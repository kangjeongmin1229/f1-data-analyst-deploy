// Step 2a gate. Attempt 1 (claude/gate-cda-measured-prereg-2026-11-23.md §7): VD vs production A, m = 1.
// Attempt 2 (…-amendment-a2.md §6): VD2 (measured drag, all laps, + ERS law b) vs the frozen base, m = 2; R10 (law b only) reported.
// node scripts/sim/cda-gate.mjs <dirBase> <dirCand> [<dirRef>]  (each: cal-<n>.js, validate-<n>.json, levelc-<n>.json, forward-<n>.json)
import {readFileSync, existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {nonInferior, signFlip, kForVariants, mde, wecNoiseCheck, boundHitCount} from './gate.mjs';

const [dA, dV, dR] = process.argv.slice(2), name = d => d.split('/').find(x => x.startsWith('exp-'))?.slice(4) || 'X', nA = name(dA), nV = name(dV), M = +(process.env.GATE_M || 2);
const cal = async (d, n) => (await import(pathToFileURL(join(d, `cal-${n}.js`)).href)).lapsimCalibration;
const json = (d, f) => existsSync(join(d, f)) ? JSON.parse(readFileSync(join(d, f), 'utf8')) : null;
const [cA, cV] = [await cal(dA, nA), await cal(dV, nV)];
// Plan 4d.1 (amendment A2 rev 3): a candidate run with LAPSIM_SKIP_WEC has no WEC series; WEC is proved unchanged by hash, so the base's WEC is reused.
const hasWec = c => Object.keys(c.series?.wec || {}).length > 0;
const reuseWec = c => { if (hasWec(c) || !hasWec(cA)) return false; c.series = {...c.series, wec: cA.series.wec}; return true; };
const reuseLevelC = (L, B) => { if (!L || !B || Object.keys(L.rows).some(k => k.startsWith('wec'))) return L; return {...L, rows: {...L.rows, ...Object.fromEntries(Object.entries(B.rows).filter(([k]) => k.startsWith('wec')))}}; };
const wecReused = {VD: reuseWec(cV)};
const median = a => { const q = [...a].sort((x, y) => x - y); return q.length ? (q[(q.length - 1) >> 1] + q[q.length >> 1]) / 2 : NaN; };
const rms = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length), mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const out = {};

// held-out rows (% lap error) keyed by group|track; seasons and classes on one track pooled as one unit (RMS over its rows)
function heldOut(c) {
  const r = [];
  for (const [y, s] of Object.entries(c.seasons || {})) for (const e of s.holdout?.tracks || []) { const L = s.tracks?.[e.track]?.realLap; if (L) r.push({grp: 'f1', key: `f1-${y}|${e.track}`, track: e.track, pct: e.errorSec / L * 100}); }
  for (const [cls, ys] of Object.entries(c.series?.wec || {})) for (const [y, s] of Object.entries(ys)) for (const e of s.holdout?.tracks || []) { const L = s.tracks?.[e.track]?.realLap; if (L) r.push({grp: 'wec', key: `wec-${cls}-${y}|${e.track}`, track: e.track, pct: e.errorSec / L * 100}); }
  return r;
}
function niPooled(rowsA, rowsV, filt, label) {
  const mV = new Map(rowsV.map(x => [x.key, x.pct])), pairs = rowsA.filter(filt).filter(x => mV.has(x.key)).map(x => ({...x, v: mV.get(x.key)}));
  const by = new Map(); for (const p of pairs) { const k = p.grp + ':' + p.track; if (!by.has(k)) by.set(k, []); by.get(k).push(p); }
  const ea = [...by.values()].map(g => rms(g.map(p => p.pct))), ev = [...by.values()].map(g => rms(g.map(p => p.v)));
  const k = kForVariants(M, ea.length), r = nonInferior(ea, ev, {rel: 0.05, k});
  return {label, rows: pairs.length, units: ea.length, k: +k.toFixed(3), rmsA: +rms(ea).toFixed(3), rmsVD: +rms(ev).toFixed(3), medianAbsA: +median(pairs.map(p => Math.abs(p.pct))).toFixed(3), medianAbsVD: +median(pairs.map(p => Math.abs(p.v))).toFixed(3), upper: +r.upper.toFixed(4), margin: +(0.05 * r.rmsCur).toFixed(4), accept: r.accept, reason: r.reason,
    k2: +kForVariants(2, ea.length).toFixed(3), acceptK2: nonInferior(ea, ev, {rel: 0.05, k: kForVariants(2, ea.length)}).accept};
}
const hA = heldOut(cA), hV = heldOut(cV);
out.heldOut = ['all', 'f1', 'wec'].map(g => niPooled(hA, hV, x => g === 'all' || x.grp === g, g));
out.heldOutF1_2026 = niPooled(hA, hV, x => x.key.startsWith('f1-2026'), 'f1-2026 (no own-season telemetry)');

// level C (holdout-track.mjs rows): per class; F1 seasons pooled per track
const lA = json(dA, `levelc-${nA}.json`), lV = reuseLevelC(json(dV, `levelc-${nV}.json`), lA);
if (lA && lV) {
  const rows = L => Object.entries(L.rows).flatMap(([cls, r]) => r.map(x => ({grp: cls.startsWith('f1') ? 'f1' : 'wec', key: cls + '|' + x.track, track: x.track, pct: x.errPct})));
  const a = rows(lA), v = rows(lV);
  out.levelC = ['all', 'f1', 'wec'].map(g => niPooled(a, v, x => g === 'all' || x.grp === g, g));
  out.levelCSummary = {A: lA.summary, VD: lV.summary};
} else out.levelC = 'not run';
const fA = json(dA, `forward-${nA}.json`), fV = json(dV, `forward-${nV}.json`);
out.forward = fA && fV ? {A: fA.summary, VD: fV.summary} : 'not run';

