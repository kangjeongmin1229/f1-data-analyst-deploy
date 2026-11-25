// Step 32 report-only diagnostics D1–D3 (docs/prereg/step32-diagnostics-rules-2026-11-25.md sha256 f718796d…). No fit, no selection.
// usage: node scripts/sim/learn/step32-diag.mjs d1|d2|d3 <out.json>
import {writeFileSync} from 'node:fs';
import * as S from './step32-loto.mjs';
import {processLap, simAtXs, envelope, car25, USED} from './step32-forward.mjs';
import {carsFor} from '../../../worker/lapsim/scenario.js';

const {K, T, EV, keyOf, trackFor, envOf, strEnd, powerOk, rng, a2Grip} = S, G = 9.81;
// fold-median A7 parameters per season from run 45524888217 (verdict summary)
const P = {2023: {muY: 1.9226751301739542, clA: 6.465578116262295, th: 1.4358683698704326, c: 0.20631308437895868, muX: 1.4067004610259897, muXTrac: 1.6624096108803048},
  2024: {muY: 2.006662628684309, clA: 6.536726357812097, th: 1.4585313307550776, c: 0.2120415331818954, muX: 1.3938273153165142, muXTrac: 1.677463819811425},
  2025: {muY: 2.096020339197285, clA: 6.180036126772416, th: 1.4016179390121026, c: 0.21721715768272376, muX: 1.4103012994870294, muXTrac: 1.6111201246160887}};
