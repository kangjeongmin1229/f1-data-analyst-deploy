// Step 2a: F1 wheel power P(v) and drag per track measured from telemetry, so the fit stops fitting what can be measured (physics
// rule 3.1). Pre-registration claude/gate-cda-measured-prereg-2026-11-23.md; attempt 2: amendment ...-amendment-a2.md (all clean push
// laps of qualifying and practice, per-lap weights, separate power for practice). Power balance on every full-throttle straight sample:
//   v·(m_eff·a + c_roll·N + m·g·sinθ) = P_b,type(v) − ½ρ(v − w∥)²·v·(CdA_t + ΔCdA_t·DRS)
// P_b,type: wheel power per speed band and session type (qualifying / practice), shared by the tracks of a season;
// CdA_t, ΔCdA_t: per track-season (the wing level each event gets), shared by the sessions of the event.
// Errors: stat (leave-one-track-out jackknife; per-track CdA leave-one-driver-out + pooled P) and sys (each assumption moved).
// 2026 is not measured (350 kW MGU-K taper, clipping, energy limits, no Straight Mode channel): declared before the run.
// In: TracingInsights season repos with laptimes.json (sparse clone, LAPSIM_TI_DIR, default .cache/ti), lap telemetry from
// raw.githubusercontent (cached in LAPSIM_TI_TEL, default .cache/ti-tel). Measured data is only read.
// Out: worker/lapsim/car-measured-data.js. Run: node scripts/sim/measure-car.mjs [--json out.json]   (LAPSIM_PICK=best: attempt 1)
import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {conditionsFromWeather, tailwind, icePowerFactor} from '../../worker/lapsim/atmosphere.js';
import {PRIOR} from '../../worker/lapsim/cars.js';
import {tiTrack} from './ti-races.mjs';

const G = 9.81, ROOT = process.env.LAPSIM_TI_DIR || '.cache/ti', CACHE = process.env.LAPSIM_TI_TEL || '.cache/ti-tel';
const YEARS = ['2023', '2024', '2025'];
const MIN_MASS = {2023: 798, 2024: 798, 2025: 800}, FUEL = 10; // FIA Technical Regulations C4.1 minimum mass + qualifying fuel
const BANDS = [[180, 240], [240, 270], [270, 300], [300, 340]], NB = BANDS.length;
const SESSIONS = {Qualifying: 'q', 'Sprint Qualifying': 'q', 'Sprint Shootout': 'q', 'Practice 1': 'p', 'Practice 2': 'p', 'Practice 3': 'p'};
const num = x => x === 'None' || x == null ? NaN : +x;
const sum = a => a.reduce((s, x) => s + x, 0), mean = a => sum(a) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(sum(a.map(x => (x - m) ** 2)) / Math.max(1, a.length - 1)); };
const wetList = (() => { try { const W = JSON.parse(readFileSync(new URL('./data/wet-sessions.json', import.meta.url), 'utf8')); return new Set((W.f1 || []).map(String)); } catch { return new Set(); } })();

