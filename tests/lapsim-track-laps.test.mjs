import test from 'node:test';
import assert from 'node:assert/strict';
import {carType, bestPerType} from '../scripts/sim/fetch-track-laps.mjs';

test('an LMH in IMSA GTP is an LMH lap; the best lap is kept per car type, not per class', () => {
  assert.equal(carType('imsa', 'GTP', 'Aston Martin'), 'lmh');
  assert.equal(carType('imsa', 'GTP', 'Cadillac'), 'lmdh');
  assert.equal(carType('wec', 'HYPERCAR', 'Ferrari'), 'lmh');
  assert.equal(carType('wec', 'HYPERCAR', 'Porsche'), 'lmdh');
  assert.equal(carType('imsa', 'GTD PRO', 'BMW'), 'gtdpro');
  const row = (n, m, t, x = {}) => ({NUMBER: n, CLASS: 'GTP', MANUFACTURER: m, LAP_TIME: t, FLAG_AT_FL: 'GF', CROSSING_FINISH_LINE_IN_PIT: '', S1: '22.951', S2: '44.192', S3: '27.370', TOP_SPEED: '324.3', ...x});
  const b = bestPerType('imsa', [row('10', 'Cadillac', '1:34.513'), row('23', 'Aston Martin', '1:35.857'), row('23', 'Aston Martin', '1:35.100', {CROSSING_FINISH_LINE_IN_PIT: 'B'}), row('23', 'Aston Martin', '1:34.000', {FLAG_AT_FL: 'FCY'})]);
  assert.equal(b.lmdh.lap, 94.513); assert.equal(b.lmdh.car, '10');
  assert.equal(b.lmh.lap, 95.857); assert.deepEqual(b.lmh.sectors, [22.951, 44.192, 27.37]); // pit lap and yellow lap are not clean laps
});
