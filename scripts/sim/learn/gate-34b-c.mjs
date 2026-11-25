// Step 34b item c (driver-rating covariate, fit-endurance GT3): power check on the base and the paired gate. Fixed before any number
// (pre-reg docs/prereg/step34b-c-2026-11-25.md). Reads the endurance job's end/endurance-rows.json of each arm.
//   node scripts/sim/learn/gate-34b-c.mjs power <base rows.json>
//   node scripts/sim/learn/gate-34b-c.mjs gate <base rows.json> <candidate rows.json>
import {readFileSync} from 'node:fs';
import {kForVariants} from '../gate.mjs';

const SERIES = new Set(['wec', 'elms', 'alms', 'imsa']), WIDTH_R = 0.01;
const load = f => JSON.parse(readFileSync(f, 'utf8'));
// unit = event: mean squared event-hidden error of its GT3 rows with a known best-lap rating (base rating join, both arms the same rows)
export function perEvent(rows, keep) {
  const m = new Map();
  for (const r of rows) if (keep(r)) { const e = (r.eventOut / r.real - 1) ** 2; (m.get(r.eventKey) || m.set(r.eventKey, []).get(r.eventKey)).push(e); }
  return new Map([...m].map(([k, a]) => [k, a.reduce((s, x) => s + x, 0) / a.length]));
}
const isRated = r => r.group === 'gt3' && SERIES.has(r.series) && r.rating;
const rmsPct = v => Math.sqrt(v.reduce((s, x) => s + x, 0) / v.length) * 100;
const sd = v => { const m = v.reduce((s, x) => s + x, 0) / v.length; return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); };

export function power(base) {
  const ev = perEvent(base.rows, isRated), r = [...ev.values()].map(e => Math.sqrt(e) * 100), n = r.length, rms = rmsPct([...ev.values()]);
  const mde = 1.84 * sd(r) / Math.sqrt(n), ratings = {};
  for (const x of base.rows.filter(isRated)) ratings[x.rating] = (ratings[x.rating] || 0) + 1;
  return {n, rows: base.rows.filter(isRated).length, ratings, rmsPct: +rms.toFixed(4), sdPct: +sd(r).toFixed(4), mdePp: +mde.toFixed(4), limitPp: +(0.1 * rms).toFixed(4), judgeable: mde <= 0.1 * rms};
}

export function gate(base, cand) {
  const key = r => [r.eventKey, r.group, r.model, r.entry].join('|'), C = new Map(cand.rows.map(r => [key(r), r]));
  const rated = new Set(base.rows.filter(isRated).map(key)); // the rows are fixed by the base join
  const eb = perEvent(base.rows, r => rated.has(key(r))), ec = perEvent(cand.rows, r => rated.has(key(r)));
  const ev = [...eb.keys()].filter(k => ec.has(k)), d = ev.map(k => eb.get(k) - ec.get(k)), n = d.length;
  const mean = d.reduce((s, x) => s + x, 0) / n, se = sd(d) / Math.sqrt(n), k = kForVariants(1, n);
  const rb = rmsPct(ev.map(k => eb.get(k))), rc = rmsPct(ev.map(k => ec.get(k)));
  const bySeries = {}; for (const s of SERIES) { const E = ev.filter(k => k.startsWith(s + '|')); if (E.length) bySeries[s] = {n: E.length, base: +rmsPct(E.map(k => eb.get(k))).toFixed(3), cand: +rmsPct(E.map(k => ec.get(k))).toFixed(3)}; }
  // guards: every other group / series (all event-hidden rows, not only rated ones) not worse than 2 δ (δ = 5 % of its base RMS)
  const groups = {}; for (const r of base.rows) { const g = r.group + ' ' + r.series, c = C.get(key(r)); if (!c) continue; const o = groups[g] ||= {b: [], c: []}; o.b.push((r.eventOut / r.real - 1) ** 2); o.c.push((c.eventOut / c.real - 1) ** 2); }
  const guards = Object.fromEntries(Object.entries(groups).map(([g, o]) => { const b = rmsPct(o.b), c = rmsPct(o.c); return [g, {n: o.b.length, base: +b.toFixed(3), cand: +c.toFixed(3), ok: c - b <= 2 * 0.05 * b}]; }));
  const coef = cand.coefR || {}, edge = Object.entries(coef).filter(([, v]) => Math.abs(v) > 3 * WIDTH_R).map(([k]) => k);
  const gainPp = rb - rc, pass = mean > k * se && gainPp >= 0.02 && Object.values(guards).every(g => g.ok) && !edge.length;
  return {n, k: +k.toFixed(3), meanGain: mean, se, rmsBase: +rb.toFixed(4), rmsCand: +rc.toFixed(4), gainPp: +gainPp.toFixed(4), bySeries, guards, coefR: coef, priorEdge: edge, pass};
}

if (process.argv[1]?.endsWith('gate-34b-c.mjs')) {
  const [mode, a, b] = process.argv.slice(2);
  console.log(JSON.stringify(mode === 'power' ? power(load(a)) : gate(load(a), load(b)), null, 1));
}
