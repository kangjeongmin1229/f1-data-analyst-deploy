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
import {applyRules} from '../worker/lapsim/cars.js';
import {lapEnergy} from '../worker/lapsim/fe-gen4.js';

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

// Regen (central 2026-11-25 11:28 and 12:25): regen recovers the tyre (brake) part of the braking force only, F_t = m·k·a − drag −
// rolling − m·g·sinθ (same m_eff as the braking pass; drag and rolling energy is dissipated). On steps that follow the braking curve
// for the whole step, the kernel's recovered energy must equal ∫ min(regenMax, share·F_t·v̄)·η dt.
function regenClosure(track, car) {
  let P; const r = K.simulateLap(track, car, {}, {kernelStep: 2, probe: p => { P = p; }}), v = r.v, n = v.length, ds = track.ds, e = car.ers;
  const dw = i => v[i] * v[i] - v[(i + 1) % n] ** 2;
  let kern = 0, want = 0, steps = 0, below = 0;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n;
    // inside a braking zone (the first step is split at the meeting point, the kernel books regen only on its braking part)
    if (!(dw(i) > 1e-6) || dw((i + n - 1) % n) < 0.5 * dw(i) || dw(j) < 0.5 * dw(i) || r.flow.brk[i] <= 0) continue;
    const aB = 0.5 * (P.brake(v[i], i).a + P.brake(v[j], j).a); // braking-curve deceleration (tyre or decel envelope)
    if (Math.abs(dw(i) / (2 * ds) - aB) > 0.02 * aB) continue; // part of the step on the lateral limit or the drive curve
    const dt = (j ? r.time[j] : r.lapTime) - r.time[i], vm = 0.5 * (v[i] + v[j]);
    // the tyre (brake) part of the deceleration force: m·k·a − drag − rolling − m·g·sinθ (drag and rolling energy is dissipated)
    const fT = P.mEff * dw(i) / (2 * ds) - 0.5 * (P.brake(v[i], i).res + P.brake(v[j], j).res) - P.m * 9.81 * 0.5 * (P.sinG[i] + P.sinG[j]);
    const pw = (e.regenShare ?? 0.6) * Math.max(0, fT) * vm * (e.etaRegen ?? 0.9); if (pw < e.regenMax) below++;
    want += Math.min(e.regenMax, pw) * dt; kern += r.flow.brk[i]; steps++; }
  return {residualPct: 100 * (kern - want) / want, steps, below};
}
// Before the fix (regen from the whole deceleration, drag and rolling included): F1 2026 +5.2 to +9.6 %, 2027 car +5.3 to +9.5 %,
// LMH +0.3 to +1.9 %. LMDh passes either way: its rear regen sits at the cap on these steps (see the cap source in series.js).
const REGEN = {'F1 2026': C.seasons['2026'].car, '2027 car': applyRules(C.seasons['2026'].car, 2027), 'Hypercar LMH': C.series.wec.lmh['2025'].car, 'LMDh': C.series.wec.lmdh['2025'].car};
for (const [name, car] of Object.entries(REGEN)) test(`braking regen uses m_eff: recovered energy within 0.1 % (${name})`, () => {
  for (const id of ['monza', 'suzuka', 'monte-carlo', 'spa-francorchamps', 'silverstone']) {
    const c = regenClosure(K.trackFromData(lapsimTracks[id]), car);
    assert.ok(c.steps > 15 && Math.abs(c.residualPct) <= 0.1, `${name} ${id}: regen residual ${c.residualPct.toFixed(3)} % on ${c.steps} steps`);
  }
});

