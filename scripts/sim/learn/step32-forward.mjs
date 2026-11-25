// Step 32 A7 (docs/prereg/step32-empirical-ggv-A7-2026-11-25.md 433e1bb7…): forward-model fit of physical car parameters per season.
// The simulated pole car is processed exactly like the measured laps (same sample positions, regrid, Savitzky–Golay, κ, bins, p95);
// objective = processed-envelope match + phase-wise trace residuals + straight-end + lap time + priors + partially pooled track terms.
// Stage 1: braking μ_x and traction μ_xTrac from the braking/traction envelope only (bootstrap SD → stage-2 priors, guard G-BT).
// usage: node step32-forward.mjs fold <held> <out>     (spawns one child per season)
//        node step32-forward.mjs season <held> <season> <out>
//        node step32-forward.mjs fold26 <held> <out>   (2026, report-only)
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {nelderMead} from '../calibrate-lib.mjs';
import {regrid, deriv} from './step32-process.mjs';
import * as S from './step32-loto.mjs';
import {stage26, a2Grip26} from './step32-stage2026.mjs';
import {carsFor} from '../../../worker/lapsim/scenario.js';

const {K, T, EV, EV26, keyOf, golden, score, strEnd, trackFor, withCorridor, envOf, a2Grip, drsPred, energyOk, powerOk, rng, pct, cases} = S;
const here = new URL('../data/step32/', import.meta.url), G = 9.81;
const KJ = JSON.parse(readFileSync(new URL('kappa.json', here))), NORM = JSON.parse(readFileSync(new URL('normalisation.json', here)));
const USED = Object.assign({}, ...Object.values(NORM).map(s => s.used)); // lap key → k_team (A6.1); laps not listed are not in the envelope
const ITERS = +(process.env.STEP32_SMOKE_ITERS || 300), BOOT1 = +(process.env.STEP32_SMOKE_BOOT || 50), SIGFLOOR = 0.05 * G;
// A7.2 priors (2023–25): μ_y, ClA, θ (CdA level), c_DRS; μ_x and μ_xTrac from stage 1
const PRI = {muY: [1.80, 0.20], clA: [6.75, 1.125], th: [1.35, 0.12], c: [0.20, 0.015]};

// ---- processing (A7.3): the same function for measured and simulated speeds ------------------------------------------------
function processLap(e, spAtXs, k = 1) {
  const n = e.n, a = regrid(n, e.xs, spAtXs.map(x => x * k)), {vf, dv, ok} = deriv(a, e.ds), kap = KJ.kappa[e.track], low = KJ.low[e.session];
  const ex = exitFlags(a, e), out = [];
  for (let i = 0; i < n; i++) { if (!ok[i]) continue; const mi = ((i - e.shift) % n + n) % n, v = vf[i] * 3.6;
    out.push([v, vf[i] * dv[i], vf[i] * vf[i] * Math.abs(kap[mi]), ex[i], low[mi] > 0 ? 1 : 0]); } // v km/h, a_x m/s², a_y m/s², exit, state
  return out;
}
function exitFlags(a, e) { // 30c phases on this trace (corner indices from the lap's measured definition; v_min from this trace)
  const n = e.n, ex = new Uint8Array(n), st = e.straights;
  e.corners.forEach(([i], j) => { if (st.length < 2) return; const a0 = st[j], a1 = st[(j + 1) % st.length], seg = [];
    for (let q = a0; q <= a1 + (a1 <= a0 ? n : 0); q++) seg.push(q % n);
    let hi = seg.indexOf(i); if (hi < 0) return; const lim = 1.05 * a[i];
    while (hi < seg.length - 1 && Number.isFinite(a[seg[hi + 1]]) && a[seg[hi + 1]] <= lim) hi++;
    for (let q = hi + 1; q < seg.length; q++) ex[seg[q]] = 1; });
  return ex;
}
const simAtXs = (e, vModelKph) => { const n = e.n; return e.xs.map(x => { const p = ((x - e.shift) % n + n) % n, i = Math.floor(p), f = p - i; return vModelKph[i % n] * (1 - f) + vModelKph[(i + 1) % n] * f; }); };
const KINDS = ['lat', 'brk', 'trc0', 'trc1'];
function binPoints(samples, track) { // [kind][bin] → values; track ids per bin
  const B = Object.fromEntries(KINDS.map(k => [k, Array.from({length: S.BINS}, () => ({a: [], t: new Set()}))]));
  for (const [v, ax, ay, ex, st] of samples) { const j = Math.floor((v - S.BIN0) / S.BINW); if (j < 0 || j >= S.BINS) continue;
    const put = k => { B[k][j].a.push(k === 'brk' ? -ax : k === 'lat' ? ay : ax); B[k][j].t.add(track); };
    if (!st) { put('lat'); if (ax < 0) put('brk'); }
    if (ex && ax > 0) put(st ? 'trc1' : 'trc0'); }
  return B;
}
function envelope(lapSamples) { PROF.env++; // lapSamples: [{track, samples}] → p95 per kind/bin with N and track counts
  const acc = Object.fromEntries(KINDS.map(k => [k, Array.from({length: S.BINS}, () => ({a: [], t: new Set()}))]));
  for (const {track, samples} of lapSamples) { const B = binPoints(samples, track); for (const k of KINDS) B[k].forEach((b, j) => { for (const x of b.a) acc[k][j].a.push(x); for (const t of b.t) acc[k][j].t.add(t); }); }
  return Object.fromEntries(KINDS.map(k => [k, acc[k].map(b => ({n: b.a.length, tracks: b.t.size, p95: b.a.length ? pct(b.a, S.Q) : null}))]));
}
const valid = b => b && b.n >= S.NMIN && b.tracks >= S.TMIN;

