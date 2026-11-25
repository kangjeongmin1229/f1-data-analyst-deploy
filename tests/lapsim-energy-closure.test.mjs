// Energy closure per lap (central step 35, 2026-11-25): the kernel's own forces must do the work its speed trace shows, with one mass.
// On every step that follows the braking curve or the drive curve, (tyre or power force − drag − rolling)·ds is compared with
// m_eff·Δ(v²)/2 + m·g·Δh (m_eff = mass × inertia factor). The braking pass divided by the bare mass: 1.2–4.1 % of the drive work
// (F1, GT3, FE; Hypercar 0.2–0.8 %, mostly on its deceleration envelope). The check's trapezoid sum is second order in the step
// (0.122 → 0.025 → −0.003 % at GT3 Silverstone), so it runs on the mesh test's ds/2 grid.
import test from 'node:test';
import assert from 'node:assert/strict';
import {lapsimKernel} from '../worker/lapsim/kernel.js';
import {lapsimTracks} from '../worker/lapsim/tracks-data.js';
import {lapsimCalibration as C} from '../worker/lapsim/calibration-data.js';
import {FE_GENS} from '../worker/lapsim/fe-cars.js';

const K = lapsimKernel(), G = 9.81;
const refine2 = t => { const n = t.kappa.length, m = 2 * n;
  const rs = a => { if (!a || a === true) return a; const o = new (a.constructor)(m); for (let i = 0; i < m; i++) { const i0 = (i >> 1) % n, i1 = (i0 + 1) % n, w = (i & 1) / 2; let a0 = a[i0], a1 = a[i1];
    if (a === t.heading) { let d = a1 - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; a1 = a0 + d; }
    o[i] = a.constructor === Uint8Array ? a[i0] : a0 + w * (a1 - a0); } return o; };
  return {...t, ds: t.ds / 2, kappa: rs(t.kappa), grade: rs(t.grade), heading: rs(t.heading), mu: rs(t.mu), vScale: rs(t.vScale), aeroLow: rs(t.aeroLow)}; };
export function closure(track, car) {
  let P; const r = K.simulateLap(track, car, {}, {kernelStep: 2, probe: p => { P = p; }}), v = r.v, n = v.length, ds = track.ds;
  const cls = new Int8Array(n), fm = new Float64Array(n), kin = new Float64Array(n), fdr = new Float64Array(n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (r.limit[i] === 0 || Math.max(v[i], v[j]) > (car.vMax ?? 1e9) - 0.05) continue;
    const b0 = P.brake(v[i], i), b1 = P.brake(v[j], j), d0 = P.drive(v[i], i), d1 = P.drive(v[j], j);
    // decel envelope (brakeEnv / brakeDecelMax) instead of the tyre: not a tyre-limited step
    const env = [[b0, i], [b1, j]].some(([q, k]) => q.a < (q.fx + q.res) / P.mEff + G * P.sinG[k] * P.m / P.mEff - 1e-9);
    const fB = -0.5 * (b0.fx + b0.res + b1.fx + b1.res), fD = 0.5 * (d0.fx - d0.res + d1.fx - d1.res);
    kin[i] = P.mEff * (v[j] * v[j] - v[i] * v[i]) / (2 * ds) + P.m * G * 0.5 * (P.sinG[i] + P.sinG[j]);
    // the limit flag says only that speed fell (drag slows a car at full throttle), so the step goes to the curve whose force is nearer
    const brake = Math.abs(kin[i] - fB) < Math.abs(kin[i] - fD); fm[i] = brake ? fB : fD; fdr[i] = 0.5 * (d0.fx + d1.fx);
    if (!(brake && env) && Math.abs(kin[i] - fm[i]) <= 0.25 * Math.abs(fm[i])) cls[i] = brake ? -1 : 1; }
  let wDrive = 0, res = 0, steps = 0;
  for (let i = 0; i < n; i++) { const c = cls[i]; if (!c || cls[(i + n - 1) % n] !== c || cls[(i + 1) % n] !== c) continue; // event points: a neighbour on another curve
    if (c > 0) wDrive += fdr[i] * ds; res += (fm[i] - kin[i]) * ds; steps++; }
  return {residualPct: 100 * res / wDrive, steps, lapTime: r.lapTime};
}
// the closure is about the mass bookkeeping, so ERS strategy is off (FE drives on pIce, its battery)
const noErs = c => ({...c, ers: {}});
const CARS = {'F1 2025': noErs(C.seasons['2025'].car), 'F1 2026': noErs(C.seasons['2026'].car), 'Hypercar LMH': noErs(C.series.wec.lmh['2025'].car),
  'GT3': noErs(C.series.wec.lmgt3['2025'].car), 'FE Gen3 Evo': noErs(FE_GENS['fe-gen3evo'].car)};