// FE (central 2026-11-25 12:25): the kernel's FE car has no battery channel; FE energy is fe-gen4.js lapEnergy(). On the same kernel lap,
// lapEnergy() must agree with the energy of the kernel's own forces (m·k·a + drag + rolling + m·g·sinθ from opts.probe, the drive aero
// accelerating and the corner aero braking, as the kernel): battery out, regen, net within 0.5 %. With its old default air density
// 1.225 (the lap is run at 1.18) net was up to +0.39 % off; now ≤ 0.1 %.
test('FE: lapEnergy() agrees with the kernel lap within 0.5 % (out, regen, net; Gen3 Evo and Gen4, 5 tracks)', () => {
  for (const key of ['fe-gen3evo', 'fe-gen4']) for (const id of ['monza', 'monte-carlo', 'suzuka', 'silverstone', 'spa-francorchamps']) {
    const car = FE_GENS[key].car, tr = K.trackFromData(lapsimTracks[id]); let P;
    const r = K.simulateLap(tr, car, {}, {kernelStep: 2, probe: p => { P = p; }}), v = r.v, n = v.length, ds = tr.ds, rg = car.regen;
    let out = 0, reg = 0;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n, dt = (j ? r.time[j] : r.lapTime) - r.time[i], vm = 0.5 * (v[i] + v[j]), a = (v[j] ** 2 - v[i] ** 2) / (2 * ds);
      const q = a >= 0 ? P.drive : P.brake, F = P.mEff * a + 0.5 * (q(v[i], i).res + q(v[j], j).res) + P.m * G * 0.5 * (P.sinG[i] + P.sinG[j]);
      if (F >= 0) out += Math.min(car.pIce, F * vm / car.etaDrive) * dt; else reg += Math.min(rg.maxW, rg.share * -F * vm * rg.eta) * dt; }
    const e = lapEnergy(r, car, tr), k = 1 / 3.6e6;
    for (const [name, x, y] of [['out', e.outKWh, out * k], ['regen', e.regenKWh, reg * k], ['net', e.netKWh, (out - reg) * k]])
      assert.ok(Math.abs(x / y - 1) <= 5e-3, `${key} ${id} ${name}: lapEnergy ${x.toFixed(4)} vs kernel ${y.toFixed(4)} kWh`);
  }
});

// LMDh light braking (central 2026-11-25 13:48): at full braking the LMDh rear regen sits at its 50 kW cap, so the test above cannot see the
// formula. With the deceleration held to 3 m/s² (brakeDecelMax, a lift-and-brake zone) most braking steps stay below the cap. The old
// formula (whole deceleration, drag included) gave +40 to +113 %; now within 0.1 %.
test('braking regen, LMDh light braking below the cap: recovered energy within 0.1 %', () => {
  const car = {...C.series.wec.lmdh['2025'].car, brakeDecelMax: 3};
  for (const id of ['monza', 'suzuka', 'monte-carlo', 'spa-francorchamps', 'silverstone']) {
    const c = regenClosure(K.trackFromData(lapsimTracks[id]), car);
    assert.ok(c.below > 0.5 * c.steps && Math.abs(c.residualPct) <= 0.1, `LMDh light ${id}: residual ${c.residualPct.toFixed(3)} % on ${c.steps} steps, ${c.below} below the cap`);
  }
});

// The Hypercar regen caps and their sources (central 2026-11-25 12:25; see the comments in worker/lapsim/series.js).
test('Hypercar regen caps: LMH 200 kW (front MGU rule), LMDh 50 kW assumed (no published rule; Equity Model not public)', () => {
  // LMH: 2024 Le Mans Hypercar Technical Regulations (FIA/ACO, WMSC 2023-10-19) Art. 5.3.2: "The electrical DC power of the MGU-K
  // must not exceed 200 kW." (DC, both directions; the kernel's regenMax is a DC limit)
  for (const y of ['2025', '2026']) assert.equal(C.series.wec.lmh[y].car.ers.regenMax, 200e3);
  // LMDh: LMDh TR Art. 5.3.10 d) "Regeneration power is subject to conditions dictated by Equity Model"; Bosch: 50 kW drive, up to
  // 200 kW recuperation. 50 kW is the shipped prior: a change to 200 kW is a model change (refit), not a data fix.
  for (const y of ['2025', '2026']) assert.equal(C.series.wec.lmdh[y].car.ers.regenMax, 50e3);
});