// 1. laps. mode 'best' (attempt 1): each driver's fastest dry Qualifying lap. mode 'all' (attempt 2, amendment §2): every clean push
// lap of qualifying-type and practice sessions: timed, not deleted, no pit in / out, accurate, dry, green for the whole lap, within
// tol × the driver's best of the session and 1.05 × the session best. Session weight 1, split over drivers, then over their laps.
export function picks(root = ROOT, {mode = 'all', tol = 1.02} = {}) {
  const out = [];
  for (const y of YEARS) {
    const dir = join(root, y); if (!existsSync(dir)) continue;
    for (const ev of readdirSync(dir).filter(e => /Grand Prix$/.test(e)).sort()) {
      const track = tiTrack(ev, +y); if (!lapsimTracks[track]) continue;
      for (const [ses, type] of Object.entries(SESSIONS)) {
        if (mode === 'best' && ses !== 'Qualifying') continue;
        const q = join(dir, ev, ses); if (!existsSync(q) || wetList.has(`${y} ${track} ${ses}`)) continue;
        let n = 0, wet = 0; const laps = [];
        for (const drv of readdirSync(q).filter(x => /^[A-Z]{3}$/.test(x))) {
          const f = join(q, drv, 'laptimes.json'); if (!existsSync(f)) continue;
          const L = JSON.parse(readFileSync(f, 'utf8'));
          for (let i = 0; i < L.time.length; i++) {
            n++; if (L.wR?.[i] === true) wet++;
            const t = num(L.time[i]);
            if (!Number.isFinite(t) || L.del?.[i] === true || L.pin?.[i] !== 'None' || L.pout?.[i] !== 'None' || L.wR?.[i] === true) continue;
            if (mode === 'all' && (L.iacc?.[i] !== true || String(L.status?.[i]) !== '1')) continue;
            laps.push({year: y, ev, ses, type, track, drv, lap: L.lap[i], time: t,
              w: {airTempC: num(L.wAT?.[i]), humidityPct: num(L.wH?.[i]), pressureHpa: num(L.wP?.[i]), windSpeed: num(L.wWS?.[i]), windFromDeg: num(L.wWD?.[i])}});
          }
        }
        if (!n || wet / n >= 0.1 || !laps.length) continue;
        const sBest = Math.min(...laps.map(l => l.time)), dBest = {};
        for (const l of laps) dBest[l.drv] = Math.min(dBest[l.drv] ?? Infinity, l.time);
        const keep = mode === 'best' ? laps.filter(l => l.time === dBest[l.drv]).filter((l, i, a) => a.findIndex(x => x.drv === l.drv) === i)
          : laps.filter(l => l.time <= tol * dBest[l.drv] && l.time <= 1.05 * sBest);
        const drivers = [...new Set(keep.map(l => l.drv))];
        for (const l of keep) l.weight = 1 / drivers.length / keep.filter(x => x.drv === l.drv).length;
        out.push(...keep);
      }
    }
  }
  return out;
}
const telPath = p => join(CACHE, p.year, (p.ses === 'Qualifying' ? '' : p.ses.replace(/ /g, '_') + '/') + `${p.ev}_${p.drv}_${p.lap}.json`.replace(/ /g, '_'));
export async function fetchAll(laps, par = 16) {
  const run = promisify(execFile), todo = laps.filter(p => !existsSync(telPath(p)));
  let k = 0;
  await Promise.all(Array.from({length: par}, async () => { while (k < todo.length) { const p = todo[k++];
    const url = `https://raw.githubusercontent.com/TracingInsights/${p.year}/main/${[p.ev, p.ses, p.drv, p.lap + '_tel.json'].map(encodeURIComponent).join('/')}`;
    try { const {stdout} = await run('curl', ['-sSf', '--retry', '2', '--max-time', '60', url], {maxBuffer: 1 << 26}); mkdirSync(dirname(telPath(p)), {recursive: true}); writeFileSync(telPath(p), stdout); } catch { /* 404: no telemetry */ } } }));
}
const readTel = p => { if (!existsSync(telPath(p))) return null; try { const r = JSON.parse(readFileSync(telPath(p), 'utf8')); return r.tel || r; } catch { return null; } };
// compact copy of the channels used here (typed arrays) with the broken-sample mask computed on the raw values
const compact = T => !T?.speed?.length ? null : {bad: frozenMask(T), time: Float64Array.from(T.time, Number), speed: Float32Array.from(T.speed, Number),
  throttle: Float32Array.from(T.throttle, Number), brake: Uint8Array.from(T.brake, x => +x > 0 || x === true ? 1 : 0), gear: Uint8Array.from(T.gear, Number),
  rpm: Float32Array.from(T.rpm, Number), drs: Uint8Array.from(T.drs, Number)};