const sim = (e, car, grip = 1, cand = true, opts) => { const tr = trackFor(e.track, e.zones, grip, cand), env = envOf(e.track), r = K.simulateLap(tr, car, env, opts); return {tr, env, r, v: Array.from(r.v, x => x * 3.6), lap: r.lapTime, time: r.time, ds: T[e.track].ds}; };
const bySession = laps => { const m = new Map(); for (const e of laps) { if (!m.has(e.session)) m.set(e.session, []); m.get(e.session).push(e); } return m; };
const boot = (xs, B = 10000) => { const r = rng(32), n = xs.length, ms = []; for (let b = 0; b < B; b++) { let s = 0; for (let i = 0; i < n; i++) s += xs[Math.floor(r() * n)]; ms.push(s / n); } ms.sort((a, b) => a - b); return [ms[Math.floor(0.025 * (B - 1))], ms[Math.ceil(0.975 * (B - 1))]]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const [mode, out] = process.argv.slice(2);

if (mode === 'd1') { // Montreal power check: as run (a) vs kernel forces (b)
  const res = [];
  for (const [ses, laps] of bySession(EV.filter(e => e.track === 'montreal'))) {
    const e = laps[0], car = car25(e.track, P[e.year]); let PR;
    const s = sim(e, car, 1, true, {kernelStep: 2, probe: p => { PR = p; }}), a = powerOk(s.tr, car, s.r, s.env), v = s.r.v, n = v.length;
    const pmax = vv => (car.pIce * (car.etaDrive ?? 0.96) + (car.ers?.pMax ?? 0) * (car.etaErs ?? 0.95) * (car.etaDrive ?? 0.96)) / vv;
    let worstB = -Infinity, failB = [], worstA = [];
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (!(v[j] > v[i]) || v[i] < 5) continue;
      const d = PR.drive(v[i], i), x = d.fx - pmax(v[i]); if (x > worstB) worstB = x; if (x > 1) failB.push({s_m: i * s.ds, kph: v[i] * 3.6, fx: d.fx, lim: pmax(v[i])});
      // where the A2.1 check (as run) fails: its own formula at this step
      const a1 = (v[j] ** 2 - v[i] ** 2) / (2 * s.ds), vm = 0.5 * (v[i] + v[j]), aF = 0.5 * (s.env.rho ?? 1.2), pm = car.pIce * (car.etaDrive ?? 1) + (car.ers?.pMax ?? 0) * (car.etaErs ?? 1);
      const lim = (pm / vm - aF * Math.min(car.cdA, car.cdALow ?? car.cdA) * vm * vm - (car.cRoll ?? 0.012) * car.mass * G) / (car.mass * (car.inertiaFactor ?? 1)) + G * Math.max(0, -Math.sin(s.tr.grade ? s.tr.grade[i] : 0));
      if (a1 - lim > 1e-6) worstA.push({s_m: i * s.ds, kph: v[i] * 3.6, a_step: a1, lim, grade_deg: (s.tr.grade?.[i] ?? 0) * 180 / Math.PI, low: s.tr.aeroLow[i]}); }
    res.push({session: ses, laps: laps.length, asRun: {ok: a.ok, worst: a.worst, failingSteps: worstA.length, top: worstA.sort((x, y) => (y.a_step - y.lim) - (x.a_step - x.lim)).slice(0, 5)},
      kernelForces: {ok: failB.length === 0, worstN: worstB, failingSteps: failB.length, top: failB.slice(0, 5)}});
  }
  writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res.map(r => ({s: r.session, asRun: r.asRun.ok, steps: r.asRun.failingSteps, kernel: r.kernelForces.ok, worstN: Math.round(r.kernelForces.worstN)}))));
} else if (mode === 'd2') { // axle-level braking/traction with μ_x = μ_y, forward-processed vs measured (2025 sessions)
  const base = carsFor('monza')['2025'].car, m = base.mass, k = base.inertiaFactor ?? 1.06, Lwb = 3.6, wr = 0.55, ar = 0.55, rho = 1.2, p = P[2025];
  const mu = Fz => p.muY + S.DMU * (Fz - S.FZ0);
  const aAx = (vk, h, beta, cdA) => { const v = vk / 3.6, q = 0.5 * rho * v * v, La = q * p.clA, drag = q * cdA, roll = 0.012 * (m * G + La);
    let lo = 0, hi = 80; for (let it = 0; it < 60; it++) { const a = (lo + hi) / 2, F = m * k * a - drag - roll, dz = m * a * h / Lwb;
      const Fzf = (1 - wr) * m * G + (1 - ar) * La + dz, Fzr = wr * m * G + ar * La - dz, ok = Fzr > 0 && beta * F <= mu(Fzf / 2) * Fzf && (1 - beta) * F <= mu(Fzr / 2) * Fzr; if (ok) lo = a; else hi = a; }
    return lo; }; // m/s², total deceleration
  const laps = EV.filter(e => e.year === 2025 && USED[keyOf(e)] != null), sessions = bySession(laps);
  const measEnv = envelope(laps.map(e => ({track: e.track, samples: processLap(e, e.sp, USED[keyOf(e)])})));
  const trk = [...new Set(laps.map(e => e.track))], byT = Object.fromEntries(trk.map(t => [t, laps.filter(e => e.track === t)])), R = rng(32), B = [];
  for (let b = 0; b < 200; b++) B.push(envelope(trk.map(() => trk[Math.floor(R() * trk.length)]).flatMap(t => byT[t]).map(e => ({track: e.track, samples: processLap(e, e.sp, USED[keyOf(e)])}))));
  const ci = (kind, j) => { const xs = B.map(x => x[kind][j].p95).filter(x => x != null).sort((a, b) => a - b); return xs.length ? [xs[Math.floor(0.025 * (xs.length - 1))], xs[Math.ceil(0.975 * (xs.length - 1))]] : null; };
  const variants = [['A7 car (μx fitted)', null, null], ['axle h0.30 β0.575', 0.30, 0.575], ['axle h0.25 β0.575', 0.25, 0.575], ['axle h0.35 β0.575', 0.35, 0.575], ['axle h0.30 β0.55', 0.30, 0.55], ['axle h0.30 β0.60', 0.30, 0.60]];
  const res = {measured: {}, variants: []}, kinds = ['brk', 'trc0'];
  for (const kind of kinds) res.measured[kind] = measEnv[kind].map((b, j) => ({lo: S.BIN0 + j * S.BINW, n: b.n, tracks: b.tracks, p95_g: b.p95 == null ? null : b.p95 / G, ci95_g: ci(kind, j)?.map(x => x / G)}));
  for (const [name, h, beta] of variants) {
    const vs = [], vv = []; for (let x = 80; x <= 300; x += 10) { vs.push(x); vv.push(h == null ? null : aAx(x, h, beta, base.cdA * p.th / S.CDA_REF)); }
    let env = null; if (h != null) { let sx = 0, sy = 0, sxx = 0, sxy = 0; vs.forEach((x, i) => { const X = (x / 3.6) ** 2; sx += X; sy += vv[i]; sxx += X * X; sxy += X * vv[i]; }); const nn = vs.length, a2 = (nn * sxy - sx * sy) / (nn * sxx - sx * sx); env = [(sy - a2 * sx) / nn, a2]; }
    const sims = {}, lapsS = [];
    for (const [ses, L] of sessions) { const e0 = L[0], c0 = car25(e0.track, p), car = h == null ? c0 : {...c0, muX: p.muY, muXTrac: p.muY, cogHeight: h, wheelbase: Lwb, brakeEnv: env};
      sims[ses] = sim(e0, car).v; for (const e of L) lapsS.push({track: e.track, samples: processLap(e, simAtXs(e, sims[ses]))}); }
    const E = envelope(lapsS), row = {name, h, beta, brakeEnv: env, aAxle_g: h == null ? null : vs.map((x, i) => [x, vv[i] / G]), bins: {}};
    for (const kind of kinds) row.bins[kind] = E[kind].map((b, j) => { const c = ci(kind, j), mm = measEnv[kind][j]; return {lo: S.BIN0 + j * S.BINW, p95_g: b.p95 == null ? null : b.p95 / G,
      inCI: c && b.p95 != null && S.valid?.call ? null : (c && b.p95 != null && mm.n >= S.NMIN ? b.p95 >= c[0] && b.p95 <= c[1] : null)}; });
    row.inCI = Object.fromEntries(kinds.map(kd => [kd, row.bins[kd].filter(b => b.inCI === true).length + ' of ' + row.bins[kd].filter(b => b.inCI != null).length]));
    res.variants.push(row);
  }
  writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res.variants.map(r => [r.name, r.inCI])));
} else if (mode === 'd3') { // straight-end bias with θ fixed at 1.35 and at the step 2a measurement
  const TH2A = {2023: 1.612, 2024: 1.572, 2025: 1.554}, cases = [['prior 1.35', () => 1.35], ['step 2a measured', y => TH2A[y]], ['A7 fold median', y => P[y].th]], res = {};
  for (const [name, thOf] of cases) { const per = {};
    for (const [ses, L] of bySession(EV)) { const e0 = L[0], s = sim(e0, car25(e0.track, {...P[e0.year], th: thOf(e0.year)}));
      const sb = L.map(e => mean(strEnd(e, s))).filter(Number.isFinite); (per[e0.track] ??= []).push(mean(sb)); }
    const tv = Object.fromEntries(Object.entries(per).map(([t, x]) => [t, mean(x)])), xs = Object.values(tv); res[name] = {mean_kph: mean(xs), ci95: boot(xs), perTrack: tv}; }
  const per = {}; for (const [ses, L] of bySession(EV)) { const e0 = L[0], s = sim(e0, carsFor(e0.track)['2025'].car, a2Grip(e0.track), false); (per[e0.track] ??= []).push(mean(L.map(e => mean(strEnd(e, s))).filter(Number.isFinite))); }
  const tv = Object.fromEntries(Object.entries(per).map(([t, x]) => [t, mean(x)])), xs = Object.values(tv); res['A2 baseline'] = {mean_kph: mean(xs), ci95: boot(xs), perTrack: tv};
  writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, [v.mean_kph, v.ci95]]))));
} else throw new Error('mode: d1 | d2 | d3');
