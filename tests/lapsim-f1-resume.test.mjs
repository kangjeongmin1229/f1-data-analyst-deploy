import test from 'node:test';
import assert from 'node:assert/strict';
import {bcdConverged, holdoutBCD} from '../scripts/sim/joint-bcd.mjs';

test('warm-started folds may stop after two rounds; the default minimum stays five', () => {
  assert.equal(bcdConverged([10, 9.95]), false);
  assert.equal(bcdConverged([10, 9.95], 2), true);
  assert.equal(bcdConverged([10, 9.5], 2), false); // still falling by 5 %
  assert.equal(bcdConverged([10], 2), false);
});

test('finished folds are read from the cache and not fitted again', async () => {
  const laps = ['a', 'b', 'c', 'd'].map(name => ({name}));
  const stored = f => ({errors: [{name: laps[f].name, dt: f, pct: f + 1}]});
  const seen = [];
  const h = await holdoutBCD([{key: 2026, laps}], 2026, {cache: {get: f => (seen.push(f), stored(f)), put: () => assert.fail('no fit expected')}});
  assert.deepEqual(seen, [0, 1, 2, 3]);
  assert.equal(h.n, 4);
  assert.ok(Math.abs(h.rmsPct - Math.sqrt(30 / 4)) < 1e-12);
});
