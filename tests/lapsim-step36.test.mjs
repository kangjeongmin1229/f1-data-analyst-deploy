import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCar, lapScore} from '../scripts/sim/joint-bcd.mjs';
import {lapsimKernel} from '../worker/lapsim/kernel.js';
import {lapsimAllTracks as T} from '../worker/lapsim/tracks.js';
import {carsFor} from '../worker/lapsim/scenario.js';

const K = lapsimKernel(), car = carsFor('monza')['2025'].car, track = K.trackFromData(T.monza);

test('step 36: buildCar keeps low-drag CdA = drsRatio × CdA; unset = as before', () => {
  const g = {base: {...car, drsRatio: 0.778}, params: [{key: 'cdA', path: 'cdA', base: 1.5}]};
  const {car: c} = buildCar(g, [Math.log(1.6 / 1.5)]); assert.ok(Math.abs(c.cdA - 1.6) < 1e-12 && Math.abs(c.cdALow - 0.778 * 1.6) < 1e-12);
  const {car: d} = buildCar({base: {...car}, params: [{key: 'cdA', path: 'cdA', base: 1.5}]}, [0]); assert.equal(d.cdALow, car.cdALow);
});

test('step 36: carMod scales CdA and power per lap; iceDensityOff ignores the ICE air-density cut', () => {
  const env = K.conditionsFromWeather({pressureHpa: 780, airTempC: 25}), l = {track, env, obs: null, lapSeconds: 80}, o = {wTime: 2}, f = {grip: 1, drag: 1};
  const t0 = lapScore(l, car, f, o).res.lapTime, t1 = lapScore({...l, carMod: {cd: 1, p: 1, iceOff: false}}, car, f, o).res.lapTime;
  assert.equal(t0, t1);
  assert.ok(lapScore({...l, carMod: {cd: 1.1, p: 1, iceOff: false}}, car, f, o).res.lapTime > t0);
  assert.ok(lapScore({...l, carMod: {cd: 1, p: 1, iceOff: true}}, car, f, o).res.lapTime < t0); // thin air: no ICE cut is faster
  const {delayLow} = K; const a = Uint8Array.from([1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1]);
  assert.deepEqual(Array.from(delayLow(a, 10, 5)), [0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0]); assert.equal(delayLow(a, undefined, 5), a);
});