// 2. broken telemetry (AGENTS.md; claude/ti-frozen-scan-2025-2026 detectors C and D) and impossible throttle, ± 1 sample
export function frozenMask(T) {
  const n = T.speed.length, bad = new Uint8Array(n), same = i => T.speed[i] === T.speed[i - 1] && T.rpm[i] === T.rpm[i - 1];
  const all5 = i => same(i) && T.gear[i] === T.gear[i - 1] && T.throttle[i] === T.throttle[i - 1] && T.brake[i] === T.brake[i - 1];
  const mark = (a, b) => { for (let k = Math.max(0, a - 1); k <= Math.min(n - 1, b + 1); k++) bad[k] = 1; };
  for (let i = 1; i < n;) { if (!same(i)) { i++; continue; } let j = i; while (j + 1 < n && same(j + 1)) j++; if (j - i + 2 >= 4) mark(i - 1, j); i = j + 1; }
  for (let i = 1; i < n;) { if (!all5(i)) { i++; continue; } let j = i; while (j + 1 < n && all5(j + 1)) j++; if (+T.time[j] - +T.time[i - 1] >= 1.5 && +T.speed[i - 1] >= 5) mark(i - 1, j); i = j + 1; }
  for (let i = 0; i < n; i++) if (+T.throttle[i] > 100) bad[i] = 1;
  return bad;
}
// slope of a local linear fit of speed on time over ± w s (unmasked samples): the acceleration
export function accel(t, v, i, w, bad) {
  let n = 0, st = 0, sv = 0, stt = 0, stv = 0;
  const add = k => { if (bad[k]) return; n++; st += t[k]; sv += v[k]; stt += t[k] * t[k]; stv += t[k] * v[k]; };
  for (let k = i; k >= 0 && t[i] - t[k] <= w; k--) add(k);
  for (let k = i + 1; k < t.length && t[k] - t[i] <= w; k++) add(k);
  const d = n * stt - st * st; return n >= 4 && d > 1e-9 ? (n * stv - st * sv) / d : NaN;
}
// solve A·x = b (A p×p as rows with b in column p), Gauss-Jordan with pivoting; null if singular
function solve(A) {
  const p = A.length;
  for (let c = 0; c < p; c++) { let m = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[m][c])) m = r; [A[c], A[m]] = [A[m], A[c]];
    if (Math.abs(A[c][c]) < 1e-9) return null; for (let r = 0; r < p; r++) if (r !== c) { const f = A[r][c] / A[c][c]; if (f) for (let k = c; k <= p; k++) A[r][k] -= f * A[c][k]; } }
  return A.map((row, i) => row[p] / row[i]);
}
// linear least squares (optionally weighted) by normal equations
export function lsq(X, y, w = null) {
  const p = X[0].length, A = Array.from({length: p}, () => new Float64Array(p + 1));
  for (let r = 0; r < y.length; r++) { const x = X[r], wr = w ? w[r] : 1; for (let a = 0; a < p; a++) { if (!x[a]) continue; A[a][p] += wr * x[a] * y[r]; for (let b = 0; b < p; b++) A[a][b] += wr * x[a] * x[b]; } }
  return solve(A);
}

