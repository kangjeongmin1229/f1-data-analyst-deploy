// Step 32b verdict (docs/prereg/step32b-drs-2026-11-25.md): F1 DRS bias on held-out tracks, base vs C3 DRS fix, lap-harm guard and
// the two physics checks. Reads files only; no fit, no measured data written.
//   node scripts/sim/learn/step32b-verdict.mjs <base Δ dir> <cand Δ dir> <base calibration-data.js> <cand calibration-data.js> <out dir>
// Each Δ dir holds baseline.csv from `F1_DELTA_HELDOUT=on f1-delta-bench.mjs model` on the pinned v2 pooled cases.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {heldOut} from '../exp-compare.mjs';
import {pairedHarm} from '../pipeline-report.mjs';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {carsFor} from '../../../worker/lapsim/scenario.js';

// pre-reg constants
const B = 2000, SEED = 7, CUT = 0.40, LIM_UB = 0.10, DELAY = 54, DELAY_TOL = 10, C_DRS = 0.20, PUBLISHED = [0.17, 0.25];
const csv = f => { const [h, ...r] = readFileSync(f, 'utf8').trim().split(/\r?\n/).map(l => l.split(',')); return r.map(x => Object.fromEntries(h.map((k, i) => [k, x[i]]))); };
const rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length, pct = (a, q) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))]; };
const median = a => pct(a, 0.5), r4 = x => +x.toFixed(4);

// paired event bootstrap of R = 1 − |bias_cand| / |bias_base| (unit = event; both sets resampled with the same events)
export function biasCut(base, cand, b = B, seed = SEED) {
  const ev = [...new Set(base.map(r => r.event))], by = (rows, e) => rows.filter(r => r.event === e).map(r => r.err);
  const E = Object.fromEntries(ev.map(e => [e, [by(base, e), by(cand, e)]])), R = (eb, ec) => 1 - Math.abs(mean(ec)) / Math.abs(mean(eb)), u = rng(seed), draws = [];
  for (let i = 0; i < b; i++) { const eb = [], ec = []; for (let j = 0; j < ev.length; j++) { const [x, y] = E[ev[Math.floor(u() * ev.length)]]; eb.push(...x); ec.push(...y); } draws.push(R(eb, ec)); }
  const r = R(base.map(x => x.err), cand.map(x => x.err)), lb = pct(draws, 0.05);
  return {n: base.length, events: ev.length, biasBase: r4(mean(base.map(x => x.err))), biasCand: r4(mean(cand.map(x => x.err))), cut: r4(r), cutLb95: r4(lb), pass: lb >= CUT};
}

const rows = (dir, cases) => { const C = Object.fromEntries(csv(cases).map(c => [c.case_id, c])); return csv(dir + '/baseline.csv').map(r => ({id: r.case_id, event: r.year + '|' + r.event, track: r.track,
  meas: +r.meas_delta_s, pred: +r.pred_delta_s, err: +r.pred_delta_s - +r.meas_delta_s, sig: +(C[r.case_id]?.sigma_meas_s ?? r.sigma_meas_s)})); };
const summary = rs => ({n: rs.length, biasS: r4(mean(rs.map(r => r.err))), passRate: r4(mean(rs.map(r => Math.abs(r.err) <= Math.max(0.25 * Math.abs(r.meas), 0.05) ? 1 : 0))),
  signErrors: rs.filter(r => Math.sign(r.pred) !== Math.sign(r.meas)).length, medianPredS: r4(median(rs.map(r => r.pred))), medianMeasS: r4(median(rs.map(r => r.meas)))});

if (process.argv[1]?.endsWith('step32b-verdict.mjs')) {
  const [bd, cd, bf, cf, out] = process.argv.slice(2), cases = 'scripts/sim/data/f1-delta/f1-delta-cases-pooled-2026-11-24.csv';
  const load = async f => (await import(pathToFileURL(f).href)).lapsimCalibration, baseCal = await load(bf), candCal = await load(cf);
  const base = rows(bd, cases), cand = rows(cd, cases);
  if (base.map(r => r.id).join() !== cand.map(r => r.id).join()) throw new Error('base and candidate case lists differ');
  const main = biasCut(base, cand), harm = pairedHarm(heldOut(baseCal), heldOut(candCal)), f1 = harm.f1;
  const guard = {f1: {n: f1.n, meanPp: f1.meanPp, ub95Pp: f1.ub95Pp, worse: f1.worse, maxPp: f1.maxPp, overRowLimit: f1.overRowLimit, pass: !!f1.pass && f1.ub95Pp <= LIM_UB},
    wec: {n: harm.wec?.n, ub95Pp: harm.wec?.ub95Pp, pass: harm.wec?.pass}};
  // physics 1: DRS drag cut of the candidate 2023–25 cars inside the published range
  const cuts = Object.fromEntries(['2023', '2024', '2025'].map(y => { const c = candCal.seasons[y].car; return [y, {cdA: r4(c.cdA), cdALow: r4(c.cdALow), cut: r4(1 - c.cdALow / c.cdA), drsDelayM: c.drsDelayM ?? null}]; }));
  const p1 = {published: PUBLISHED, cuts, pass: Object.values(cuts).every(x => x.cut >= PUBLISHED[0] && x.cut <= PUBLISHED[1] && Math.abs(x.cut - C_DRS) < 1e-6 && x.drsDelayM === DELAY)};
  // physics 2: telemetry flap opening (first drs ∈ {10,12,14} sample after the mapped activation line, median over race laps per zone)
  const zm = csv('scripts/sim/data/f1-delta/zone-mapping-table.csv').filter(z => z.telemetry_first_open_minus_mapped_m !== '' && !z.dropped);
  const d = zm.map(z => +z.telemetry_first_open_minus_mapped_m), u = rng(SEED), bs = Array.from({length: B}, () => median(d.map(() => d[Math.floor(u() * d.length)])));
  const K = lapsimKernel(), vAt = {}, tOpen = zm.map(z => { const id = z.track, s = +z.sim_from_m;
    const r = vAt[id] ??= K.simulateLap(K.trackFromData(T[id]), carsFor(id)['2025'].car, {}); const i = Math.round(s / T[id].ds) % r.v.length; return +z.telemetry_first_open_minus_mapped_m / r.v[i]; });
  const p2 = {zones: d.length, medianM: r4(median(d)), ci95M: [r4(pct(bs, 0.025)), r4(pct(bs, 0.975))], iqrM: [r4(pct(d, 0.25)), r4(pct(d, 0.75))],
    medianTimeS: r4(median(tOpen)), timeNote: 'distance ÷ model 2025 speed at the activation point (ISA); label: model', delayM: DELAY, tolM: DELAY_TOL, pass: Math.abs(median(d) - DELAY) <= DELAY_TOL};
  const perTrack = Object.fromEntries([...new Set(base.map(r => r.track))].sort().map(t => [t, {base: summary(base.filter(r => r.track === t)), cand: summary(cand.filter(r => r.track === t))}]));
  const v = {prereg: 'docs/prereg/step32b-drs-2026-11-25.md', main, guard, physics: {dragCut: p1, flapDelay: p2}, base: summary(base), cand: summary(cand), perTrack,
    verdict: main.pass && guard.f1.pass ? 'PASS' : 'FAIL', physicsOk: p1.pass && p2.pass};
  mkdirSync(out, {recursive: true}); writeFileSync(out + '/step32b-verdict.json', JSON.stringify(v, null, 1));
  console.log(JSON.stringify({verdict: v.verdict, physicsOk: v.physicsOk, main, guard: guard.f1}, null, 1));
}
