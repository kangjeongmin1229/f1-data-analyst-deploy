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

test('pipeline report (step 36): endurance outputs compared without the date field', async () => {
  const {jsonDiff} = await import('../scripts/sim/pipeline-report.mjs');
  assert.deepEqual(jsonDiff({generated: '2026-11-21', a: {b: 1, c: [1, 2]}}, {generated: '2026-11-25', a: {b: 1, c: [1, 2]}}), []);
  assert.deepEqual(jsonDiff({a: {b: 1, c: [1, 2]}}, {a: {b: 2, c: [1, 3], d: 0}}).map(x => x.path), ['a.b', 'a.c.1', 'a.d']);
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

test('WEC per class and per track, and per-series shipping (central 2026-11-25 16:10)', async () => {
  const {wecDetail, shipSeries, pairedHarm} = await import('../scripts/sim/pipeline-report.mjs');
  const a = {'wec-lmh/2025|spa': 1, 'wec-lmh/2026|spa': -1, 'wec-lmh/2025|monza': 0.5, 'wec-lmgt3/2025|spa': 1.2, 'wec-lmgt3/2025|monza': 1, 'f1/2025|x': 1, 'f1/2025|y': 1};
  const b = {...a, 'wec-lmh/2025|spa': 2.5, 'wec-lmgt3/2025|spa': 1.3};
  const d = wecDetail(a, b);
  assert.deepEqual(Object.keys(d.byClass).sort(), ['wec-lmgt3', 'wec-lmh']);
  assert.equal(d.byClass['wec-lmh'].n, 3);
  assert.deepEqual(d.byClass['wec-lmh'].overRowLimit, ['wec-lmh/2025|spa']);
  assert.equal(d.byTrack[0].track, 'spa');
  assert.equal(d.byTrack[0].maxHarmPp, 1.5);
  const ship = shipSeries(pairedHarm(a, b), {pass: true}, d, 1.3);
  assert.deepEqual(ship.map(x => [x.series, x.pass]), [['f1', true], ['wec', false], ['fe', true]]);
  const w = ship.find(x => x.series === 'wec').why;
  assert.ok(w.includes('class wec-lmh') && w.includes('track spa') && w.some(x => x.startsWith('held-out RMS 1.3')), w.join('|'));
  // WEC passing every rule and at the kernel-only RMS ships
  const same = {...a}, ok = shipSeries(pairedHarm(a, same), null, wecDetail(a, same), 0.99);
  assert.equal(ok.find(x => x.series === 'wec').pass, true);
});

test('car table: ClA and other parameters on a fit bound, μx/μy (central 2026-11-25 17:18)', async () => {
  const {carTable} = await import('../scripts/sim/pipeline-report.mjs');
  const c = {seasons: {2025: {car: {muX: 1.4, muY: 2, clA: 8, cdA: 1.0}}}, series: {wec: {lmgt3: {2025: {car: {muX: 1.4, muY: 1.6, clA: 3.5, cdA: 0.9}}}, lmh: {2026: {car: {muX: 1.5, muY: 1.8, clA: 6.3, cdA: 1.0}}}}}};
  const t = Object.fromEntries(carTable(c).map(r => [r.where, r]));
  assert.deepEqual(t['f1/2025'].atBound, {clA: 'max'});
  assert.deepEqual(t['wec-lmgt3/2025'].atBound, {clA: 'max'});
  assert.deepEqual(t['wec-lmh/2026'].atBound, {});
  assert.equal(t['f1/2025'].muXOverMuY, 0.7);
});

test('honest gate (central 2026-11-25 19:35): UB ≤ 0.15 pp and no fitted parameter at a bound', async () => {
  const {pairedHarm, shipSeries, wecDetail, carTable, GATES, gateOf} = await import('../scripts/sim/pipeline-report.mjs');
  assert.equal(gateOf({}).ub, 0.10); assert.equal(gateOf({LAPSIM_GATE: 'honest'}).ub, 0.15);
  const a = {'f1/2025|x': 1, 'f1/2025|y': 1, 'f1/2025|z': 1}, b = {'f1/2025|x': 1.12, 'f1/2025|y': 1.12, 'f1/2025|z': 1.12};
  assert.equal(pairedHarm(a, b, GATES.old.ub).f1.pass, false);   // UB 0.12 fails the old gate
  assert.equal(pairedHarm(a, b, GATES.honest.ub).f1.pass, true); // and passes 0.15
  const cars = carTable({seasons: {2025: {car: {muX: 1.4, muY: 2, clA: 8, cdA: 1}}}, series: {}});
  const s = shipSeries(pairedHarm(a, b, 0.15), null, null, null, cars).find(x => x.series === 'f1');
  assert.equal(s.pass, false); assert.match(s.why.join(), /at bound: f1\/2025 clA max/);
});
