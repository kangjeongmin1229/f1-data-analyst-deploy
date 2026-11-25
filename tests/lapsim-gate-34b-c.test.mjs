// Step 34b c: power check and paired gate on synthetic rows (the rated GT3 rows are fixed by the base join).
import test from 'node:test';
import assert from 'node:assert/strict';
import {power, gate} from '../scripts/sim/learn/gate-34b-c.mjs';

const row = (ev, i, err, rating = 'B', series = 'imsa', group = 'gt3') => ({eventKey: `${series}|2025|${ev}`, group, series, model: 'm' + i, entry: String(i), real: 100, eventOut: 100 * (1 + err), rating});
const base = {rows: Array.from({length: 40}, (_, e) => [row(e, 1, 0.01), row(e, 2, -0.008, 'P'), row(e, 3, 0.005, null)]).flat()};
test('power counts only rated GT3 rows of the Al Kamel series, one unit per event', () => {
  const p = power(base);
  assert.equal(p.n, 40); assert.equal(p.rows, 80); assert.deepEqual(p.ratings, {B: 40, P: 40}); assert.ok(p.judgeable);
});
test('gate: a candidate that halves every rated error passes; an unrated row change does not count', () => {
  const cand = {coefR: {'R:gt3|B': 0.004}, rows: base.rows.map(r => ({...r, eventOut: r.rating ? 100 + (r.eventOut - 100) / 2 : r.eventOut}))};
  const g = gate(base, cand); assert.equal(g.n, 40); assert.ok(g.gainPp > 0.02); assert.ok(g.pass);
  const same = gate(base, {coefR: {}, rows: base.rows.map(r => ({...r, eventOut: r.rating ? r.eventOut : 100}))}); assert.equal(same.gainPp, 0); assert.ok(!same.pass);
});
test('gate: a coefficient beyond 3 prior widths is a prior-edge flag and fails', () => {
  const cand = {coefR: {'R:gt3|B': 0.05}, rows: base.rows.map(r => ({...r, eventOut: r.rating ? 100 + (r.eventOut - 100) / 2 : r.eventOut}))};
  assert.deepEqual(gate(base, cand).priorEdge, ['R:gt3|B']); assert.ok(!gate(base, cand).pass);
});
