import test from 'node:test';
import assert from 'node:assert/strict';
import {delayLow, lapsimKernel} from '../worker/lapsim/kernel.js';
import {biasCut} from '../scripts/sim/learn/step32b-verdict.mjs';
import {lapsimAllTracks as T} from '../worker/lapsim/tracks.js';
import {carsFor} from '../worker/lapsim/scenario.js';

test('delayLow: first k points of every low-drag run are closed, wrap-around run included; unset = same array', () => {
  const a = Uint8Array.from([1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1]);
  assert.deepEqual(Array.from(delayLow(a, 10, 5)), [0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0]);
  assert.equal(delayLow(a, 0, 5), a); assert.equal(delayLow(a, undefined, 5), a);
  const all = new Uint8Array(4).fill(1); assert.equal(delayLow(all, 10, 5), all);
});

test('car.drsDelayM: unset lap unchanged, a delay makes a DRS lap slower', () => {
  const K = lapsimKernel(), d = T.monza, car = carsFor('monza')['2025'].car, tr = K.trackFromData(d);
  const t0 = K.simulateLap(tr, car, {}).lapTime, t1 = K.simulateLap(tr, {...car, drsDelayM: 54}, {}).lapTime;
  assert.equal(K.simulateLap(tr, {...car}, {}).lapTime, t0); assert.ok(t1 > t0);
});

test('biasCut: halving the bias on every event gives cut 0.5', () => {
  const base = [], cand = [];
  for (let e = 0; e < 10; e++) for (let k = 0; k < 3; k++) { const x = -0.3 + 0.01 * k + 0.005 * e; base.push({event: 'e' + e, err: x}); cand.push({event: 'e' + e, err: x / 2}); }
  const r = biasCut(base, cand, 200, 7); assert.equal(r.cut, 0.5); assert.ok(r.cutLb95 > 0.49 && r.pass);
});
