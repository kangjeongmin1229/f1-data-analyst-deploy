// WEC BoP Δ benchmark (step 21 v1, rules: Project claude/status-2026-11-24-step21-bop-benchmark.md §1, sha256 d6cb2d83…3ef2), reused
// unchanged as a ship guard (central 2026-11-26 14:28). Only changes vs claude/release/step21-bop-benchmark-2026-11-24.patch:
// the calibration file comes from BOP_CAL (default worker/lapsim/calibration-data.js) and the output from BOP_OUT.
// Run from a repo root: BOP_CAL=<calibration-data.js> BOP_OUT=<out.json> node <this> predict
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const MODE = process.argv[2] || 'cases', ROOT = process.cwd();
const split = l => { const o = []; let f = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i];
  if (c === '"') { if (q && l[i + 1] === '"') { f += '"'; i++; } else q = !q; } else if (c === ',' && !q) { o.push(f); f = ''; } else f += c; } o.push(f); return o; };
const csv = t => { const [h, ...L] = t.replace(/^﻿/, '').trim().split(/\r?\n/), c = split(h); return L.map(l => Object.fromEntries(split(l).map((v, i) => [c[i], v]))); };
const TRACK = [[/sebring/i, 'sebring'], [/portim|algarve/i, 'portimao'], [/spa/i, 'spa-francorchamps'], [/le mans$|24 hours of le mans|^le mans/i, 'le-mans'],
  [/monza/i, 'monza'], [/fuji/i, 'fuji'], [/bahrain/i, 'sakhir'], [/qatar|losail/i, 'lusail'], [/imola/i, 'imola'], [/sao paulo/i, 'interlagos'],
  [/lone star|americas/i, 'austin']];
const trackOf = e => TRACK.find(([re]) => re.test(e))?.[1] ?? null;
const key = s => String(s).toLowerCase().split(/\s+/)[0];
const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const CLS = {Hypercar: 'HYPERCAR', LMGT3: 'LMGT3'};

const bop = new Map(), multi = [];
for (const r of csv(readFileSync('scripts/sim/data/fia-docs/wec-bop-2023-2026.csv', 'utf8'))) {
  if (!CLS[r.class] || !/^published/.test(r.status) || +r.year > 2025) continue;
  const o = JSON.parse(r.other || '{}'), k = [CLS[r.class], r.year, trackOf(r.event), key(r.car_model)].join('|');
  const v = {kg: +r.min_weight_kg || null, kW: +r.max_power_kw || null, MJ: +r.energy_per_stint_mj || null, curve: o.curve_id ?? null, gain: o.power_gain_above_pct ?? null, model: r.car_model, src: r.source_url};
  if (bop.has(k)) multi.push(k); bop.set(k, v);
}
const lap = new Map();
for (const r of csv(gunzipSync(readFileSync('scripts/sim/data/learn/wec-alkamel-cars.csv.gz')).toString())) {
  if (r.series !== 'wec' || r.type !== 'Q' || !['HYPERCAR', 'LMGT3'].includes(r.cls) || !(+r.season >= 2023 && +r.season <= 2025)) continue;
  const t = trackOf(r.event); if (!t || !(+r.best > 20)) continue;
  const k = [r.cls, r.season, t, key(r.vehicle)].join('|'), p = lap.get(k), x = {t: +r.best, rain: +r.rainShare, trackC: +r.trackC || null, vehicle: r.vehicle, entry: r.entry, session: r.session};
  if (!p) lap.set(k, {...x, rainMax: x.rain, temps: [x.trackC]}); else { p.rainMax = Math.max(p.rainMax, x.rain); p.temps.push(x.trackC); if (x.t < p.t) Object.assign(p, {t: x.t, vehicle: x.vehicle, entry: x.entry, session: x.session}); }
}
const tyres = JSON.parse(readFileSync('scripts/sim/data/wec-tyres.json', 'utf8'));
const lines = csv(readFileSync('scripts/sim/data/fia-docs/wec-timing-lines-2023-2025.csv', 'utf8')).filter(r => r.line === 'S3');
const lapLen = (t, y) => lines.find(r => trackOf(r.circuit.replace('Qatar / Lusail', 'Qatar').replace('São Paulo / Interlagos', 'Sao Paulo').replace('COTA', 'americas').replace('Portimão', 'Portimao')) === t && r.year === String(y))?.distance_m;
const mean = a => { const v = a.filter(Number.isFinite); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };
const med = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n ? (n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };

