// Step 32 guards 5a–5c (v2 §5) + A2.2 energy unit check, on the all-track tables (precheck.json) with the fold-median θ and c_DRS.
// 5a: lap change < 0.03 % when ds halves (ds → ds/2 → ds/4) on the lapsim-mesh tracks, refine copied from tests/lapsim-mesh.test.mjs;
//     2025 car + 2025 tables, and 2026 car + 2026 tables (from a 2026 fold file, all tracks but one; report-only group).
// 5b: on the 24 step 31/32 tracks, candidate max |v(ds) − v(ds/2)| at shared points ≤ max(baseline's on that track, 0.5 km/h).
// 5c: each table: |Δa| between adjacent 1 km/h points ≤ 0.05 g.  A2.2: ERS flows close within 0.1 % and deploy ≤ budget·1.001.
// usage: node scripts/sim/learn/step32-mesh.mjs <precheck.json> <median-fit.json {2025: {th, c}}> <fold26 file> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {carsFor} from '../../../worker/lapsim/scenario.js';
const [PRE, MED, F26, OUT] = process.argv.slice(2);
const K = lapsimKernel(), STEP = {kernelStep: 2}, pre = JSON.parse(readFileSync(PRE, 'utf8')), med = JSON.parse(readFileSync(MED, 'utf8')), f26 = JSON.parse(readFileSync(F26, 'utf8'));
const refine = (t, f) => { // copied from tests/lapsim-mesh.test.mjs
  const n = t.kappa.length, m = n * f;
  const rs = a => { if (!a || a === true) return a; const o = new (a.constructor)(m); for (let i = 0; i < m; i++) { const x = i / f, i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, w = x - Math.floor(x); let a0 = a[i0], a1 = a[i1];
    if (a === t.heading) { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; a1 = a0 + d; }
    o[i] = a.constructor === Uint8Array ? a[i0] : a0 + w * (a1 - a0); } return o; };
  return {...t, ds: t.ds / f, kappa: rs(t.kappa), grade: rs(t.grade), heading: rs(t.heading), mu: rs(t.mu), vScale: rs(t.vScale), aeroLow: rs(t.aeroLow)};
};
const GRID = Array.from({length: 77}, (_, i) => i * 5), CDA_REF = 1.2820, LOWR = 4.6 / 8;
const ll = d => ({clA: d.clA, clALow: d.clA * LOWR, mu0: d.mu0, dmu: -5e-5, fz0: 3000});
const tabCar = (c, tb, dec) => ({...c, lateralCap: {kind: 'table', kph: GRID, ay: tb.lat.a, rhoRef: 1.2, lowLoad: ll(dec)},
  decoupled: {brake: {kph: GRID, a: tb.brk.a}, trac: {kph: GRID, a: tb.trc.a}, ...(tb.trcLow ? {tracLow: {kph: GRID, a: tb.trcLow.a}} : {}), lowLoad: ll(dec)}});
const s25 = pre.seasons['2025'], m25 = med['2025'];
const car25 = id => { const c = carsFor(id)['2025'].car, k = m25.th / CDA_REF; return tabCar({...c, pIce: 540000, cdA: c.cdA * k, cdALow: c.cdA * k * (1 - m25.c), clALow: c.clA * LOWR}, s25.tables, s25.decomposition); };
const car26 = id => tabCar({...carsFor(id)['2026'].car, cdA: f26.drag.cdA, cdALow: f26.drag.cdALow}, f26.tables, f26.decomposition);
const sum = a => a.reduce((x, y) => x + y, 0);
const res = {mesh5a: [], energy: [], cont5b: [], tables5c: []};
for (const [name, carOf] of [['2025 + tables', car25], ['2026 + tables', car26]]) for (const id of ['monte-carlo', 'suzuka', 'monza', 'jeddah', 'silverstone', 'spa-francorchamps', 'hungaroring', 'singapore']) {
  const t = K.trackFromData(lapsimTracks[id]), [a, b, c] = [1, 2, 4].map(f => K.simulateLap(refine(t, f), carOf(id), {}, STEP).lapTime);
  const d1 = Math.abs(b - a) / a, d2 = Math.abs(c - b) / b; res.mesh5a.push({car: name, id, laps: [a, b, c], ok: d1 < 3e-4 && d2 < 3e-4});
  const r = K.simulateLap(t, carOf(id), {}, STEP), e = r.energy, tol = x => Math.max(1, 1e-3 * Math.abs(x));
  res.energy.push({car: name, id, ok: !r.flow || (Math.abs(sum(r.flow.dep) - e.deployJ) <= tol(e.deployJ) && Math.abs(sum(r.flow.brk) + sum(r.flow.thr) - e.regenJ) <= tol(e.regenJ) && e.deployJ <= e.budgetJ * 1.001)});
}
const TRK = [...new Set(Object.values(JSON.parse(readFileSync('scripts/sim/data/step32/traces-top10.json', 'utf8')).events).filter(e => e.year <= 2025).map(e => e.track))].sort();
for (const id of TRK) {
  const t = K.trackFromData(T[id]), jump = car => { const r1 = K.simulateLap(t, car, {}), r2 = K.simulateLap(refine(t, 2), car, {}); let m = 0; for (let i = 0; i < r1.v.length; i++) m = Math.max(m, Math.abs(r1.v[i] - r2.v[2 * i]) * 3.6); return m; };
  const jc = jump(car25(id)), jb = jump(carsFor(id)['2025'].car); res.cont5b.push({id, cand_kph: jc, base_kph: jb, ok: jc <= Math.max(jb, 0.5)});
}
for (const [nm, tbs] of [['2023', pre.seasons['2023'].tables], ['2024', pre.seasons['2024'].tables], ['2025', s25.tables], ['2026', f26.tables]]) for (const [k, tb] of Object.entries(tbs)) {
  let m = 0; for (let v = 0; v < 380; v++) { const f = x => { const i = Math.min(75, Math.floor(x / 5)), w = (x - 5 * i) / 5; return tb.a[i] + w * (tb.a[i + 1] - tb.a[i]); }; m = Math.max(m, Math.abs(f(v + 1) - f(v)) / 9.81); }
  res.tables5c.push({season: nm, table: k, max_step_g: m, ok: m <= 0.05});
}
res.pass = Object.values(res).every(a => !Array.isArray(a) || a.every(x => x.ok));
writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log('mesh/continuity/energy pass', res.pass);
