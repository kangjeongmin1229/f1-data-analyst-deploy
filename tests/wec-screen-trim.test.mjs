import test from 'node:test';
import assert from 'node:assert/strict';
import {trimCar} from '../scripts/sim/calibrate-lib.mjs';

// screen S5: the trim is a no-op unless asked for, and never uses a report-only trap
test('trimCar leaves the car unchanged without trimSd, without a trap, or with a report-only trap', () => {
  const car = {cdA: 1.1};
  assert.equal(trimCar({trapKph: 300}, car, 1), car);
  assert.equal(trimCar({trimSd: 0.1, trapKph: null}, car, 1), car);
  assert.equal(trimCar({trimSd: 0.1, trapKph: 300, trapReportOnly: true}, car, 1), car);
});
