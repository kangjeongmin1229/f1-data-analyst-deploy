import test from 'node:test';
import assert from 'node:assert/strict';
import {lapsimKernel} from '../worker/lapsim/kernel.js';
import {lapsimTracks} from '../worker/lapsim/tracks-data.js';
import {SERIES} from '../worker/lapsim/series.js';
import {FE_GEN4_FIXED, FE_GEN4_PRIOR, FE_GEN4_AERO, gen4Car, modeCar, powerSplit, straightLine, lapEnergy} from '../worker/lapsim/fe-gen4.js';

const K = lapsimKernel();
const env = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35});
const run = car => { const tr = K.trackFromData(lapsimTracks.monza); return {tr, r: K.simulateLap(tr, car, env)}; };

test('Gen4 stays a prior: the product entry is not released', () => {
  assert.equal(SERIES.fe.status, 'coming-soon');
});

test('axle caps force the split at 600 kW and leave a range in Race Mode', () => {
  assert.deepEqual(powerSplit(600), {frontMinKW: 250, frontMaxKW: 250, rearMinKW: 350, rearMaxKW: 350, forced: true});
  const s = powerSplit(450);
  assert.deepEqual([s.frontMinKW, s.frontMaxKW, s.rearMinKW, s.rearMaxKW, s.forced], [100, 250, 200, 350, false]);
  assert.throws(() => powerSplit(601), RangeError);
});

test('the prior car carries the regulation values and starts inside its bounds', () => {
  const c = gen4Car({aero: 'hdf', powerKW: 600});
  assert.equal(c.mass, 1046);
  assert.equal(c.pIce, 600e3);
  assert.ok(Math.abs(c.rearWeight - 0.55) < 1e-12);
  assert.equal(c.awdAboveKph, 0);
  for (const [k, p] of Object.entries(FE_GEN4_PRIOR)) assert.ok(p.lo <= p.start && p.start <= p.hi, k);
  for (const a of Object.values(FE_GEN4_AERO)) for (const k of ['clA', 'cdA']) assert.ok(a.bounds[k][0] <= a[k] && a[k] <= a.bounds[k][1]);
  assert.ok(FE_GEN4_AERO.hdf.bounds.cdA[1] <= 1.18);
  assert.throws(() => gen4Car({powerKW: 700}), RangeError);
  assert.throws(() => gen4Car({aero: 'x'}), RangeError);
});

test('straight-line check is near the published acceleration claims', () => {
  const s = straightLine(modeCar('eprix-attack'));
  assert.ok(s.t100 > 1.5 && s.t100 < 2.1, String(s.t100));
  assert.ok(s.t200 > 3.8 && s.t200 < 5.0, String(s.t200));
  assert.ok(s.vTopKph >= 335);
});

test('more power and more downforce both shorten the lap; energy stays consistent', () => {
  const q = run(modeCar('qualifying')), ua = run(modeCar('unleashed')), ep = run(modeCar('eprix')), ea = run(modeCar('eprix-attack'));
  assert.ok(q.r.lapTime < ua.r.lapTime);
  assert.ok(ea.r.lapTime < ep.r.lapTime);
  assert.ok(ep.r.vMaxKph <= 340.01);
  const e = lapEnergy(ep.r, modeCar('eprix'), ep.tr, {rho: env.rho});
  assert.ok(e.outKWh > e.netKWh && e.netKWh > 0 && e.regenFraction > 0 && e.regenFraction < 1);
  assert.ok(FE_GEN4_FIXED.raceEnergyKWh / e.netKWh > 1);
});
