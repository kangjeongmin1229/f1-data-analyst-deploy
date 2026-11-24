import test from 'node:test';
import assert from 'node:assert/strict';
import {diff} from '../scripts/sim/pipeline-report.mjs';
import {lapsimCalibration as cal} from '../worker/lapsim/calibration-data.js';

test('pipeline report: the shipped calibration reproduces itself', () => {
  const d = diff(cal, structuredClone(cal));
  assert.equal(d.identical, true);
  assert.ok(d.heldOut.all.n > 0);
});

test('pipeline report: a moved car parameter and held-out row are listed', () => {
  const c = structuredClone(cal), y = Object.keys(c.seasons).find(k => c.seasons[k].holdout?.tracks?.length);
  c.seasons[y].car.cdA += 0.01; c.seasons[y].holdout.tracks[0].errorSec += 0.1;
  const d = diff(cal, c);
  assert.equal(d.identical, false);
  assert.deepEqual(d.changedCarParams.map(x => x.where + ' ' + x.param), [`f1 ${y} cdA`]);
  assert.equal(d.changedRows.length, 1);
});

test('pipeline report: paired harm UB is 0 for the same calibration and fails when every row is 0.2 pp worse', async () => {
  const {pairedHarm} = await import('../scripts/sim/pipeline-report.mjs');
  const {heldOut} = await import('../scripts/sim/exp-compare.mjs');
  const a = heldOut(cal), worse = Object.fromEntries(Object.entries(a).map(([k, e]) => [k, e + Math.sign(e || 1) * 0.2]));
  const same = pairedHarm(a, a), bad = pairedHarm(a, worse);
  assert.equal(same.f1.ub95Pp, 0); assert.equal(same.f1.pass, true); assert.equal(same.wec.pass, true);
  assert.equal(bad.f1.pass, false); assert.ok(Math.abs(bad.wec.meanPp - 0.2) < 1e-9);
});
