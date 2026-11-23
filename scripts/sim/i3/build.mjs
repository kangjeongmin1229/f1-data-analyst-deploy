// I3 (claude/gate-i3-geometry-prereg-2026-11-23.md), steps 2 and 4: car-independent geometry for Jeddah, Shanghai, Imola, Suzuka.
//   node scripts/sim/i3/build.mjs --line   OSM ways (UTM, from fetch.py) -> centre line, least-curvature line, stations for the DEM
//   node scripts/sim/i3/build.mjs --finish elevation (sample.py) -> grade, vertical curvature, banking -> scripts/sim/data/i3/geometry.json
// The production line (car positions) is used only to register the frames, to order the stations and to place the start and the
// distance map; every coordinate of the new line is an OpenStreetMap coordinate. All settings are the pre-registered ones.
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimTrackWidths} from '../../../worker/lapsim/track-widths.js';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {minCurvatureLine, lineTrack} from '../../../worker/lapsim/racing-line.js';

export const IDS = ['jeddah', 'shanghai', 'imola', 'suzuka'];
export const SET = {matchR1: 40, matchR2: 15, headingDeg: 35, offsetSigmaM: 150, sigmaM: 8, carM: 1.2, ds: 5, bridgedMax: 0.05};
const FIA = {jeddah: {lengthM: 6176, widthM: 12}, shanghai: {lengthM: 5451, widthM: 13}, imola: {lengthM: 4909, widthM: 10}, suzuka: {lengthM: 5807, widthM: 10}}; // FIA licensed circuits list (fia-circuits.json)
const D = 'scripts/sim/data/i3', C = '.cache/i3', K = lapsimKernel();
const PIT = /pit|boxen/i;

