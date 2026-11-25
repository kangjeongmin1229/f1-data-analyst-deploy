// Lane-C report (geometry QA, spec A1 56fbd495…): base N7 vs candidate calibrations. Report-only harness, no fit.
// usage: node scripts/sim/night/lanec.mjs <base cal.js> <cand cal.js> <shipped cal.js> <out.json>
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {heldOut} from '../exp-compare.mjs';
import {pairedHarm, wecDetail} from '../pipeline-report.mjs';
import {F1_BOUNDS} from '../exp-physics.mjs';
import {SERIES} from '../../../worker/lapsim/series.js';
import * as S from '../learn/step32-loto.mjs';
import {applyTrackQa} from '../../../worker/lapsim/track-qa-data.js';
const [bF, cF, sF, out] = process.argv.slice(2), L = async f => (await import(pathToFileURL(f).href)).lapsimCalibration;
const [B, C, SH] = [await L(bF), await L(cF), await L(sF)];
const a = heldOut(B), b = heldOut(C), harm = pairedHarm(a, b, 0.10, 1.0);
for (const s of Object.values(harm)) delete s.rows;
const rows = Object.keys(a).filter(k => k in b).map(k => ({row: k, base: a[k], cand: b[k], d: Math.abs(b[k]) - Math.abs(a[k])})).sort((x, y) => y.d - x.d);
const perSeason = {}; for (const y of ['2025', '2026']) { const ks = rows.filter(r => r.row.startsWith(`f1/${y}|`)); if (ks.length > 1) { const aa = Object.fromEntries(ks.map(r => [r.row, r.base])), bb = Object.fromEntries(ks.map(r => [r.row, r.cand])); const h = pairedHarm(aa, bb, 0.10, 1.0).f1; delete h.rows; perSeason[y] = h; } }
const wec = wecDetail(a, b, 0.10);
// bound hits, 0.5 % rule (within 0.5 % of the bound value)
const at = (v, [lo, hi]) => !Number.isFinite(v) ? null : v <= lo * 1.005 ? 'min' : v >= hi * 0.995 ? 'max' : null;
const hits = cal => { const o = [];
  for (const [y, s] of Object.entries(cal.seasons || {})) for (const [k, bd] of Object.entries((({pIce, ...x}) => x)(F1_BOUNDS))) { const h = at(s.car?.[k], bd); if (h) o.push(`f1/${y} ${k} ${h}`); }
  for (const [c, ys] of Object.entries(cal.series?.wec || {})) for (const [y, s] of Object.entries(ys)) for (const [k, bd] of Object.entries(SERIES.wec.classes[c]?.bounds || {})) { const h = at(s.car?.[k], bd); if (h) o.push(`wec-${c}/${y} ${k} ${h}`); }
  return o; };
const hS = hits(SH), hB = hits(B), hC = hits(C), newVsShipped = hC.filter(h => !hS.includes(h));
const cars = cal => ({f1: Object.fromEntries(Object.entries(cal.seasons || {}).map(([y, s]) => [y, {clA: s.car?.clA, muY: s.car?.muY, cdA: s.car?.cdA}])),
  wec: Object.fromEntries(Object.entries(cal.series?.wec || {}).flatMap(([c, ys]) => Object.entries(ys).map(([y, s]) => [`${c}/${y}`, {clA: s.car?.clA, muY: s.car?.muY, cdA: s.car?.cdA}])))});
// Shanghai corner RMS 120–240 (step 32 score(), held-out car as N4); candidate on the corrected line
const med = q => { const s = [...q].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const heldCar = (cal, id, y) => { const s = cal.seasons[String(y)], o = Object.entries(s.tracks).filter(([t]) => t !== id), dr = med(o.map(([, t]) => t.drag ?? 1));
  return {car: {...s.car, cdA: s.car.cdA * dr, cdALow: (s.car.cdALow ?? s.car.cdA) * dr}, grip: med(o.map(([, t]) => t.grip))}; };
const corner = (cal, tracks) => { const E = S.EV.filter(e => e.year <= 2025 && tracks.includes(e.track)), err = [];
  for (const e of E) { if (!cal.seasons[String(e.year)]) continue; const h = heldCar(cal, e.track, e.year), r = S.K.simulateLap(S.trackFor(e.track, e.zones, h.grip, false), h.car, S.envOf(e.track));
    for (const c of S.score(e, {v: Array.from(r.v, x => x * 3.6), lap: r.lapTime}).corners) if (Number.isFinite(c.apex) && c.meas >= 120 && c.meas < 240) err.push(c.apex); }
  return {n: err.length, rms: Math.sqrt(err.reduce((p, q) => p + q * q, 0) / err.length), mean: err.reduce((p, q) => p + q, 0) / err.length}; };
const allT = [...new Set(S.EV.filter(e => e.year <= 2025).map(e => e.track))];
const before = {shanghai: corner(B, ['shanghai']), all: corner(B, allT)};
const rawShanghai = [...S.T.shanghai.kappa]; const log = applyTrackQa(S.T);
const after = {shanghai: corner(C, ['shanghai']), all: corner(C, allT)};
const pick = ids => rows.filter(r => ids.some(id => r.row.endsWith('|' + id)));
const res = {base: bF, cand: cF, trackQa: log, harmUB: harm, f1PerSeason: perSeason, wecByClass: wec.byClass, worstRows: rows.slice(0, 12), rowsOver1pp: rows.filter(r => r.d > 1.0),
  focus: pick(['shanghai', 'lusail', 'spa-francorchamps', 'sakhir']), boundHits: {shipped: hS, base: hB, cand: hC, newVsShipped}, cars: {base: cars(B), cand: cars(C)}, cornerRms120to240: {before, after}};
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1).slice(0, 8000));