for (const [name, car] of Object.entries(CARS)) test(`energy closes per lap within 0.1 % of the drive work (${name})`, () => {
  for (const id of ['monza', 'suzuka', 'monte-carlo', 'spa-francorchamps', 'silverstone']) {
    const c = closure(refine2(K.trackFromData(lapsimTracks[id])), car);
    assert.ok(c.steps > 500 && Math.abs(c.residualPct) <= 0.1, `${name} ${id}: residual ${c.residualPct.toFixed(3)} % on ${c.steps} steps`);
  }
});

// Regen (central 2026-11-25 11:28): regen is a braking force, so the braking power it draws from is m·k·(−Δv²)/(2 ds)·v̄, the same
// m_eff as the braking pass. On steps that follow the braking curve for the whole step, the kernel's recovered energy must equal
// min(regenMax, share·η·m_eff·(−Δv²)/(2 ds)·v̄)·dt. With the bare mass: −1.8 to −2.7 % (F1 2026), −0.3 to −1.3 % (Hypercar LMH).
// FE recovers in fe-gen4.js lapEnergy() (already m·k); the kernel FE car has no ERS channel.
function regenClosure(track, car) {
  let P; const r = K.simulateLap(track, car, {}, {kernelStep: 2, probe: p => { P = p; }}), v = r.v, n = v.length, ds = track.ds, e = car.ers;
  const dw = i => v[i] * v[i] - v[(i + 1) % n] ** 2;
  let kern = 0, want = 0, steps = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n;
    // inside a braking zone (the first step is split at the meeting point, the kernel books regen only on its braking part)
    if (!(dw(i) > 1e-6) || dw((i + n - 1) % n) < 0.5 * dw(i) || dw(j) < 0.5 * dw(i) || r.flow.brk[i] <= 0) continue;
    const aB = 0.5 * (P.brake(v[i], i).a + P.brake(v[j], j).a); // braking-curve deceleration (tyre or decel envelope)
    if (Math.abs(dw(i) / (2 * ds) - aB) > 0.02 * aB) continue; // part of the step on the lateral limit or the drive curve
    const dt = (j ? r.time[j] : r.lapTime) - r.time[i], vm = 0.5 * (v[i] + v[j]);
    want += Math.min(e.regenMax, (e.regenShare ?? 0.6) * P.mEff * dw(i) / (2 * ds) * vm * (e.etaRegen ?? 0.9)) * dt; kern += r.flow.brk[i]; steps++; }
  return {residualPct: 100 * (kern - want) / want, steps};
}
const REGEN = {'F1 2026': C.seasons['2026'].car, 'Hypercar LMH': C.series.wec.lmh['2025'].car, 'LMDh': C.series.wec.lmdh['2025'].car};
for (const [name, car] of Object.entries(REGEN)) test(`braking regen uses m_eff: recovered energy within 0.1 % (${name})`, () => {
  for (const id of ['monza', 'suzuka', 'monte-carlo', 'spa-francorchamps', 'silverstone']) {
    const c = regenClosure(K.trackFromData(lapsimTracks[id]), car);
    assert.ok(c.steps > 15 && Math.abs(c.residualPct) <= 0.1, `${name} ${id}: regen residual ${c.residualPct.toFixed(3)} % on ${c.steps} steps`);
  }
});