// closed Gaussian smoothing of a periodic series with spacing h (m)
export function gauss(a, sigmaM, h) {
  const n = a.length, r = Math.ceil(3 * sigmaM / h), w = Array.from({length: 2 * r + 1}, (_, k) => Math.exp(-0.5 * ((k - r) * h / sigmaM) ** 2)), sw = w.reduce((s, x) => s + x, 0);
  return Array.from(a, (_, i) => { let s = 0; for (let k = -r; k <= r; k++) s += w[k + r] * a[((i + k) % n + n) % n]; return s / sw; });
}
export function median(a, k) { const n = a.length, h = k >> 1; return Array.from(a, (_, i) => { const w = []; for (let j = -h; j <= h; j++) w.push(a[((i + j) % n + n) % n]); return w.sort((x, y) => x - y)[h]; }); }
// closed polyline -> points every h metres
export function resample(x, y, h) {
  const n = x.length, s = [0]; for (let i = 1; i <= n; i++) s.push(s[i - 1] + Math.hypot(x[i % n] - x[i - 1], y[i % n] - y[i - 1]));
  const L = s[n], m = Math.round(L / h), d = L / m, X = [], Y = [];
  for (let j = 0, i = 0; j < m; j++) { const t = j * d; while (s[i + 1] < t) i++; const f = (t - s[i]) / ((s[i + 1] - s[i]) || 1); X.push(x[i] + f * (x[(i + 1) % n] - x[i])); Y.push(y[i] + f * (y[(i + 1) % n] - y[i])); }
  return {x: X, y: Y, L, d};
}
// production line in its own frame (heading integrated, end gap spread along the lap)
function prodLine(t) {
  const n = t.heading.length, x = [0], y = [0];
  for (let i = 0; i < n - 1; i++) { const h = t.heading[i] / 1e3; x.push(x[i] + Math.cos(h) * t.ds); y.push(y[i] + Math.sin(h) * t.ds); }
  const h = t.heading[n - 1] / 1e3, ex = x[n - 1] + Math.cos(h) * t.ds, ey = y[n - 1] + Math.sin(h) * t.ds;
  return {x: x.map((v, i) => v - ex * i / n), y: y.map((v, i) => v - ey * i / n), h: Array.from(t.heading, v => v / 1e3)};
}
// OSM segments (pit lanes out), split to <= 10 m, in a 20 m grid
function segIndex(ways) {
  const S = [], G = new Map(), cell = 20;
  for (const w of ways) { if (PIT.test(`${w.tags?.name || ''} ${w.tags?.raceway || ''} ${w.tags?.service || ''}`) || w.tags?.area === 'yes') continue;
    for (let i = 1; i < w.xy.length; i++) { const [a, b] = [w.xy[i - 1], w.xy[i]], k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
      for (let j = 0; j < k; j++) S.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k, a[0] + (b[0] - a[0]) * (j + 1) / k, a[1] + (b[1] - a[1]) * (j + 1) / k]); } }
  S.forEach((s, i) => { for (const [px, py] of [[s[0], s[1]], [s[2], s[3]]]) { const key = Math.floor(px / cell) + ',' + Math.floor(py / cell); const l = G.get(key) || G.set(key, []).get(key); if (l.at(-1) !== i) l.push(i); } });
  const near = (px, py, R, hd) => { let best = null; const r = Math.ceil(R / cell) + 1, i0 = Math.floor(px / cell), j0 = Math.floor(py / cell), seen = new Set();
    for (let i = i0 - r; i <= i0 + r; i++) for (let j = j0 - r; j <= j0 + r; j++) for (const k of G.get(i + ',' + j) || []) { if (seen.has(k)) continue; seen.add(k);
      const [ax, ay, bx, by] = S[k], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)), qx = ax + u * dx, qy = ay + u * dy, d = Math.hypot(px - qx, py - qy);
      if (d > R) continue; if (hd != null) { let a = Math.abs(Math.atan2(dy, dx) - hd) % Math.PI; a = Math.min(a, Math.PI - a); if (a > SET.headingDeg * Math.PI / 180) continue; }
      if (!best || d < best.d) best = {x: qx, y: qy, d}; }
    return best; };
  return {S, near};
}
// trimmed rigid ICP (production -> OSM), many start angles
function register(P, osm) {
  const cx = P.x.reduce((a, b) => a + b, 0) / P.x.length, cy = P.y.reduce((a, b) => a + b, 0) / P.y.length;
  const Q = osm.S.map(s => [(s[0] + s[2]) / 2, (s[1] + s[3]) / 2]), qx = Q.reduce((a, q) => a + q[0], 0) / Q.length, qy = Q.reduce((a, q) => a + q[1], 0) / Q.length;
  const pts = P.x.map((x, i) => [x - cx, P.y[i] - cy]).filter((_, i) => i % 2 === 0);
  const run = (th, tx, ty, it) => { let c = Math.cos(th), s = Math.sin(th), score = Infinity;
    for (let k = 0; k < it; k++) { const pr = []; for (const [x, y] of pts) { const X = c * x - s * y + tx, Y = s * x + c * y + ty, m = osm.near(X, Y, 120, null); if (m) pr.push([x, y, m.x, m.y, m.d]); }
      if (pr.length < pts.length / 3) return {score: Infinity}; pr.sort((a, b) => a[4] - b[4]); const keep = pr.slice(0, Math.floor(pr.length * 0.8)); score = keep.at(-1)[4];
      const mx = keep.reduce((a, p) => a + p[0], 0) / keep.length, my = keep.reduce((a, p) => a + p[1], 0) / keep.length, nx = keep.reduce((a, p) => a + p[2], 0) / keep.length, ny = keep.reduce((a, p) => a + p[3], 0) / keep.length;
      let sxx = 0, sxy = 0; for (const p of keep) { const ax = p[0] - mx, ay = p[1] - my, bx = p[2] - nx, by = p[3] - ny; sxx += ax * bx + ay * by; sxy += ax * by - ay * bx; }
      th = Math.atan2(sxy, sxx); c = Math.cos(th); s = Math.sin(th); tx = nx - (c * mx - s * my); ty = ny - (s * mx + c * my); }
    return {th, tx, ty, score}; };
  let best = {score: Infinity};
  for (let a = 0; a < 360; a += 5) for (const [ox, oy] of [[0, 0], [150, 0], [-150, 0], [0, 150], [0, -150]]) { const r = run(a * Math.PI / 180, qx + ox, qy + oy, 12); if (r.score < best.score) best = r; } // offsets: other courses (karting) pull the centroid
  best = run(best.th, best.tx, best.ty, 40);
  const c = Math.cos(best.th), s = Math.sin(best.th);
  return {x: P.x.map((x, i) => c * (x - cx) - s * (P.y[i] - cy) + best.tx), y: P.x.map((x, i) => s * (x - cx) + c * (P.y[i] - cy) + best.ty), h: P.h.map(h => h + best.th), p80M: +best.score.toFixed(2), rotDeg: +(best.th * 180 / Math.PI).toFixed(2)};
}
// station i of the production line -> OSM point (two passes: wide, then narrow after a smooth offset field)
function match(R, osm, n, dsP) {
  const p1 = R.x.map((x, i) => osm.near(x, R.y[i], SET.matchR1, R.h[i]));
  const ox = p1.map((m, i) => m ? m.x - R.x[i] : null), oy = p1.map((m, i) => m ? m.y - R.y[i] : null), fill = a => { const ok = a.map(v => v != null); const out = a.slice(); for (let i = 0; i < n; i++) if (!ok[i]) { let j = 1; while (j < n && !ok[(i + j) % n] && !ok[(i - j + n) % n]) j++; out[i] = ok[(i + j) % n] ? a[(i + j) % n] : a[(i - j + n) % n] ?? 0; } return out; };
  const sx = gauss(fill(ox), SET.offsetSigmaM, dsP), sy = gauss(fill(oy), SET.offsetSigmaM, dsP);
  const p2 = R.x.map((x, i) => osm.near(x + sx[i], R.y[i] + sy[i], SET.matchR2, R.h[i]));
  const ok = p2.map(Boolean), mx = [], my = [];
  for (let i = 0; i < n; i++) { if (ok[i]) { mx.push(p2[i].x); my.push(p2[i].y); continue; }
    let a = i, b = i; while (!ok[(a - 1 + n) % n] && a > i - n) a--; while (!ok[(b + 1) % n] && b < i + n) b++; a = (a - 1 + n) % n; b = (b + 1) % n;
    const da = ((i - a) % n + n) % n, db = ((b - i) % n + n) % n, f = da / (da + db); mx.push(p2[a].x + (p2[b].x - p2[a].x) * f); my.push(p2[a].y + (p2[b].y - p2[a].y) * f); }
  const d = p2.filter(Boolean).map(m => m.d).sort((a, b) => a - b);
  return {x: mx, y: my, bridged: +(ok.filter(v => !v).length / n).toFixed(4), medianGapM: +d[d.length >> 1].toFixed(2), p95GapM: +d[Math.floor(d.length * 0.95)].toFixed(2)};
}