// ---- cars ------------------------------------------------------------------------------------------------------------------------
const SHIP = {}, ship25 = id => (SHIP[id] ??= carsFor(id)['2025'].car);
function car25(id, p) { const s = ship25(id), cdA = s.cdA * p.th / S.CDA_REF;
  return {...s, pIce: S.P_ICE, muY: p.muY, muX: p.muX, muXTrac: p.muXTrac, clA: p.clA, clALow: p.clA * S.CLA_LOW_RATIO, cdA, cdALow: cdA * (1 - p.c)}; }
export const PROF = {sim: 0, simMs: 0, env: 0, envMs: 0};
const memo = new Map();
function simSession(e, car, grip) { // the candidate lap of e's session (corridor, DRS +54 m, grip 1 + u)
  const key = JSON.stringify([e.session, car.muY, car.muX, car.muXTrac, car.clA, car.cdA, car.cdALow, grip]); if (memo.has(key)) return memo.get(key);
  let PR; const t0 = Date.now(), tr = trackFor(e.track, e.zones, grip, true), env = envOf(e.track), r = K.simulateLap(tr, car, env, {kernelStep: 2, probe: p => { PR = p; }}); PROF.sim++; PROF.simMs += Date.now() - t0;
  const o = {v: Array.from(r.v, x => x * 3.6), time: r.time, lap: r.lapTime, ds: T[e.track].ds, energyOk: energyOk(r), power: S.powerOkProbe(PR, car, r)}; // D1 fix
  if (memo.size > 300) memo.clear(); memo.set(key, o); return o;
}

