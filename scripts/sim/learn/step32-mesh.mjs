// Step 32 guards (A7 form): 5a lap change < 0.03 % when ds halves (ds → ds/2 → ds/4) on the lapsim-mesh tracks with the fitted 2025 car
// (fold-median physical parameters; refine copied from tests/lapsim-mesh.test.mjs); A2.2 energy closes within 0.1 %; 5b on the 24 tracks
// candidate max |v(ds) − v(ds/2)| ≤ max(baseline's, 0.5 km/h). 5c (table steps) does not apply: A7 has no tables.
// usage: node scripts/sim/learn/step32-mesh.mjs <median-fit.json {2025: {muY, clA, th, c, muX, muXTrac}}> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {carsFor} from '../../../worker/lapsim/scenario.js';
const [MED, OUT] = process.argv.slice(2), K = lapsimKernel(), STEP = {kernelStep: 2}, P = JSON.parse(readFileSync(MED, 'utf8'))['2025'];
const refine = (t, f) => { // copied from tests/lapsim-mesh.test.mjs
  const n = t.kappa.length, m = n * f;
  const rs = a => { if (!a || a === true) return a; const o = new (a.constructor)(m); for (let i = 0; i < m; i++) { const x = i / f, i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, w = x - Math.floor(x); let a0 = a[i0], a1 = a[i1];
    if (a === t.heading) { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; a1 = a0 + d; }
    o[i] = a.constructor === Uint8Array ? a[i0] : a0 + w * (a1 - a0); } return o; };
  return {...t, ds: t.ds / f, kappa: rs(t.kappa), grade: rs(t.grade), heading: rs(t.heading), mu: rs(t.mu), vScale: rs(t.vScale), aeroLow: rs(t.aeroLow)};
};
const car = id => { const s = carsFor(id)['2025'].car, cdA = s.cdA * P.th / 1.2820; return {...s, pIce: 540000, muY: P.muY, muX: P.muX, muXTrac: P.muXTrac, clA: P.clA, clALow: P.clA * 4.6 / 8, cdA, cdALow: cdA * (1 - P.c)}; };
const sum = a => a.reduce((x, y) => x + y, 0), res = {mesh5a: [], energy: [], cont5b: []};
for (const id of ['monte-carlo', 'suzuka', 'monza', 'jeddah', 'silverstone', 'spa-francorchamps', 'hungaroring', 'singapore']) {
  const t = K.trackFromData(lapsimTracks[id]), [a, b, c] = [1, 2, 4].map(f => K.simulateLap(refine(t, f), car(id), {}, STEP).lapTime);
  res.mesh5a.push({id, laps: [a, b, c], ok: Math.abs(b - a) / a < 3e-4 && Math.abs(c - b) / b < 3e-4});
  const r = K.simulateLap(t, car(id), {}, STEP), e = r.energy, tol = x => Math.max(1, 1e-3 * Math.abs(x));
  res.energy.push({id, ok: !r.flow || (Math.abs(sum(r.flow.dep) - e.deployJ) <= tol(e.deployJ) && Math.abs(sum(r.flow.brk) + sum(r.flow.thr) - e.regenJ) <= tol(e.regenJ) && e.deployJ <= e.budgetJ * 1.001)});
}
const TRK = [...new Set(Object.values(JSON.parse(readFileSync('scripts/sim/data/step32/traces-top10.json', 'utf8')).events).filter(e => e.year <= 2025).map(e => e.track))].sort();
for (const id of TRK) { const t = K.trackFromData(T[id]), jump = c => { const r1 = K.simulateLap(t, c, {}), r2 = K.simulateLap(refine(t, 2), c, {}); let m = 0; for (let i = 0; i < r1.v.length; i++) m = Math.max(m, Math.abs(r1.v[i] - r2.v[2 * i]) * 3.6); return m; };
  const jc = jump(car(id)), jb = jump(carsFor(id)['2025'].car); res.cont5b.push({id, cand_kph: jc, base_kph: jb, ok: jc <= Math.max(jb, 0.5)}); }
res.pass = [res.mesh5a, res.energy, res.cont5b].every(a => a.every(x => x.ok));
writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log('mesh/continuity/energy pass', res.pass);
