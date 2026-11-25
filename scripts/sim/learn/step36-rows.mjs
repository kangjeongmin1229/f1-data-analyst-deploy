// Step 36 rows (b) straight-end RMS and (c) braking p95 on a calibration, no own-track factor (pre-reg 4bf823a9 §9).
// usage (worktree with step 32's learn scripts and data): node scripts/sim/learn/step36-rows.mjs <calibration-data.js> <out.json>
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as S from './step32-loto.mjs';
import {processLap, simAtXs, envelope, valid, USED} from './step32-forward.mjs';

const [calF, out] = process.argv.slice(2), cal = (await import(pathToFileURL(calF).href)).lapsimCalibration, G = 9.81, B = 500, SEED = 7;
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const heldCar = (id, y) => { const s = cal.seasons[String(y)], o = Object.entries(s.tracks).filter(([t]) => t !== id), dr = med(o.map(([, t]) => t.drag ?? 1));
  return {car: {...s.car, cdA: s.car.cdA * dr, cdALow: (s.car.cdALow ?? s.car.cdA) * dr}, grip: med(o.map(([, t]) => t.grip))}; };
const memo = new Map(), simOf = e => { const k = e.track + '|' + e.year; if (!memo.has(k)) { const h = heldCar(e.track, e.year);
  const r = S.K.simulateLap(S.trackFor(e.track, e.zones, h.grip, false), h.car, S.envOf(e.track)); memo.set(k, Array.from(r.v, x => x * 3.6)); } return memo.get(k); };
const laps = S.EV.map(e => { const v = simOf(e), k = USED[S.keyOf(e)];
  return {track: e.track, se: S.strEnd(e, {v}), meas: k != null ? processLap(e, e.sp, k) : null, model: k != null ? processLap(e, simAtXs(e, v)) : null}; });
const tracks = [...new Set(laps.map(l => l.track))].sort(), byT = Object.fromEntries(tracks.map(t => [t, laps.filter(l => l.track === t)]));
const rmsStr = ts => { const b = ts.map(t => { const x = byT[t].flatMap(l => l.se); return x.reduce((p, q) => p + q, 0) / x.length; }).filter(Number.isFinite);
  return Math.sqrt(b.reduce((p, q) => p + q * q, 0) / b.length); };
const brk = ts => { const L = ts.flatMap(t => byT[t]).filter(l => l.meas), M = envelope(L.map(l => ({track: l.track, samples: l.meas}))).brk,
  P = envelope(L.map(l => ({track: l.track, samples: l.model}))).brk, d = M.map((b, j) => valid(b) && P[j].p95 != null ? (P[j].p95 - b.p95) / G : null).filter(x => x != null);
  return d.length ? d.reduce((p, q) => p + q, 0) / d.length : NaN; };
const rng = s => () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const sd = a => { const m = a.reduce((p, q) => p + q, 0) / a.length; return Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1)); };
const u = rng(SEED), bS = [], bB = [];
for (let i = 0; i < B; i++) { const ts = tracks.map(() => tracks[Math.floor(u() * tracks.length)]); bS.push(rmsStr(ts)); bB.push(brk(ts)); }
const row = (v, b) => { const se = sd(b.filter(Number.isFinite)), mde = 2.97 * se; return {base: +v.toFixed(4), se: +se.toFixed(4), mde: +mde.toFixed(4), mdeShare: +(mde / Math.abs(v)).toFixed(3), reportOnly: mde > 0.3 * Math.abs(v)}; };
const res = {calibration: calF, laps: laps.length, tracks: tracks.length, bootstrap: {B, seed: SEED, unit: 'track'},
  straightEndRmsKph: row(rmsStr(tracks), bS), brakingP95MeanExcessG: row(brk(tracks), bB)};
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1));