// 3. full-throttle straight samples of one lap: y = v·(m_eff·a + roll + grade) (W at the wheel), x = ½ρ·va²·v (W per m² of CdA)
const TRK = new Map(), trk = id => TRK.get(id) || TRK.set(id, trackFromData(lapsimTracks[id])).get(id);
export function samples(p, T, o) {
  const tr = trk(p.track), nK = tr.kappa.length, Lk = nK * tr.ds, car = PRIOR[p.year], bad = T.bad || frozenMask(T);
  let n = T.speed.length; if (bad.reduce((a, b) => a + b, 0) > n / 2) return [];
  let t = Array.from(T.time, Number), v = Array.from(T.speed, x => +x / 3.6 * o.speedScale), ix = t.map((_, i) => i);
  if (o.thin) ix = ix.filter(i => i % 2 === 0); // sampling-rate row: every second sample dropped
  const pick = a => ix.map(i => a[i]); t = pick(t); v = pick(v);
  const thr = pick(T.throttle).map(Number), brk = pick(T.brake).map(x => +x > 0 || x === true), gear = pick(T.gear).map(Number), rpm = pick(T.rpm).map(Number), drs = pick(T.drs).map(Number), bd = pick(bad);
  n = t.length;
  const s = new Float64Array(n); for (let i = 1; i < n; i++) s[i] = s[i - 1] + 0.5 * (v[i] + v[i - 1]) * (t[i] - t[i - 1]); // distance from integrated speed
  const at = (arr, i) => arr ? arr[((Math.round(s[i] / s[n - 1] * Lk / tr.ds) % nK) + nK) % nK] : 0;
  const env = conditionsFromWeather(p.w), rho = env.rho, m = MIN_MASS[p.year] + FUEL + o.dMass + (p.type === 'p' ? o.dFuelPractice : 0), mEff = m * o.inertia;
  const wind = o.wind && Number.isFinite(p.w.windSpeed) && Number.isFinite(p.w.windFromDeg) && tr.heading;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (bd[i] || v[i] < 180 / 3.6 || v[i] > 340 / 3.6 || gear[i] < 6 || rpm[i] < 10000) continue;
    let ok = true;
    for (let k = i; k >= 0 && t[i] - t[k] <= 0.5 && ok; k--) if (thr[k] < 99 || brk[k] || bd[k]) ok = false;
    for (let k = i; k < n && t[k] - t[i] <= 0.5 && ok; k++) if (thr[k] < 99 || brk[k] || bd[k]) ok = false;
    if (!ok || v[i] ** 2 * Math.abs(at(tr.kappa, i)) > 6) continue;
    const a = accel(t, v, i, o.win, bd); if (!Number.isFinite(a)) continue;
    const va = Math.max(0, v[i] - (wind ? tailwind(at(tr.heading, i), p.w.windSpeed, p.w.windFromDeg) : 0));
    const N = m * G + 0.5 * rho * car.clA * va * va, sinG = o.grade && tr.grade ? Math.sin(at(tr.grade, i)) : 0;
    const y = v[i] * (mEff * a + car.cRoll * N + m * G * sinG), x = 0.5 * rho * va * va * v[i];
    if (Number.isFinite(y) && Number.isFinite(x)) out.push({track: p.track, drv: p.drv, type: p.type || 'q', v: v[i], y, x, drs: drs[i] === 1 || drs[i] >= 10 ? 1 : 0, iceF: icePowerFactor(rho)});
  }
  const w = (p.weight ?? 1) / Math.max(1, out.length); for (const q of out) q.w = w; // lap weight shared by its samples
  return out;
}