// co-primary: trap (lap max) |error| per F1 track, seasons pooled (mean), gain = A − VD
const vA = json(dA, `validate-${nA}.json`), vV = json(dV, `validate-${nV}.json`);
const trapBy = V => { const m = new Map(); for (const r of V.rows.filter(r => r.series === 'f1' && Number.isFinite(r.trapKph))) { if (!m.has(r.track)) m.set(r.track, []); m.get(r.track).push(Math.abs(r.trapKph)); } return new Map([...m].map(([t, a]) => [t, mean(a)])); };
const tA = trapBy(vA), tV = trapBy(vV), ids = [...tA.keys()].filter(t => tV.has(t)).sort();
const gains = ids.map(t => tA.get(t) - tV.get(t)), sdA = sd(ids.map(t => tA.get(t))), MDE = mde(sdA, ids.length);
const sf = signFlip(gains, {m: M});
out.trap = {n: ids.length, meanAbsA: +mean(ids.map(t => tA.get(t))).toFixed(2), meanAbsVD: +mean(ids.map(t => tV.get(t))).toFixed(2), mde: +MDE.toFixed(2), judgeable: MDE <= 2,
  gain: +sf.gain.toFixed(2), ci90: sf.ci90.map(x => +x.toFixed(2)), p: +sf.p.toFixed(4), accept: sf.accept && sf.gain >= 2, reason: sf.reason, perTrack: Object.fromEntries(ids.map((t, i) => [t, +gains[i].toFixed(2)]))};
out.summaryValidate = {A: vA.summary, VD: vV.summary};

// cars and bounds (rule 3.4)
const BOUNDS = {muY: [1.5, 2.4], clA: [2.5, 8], cdA: [0.7, 1.9], cdALow: [0.45, 1.6]};
out.cars = Object.fromEntries(['A', 'VD'].map((n, i) => [n, Object.fromEntries(Object.entries((i ? cV : cA).seasons).map(([y, s]) => { const c = s.car, prior = 560e3 * (y === '2026' ? 400 / 560 : 1);
  const at = Object.entries(BOUNDS).filter(([k, [lo, hi]]) => Math.abs(c[k] - lo) < 1e-3 || Math.abs(c[k] - hi) < 1e-3).map(([k]) => k);
  if (Math.abs(c.pIce / prior - 0.85) < 1e-3 || Math.abs(c.pIce / prior - 1.15) < 1e-3) at.push('pIce');
  return [y, {muY: +c.muY.toFixed(3), clA: +c.clA.toFixed(3), cdA: +c.cdA.toFixed(3), cdALow: +c.cdALow.toFixed(3), pIceKW: +(c.pIce / 1e3).toFixed(1), atBound: at}]; }))]));
out.noise = {wec: wecNoiseCheck(cA.series?.wec), f1: Object.fromEntries(Object.entries(cA.seasons).filter(([, s]) => s.holdout?.noise).map(([y, s]) => [y, s.holdout.noise.spreadPp]))};
out.noise.wec.groups = out.noise.wec.groups.map(g => ({group: g.group, spreadPp: g.spreadPp && +g.spreadPp.toFixed(3)}));
const f1Bounds = c => Object.values(out.cars[c]).reduce((n, s) => n + s.atBound.length, 0);
out.boundHits = {f1SeasonCars: {base: f1Bounds('A'), cand: f1Bounds('VD')}, wecFolds: {base: boundHitCount(cA.series?.wec), cand: boundHitCount(cV.series?.wec)}};
out.boundHits.noNew = out.boundHits.f1SeasonCars.cand <= out.boundHits.f1SeasonCars.base && out.boundHits.wecFolds.cand <= out.boundHits.wecFolds.base;
if (dR) { const nR = name(dR), cR = await cal(dR, nR); wecReused.R = reuseWec(cR); const hR = heldOut(cR), lR = reuseLevelC(json(dR, `levelc-${nR}.json`), lA), vR = json(dR, `validate-${nR}.json`), tR = vR ? trapBy(vR) : null;
  out.reference = {name: nR, heldOut: ['all', 'f1', 'wec'].map(g => niPooled(hA, hR, x => g === 'all' || x.grp === g, g)), levelC: lR?.summary,
    trapMeanAbs: tR ? +mean(ids.filter(t => tR.has(t)).map(t => tR.get(t))).toFixed(2) : null, summaryValidate: vR?.summary,
    cars: Object.fromEntries(Object.entries(cR.seasons).map(([y, s]) => [y, {cdA: +s.car.cdA.toFixed(3), cdALow: +s.car.cdALow.toFixed(3), pIceKW: +(s.car.pIce / 1e3).toFixed(1), clA: +s.car.clA.toFixed(3), muY: +s.car.muY.toFixed(3)}]))}; }
out.wecReusedFromBase = wecReused;
out.pass = out.noise.wec.judgeable && out.boundHits.noNew && out.heldOut.every(r => r.accept) && Array.isArray(out.levelC) && out.levelC.every(r => r.accept) && out.trap.judgeable && out.trap.accept;
console.log(JSON.stringify(out, null, 1));
