// Step 35 FE line audit (central 18:10 item 2; report only). Which path the FE kernel drives, corner radii vs the assumed width,
// and how the sector lines are placed on that path. Tokyo, Jeddah (FE map tracks), Monaco (F1 driven line).
//   node scripts/sim/learn/fe-line-audit.mjs <fe-sector-lines.json> [out.json]
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {minCurvatureLine, lineTrack} from '../../../worker/lapsim/racing-line.js';
import {FE_GENS} from '../../../worker/lapsim/fe-cars.js';

const [SLF, OUTF] = process.argv.slice(2), SL = JSON.parse(readFileSync(SLF, 'utf8')).tracks;
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, car = FE_GENS['fe-gen3evo'].car;
const ENV = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
const r = (x, d = 1) => Number.isFinite(x) ? +x.toFixed(d) : null;
// curvature of a closed polyline, smoothed over ±w points (centre line from the map)
function kappaOf(x, y, w = 2) { const n = x.length, k = new Array(n);
  for (let i = 0; i < n; i++) { const a = (i - w + n) % n, b = (i + w) % n, ax = x[i] - x[a], ay = y[i] - y[a], bx = x[b] - x[i], by = y[b] - y[i];
    const h = Math.atan2(ax * by - ay * bx, ax * bx + ay * by), s = Math.hypot(ax, ay) + Math.hypot(bx, by); k[i] = h / (s / 2); } return k; }
const corners = (kap, ds) => { const n = kap.length, out = [];
  for (let i = 0; i < n; i++) { const a = Math.abs(kap[i]); if (a < 1 / 150) continue; let peak = true; for (let d = -6; d <= 6; d++) if (d && Math.abs(kap[(i + d + n) % n]) > a) peak = false;
    if (peak) { let th = 0; for (let d = -20; d <= 20; d++) th += kap[(i + d + n) % n] * ds; out.push({i, s: Math.round(i * ds), R: r(1 / a), deflDeg: Math.round(Math.abs(th) * 180 / Math.PI)}); } }
  return out; };
const lapOf = trk => { const res = K.simulateLap(trk, car, ENV); return res; };
const report = {};
for (const id of ['fe-tokyo', 'fe-jeddah', 'monte-carlo']) {
  const t = ALL[id], m = t.map, n0 = m.x.length, fe = t.series === 'fe', half = fe ? t.quality.halfWidthM : null;
  const base = K.trackFromData(t), res = lapOf(base), sl = SL[id];
  // 1) path and corners
  const lineK = t.kappa.map(v => v / 1e5), lc = corners(lineK, t.ds);
  const cx = m.x, cy = m.y, ck = kappaOf(cx, cy), cds = (fe ? t.quality.centreLengthM : t.length) / n0;
  const rows = lc.sort((a, b) => a.R - b.R).slice(0, 6).map(c => { const j = Math.round(c.i / t.kappa.length * n0); let kmax = 0;
    for (let d = -8; d <= 8; d++) kmax = Math.max(kmax, Math.abs(ck[(j + d + n0) % n0])); const Rc = 1 / kmax;
    const th = c.deflDeg * Math.PI / 180, Rmax = fe ? Rc + 2 * half / (1 - Math.cos(th / 2)) : null; // one arc touching both edges
    return {s: c.s, deflDeg: c.deflDeg, Rcentre: r(Rc), Rline: c.R, RlineOverCentre: r(c.R / Rc, 2), RmaxOneArc: r(Rmax), vApexKph: r(res.v[c.i] * 3.6)}; });
  // 2) width sensitivity (FE map tracks: rebuild the least-curvature line at other widths)
  let width = null;
  if (fe) { width = {};
    for (const w of [8, 11, 14]) { const h = Math.max(1, w / 2 - 1.2), rl = minCurvatureLine(cx, cy, new Array(n0).fill(h)), L = lineTrack(K, rl.x, rl.y, 5);
      const trk = K.trackFromData({...t, ds: L.ds, length: Math.round(L.length), kappa: Array.from(L.kappa, v => Math.round(v * 1e5))}), q = lapOf(trk);
      width[w + ' m'] = {lineLengthM: Math.round(L.length), lapS: r(q.lapTime, 3), minRm: r(1 / Math.max(...L.kappa.map(Math.abs)))}; }
    const l11 = width['11 m'].lapS; for (const w in width) width[w].lapVs11Pct = r((width[w].lapS / l11 - 1) * 100, 2); }
  // 3) sector lines: by line-index fraction (used in the audits) vs by projection of the centre-line distance onto the line
  let sectors = null;
  if (sl && fe) { const rl = minCurvatureLine(cx, cy, new Array(n0).fill(half)), n = res.v.length, f = i => i / n;
    // centre fraction of each line point: nearest centre point (resampled line has n0 points on the same index grid)
    const cfrac = Array.from({length: n0}, (_, i) => { let b = 0, bd = Infinity; for (let j = Math.max(0, i - 40); j < Math.min(n0, i + 40); j++) { const d = Math.hypot(rl.x[i] - cx[j], rl.y[i] - cy[j]); if (d < bd) { bd = d; b = j; } } return b / n0; });
    // line arc fraction of each resampled line point
    const arc = [0]; for (let i = 1; i < n0; i++) arc.push(arc[i - 1] + Math.hypot(rl.x[i] - rl.x[i - 1], rl.y[i] - rl.y[i - 1])); const tot = arc.at(-1) + Math.hypot(rl.x[0] - rl.x[n0 - 1], rl.y[0] - rl.y[n0 - 1]);
    const proj = fc => { const i = cfrac.findIndex(c => c >= fc); return arc[i] / tot; };
    const tAt = fr => res.time[Math.min(n - 1, Math.round(fr * n))], share = (a, b) => [tAt(a), tAt(b) - tAt(a), res.lapTime - tAt(b)].map(x => x / res.lapTime * 100);
    const used = share(sl.f1, sl.f2), pj = [proj(sl.f1), proj(sl.f2)], fixed = share(pj[0], pj[1]);
    sectors = {printed: [sl.i1M, sl.i2M], usedLineFraction: [sl.f1, sl.f2], projectedLineFraction: pj.map(v => r(v, 4)),
      shiftAlongLineM: pj.map((v, k) => r((v - [sl.f1, sl.f2][k]) * t.length)), modelSharePct: {used: used.map(v => r(v, 2)), projected: fixed.map(v => r(v, 2)), deltaPp: fixed.map((v, k) => r(v - used[k], 2))}}; }
  report[id] = {path: fe ? `least-curvature line inside a uniform ${t.quality.widthM} m width (half-width ${half} m for the car centre), width assumed, flat` : `measured driven line (F1 car positions, ${t.quality.laps} laps), FE uses the same circuit`,
    lineLengthM: t.length, centreOrOfficialM: fe ? t.quality.centreLengthM : 3337, lapS: r(res.lapTime, 3), tightestCorners: rows, width, sectors}; }
const brakingRule = 'audits: a corner = one run of non-power-limited points (braking + apex + traction), so braking zones count in the corner bin of the sector where they lie; A2 counted braking zones (≥ 20 m, ≥ 1.5 g) in the sector where they start';
const out = {note: 'report only', brakingRule, tracks: report}; if (OUTF) writeFileSync(OUTF, JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
