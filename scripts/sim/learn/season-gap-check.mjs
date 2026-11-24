// Research only (central decision 22, option 3, 2026-11-25): candidate A of "WEC season level", attempt 1, report-only.
// Same tables, same leave-one-event-out as fair-test.mjs; A = LAPSIM_WEC_BOP off (baseline), B = on (candidate A).
// Slow sessions recomputed by slowSessions() on each side. Output: per-class RMS with event-bootstrap 90 % intervals and the
// signed class-best error of the 8 gap cells (Monza 2023/2026, Austin 2024/2026 x LMH/LMDh), each with a car-bootstrap 90 %
// interval (resample the event's cars, recompute class-best real and predicted). No selection, no ship.
//   node scripts/sim/learn/season-gap-check.mjs [out.json]
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fit, loadRows, slowSessions, SOURCES} from './fit-endurance.mjs';
import {eventErrors, score, rng, SEED} from './fair-test.mjs';

const GAP = ['wec|2023|autodromo-nazionale-di-monza', 'wec|2026|monza', 'wec|2024|circuit-of-the-americas', 'wec|2026|austin'];
const OUT = process.argv[2] || 'probe-out/season-gap-check.json', q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const side = flag => { if (flag) process.env.LAPSIM_WEC_BOP = '1'; else delete process.env.LAPSIM_WEC_BOP; return slowSessions(loadRows(SOURCES).rows); };
const loo = rows => { const p = new Array(rows.length); for (const ev of new Set(rows.map(r => r.eventKey))) { const f = fit(rows.filter(r => r.eventKey !== ev)); rows.forEach((r, i) => { if (r.eventKey === ev) p[i] = f.predict(r); }); } return p; };
const off = side(false), on = side(true);
// both sides score the same events: rows of sessions slow on either side are dropped from both
const key = r => [r.eventKey, r.group, r.entry ?? r.car ?? '', r.model, r.real].join('|'), slow = new Set([...off.slow, ...on.slow].map(s => s.session));
const keep = rs => rs.filter(r => !slow.has(r.eventKey + '|' + r.group)), A = keep(off.rows), B = keep(on.rows);
const mapB = new Map(B.map((r, i) => [key(r), i])); if (A.length !== B.length || A.some(r => !mapB.has(key(r)))) throw Error('row sets differ between flag off and on');
const pA = loo(A), pBraw = loo(B), pB = A.map(r => pBraw[mapB.get(key(r))]);
const ev = eventErrors(A, pA, pB), by = k => Object.fromEntries([...new Set(ev.map(k))].sort().map(g => [g, score(ev.filter(e => k(e) === g))]));
const r = rng(SEED + 1), cells = [];
for (const event of GAP) for (const group of ['lmh', 'lmdh']) {
  const idx = A.map((x, i) => i).filter(i => A[i].eventKey === event && A[i].group === group); if (!idx.length) { cells.push({event, group, rows: 0}); continue; }
  const cell = ix => { const real = Math.min(...ix.map(i => A[i].real)); return [100 * (Math.min(...ix.map(i => pA[i])) / real - 1), 100 * (Math.min(...ix.map(i => pB[i])) / real - 1)]; };
  const [a, b] = cell(idx), bs = Array.from({length: 2000}, () => cell(idx.map(() => idx[Math.floor(r() * idx.length)])));
  const f = v => +v.toFixed(3), bop = B[mapB.get(key(A[idx[0]]))].bop;
  cells.push({event, group, rows: idx.length, off: f(a), offPI90: [f(q(bs.map(x => x[0]), 0.05)), f(q(bs.map(x => x[0]), 0.95))], on: f(b), onPI90: [f(q(bs.map(x => x[1]), 0.05)), f(q(bs.map(x => x[1]), 0.95))], bopUnknown: bop?.unknown ?? null});
}
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const res = {generated: new Date().toISOString(), code: execFileSync('git', ['rev-parse', 'HEAD']).toString().trim(), mode: 'research, report-only (attempt 1 of WEC season level)',
  seed: SEED, node: process.version, inputs: Object.fromEntries([...SOURCES, 'scripts/sim/data/fia-docs/wec-bop-2023-2026.csv'].map(f => [f, sha(f)])),
  rows: A.length, slowSessions: {off: off.slow.map(s => s.session), on: on.slow.map(s => s.session)}, byGroup: by(e => e.group), wec: by(e => e.group + ' ' + e.event.split('|')[0]), gapCells: cells,
  note: 'ratio = flag on / flag off (paired events). shipped/refit fields in byGroup mean off/on here.'};
mkdirSync(dirname(OUT), {recursive: true}); writeFileSync(OUT, JSON.stringify(res, null, 1));
console.table(cells.map(c => ({event: c.event, group: c.group, off: c.off, on: c.on, unknown: c.bopUnknown})));
console.table(Object.fromEntries(Object.entries(res.byGroup).map(([g, s]) => [g, {events: s.events, off: s.shipped, on: s.refit, ratio: s.ratio, PI90: s.ratioPI90.join(' to ')}])));