// 4. fits (weighted). Season model: P per band and session type (shared by tracks) + CdA_t, ΔCdA_t per track. Built from sparse rows.
const bandOf = v => BANDS.findIndex(([a, b]) => v * 3.6 >= a && v * 3.6 < b);
export function fitSeason(S, {bands = true} = {}) {
  const tracks = [...new Set(S.map(q => q.track))].sort(), types = ['q', 'p'].filter(t => S.some(q => (q.type || 'q') === t)), nb = bands ? NB : 1;
  const P0 = types.length * nb, p = P0 + 2 * tracks.length, ti = Object.fromEntries(tracks.map((t, i) => [t, i]));
  const A = Array.from({length: p}, () => new Float64Array(p + 1));
  for (const q of S) {
    const b = bands ? bandOf(q.v) : 0; if (b < 0) continue;
    const w = q.w ?? 1, c = [types.indexOf(q.type || 'q') * nb + b, P0 + 2 * ti[q.track], P0 + 2 * ti[q.track] + 1], x = [1, -q.x, -q.x * q.drs];
    for (let a = 0; a < 3; a++) { A[c[a]][p] += w * x[a] * q.y; for (let k = 0; k < 3; k++) A[c[a]][c[k]] += w * x[a] * x[k]; }
  }
  // a band without samples (e.g. 180-240 in a short practice set) keeps its row empty: pin it to 0
  for (let r = 0; r < P0; r++) if (!A[r][r]) A[r][r] = 1;
  const sol = solve(A); if (!sol) return null;
  const byType = Object.fromEntries(types.map((t, i) => [t, sol.slice(i * nb, (i + 1) * nb)]));
  const cdA = Object.fromEntries(tracks.map(t => [t, {cdA: sol[P0 + 2 * ti[t]], cdALow: sol[P0 + 2 * ti[t]] + sol[P0 + 2 * ti[t] + 1]}]));
  return {P: byType.q ?? byType.p, Pp: byType.p ?? null, cdA};
}
// per-track drag with P fixed per session type (W): y − P_type = −x·(CdA + ΔCdA·DRS), weighted
export function fitTrackDrag(S, P, Pp = P) {
  if (!S.length) return null;
  const c = lsq(S.map(q => [-q.x, -q.x * q.drs]), S.map(q => q.y - ((q.type || 'q') === 'p' ? Pp : P)), S.map(q => q.w ?? 1));
  return c ? {cdA: c[0], cdALow: c[0] + c[1]} : null;
}
const jackknife = (units, f) => { const xs = units.map(f).filter(Number.isFinite), m = mean(xs); return xs.length > 1 ? Math.sqrt((xs.length - 1) / xs.length * sum(xs.map(x => (x - m) ** 2))) : NaN; };

// everything one option set gives, per season
export function measure(laps, telOf, o) {
  const res = {};
  for (const y of YEARS) {
    const L = laps.filter(p => p.year === y && (!o.qualiOnly || p.type === 'q') && p.time <= (o.tol ?? Infinity) * p.dBest);
    const S = L.flatMap(p => { const T = telOf(p); return T ? samples(p, T, o) : []; });
    if (S.length < 500) continue;
    const tracks = [...new Set(S.map(q => q.track))].sort(), car = PRIOR[y];
    const band = fitSeason(S), flat = fitSeason(S, {bands: false}), P0 = flat.P[0], Pp0 = flat.Pp?.[0] ?? P0;
    const Sq = S.filter(q => q.type === 'q'), nBand = BANDS.map((_, b) => Sq.filter(q => bandOf(q.v) === b).length);
    const perTrack = {}, iceF = mean(Sq.length ? Sq.map(q => q.iceF) : S.map(q => q.iceF));
    for (const t of tracks) {
      const St = S.filter(q => q.track === t), d = fitTrackDrag(St, P0, Pp0), drv = [...new Set(St.map(q => q.drv))];
      const loo = x => fitTrackDrag(St.filter(q => q.drv !== x), P0, Pp0);
      const own = fitSeason(St, {bands: false});
      perTrack[t] = {n: St.length, laps: new Set(St.map(q => q.drv + q.w)).size, drivers: drv.length, cdA: d.cdA, cdALow: d.cdALow,
        statDrv: jackknife(drv, x => loo(x)?.cdA), statDrvLow: jackknife(drv, x => loo(x)?.cdALow), pOwn: own?.P[0]};
    }
    const cds = tracks.map(t => perTrack[t].cdA), lows = tracks.map(t => perTrack[t].cdALow);
    res[y] = {n: S.length, nQ: Sq.length, nBand, tracks, P0, Pp0, Pband: band.P, PbandP: band.Pp, perTrack, iceF, car,
      cdAMean: mean(cds), cdASd: sd(cds), drsRatio: sum(lows) / sum(cds),
      pIce120: P0 / car.etaDrive / iceF - car.ers.pMax * car.etaErs / iceF, pIce0: P0 / car.etaDrive / iceF, S};
  }
  return res;
}

