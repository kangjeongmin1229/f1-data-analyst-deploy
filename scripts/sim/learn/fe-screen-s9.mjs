// Screen S9 (central 07:15 KST 26 Nov; report only): FE layout geometry. (1) 32's fault rule adapted to FE: implied a_y at the
// "measured" apex speed (model apex speed × model / measured sector time) with the raw κ of the official map centre line and of the
// kernel line; limit 3.5 g. (2) Per-layout sector offsets (duel-matched) and the geometry of each large-offset sector.
//   LAPSIM_FE_AXLE=v1 LAPSIM_FE_BRAKE=on node scripts/sim/learn/fe-screen-s9.mjs <fe-sector-lines.json> <fe-duel-rows.json> <fe-fit.json> [out.json]
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {feCarFor} from '../../../worker/lapsim/fe-cars.js';

const [SLF, DUELF, FITF, OUTF] = process.argv.slice(2), G = 9.80665, LIMIT_G = 3.5;
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks};
const SL = JSON.parse(readFileSync(SLF, 'utf8')).tracks, DUEL = JSON.parse(readFileSync(DUELF, 'utf8')).files.flatMap(f => f.rows), FIT = JSON.parse(readFileSync(FITF, 'utf8'));
const r = (x, d = 2) => Number.isFinite(x) ? +x.toFixed(d) : null, mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const ENV = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
// curvature of the official map centre line (closed polyline, ±w points = ±15 m chords; integer-metre map points make ±1 point pure noise)
const kapMap = (x, y, w = 3) => { const n = x.length; return x.map((_, i) => { const a = (i - w + n) % n, b = (i + w) % n, ax = x[i] - x[a], ay = y[i] - y[a], bx = x[b] - x[i], by = y[b] - y[i];
  return Math.atan2(ax * by - ay * bx, ax * bx + ay * by) / ((Math.hypot(ax, ay) + Math.hypot(bx, by)) / 2); }); };
const sectorOf = (f, sl) => f < sl.f1 ? 0 : f < sl.f2 ? 1 : 2;
const perLayout = {};
for (const f of FIT.rows) { const sl = SL[f.layout], d = DUEL.find(q => Math.abs(q.time - f.real) < 0.0015); if (!sl || !d || !ALL[f.layout]) continue;
  const t = ALL[f.layout], res = K.simulateLap(K.trackFromData(t), feCarFor(f.key, f.season, f.session, 'Q'), ENV), n = res.v.length, tAt = x => res.time[Math.min(n - 1, Math.round(x * n))];
  const ms = [tAt(sl.f1), tAt(sl.f2) - tAt(sl.f1), res.lapTime - tAt(sl.f2)], mt = [d.s1, d.s2, d.s3], scale = ms.map((m, s) => m / res.lapTime / (mt[s] / d.time)); // > 1: model sector too slow
  const sec = [0, 1, 2].map(s => (mt[s] / d.time - ms[s] / res.lapTime) * 100); // + = model too fast in this sector (% of lap)
  (perLayout[f.layout] ||= {rows: [], res, t, sl}).rows.push({season: f.season, key: f.key, sec, scale}); }
const out = {note: 'report only; FE has no measured speeds: v_meas = v_model × (model sector share / measured sector share), assumption', limitG: LIMIT_G, faults: [], layouts: {}};
for (const [id, L] of Object.entries(perLayout)) { const {res, t, sl} = L, n = res.v.length, ds = t.ds, m = t.map, n0 = m.x.length, ck = kapMap(m.x, m.y);
  const off = [0, 1, 2].map(s => mean(L.rows.map(q => q.sec[s]))), scl = [0, 1, 2].map(s => mean(L.rows.map(q => q.scale[s])));
  // corners = local minima of the model speed (±40 m), with line κ and centre κ (max |κ| within ±25 m of the apex)
  const corners = []; const w = Math.round(40 / ds);
  for (let i = 0; i < n; i++) { let min = true; for (let k = -w; k <= w; k++) if (k && res.v[(i + k + n) % n] < res.v[i]) { min = false; break; } if (!min || res.limit[i] === 2) continue;
    const s = sectorOf(i / n, sl), vMeas = res.v[i] * scl[s], j = Math.round(i / n * n0); let kl = 0, kc = 0;
    for (let k = -Math.round(25 / ds); k <= Math.round(25 / ds); k++) kl = Math.max(kl, Math.abs(t.kappa[(i + k + n) % n] / 1e5));
    for (let k = -5; k <= 5; k++) kc = Math.max(kc, Math.abs(ck[(j + k + n0) % n0]));
    const c = {at: Math.round(i * ds), sector: s + 1, vModelKph: r(res.v[i] * 3.6, 1), vMeasKph: r(vMeas * 3.6, 1), Rline: r(1 / kl, 1), Rcentre: r(1 / kc, 1),
      ayLineG: r(vMeas ** 2 * kl / G), ayCentreG: r(vMeas ** 2 * kc / G), ayModelG: r(res.v[i] ** 2 * kl / G)};
    corners.push(c); if (c.ayLineG > LIMIT_G || c.ayCentreG > LIMIT_G) out.faults.push({layout: id, ...c}); }
  // sector geometry for the offset table
  const sectors = [0, 1, 2].map(s => { const a = s === 0 ? 0 : s === 1 ? sl.f1 : sl.f2, b = s === 0 ? sl.f1 : s === 1 ? sl.f2 : 1, i0 = Math.round(a * n), i1 = Math.round(b * n);
    let kmax = 0, chic = 0, last = 0, lastAt = -1e9;
    for (let i = i0; i < i1; i++) { const k = t.kappa[i] / 1e5; kmax = Math.max(kmax, Math.abs(k)); if (Math.abs(k) > 1 / 80) { const sg = Math.sign(k); if (last && sg !== last && (i - lastAt) * ds <= 60) chic++; last = sg; lastAt = i; } }
    const cs = corners.filter(c => c.sector === s + 1);
    return {offsetPp: r(off[s]), lengthM: Math.round((b - a) * t.length), tightestRline: r(1 / kmax, 1), chicanes: chic, corners: cs.length,
      tightestRcentre: cs.length ? Math.min(...cs.map(c => c.Rcentre)) : null, maxAyLineG: cs.length ? Math.max(...cs.map(c => c.ayLineG)) : null}; });
  out.layouts[id] = {rows: L.rows.length, seasons: L.rows.map(q => q.season), lineLengthM: t.length, centreLengthM: t.quality?.centreLengthM, officialM: t.officialLengthM ?? t.quality?.officialLengthM ?? null,
    sectors, maxAyLineG: Math.max(...corners.map(c => c.ayLineG)), maxAyCentreG: Math.max(...corners.map(c => c.ayCentreG)), corners}; }
out.faults.sort((a, b) => Math.max(b.ayLineG, b.ayCentreG) - Math.max(a.ayLineG, a.ayCentreG));
if (OUTF) writeFileSync(OUTF, JSON.stringify(out, null, 1));
console.log(JSON.stringify({faults: out.faults.length, top: out.faults.slice(0, 15), layouts: Object.fromEntries(Object.entries(out.layouts).map(([k, v]) => [k, {rows: v.rows, lineLengthM: v.lineLengthM, centreLengthM: v.centreLengthM, officialM: v.officialM, maxAyLineG: r(v.maxAyLineG), maxAyCentreG: r(v.maxAyCentreG), sectors: v.sectors}]))}, null, 1));