// ---- season fit (A7.4, A7.5) --------------------------------------------------------------------------------------------------
function seasonFit(train, s, opts = {}) {
  const ev = train.filter(e => e.year === s), envLaps = ev.filter(e => USED[keyOf(e)] != null), tracks = [...new Set(ev.map(e => e.track))].sort();
  const measOf = laps => envelope(laps.map(e => ({track: e.track, samples: processLap(e, e.sp, USED[keyOf(e)])})));
  const M = measOf(envLaps), R = rng(32), boots = [];
  const byT = Object.fromEntries(tracks.map(t => [t, envLaps.filter(e => e.track === t)]));
  for (let b = 0; b < 200; b++) boots.push(measOf(tracks.map(() => tracks[Math.floor(R() * tracks.length)]).flatMap(t => byT[t] || [])));
  const sig = Object.fromEntries(KINDS.map(k => [k, M[k].map((_, j) => { const xs = boots.map(B => B[k][j].p95).filter(x => x != null); if (xs.length < 2) return SIGFLOOR;
    const m = xs.reduce((a, b) => a + b, 0) / xs.length; return Math.max(SIGFLOOR, Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1))); })]));
  const u = Object.fromEntries(tracks.map(t => [t, 0]));
  const simEnv = (p, laps) => envelope(laps.map(e => ({track: e.track, samples: processLap(e, simAtXs(e, simSession(e, car25(e.track, p), 1 + u[e.track]).v))})));
  let BINSET = null; // fixed at the first evaluation: measured-valid bins that are also valid for the prior-mean car (mechanical, see status)
  const envTerm = (p, kinds, laps = envLaps, Mx = M, sg = sig) => { const Sm = simEnv(p, laps); if (!BINSET) BINSET = Object.fromEntries(KINDS.map(k => [k, M[k].map((b, j) => valid(b) && valid(Sm[k][j]))]));
    let z = 0, nb = 0; for (const k of kinds) Mx[k].forEach((b, j) => { if (!BINSET[k][j] || !valid(b) || Sm[k][j].p95 == null) return; z += ((Sm[k][j].p95 - b.p95) / sg[k][j]) ** 2; nb++; }); return {z, nb}; };
  const lapTerm = p => { const by = {}; for (const e of ev) { const sc = score(e, simSession(e, car25(e.track, p), 1 + u[e.track]));
      const Je = (sc.apexAll ?? 0) / 5 + (sc.entry ?? 0) / 0.10 + (sc.exit ?? 0) / 0.10 + (sc.strEndRms ?? 0) / 5 + Math.abs(sc.lapErr) / 0.5; (by[e.session] ??= []).push(Je); }
    return Object.values(by).reduce((a, x) => a + x.reduce((q, y) => q + y, 0) / x.length, 0); };
  const pz = (p, pri) => Object.entries(pri).reduce((a, [k, [m, sd]]) => a + ((p[k] - m) / sd) ** 2, 0);
  const physical = p => p.muY > 0 && p.clA > 0 && p.th > 0 && p.c > 0 && p.c < 1 && p.muX > 0 && p.muXTrac > 0;
  const base = Object.fromEntries(Object.entries(PRI).map(([k, [m]]) => [k, m]));
  // stage 1: μ_x, μ_xTrac on the braking and traction envelope terms only (others at prior means, u = 0)
  const st1 = (laps, Mx, sg) => { const f = x => { const p = {...base, muX: x[0], muXTrac: x[1]}; return physical(p) ? envTerm(p, ['brk', 'trc0', 'trc1'], laps, Mx, sg).z : 1e9; };
    const r = nelderMead(f, [1.6, 1.8], {step: [0.1, 0.1], iters: ITERS, relTol: 1e-4}); return r.x; };
  const s1 = st1(envLaps, M, sig), R1 = rng(320), bt = [];
  for (let b = 0; b < BOOT1; b++) { const laps = tracks.map(() => tracks[Math.floor(R1() * tracks.length)]).flatMap(t => byT[t] || []); bt.push(st1(laps, measOf(laps), sig)); }
  const sd = i => Math.max(0.03, Math.sqrt(bt.reduce((a, x) => a + (x[i] - bt.reduce((q, y) => q + y[i], 0) / bt.length) ** 2, 0) / Math.max(1, bt.length - 1)));
  const PRI2 = {...PRI, muX: [s1[0], sd(0)], muXTrac: [s1[1], sd(1)]}, KEYS = Object.keys(PRI2);
  // stage 2: all six, Nelder–Mead from the prior means and prior means + 1σ, then u_t by golden search; 2 rounds
  let P = Object.fromEntries(KEYS.map(k => [k, PRI2[k][0]])); const log = [];
  const J = p => physical(p) ? envTerm(p, KINDS).z + lapTerm(p) + pz(p, PRI2) + Object.values(u).reduce((a, x) => a + (x / 0.03) ** 2, 0) : 1e9;
  for (let round = 0; round < 2; round++) {
    let best = null; for (const x0 of [KEYS.map(k => P[k]), KEYS.map(k => PRI2[k][0] + PRI2[k][1])]) {
      const r = nelderMead(x => J(Object.fromEntries(KEYS.map((k, i) => [k, x[i]]))), x0, {step: KEYS.map(k => PRI2[k][1]), iters: ITERS, relTol: 1e-4}); if (!best || r.value < best.value) best = r; }
    P = Object.fromEntries(KEYS.map((k, i) => [k, best.x[i]])); log.push({round, J: best.value, it: best.it});
    for (const t of tracks) u[t] = golden(x => { const o = u[t]; u[t] = x; const v = J(P); u[t] = o; return v; }, -0.15, 0.15, 14);
  }
  const et = envTerm(P, KINDS), dof = Math.max(1, et.nb - KEYS.length);
  const z = Object.fromEntries(KEYS.map(k => [k, (P[k] - PRI2[k][0]) / PRI2[k][1]]));
  // A7.6 physics checks on the fitted parameters
  const loads = [...Array.from({length: 14}, (_, i) => 60 + i * 20), 330].map(v => (M_.g + 0.5 * 1.2 * P.clA * (v / 3.6) ** 2 / M_.m) * M_.m / 4); // per-tyre Fz, 60–330 km/h
  const muAt = Fz => P.muY + S.DMU * (Fz - S.FZ0);
  const checks = {P1: loads.every(F => muAt(F) >= 1.4 && muAt(F) <= 2.2) && P.clA >= 4.5 && P.clA <= 9.0, P2: P.muX / P.muY >= 0.8 && P.muX / P.muY <= 1.2,
    P4: S.CLA_LOW_RATIO < 1, GBT: Math.abs(z.muX) <= 2 && Math.abs(z.muXTrac) <= 2};
  return {season: s, params: P, prior: PRI2, z, stage1: {muX: s1[0], muXTrac: s1[1], sd: [sd(0), sd(1)], boot: bt.length}, u, checks,
    muYRange: [Math.min(...loads.map(muAt)), Math.max(...loads.map(muAt))], envChi2: et.z, envBins: et.nb, envDof: dof, envChi2Dof: et.z / dof,
    measEnv: M, sig, simEnv: simEnv(P, envLaps), log};
}
const M_ = {g: 9.81, m: S.M_CAR};

