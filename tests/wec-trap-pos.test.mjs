import test from 'node:test';
import assert from 'node:assert/strict';
import {trapAt} from '../scripts/sim/wec-trap-pos.mjs';
import {trapSpeed} from '../scripts/sim/calibrate-lib.mjs';

test('trap positions from the Al Kamel timing-line table', () => {
  assert.deepEqual(trapAt('spa-francorchamps', 2025), {m: 2243.5, status: 'sourced'});
  assert.equal(trapAt('austin', 2026).m, 3568); // same printed distance in every published season → carried
  assert.equal(trapAt('sakhir', 2026), null); // 625 / 650 / 650: not identical → no carry-forward
  assert.equal(trapAt('catalunya', 2026), null);
});

test('trap speed = peak of the straight around the printed point, wraps the lap', () => {
  const v = Float64Array.from({length: 100}, (_, i) => i < 50 ? i : 100 - i); // ds 10 m: peak 50 at 500 m
  assert.equal(trapSpeed(v, 10, 450, 100), 50);
  assert.equal(trapSpeed(v, 10, 450, 20), 47);
  assert.equal(trapSpeed(v, 10, 980, 50), 7); // indices 93..103 → 93..99 and 0..3 (wrap)
});

import {sectorResid} from '../scripts/sim/calibrate-lib.mjs';
import {sectorSpec, sectorsOk, weight} from '../scripts/sim/wec-sector-lines.mjs';

test('sector shape residual removes the lap error (step 34 V1 = step 21 r1 §3)', () => {
  // uniform 10 m/s on a 1000 m lap, ds 10: sim time at 300 m = 30 s, at 600 m = 60 s, lap 100 s
  const res = {lapTime: 100, time: Float64Array.from({length: 101}, (_, i) => i)};
  const r = sectorResid(res, 10, 110, {real: [36.3, 36.3, 37.4], lines: [330, 660]}) // real = sim × 1.1: same shape;
  assert.ok(Math.abs(r[0]) < 1e-9 && Math.abs(r[1]) < 1e-9, JSON.stringify(r));
});

test('frozen sector weights and seasons', () => {
  assert.equal(sectorSpec('lmh', 'monza', 2026), null);
  assert.equal(sectorSpec('lmh', 'lusail', 2026), null);
  assert.deepEqual(sectorSpec('lmgt3', 'imola', 2026).lines, [1214, 2728]);
  assert.ok(Math.abs(weight(0.10) - 1) < 1e-12);
  assert.ok(sectorsOk(98.359, [35.705, 33.082, 29.572]) && !sectorsOk(98.359, [35.705, 33.082]));
});

test('step 34b mapping fix: Sakhir trap on our main straight (description-constrained), measured values untouched', () => {
  assert.deepEqual(trapAt('sakhir', 2025), {m: 561, status: 'geometry fix', printed: 650});
  assert.equal(trapAt('sakhir', 2023).m, 536);
  assert.equal(trapAt('interlagos', 2025).m, 125); // no change
});