const visits = {}; for (const k of bop.keys()) { const [c, y, t] = k.split('|'); ((visits[c + '|' + t] ||= new Set())).add(+y); }
const cases = [];
for (const [ct, ys] of Object.entries(visits)) { const [c, t] = ct.split('|'), Y = [...ys].sort();
  for (let i = 0; i + 1 < Y.length; i++) { const [y1, y2] = [Y[i], Y[i + 1]];
    const models = [...bop.keys()].filter(k => k.startsWith([c, y1, t].join('|') + '|')).map(k => k.split('|')[3]).filter(m => bop.has([c, y2, t, m].join('|')));
    for (const m of models) { const a = bop.get([c, y1, t, m].join('|')), b = bop.get([c, y2, t, m].join('|'));
      const step = ['kg', 'kW', 'MJ'].filter(q => a[q] !== b[q]); if (!step.length) continue;
      const L1 = lap.get([c, y1, t, m].join('|')), L2 = lap.get([c, y2, t, m].join('|'));
      const refs = models.filter(o => o !== m && lap.has([c, y1, t, o].join('|')) && lap.has([c, y2, t, o].join('|')));
      const drop = [];
      if (L1 && L2 && (L1.rainMax > 0.02 || L2.rainMax > 0.02 || Math.abs(mean(L1.temps) - mean(L2.temps)) > 10)) drop.push('D1 weather');
      const l1 = lapLen(t, y1), l2 = lapLen(t, y2); if (l1 && l2 && l1 !== l2) drop.push('D2 track length');
      const ty = y => tyres[t]?.[y]?.[c === 'HYPERCAR' ? 'hypercar' : 'lmgt3']?.dry; const d1 = ty(y1), d2 = ty(y2);
      if (d1 && d2 && d1.join() !== d2.join()) drop.push('D3 tyre');
      if (L1 && L2 && norm(L1.vehicle) !== norm(L2.vehicle)) drop.push('D4 car change');
      if (!L1 || !L2 || refs.length < 2) drop.push('D5 no laps');
      if (c === 'LMGT3' && (a.curve !== b.curve || a.gain !== b.gain)) drop.push('D6 LMGT3 power entry');
      const tref = y => med(refs.map(o => lap.get([c, y, t, o].join('|')).t));
      const meas = !drop.length ? (L2.t - tref(y2)) - (L1.t - tref(y1)) : null;
      cases.push({cls: c, track: t, y1, y2, model: m, step: step.join('+'), kg1: a.kg, kg2: b.kg, kW1: a.kW, kW2: b.kW, MJ1: a.MJ, MJ2: b.MJ,
        lap1: L1?.t ?? '', lap2: L2?.t ?? '', refs: refs.join(' '), dMeasS: meas == null ? '' : +meas.toFixed(3), drop: drop.join('; ')}); } } }
cases.sort((p, q) => (p.cls + p.track + p.y1 + p.model).localeCompare(q.cls + q.track + q.y1 + q.model));

const {lapsimKernel} = await import(pathToFileURL(resolve(ROOT, 'worker/lapsim/kernel.js')).href);
const {lapsimTracks, lapsimExtraTracks} = await import(pathToFileURL(resolve(ROOT, 'worker/lapsim/tracks-data.js')).href);
const {lapsimCalibration} = await import(pathToFileURL(resolve(process.env.BOP_CAL || 'worker/lapsim/calibration-data.js')).href);
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks}, W = lapsimCalibration.series.wec, env = K.conditionsFromWeather({});
const LMH = new Set(['toyota', 'ferrari', 'peugeot', 'aston', 'glickenhaus', 'vanwall', 'isotta']);
const simCache = new Map();
function simT(c, y, t, m) { const k = [c, y, t, m].join('|'); if (simCache.has(k)) return simCache.get(k);
  const all = [...bop.keys()].filter(x => x.startsWith([c, y, t].join('|') + '|')).map(x => bop.get(x)), b = bop.get(k);
  const kg0 = mean(all.map(x => x.kg)), kW0 = mean(all.map(x => x.kW));
  const base = c === 'LMGT3' ? W.lmgt3['2025'].car : (LMH.has(m) ? W.lmh : W.lmdh)['2025'].car;
  const car = {...base, mass: base.mass * b.kg / kg0, ...(c === 'HYPERCAR' ? {pIce: base.pIce * b.kW / kW0} : {})};
  const v = K.simulateLap(K.trackFromData(ALL[t]), car, env).lapTime; simCache.set(k, v); return v; }
const out = [];
for (const r of cases) { if (r.drop) { out.push(r); continue; } const refs = r.refs.split(' ');
  const rel = y => simT(r.cls, y, r.track, r.model) - med(refs.map(o => simT(r.cls, y, r.track, o)));
  const pred = rel(r.y2) - rel(r.y1), err = pred - r.dMeasS, tol = Math.max(0.25 * Math.abs(r.dMeasS), 0.05);
  out.push({...r, dPredS: +pred.toFixed(3), errS: +err.toFixed(3), tolS: +tol.toFixed(3), pass: Math.abs(err) <= tol, signOk: Math.sign(pred) === Math.sign(r.dMeasS) || (Math.abs(r.dMeasS) < 1e-9)}); }
writeFileSync(process.env.BOP_OUT || 'wec-bop-delta-results.json', JSON.stringify(out, null, 1));
const K2 = out.filter(r => !r.drop);
console.log(JSON.stringify({n: K2.length, pass: K2.filter(r => r.pass).length, signErrors: K2.filter(r => !r.signOk).length, medAbsErrS: med(K2.map(r => Math.abs(r.errS)))}));
