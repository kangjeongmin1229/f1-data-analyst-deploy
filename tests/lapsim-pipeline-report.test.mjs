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

test('FE ship rule: per-row event-hidden paired harm from fe-fit.json; identical fit passes, a worse fit fails', async () => {
  const {feHarm, feHeldOut, pairedHarm} = await import('../scripts/sim/pipeline-report.mjs');
  const fit = JSON.parse((await import('node:fs')).readFileSync('scripts/sim/data/learn/fe-fit.json', 'utf8'));
  assert.equal(Object.keys(feHeldOut(fit)).length, fit.rows.length, 'one key per FE row');
  const same = feHarm(fit, fit), worse = feHarm(fit, {...fit, rows: fit.rows.map(r => ({...r, event: Math.abs(r.event) + 0.3}))});
  assert.ok(same.pass && same.n === fit.rows.length && same.ub95Pp === 0);
  assert.ok(!worse.pass && worse.meanPp >= 0.29);
  assert.equal(pairedHarm({'f1/x': 1, 'f1/y': 2}, {'f1/x': 1, 'f1/y': 2}).fe, undefined, 'no FE rows, no FE entry');
});

test('ship rule: one row worse than +1.0 pp fails even when the UB passes; rows are listed worst first', async () => {
  const {pairedHarm} = await import('../scripts/sim/pipeline-report.mjs');
  const a = Object.fromEntries(Array.from({length: 40}, (_, i) => [`fe/k/t${i}/2025/Q`, 1])), b = {...a, 'fe/k/t0/2025/Q': 2.2};
  const h = pairedHarm(a, b).fe;
  assert.ok(h.ub95Pp <= 0.10 && !h.pass && h.overRowLimit[0] === 'fe/k/t0/2025/Q' && h.rows[0].harmPp === 1.2 && h.maxPp === 1.2);
  assert.ok(pairedHarm(a, {...a, 'fe/k/t0/2025/Q': 1.9}).fe.pass, '+0.9 pp is inside the row limit');
});