const BASE = {speedScale: 1, dMass: 0, dFuelPractice: 0, inertia: 1.06, win: 0.4, wind: true, grade: true, thin: false, tol: null, qualiOnly: false};
const SYS = {mass: [{dMass: -10}, {dMass: 10}], inertia: [{inertia: 1.04}, {inertia: 1.08}], window: [{win: 0.3}, {win: 0.5}], rate: [{thin: true}],
  speedBias: [{speedScale: 0.99}, {speedScale: 1.01}], wind: [{wind: false}], grade: [{grade: false}],
  practiceFuel: [{dFuelPractice: 30}], pickTol: [{tol: 1.01}, {tol: 1.03}], qualiOnly: [{qualiOnly: true}]};
const shift = (base, alts, get) => { const xs = alts.map(get); if (!xs.every(Number.isFinite)) return NaN; return alts.length === 2 ? Math.abs(xs[1] - xs[0]) / 2 : Math.abs(xs[0] - get(base)); };
const quad = o => Math.sqrt(sum(Object.values(o).filter(Number.isFinite).map(x => x * x)));
const r4 = x => Number.isFinite(x) ? +(+x).toPrecision(4) : null;

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.env.LAPSIM_PICK === 'best' ? 'best' : 'all';
  // pick once at the widest tolerance (1.03); the 1.02 rule and the 1.01 row are filters on the driver's session best
  const laps = picks(ROOT, {mode, tol: mode === 'all' ? 1.03 : 1});
  const dBest = {}; for (const l of laps) { const k = l.year + l.ev + l.ses + l.drv; dBest[k] = Math.min(dBest[k] ?? Infinity, l.time); }
  for (const l of laps) l.dBest = dBest[l.year + l.ev + l.ses + l.drv];
  // weights belong to the pick of each run (1.02 by default): recomputed per tolerance in reweight()
  const reweight = tol => { const by = new Map(); for (const l of laps) { l._in = mode === 'best' || l.time <= tol * l.dBest; if (!l._in) continue; const k = l.year + l.ev + l.ses; (by.get(k) || by.set(k, []).get(k)).push(l); }
    for (const a of by.values()) { const drv = [...new Set(a.map(l => l.drv))]; for (const l of a) l.weight = 1 / drv.length / a.filter(x => x.drv === l.drv).length; } };
  await fetchAll(laps);
  const C = new Map(); for (const l of laps) C.set(l, compact(readTel(l))); const tel = p => C.get(p); // ~14 bytes per sample
  const run = o => { const tol = mode === 'all' ? (o.tol ?? 1.02) : null; reweight(tol ?? 1); return measure(laps.filter(l => l._in), tel, {...o, tol: null}); };
  console.log(`${mode}: ${laps.length} laps picked (superset), ${laps.filter(l => existsSync(telPath(l))).length} with telemetry`);
  const base = run(BASE), sys = {};
  for (const [k, alts] of Object.entries(SYS)) { if (mode === 'best' && (k === 'pickTol' || k === 'practiceFuel' || k === 'qualiOnly')) continue; sys[k] = alts.map(a => { const r = run({...BASE, ...a}); for (const v of Object.values(r)) delete v.S; return r; }); console.log('sys', k, 'done'); }
  const SYSK = Object.keys(sys), out = {};
  for (const [y, b] of Object.entries(base)) {
    const S = b.S, loo = b.tracks.map(t => { const s = S.filter(q => q.track !== t); return {f: fitSeason(s), g: fitSeason(s, {bands: false}), tracksLeft: b.tracks.filter(x => x !== t)}; });
    const jk = get => { const xs = loo.map(get).filter(Number.isFinite), m = mean(xs); return Math.sqrt((xs.length - 1) / xs.length * sum(xs.map(x => (x - m) ** 2))); };
    const sysOf = get => Object.fromEntries(SYSK.map(k => [k, shift(b, sys[k].map(r => r[y]), r => r ? get(r) : NaN)]));
    const entry = (value, stat, sy) => { const st = quad(sy); return {value: r4(value), stat: r4(stat), sys: Object.fromEntries(Object.entries(sy).map(([k, v]) => [k, r4(v)])), sysTotal: r4(st), total: r4(Math.hypot(stat, st))}; };
    const P = entry(b.P0, jk(l => l.g.P[0]), sysOf(r => r.P0));
    const Pp = b.Pp0 !== b.P0 ? entry(b.Pp0, jk(l => l.g.Pp?.[0]), sysOf(r => r.Pp0)) : null;
    const bands = BANDS.map((bb, i) => ({kph: bb, n: b.nBand[i], enough: b.nBand[i] >= 300, ...entry(b.Pband[i], jk(l => l.f.P[i]), sysOf(r => r.Pband[i]))}));
    const flat = bands.filter(x => x.enough).every(x => Math.abs(x.value - P.value) <= Math.hypot(x.total, P.total));
    const insideP = Object.values(b.perTrack).filter(t => Number.isFinite(t.pOwn)).map(t => Math.abs(t.pOwn - b.P0) <= P.total);
    const dragOf = (l, t) => fitTrackDrag(S.filter(q => q.track === t), l.g.P[0], l.g.Pp?.[0] ?? l.g.P[0]);
    const cdA = entry(b.cdAMean, jk(l => mean(l.tracksLeft.map(t => dragOf(l, t).cdA))), sysOf(r => r.cdAMean));
    const drs = entry(b.drsRatio, jk(l => { const c = l.tracksLeft.map(t => dragOf(l, t)); return sum(c.map(x => x.cdALow)) / sum(c.map(x => x.cdA)); }), sysOf(r => r.drsRatio));
    const split = Math.abs(b.pIce120 - b.pIce0) / 2;
    const pIce = entry((b.pIce120 + b.pIce0) / 2, P.stat / b.car.etaDrive / b.iceF, {...Object.fromEntries(Object.entries(P.sys).map(([k, v]) => [k, v / b.car.etaDrive / b.iceF])), ersSplit: split});
    const tracks = {};
    for (const t of b.tracks) {
      const pt = b.perTrack[t], S_t = S.filter(q => q.track === t), dP = P.stat, up = fitTrackDrag(S_t, b.P0 + dP, b.Pp0 + dP), dn = fitTrackDrag(S_t, b.P0 - dP, b.Pp0 - dP);
      const c = entry(pt.cdA, Math.hypot(pt.statDrv || 0, Math.abs(up.cdA - dn.cdA) / 2), sysOf(r => r.perTrack[t]?.cdA));
      const lo = entry(pt.cdALow, Math.hypot(pt.statDrvLow || 0, Math.abs(up.cdALow - dn.cdALow) / 2), sysOf(r => r.perTrack[t]?.cdALow));
      tracks[t] = {n: pt.n, drivers: pt.drivers, cdA: c, cdALow: lo, pOwnKW: r4(pt.pOwn / 1e3)};
    }
    const insideCd = b.tracks.filter(t => Math.abs(b.perTrack[t].cdA - b.cdAMean) <= cdA.total).length / b.tracks.length;
    out[y] = {samples: b.n, samplesQuali: b.nQ, tracks: b.tracks.length, pWheel: P, pWheelPractice: Pp, pWheelInsideShare: r4(mean(insideP.map(Number))), pBands: bands, flatPv: flat,
      pIce: {...pIce, identified: false, note: 'kernel pIce from qualifying P_wheel: midpoint of the two ERS assumptions (120 kW deploying at every full-throttle point, or 0 kW above the kernel cut-off); ersSplit row = half their difference. The ICE / ERS split is not identified by speed data.'},
      cdA: {...cdA, sdAcrossTracks: r4(b.cdASd), insideShare: r4(insideCd), perTrackOnly: insideCd < 0.68}, drsRatio: drs, perTrack: tracks};
  }
  // fit-flag inputs (LAPSIM_CDA_MEASURED): per-track drag ratio = mean over measured seasons of CdA_t,y / CdA_y, with its season spread
  const ids = [...new Set(Object.values(out).flatMap(s => Object.keys(s.perTrack)))].sort();
  const dragRatio = Object.fromEntries(ids.map(id => { const r = Object.values(out).filter(s => s.perTrack[id]).map(s => s.perTrack[id].cdA.value / s.cdA.value);
    return [id, {ratio: r4(mean(r)), seasons: r.length, spread: r.length > 1 ? r4(sd(r)) : null}]; }));
  const note = mode === 'all'
    ? 'F1 wheel power and per-track drag measured from TracingInsights telemetry 2023-25: every clean push lap of qualifying and practice (amendment claude/gate-cda-measured-prereg-2026-11-23-amendment-a2.md: green, accurate, dry, within 1.02 x the driver\'s session best; session weight 1 split over drivers and laps; broken samples masked; straights only, |v2 kappa| < 6 m/s2), scripts/sim/measure-car.mjs. Evidence layer 3 (Newton on measured speed). value ± stat (track jackknife; per track: driver jackknife + pooled P) ± sys (columns). pWheel = qualifying wheel power (W); practice power fitted apart. 2026 not measured. Used only with LAPSIM_CDA_MEASURED=on.'
    : 'F1 wheel power and per-track drag measured from TracingInsights qualifying telemetry 2023-25 (each driver\'s best dry lap, broken samples masked), scripts/sim/measure-car.mjs; pre-registration claude/gate-cda-measured-prereg-2026-11-23.md. Evidence layer 3 (Newton on measured speed). value ± stat (track jackknife; per track: driver jackknife + pooled P) ± sys (columns). pWheel is power at the wheels (W). 2026 not measured. Used only with LAPSIM_CDA_MEASURED=on.';
  const outFile = process.env.LAPSIM_MEASURED_OUT || 'worker/lapsim/car-measured-data.js';
  writeFileSync(outFile, `// Generated by scripts/sim/measure-car.mjs. Do not edit by hand.\nexport const lapsimCarMeasured = ${JSON.stringify({note, pick: mode, seasons: out, dragRatio})};\n`);
  const jo = process.argv.indexOf('--json'); if (jo > 0) { mkdirSync(dirname(process.argv[jo + 1]), {recursive: true}); writeFileSync(process.argv[jo + 1], JSON.stringify({pick: mode, seasons: out, dragRatio}, null, 1)); }
  for (const [y, s] of Object.entries(out)) console.log(y, `n ${s.samples} (q ${s.samplesQuali}), ${s.tracks} tracks | P_wheel ${(s.pWheel.value / 1e3).toFixed(1)} ± ${(s.pWheel.stat / 1e3).toFixed(1)} ± ${(s.pWheel.sysTotal / 1e3).toFixed(1)} kW, inside ${s.pWheelInsideShare}`,
    s.pWheelPractice ? `| practice ${(s.pWheelPractice.value / 1e3).toFixed(1)}` : '',
    `| bands ${s.pBands.map(x => `${x.kph[0]}-${x.kph[1]}: ${(x.value / 1e3).toFixed(0)}±${(x.total / 1e3).toFixed(0)} (n ${x.n})`).join(', ')} flat ${s.flatPv}`,
    `| pIce ${(s.pIce.value / 1e3).toFixed(0)} ± ${(s.pIce.total / 1e3).toFixed(0)} kW | CdA ${s.cdA.value} ± ${s.cdA.total} (SD tracks ${s.cdA.sdAcrossTracks}, inside ${s.cdA.insideShare}) | DRS ratio ${s.drsRatio.value} ± ${s.drsRatio.total}`);
}
