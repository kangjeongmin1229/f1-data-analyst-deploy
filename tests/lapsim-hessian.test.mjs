import test from 'node:test';
import assert from 'node:assert/strict';
import {hessianAt} from '../scripts/sim/calibrate-lib.mjs';

test('hessianAt: quadratic → exact H, covariance = H⁻¹, correlation and condition number', () => {
  const f = x => 3 * (x[0] - 1) ** 2 + (x[1] + 2) ** 2 + 0.5 * x[0] * x[1];
  const r = hessianAt(f, [1, -2]);
  assert.ok(Math.abs(r.H[0][0] - 6) < 1e-6 && Math.abs(r.H[1][1] - 2) < 1e-6 && Math.abs(r.H[0][1] - 0.5) < 1e-6);
  const det = 6 * 2 - 0.25;
  assert.ok(Math.abs(r.cov[0][0] - 2 / det) < 1e-6 && Math.abs(r.cov[0][1] + 0.5 / det) < 1e-6);
  assert.ok(Math.abs(r.corr[0][1] - (-0.5 / det) / Math.sqrt((2 / det) * (6 / det))) < 1e-6);
  const l1 = 4 + Math.sqrt(4 + 0.25), l2 = 4 - Math.sqrt(4 + 0.25);
  assert.ok(Math.abs(r.cond - l1 / l2) < 1e-6);
});