function buildLine(id) {
  const t = lapsimTracks[id], O = JSON.parse(readFileSync(`${D}/osm-${id}.json`, 'utf8')), osm = segIndex(O.ways), n = t.heading.length;
  // the production frame may be mirrored against the map (car-position frames are not always right-handed): keep the better fit
  const P = prodLine(t), Pm = {x: P.x, y: P.y.map(v => -v), h: P.h.map(v => -v)}, R0 = register(P, osm), R1 = register(Pm, osm), Rg = R1.p80M < R0.p80M ? {...R1, mirrored: true} : R0, M = match(Rg, osm, n, t.ds);
  // centre line: matched OSM points every 1 m, Gaussian sigma 8 m (closed)
  const r1 = resample(M.x, M.y, 1), cx = gauss(r1.x, SET.sigmaM, r1.d), cy = gauss(r1.y, SET.sigmaM, r1.d);
  // start = the OSM point matched to production station 0 (point 0 of the matched list is station 0)
  let k0 = 0, bd = Infinity; cx.forEach((x, i) => { const d = Math.hypot(x - M.x[0], cy[i] - M.y[0]); if (d < bd) { bd = d; k0 = i; } });
  const rot = a => [...a.slice(k0), ...a.slice(0, k0)], c5 = resample(rot(cx), rot(cy), SET.ds), centreLengthM = c5.L;
  const w = lapsimTrackWidths[id] ? {m: lapsimTrackWidths[id].m, source: 'track-widths.js: ' + lapsimTrackWidths[id].source} : {m: FIA[id].widthM, source: 'FIA list of licensed circuits (width)'};
  const half = new Array(c5.x.length).fill(w.m / 2 - SET.carM), rl = minCurvatureLine(c5.x, c5.y, half), line = lineTrack(K, rl.x, rl.y, SET.ds);
  // distance map production -> new: nearest new station to each matched point, monotone
  const lx = Array.from(line.x), ly = Array.from(line.y), m = lx.length, sMap = []; let j = 0;
  for (let i = 0; i < n; i++) { let bj = j, bdd = Infinity; for (let k = j - 3; k <= j + 60; k++) { const q = ((k % m) + m) % m, d = Math.hypot(lx[q] - M.x[i], ly[q] - M.y[i]); if (d < bdd) { bdd = d; bj = k; } }
    j = Math.max(j, bj); sMap.push([+(i * t.ds).toFixed(1), +(Math.min(j, m) * line.ds).toFixed(1)]); }
  sMap[0][1] = 0;
  // stations for the DEM: line points; centre-line edges at +-W/2 (normal of the centre line)
  const nrm = c5.x.map((_, i) => { const a = (i - 1 + c5.x.length) % c5.x.length, b = (i + 1) % c5.x.length, dx = c5.x[b] - c5.x[a], dy = c5.y[b] - c5.y[a], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
  const st = {epsg: O.epsg, line: lx.map((x, i) => [x, ly[i]]), left: c5.x.map((x, i) => [x + nrm[i][0] * w.m / 2, c5.y[i] + nrm[i][1] * w.m / 2]), right: c5.x.map((x, i) => [x - nrm[i][0] * w.m / 2, c5.y[i] - nrm[i][1] * w.m / 2]), centre: c5.x.map((x, i) => [x, c5.y[i]])};
  mkdirSync(C, {recursive: true}); writeFileSync(`${C}/stations-${id}.json`, JSON.stringify(st));
  return {id, epsg: O.epsg, osmSource: O.source, osmWays: O.ways.length, register: {rotDeg: Rg.rotDeg, p80M: Rg.p80M, mirrored: !!Rg.mirrored, p80OtherM: R1.p80M < R0.p80M ? R0.p80M : R1.p80M}, match: {bridgedShare: M.bridged, medianGapM: M.medianGapM, p95GapM: M.p95GapM},
    width: w, centreLengthM: +centreLengthM.toFixed(1), officialLengthM: FIA[id].lengthM, centreVsOfficialPct: +((centreLengthM / FIA[id].lengthM - 1) * 100).toFixed(2),
    lineLengthM: +line.length.toFixed(1), prodLengthM: t.length, ds: line.ds, kappa: Array.from(line.kappa, v => Math.round(v * 1e5)),
    heading: lx.map((_, i) => { const b = (i + 1) % m; return Math.round(Math.atan2(ly[b] - ly[i], lx[b] - lx[i]) * 1e3); }), sMap};
}

function finish(g) {
  const z = JSON.parse(readFileSync(`${C}/z-${g.id}.json`, 'utf8')), meta = JSON.parse(readFileSync(`${C}/dem-${g.id}.json`, 'utf8')), grid = meta.gridM, ds = g.ds, W = g.width.m;
  const fill = a => { const ok = a.map(v => v != null), n = a.length; if (!ok.some(Boolean)) return null; return a.map((v, i) => { if (v != null) return v; let j = 1; while (!ok[(i + j) % n] && !ok[(i - j + n) % n]) j++; return a[(i + j) % n] ?? a[(i - j + n) % n]; }); };
  const prep = (a, h) => { const k = Math.max(1, Math.round(3 * grid / h)) | 1; return gauss(median(a, k), 2 * grid, h); };
  const zl = fill(z.line); if (!zl) return {...g, elevation: {source: meta.source, error: 'no elevation'}};
  const zs = prep(zl, ds), n = zs.length, grade = zs.map((_, i) => Math.atan((zs[(i + 1) % n] - zs[(i - 1 + n) % n]) / (2 * ds))), kv = grade.map((_, i) => (grade[(i + 1) % n] - grade[(i - 1 + n) % n]) / (2 * ds));
  let bank = null; const zL = fill(z.left), zR = fill(z.right);
  if (grid <= W / 2 && zL && zR) { const b = prep(zL.map((v, i) => Math.atan((v - zR[i]) / W)), ds), nc = b.length; bank = Array.from({length: n}, (_, i) => b[Math.min(nc - 1, Math.round(i / n * nc))]); }
  const mx = a => Math.max(...a.map(Math.abs));
  return {...g, grade: grade.map(v => Math.round(v * 1e4)), kv: kv.map(v => Math.round(v * 1e6)), bank: bank && bank.map(v => Math.round(v * 1e4)),
    elevation: {source: meta.source, kind: meta.kind, gridM: grid, licence: meta.licence, url: meta.url, validShare: meta.validShare, missingLineShare: +(z.line.filter(v => v == null).length / n).toFixed(4),
      zRangeM: +(Math.max(...zs) - Math.min(...zs)).toFixed(1), maxGradePct: +(Math.tan(mx(grade)) * 100).toFixed(1), maxKvPerKm: +(mx(kv) * 1000).toFixed(2), maxBankDeg: bank ? +(mx(bank) * 180 / Math.PI).toFixed(1) : null,
      bankNote: bank ? `from edge heights ±${W / 2} m on a ${grid} m grid (only ${Math.round(W / grid)} cells across: coarse)` : `not resolvable: ${grid} m grid > half width ${W / 2} m`,
      smoothing: `running median over ${Math.max(1, Math.round(3 * grid / ds)) | 1} samples, then Gaussian sigma ${2 * grid} m along the lap`}};
}

if (process.argv[1]?.endsWith('build.mjs')) {
  const ids = process.argv.slice(3).length ? process.argv.slice(3) : IDS;
  if (process.argv[2] === '--line') { const out = {}; for (const id of ids) { out[id] = buildLine(id); const {kappa, heading, sMap, ...q} = out[id]; console.log(JSON.stringify(q)); } writeFileSync(`${C}/lines.json`, JSON.stringify(out)); }
  else if (process.argv[2] === '--finish') {
    const L = JSON.parse(readFileSync(`${C}/lines.json`, 'utf8')), out = {};
    for (const id of ids) out[id] = existsSync(`${C}/z-${id}.json`) ? finish(L[id]) : {...L[id], elevation: {error: 'no elevation file'}};
    writeFileSync(`${D}/geometry.json`, JSON.stringify({note: 'I3 car-independent geometry (claude/gate-i3-geometry-prereg-2026-11-23.md). Integers: kappa x1e5 1/m, grade x1e4 rad, kv x1e6 1/m, bank x1e4 rad, heading x1e3 rad (UTM grid, east = 0, ccw). sMap: [production m, new m]. Not read by the site.', settings: SET, generated: new Date().toISOString(), tracks: out}));
    for (const g of Object.values(out)) { const {kappa, heading, sMap, grade, kv, bank, ...q} = g; console.log(JSON.stringify(q)); }
  } else console.log('usage: build.mjs --line | --finish [ids]');
}
