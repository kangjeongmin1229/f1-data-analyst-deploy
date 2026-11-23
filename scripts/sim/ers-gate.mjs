// Gate 10b (claude/gate-ers-law-prereg-2026-11-23-amendment.md §9.4, §9.6): ERS law (b) candidate against the wave-2 base.
// node scripts/sim/ers-gate.mjs <baseDir> <candDir>   each dir: cal.mjs, levelc.json, forward.json, validate.json, checks.json
// (checks.json = ERS_CHECKS=gate node scripts/sim/ers-strategy-options.mjs --checks, run with that calibration in worker/lapsim/)
import {readFileSync, existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {nonInferior, signFlip, kForVariants, wecNoiseCheck, boundHitCount} from './gate.mjs';

const M = 2, [dB, dC] = process.argv.slice(2);
const json = (d, f) => existsSync(join(d, f)) ? JSON.parse(readFileSync(join(d, f), 'utf8')) : null;
const cal = async d => (await import(pathToFileURL(join(d, 'cal.mjs')).href)).lapsimCalibration;
const [cB, cC] = [await cal(dB), await cal(dC)];
const rms = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length), mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const med = a => { const s = [...a].sort((x, y) => x - y); return (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2; };
const sd = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
const out = {m: M};

// 0. noise: WEC second start (base decides), F1 second start reported
const f1Noise = c => { const A = [], B = []; for (const s of Object.values(c.seasons || {})) { const h = s.holdout; if (!h?.noise) continue;
  for (const e of h.tracks) { const L = s.tracks?.[e.track]?.realLap; if (L) A.push(100 * e.errorSec / L); }
  for (const e of h.noise.tracks) { const L = s.tracks?.[e.track]?.realLap; if (L) B.push(100 * e.errorSec / L); } }
  return A.length && B.length ? {rmsPct: +rms(A).toFixed(3), rms2Pct: +rms(B).toFixed(3), spreadPp: +Math.abs(rms(A) - rms(B)).toFixed(3)} : 'not stored'; };
const nB = wecNoiseCheck(cB.series?.wec), nC = wecNoiseCheck(cC.series?.wec, {delta: nB.delta});
out.noise = {wecBase: {spreadPp: nB.spreadPp, delta: nB.delta, judgeable: nB.judgeable, reason: nB.reason}, wecCand: {spreadPp: nC.spreadPp},
  f1Base: f1Noise(cB), f1Cand: f1Noise(cC), wecBoundHits: {base: boundHitCount(cB.series?.wec), cand: boundHitCount(cC.series?.wec)}};

// 2. held-out (levels A/B), level C, forward-chaining: non-inferior per group, rows pooled per track
function heldOut(c) {
  const r = [];
  for (const [y, s] of Object.entries(c.seasons || {})) for (const e of s.holdout?.tracks || []) { const L = s.tracks?.[e.track]?.realLap; if (L) r.push({grp: 'f1', key: `f1-${y}|${e.track}`, track: e.track, pct: e.errorSec / L * 100}); }
  for (const [cls, ys] of Object.entries(c.series?.wec || {})) for (const [y, s] of Object.entries(ys)) for (const e of s.holdout?.tracks || []) { const L = s.tracks?.[e.track]?.realLap; if (L) r.push({grp: 'wec', key: `wec-${cls}-${y}|${e.track}`, track: e.track, pct: e.errorSec / L * 100}); }
  return r;
}
function niPooled(rowsB, rowsC, g) {
  const mC = new Map(rowsC.map(x => [x.key, x.pct])), pairs = rowsB.filter(x => (g === 'all' || x.grp === g) && mC.has(x.key)).map(x => ({...x, c: mC.get(x.key)}));
  const by = new Map(); for (const p of pairs) { const k = p.grp + ':' + p.track; if (!by.has(k)) by.set(k, []); by.get(k).push(p); }
  const eb = [...by.values()].map(q => rms(q.map(p => p.pct))), ec = [...by.values()].map(q => rms(q.map(p => p.c)));
  const k = kForVariants(M, eb.length), r = nonInferior(eb, ec, {rel: 0.05, k});
  return {group: g, rows: pairs.length, units: eb.length, k: +k.toFixed(3), rmsBase: +rms(eb).toFixed(3), rmsCand: +rms(ec).toFixed(3),
    medAbsBase: +med(pairs.map(p => Math.abs(p.pct))).toFixed(3), medAbsCand: +med(pairs.map(p => Math.abs(p.c))).toFixed(3),
    lossBound: +r.upper.toFixed(4), margin: +(0.05 * r.rmsCur).toFixed(4), accept: r.accept, reason: r.reason};
}
out.heldOut = ['all', 'f1', 'wec'].map(g => niPooled(heldOut(cB), heldOut(cC), g));
const repRows = L => Object.entries(L.rows).flatMap(([cls, r]) => r.map(x => ({grp: cls.startsWith('f1') ? 'f1' : 'wec', key: cls + '|' + x.track, track: x.track, pct: x.errPct})));
for (const [name, f] of [['levelC', 'levelc.json'], ['forward', 'forward.json']]) { const b = json(dB, f), c = json(dC, f);
  out[name] = b && c ? {tests: ['all', 'f1', 'wec'].map(g => niPooled(repRows(b), repRows(c), g)), summary: {base: b.summary, cand: c.summary}} : 'not run'; }

// per-track loss rule (checks 3, 4): pass if mean(cand − base) − k·SE ≤ 0; sign-flip on gains (base − cand) reported
const lossRule = (b, c) => { const ids = [...b.keys()].filter(t => c.has(t)).sort(), loss = ids.map(t => c.get(t) - b.get(t)), n = ids.length, k = kForVariants(M, n);
  const se = n > 1 ? sd(loss) / Math.sqrt(n) : Infinity, sf = signFlip(loss.map(x => -x), {m: M});
  return {n, k: +k.toFixed(3), meanBase: +mean(ids.map(t => b.get(t))).toFixed(2), meanCand: +mean(ids.map(t => c.get(t))).toFixed(2),
    medianBase: +med(ids.map(t => b.get(t))).toFixed(2), medianCand: +med(ids.map(t => c.get(t))).toFixed(2), meanLoss: +mean(loss).toFixed(2),
    se: +se.toFixed(2), accept: mean(loss) - k * se <= 0, signFlip: {gain: +sf.gain.toFixed(2), p: +sf.p.toFixed(4), ci90: sf.ci90.map(x => +x.toFixed(2))},
    perTrack: Object.fromEntries(ids.map((t, i) => [t, +loss[i].toFixed(1)]))}; };

// 1, 3. ledger and clip onset (held-out 2026 tracks)
const kB = json(dB, 'checks.json'), kC = json(dC, 'checks.json');
if (kB && kC) {
  const L = kC.ledger.calibration;
  out.ledger = {maxResidualPct: L.maxResidualPct, maxOverBudgetJ: L.maxOverBudgetJ, minSocKJ: L.minSocKJ, accept: L.maxResidualPct < 1 && L.maxOverBudgetJ <= 1};
  const held = new Set((cB.seasons['2026']?.holdout?.tracks || []).map(e => e.track));
  const pt = k => new Map(Object.entries(k.clip.calibration.perTrack).filter(([t]) => held.has(t)));
  out.clip = lossRule(pt(kB), pt(kC));
  out.energy2026 = Object.fromEntries(kC.ledger.calibration.rows.map(r => { const b = kB.ledger.calibration.rows.find(x => x.id === r.id);
    return [r.id, {deployMJ: [+b.deployMJ.toFixed(2), +r.deployMJ.toFixed(2)], recoveredMJ: [+b.recoveredMJ.toFixed(2), +r.recoveredMJ.toFixed(2)]}]; }));
} else out.ledger = out.clip = 'not run';

// 4. trap |e| per F1 track, seasons pooled
const vB = json(dB, 'validate.json'), vC = json(dC, 'validate.json');
const trapBy = V => { const m = new Map(); for (const r of V.rows.filter(r => r.series === 'f1' && Number.isFinite(r.trapKph))) { if (!m.has(r.track)) m.set(r.track, []); m.get(r.track).push(Math.abs(r.trapKph)); } return new Map([...m].map(([t, a]) => [t, mean(a)])); };
out.trap = vB && vC ? {...lossRule(trapBy(vB), trapBy(vC)), bias: Object.fromEntries(Object.keys(vC.summary).filter(k => k.startsWith('f1')).map(k => [k, [vB.summary[k]?.trapBiasKph, vC.summary[k]?.trapBiasKph]]))} : 'not run';

// cars and bounds (reported)
const BOUNDS = {muY: [1.5, 2.4], clA: [2.5, 8], cdA: [0.7, 1.9], cdALow: [0.45, 1.6]}, P0 = y => y === '2026' ? 400e3 : 560e3;
const cars = (c, law) => Object.fromEntries(Object.entries(c.seasons).map(([y, s]) => { const v = s.car, p = law && y !== '2026' ? 540e3 : P0(y);
  const at = Object.entries(BOUNDS).filter(([k, [lo, hi]]) => Math.abs(v[k] - lo) < 1e-3 || Math.abs(v[k] - hi) < 1e-3).map(([k]) => k);
  if (Math.abs(v.pIce / p - 0.85) < 1e-3 || Math.abs(v.pIce / p - 1.15) < 1e-3) at.push('pIce');
  return [y, {muY: +v.muY.toFixed(3), clA: +v.clA.toFixed(3), cdA: +v.cdA.toFixed(3), cdALow: +v.cdALow.toFixed(3), pIceKW: +(v.pIce / 1e3).toFixed(1), law: v.ers?.law ?? null, atBound: at}]; }));
out.cars = {base: cars(cB, false), cand: cars(cC, true)};

out.judgeable = nB.judgeable;
out.pass = out.judgeable && out.heldOut.every(r => r.accept) && [out.levelC, out.forward].every(x => x !== 'not run' && x.tests.every(r => r.accept))
  && out.ledger?.accept === true && out.clip?.accept === true && out.trap?.accept === true;
console.log(JSON.stringify(out, null, 1));
