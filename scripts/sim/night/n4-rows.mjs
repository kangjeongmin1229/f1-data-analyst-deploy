// Step 32 night N4 (report-only, central 21:15): metrics of one k-scan calibration that are not in step36-rows.mjs.
// Lap held-out RMS (F1 rows of heldOut), corner RMS 120–240 and central's speed-bin bias (<120, 120–200, >200 km/h) + per-track slope
// of (model − measured) on measured v_min, car per season (μ, ClA, θ_s, k_s, loadK) and every fitted value within 0.5 % of a bound.
// Same held-out car as step36-rows.mjs (fit car × median drag of the other tracks, median grip of the other tracks; no own-track factor).
// usage (tree with step 32's learn scripts and data): node scripts/sim/night/n4-rows.mjs <calibration-data.js> <out.json>
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as S from '../learn/step32-loto.mjs';
import {heldOut} from '../exp-compare.mjs';
import {F1_BOUNDS} from '../exp-physics.mjs';
import {lapsimCarMeasured as MCD} from '../../../worker/lapsim/car-measured-data.js';

const [calF, out] = process.argv.slice(2), cal = (await import(pathToFileURL(calF).href)).lapsimCalibration;
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const heldCar = (id, y) => { const s = cal.seasons[String(y)], o = Object.entries(s.tracks).filter(([t]) => t !== id), dr = med(o.map(([, t]) => t.drag ?? 1));
  return {car: {...s.car, cdA: s.car.cdA * dr, cdALow: (s.car.cdALow ?? s.car.cdA) * dr}, grip: med(o.map(([, t]) => t.grip))}; };
const rms = a => Math.sqrt(a.reduce((p, q) => p + q * q, 0) / a.length), mean = a => a.reduce((p, q) => p + q, 0) / a.length;
const H = heldOut(cal), f1 = Object.entries(H).filter(([k]) => k.startsWith('f1/')), lapHeld = {all: rms(f1.map(([, v]) => v)), n: f1.length};
for (const y of ['2023', '2024', '2025']) { const r = f1.filter(([k]) => k.startsWith(`f1/${y}|`)).map(([, v]) => v); lapHeld[y] = r.length ? {rmsPct: rms(r), n: r.length} : null; }
const C = [];
for (const e of S.EV) { if (e.year > 2025) continue; const h = heldCar(e.track, e.year);
  const r = S.K.simulateLap(S.trackFor(e.track, e.zones, h.grip, false), h.car, S.envOf(e.track));
  for (const c of S.score(e, {v: Array.from(r.v, x => x * 3.6), lap: r.lapTime}).corners) if (Number.isFinite(c.apex)) C.push({track: e.track, year: e.year, meas: c.meas, err: c.apex}); }
const band = C.filter(c => c.meas >= 120 && c.meas < 240), bins = {};
for (const [k, lo, hi] of [['<120', 0, 120], ['120-200', 120, 200], ['>200', 200, 1e9]]) { const x = C.filter(c => c.meas >= lo && c.meas < hi).map(c => c.err); bins[k] = {n: x.length, meanBiasKph: mean(x), rmsKph: rms(x)}; }
const slope = rows => { const mx = mean(rows.map(r => r.meas)), my = mean(rows.map(r => r.err)); let a = 0, b = 0; for (const r of rows) { a += (r.meas - mx) * (r.err - my); b += (r.meas - mx) ** 2; } return a / b; };
const perTrack = [...new Set(C.map(c => c.track))].sort().map(t => { const x = C.filter(c => c.track === t); return {track: t, n: x.length, slopeKphPerKph: x.length >= 3 ? slope(x) : null}; });
const sl = perTrack.map(p => p.slopeKphPerKph).filter(Number.isFinite);
const seasons = {}, hits = [];
for (const y of ['2023', '2024', '2025', '2026']) { const c = cal.seasons?.[y]?.car; if (!c) continue; const mc = MCD.seasons?.[y];
  const theta = mc ? c.cdA / mc.cdA.value : null, ks = mc ? c.pIce / (mc.pWheel.value / 0.96 - 114e3) : null;
  seasons[y] = {muY: c.muY, muX: c.muX, clA: c.clA, cdA: c.cdA, LoverD: c.clA / c.cdA, pIce: c.pIce, theta_s: theta, k_s: ks, loadK: c.loadK ?? null};
  const B = {muY: F1_BOUNDS.muY, clA: process.env.N4_CLA_MAX && y <= '2025' ? [F1_BOUNDS.clA[0], Number(process.env.N4_CLA_MAX)] : F1_BOUNDS.clA, ...(mc ? {theta_s: [0.7, 1.3], k_s: F1_BOUNDS.pIce} : {cdA: F1_BOUNDS.cdA})};
  for (const [k, [lo, hi]] of Object.entries(B)) { const v = k in c ? c[k] : seasons[y][k], w = 0.005 * (hi - lo);
    if (Number.isFinite(v) && (v <= lo + w || v >= hi - w)) hits.push({season: y, key: k, value: v, bound: v <= lo + w ? lo : hi}); }
  for (const f of cal.seasons[y].holdout?.fits || []) for (const b of f.bounds || []) hits.push({season: y, fold: (f.test || []).join('+'), key: b.key, bound: b.bound, foldCar: true}); }
const res = {calibration: calF, lapHeldOutRmsPct: lapHeld, cornerRms120to240Kph: {n: band.length, rms: rms(band.map(c => c.err)), meanBias: mean(band.map(c => c.err))},
  speedBins: bins, perTrackSlope: {median: med(sl), mean: mean(sl), nTracks: sl.length, tracks: perTrack}, seasons, boundHits_0p5pct: hits};
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify({...res, perTrackSlope: {...res.perTrackSlope, tracks: undefined}}, null, 1));