export {processLap, simAtXs, envelope, car25, simSession, KINDS, valid, USED};
const MAIN = process.argv[1] && new URL(import.meta.url).pathname === (await import('node:path')).resolve(process.argv[1]);
const [mode, held, a2, a3] = MAIN ? process.argv.slice(2) : [];
if (!MAIN) { /* imported */ } else if (mode === 'season') { // one season of one fold (child process)
  const train = EV.filter(e => e.track !== held); const t0 = Date.now(); writeFileSync(a3, JSON.stringify(seasonFit(train, +a2))); console.log(held, a2, 'done', JSON.stringify({...PROF, totalMs: Date.now() - t0}));
} else if (mode === 'fold') {
  const test = EV.filter(e => e.track === held); if (!test.length) throw new Error('no laps for ' + held);
  const kids = [2023, 2024, 2025].map(s => new Promise((res, rej) => { const f = `/tmp/s32-${held}-${s}.json`;
    import('node:child_process').then(({execFile}) => execFile('node', [new URL(import.meta.url).pathname, 'season', held, String(s), f], {maxBuffer: 1e8}, err => err ? rej(err) : res(JSON.parse(readFileSync(f, 'utf8'))))); }));
  const fits = Object.fromEntries((await Promise.all(kids)).map(f => [f.season, f]));
  const g2 = a2Grip(held), r2 = a => a.map(x => Math.round(x * 100) / 100), cand = (id, y) => car25(id, fits[y].params), base = id => ship25(id);
  const baseSim = e => { const tr = trackFor(e.track, e.zones, g2, false), env = envOf(e.track), r = K.simulateLap(tr, base(e.track), env); return {v: Array.from(r.v, x => x * 3.6), time: r.time, lap: r.lapTime, ds: T[e.track].ds, energyOk: energyOk(r)}; };
  const BS = {}, heldScores = test.map(e => { const rc = simSession(e, cand(e.track, e.year), 1), rb = (BS[e.session] ??= baseSim(e));
    const proc = sp => processLap(e, sp).filter(q => q[3] && q[1] > 0 || q[1] < 0).map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 1000) / 1000, q[3], q[4]]);
    return {key: keyOf(e), session: e.session, year: e.year, rank: e.rank, cand: score(e, rc), base: score(e, rb),
      checks: {energyCand: rc.energyOk, energyBase: rb.energyOk, power: rc.power, lowR: {ok: true}},
      procMeas: proc(e.sp), procCand: proc(simAtXs(e, rc.v)), procBase: proc(simAtXs(e, rb.v))}; });
  const sessV = {}; for (const e of test) sessV[e.session] ??= {cand: r2(simSession(e, cand(e.track, e.year), 1).v), base: r2(BS[e.session].v)};
  const drs = cases.filter(c => c.track === held).map(c => ({id: c.case_id, year: +c.year, meas: +c.meas_delta_s,
    cand: drsPred(c, zs => { const car = cand(c.track, +c.year), r = K.simulateLap(trackFor(c.track, zs, 1, true), car, envOf(c.track)); return {v: Array.from(r.v), time: r.time, lap: r.lapTime, ds: T[c.track].ds}; }),
    base: drsPred(c, zs => { const r = K.simulateLap(trackFor(c.track, zs, g2, false), base(c.track), envOf(c.track)); return {v: Array.from(r.v), time: r.time, lap: r.lapTime, ds: T[c.track].ds}; })}));
  const slimFit = f => ({params: f.params, prior: f.prior, z: f.z, stage1: f.stage1, checks: f.checks, muYRange: f.muYRange, envChi2Dof: f.envChi2Dof, envBins: f.envBins,
    measEnv: f.measEnv, simEnv: f.simEnv, sig: f.sig, log: f.log, uMean: Object.values(f.u).reduce((a, b) => a + b, 0) / Object.keys(f.u).length});
  writeFileSync(a2, JSON.stringify({held, variant: 'V1', method: 'A7 forward', baseline: 'A2', corridor: !!S.COR.tracks[held], fits: Object.fromEntries(Object.entries(fits).map(([k, f]) => [k, slimFit(f)])), heldScores, sessV, drs}));
  console.log(held, 'laps', test.length, 'drs', drs.length);
} else if (mode === 'fold26') {
  console.log('2026 forward fold: report-only group; implemented after the 2023–25 code is checked'); process.exit(3);
} else if (MAIN) throw new Error('mode: fold | season | fold26');
