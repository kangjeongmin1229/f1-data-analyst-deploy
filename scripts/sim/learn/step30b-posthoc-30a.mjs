// Step 30a (report-only): is the F1 corner-speed gap from grip or from the line? Pre-registration: Project
// claude/prereg-step30a-line-vs-grip-2026-11-25.md (sha256 d66215b8…4ce4ba). No fit, no model change.
// In: scripts/sim/data/f1-pedal-gap-corners-2025-2026.csv, the page track (simulationPage), worker/lapsim/racing-lines-data.js.
// Out: scripts/sim/data/step30a-corners.csv, scripts/sim/data/step30a-result.json (+ .sha256). Usage: node scripts/sim/learn/step30a-line-vs-grip.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {simulationPage} from '../../../worker/simulation.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimRacingLines} from '../../../worker/lapsim/racing-lines-data.js';
import {lapsimTrackWidths} from '../../../worker/lapsim/track-widths.js';

// POST-HOC copy of step30a-line-vs-grip.mjs for step 30b (central 2026-11-25 decision 1): same code, corrected corner table.
const IN = process.env.STEP30B_IN, D = process.env.STEP30B_OUT;
const sha = t => createHash('sha256').update(t).digest('hex');
const csvText = readFileSync(IN, 'utf8');
if (sha(csvText) !== process.env.STEP30B_IN_SHA) throw new Error('input CSV changed');
const [head, ...lines] = csvText.trim().split('\n'), H = head.split(',');
const rows = lines.map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], i < 2 ? v : +v])))
  .filter(r => r.apex_kph_meas > 0 && r.apex_kph_model > 0);

// page track (the kappa the kernel drives)
const pageTrack = new Map();
function track(id, season) {
  const k = id + season; if (pageTrack.has(k)) return pageTrack.get(k);
  const d = JSON.parse(simulationPage({track: id, car: season}, 'en').match(/id="lapsim-data">([\s\S]*?)<\/script>/)[1]).track;
  const t = {ds: d.ds, kappa: d.kappa.map(v => v / 1e5), corners: d.corners || []}; pageTrack.set(k, t); return t;
}
// same 8 m resample as racing-lines.mjs
function resample(x, y, step) {
  const s = [0]; for (let i = 1; i <= x.length; i++) s.push(s[i - 1] + Math.hypot(x[i % x.length] - x[i - 1], y[i % x.length] - y[i - 1]));
  const L = s.at(-1), n = Math.round(L / step), X = [], Y = [];
  for (let k = 0, j = 0; k < n; k++) { const t = k * L / n; while (s[j + 1] < t) j++; const f = (t - s[j]) / (s[j + 1] - s[j] || 1), b = (j + 1) % x.length; X.push(x[j] + f * (x[b] - x[j])); Y.push(y[j] + f * (y[b] - y[j])); }
  return {x: X, y: Y};
}
const normals = (x, y) => x.map((_, i) => { const n = x.length, dx = x[(i + 1) % n] - x[(i - 1 + n) % n], dy = y[(i + 1) % n] - y[(i - 1 + n) % n], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
// 3-point curvature, points 2 apart (±16 m at 8 m), then [1 2 1]/4 (as lineTrack)
function curv(x, y) {
  const m = x.length, k = new Float64Array(m);
  for (let j = 0; j < m; j++) { const a = (j - 2 + m) % m, b = (j + 2) % m, ax = x[j] - x[a], ay = y[j] - y[a], bx = x[b] - x[j], by = y[b] - y[j];
    k[j] = 2 * (ax * by - ay * bx) / (Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(x[b] - x[a], y[b] - y[a]) || 1); }
  return k.map((v, j) => (k[(j - 1 + m) % m] + 2 * v + k[(j + 1) % m]) / 4);
}
const lineGeo = new Map();
function geo(id) {
  if (lineGeo.has(id)) return lineGeo.get(id);
  const L = lapsimRacingLines.tracks[id], td = lapsimTracks[id]; if (!L || !td?.map?.x?.length) { lineGeo.set(id, null); return null; }
  // the map was rebuilt after racing-lines-data.js (1-4 points fewer at 8 m): match each line point to its nearest reference point
  const ref = resample(td.map.x, td.map.y, 8), m = ref.x.length, n = L.line.length, nrm = normals(ref.x, ref.y), kRef = curv(ref.x, ref.y);
  const near = j => { const e = Math.round(j * m / n); let bi = e, bd = Infinity; for (let k = -12; k <= 12; k++) { const i = ((e + k) % m + m) % m, d = (ref.x[i] - L.line[j][0]) ** 2 + (ref.y[i] - L.line[j][1]) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
  const idx = L.line.map((_, j) => near(j)), lat = (p, j) => { const i = idx[j]; return (p[0] - ref.x[i]) * nrm[i][0] + (p[1] - ref.y[i]) * nrm[i][1]; };
  const g = {edges: L.edges, n, m, idx, lo: L.left.map(lat), ro: L.right.map(lat), mc: L.line.map(lat), kRef: idx.map(i => kRef[i]), kLine: curv(L.line.map(p => p[0]), L.line.map(p => p[1])),
    midOffM: L.left.map((l, j) => Math.abs((lat(l, j) + lat(L.right[j], j)) / 2))};
  lineGeo.set(id, g); return g;
}

function lagM(id, t) { const G = geo(id); if (!G) return null; const ref = resample(lapsimTracks[id].map.x, lapsimTracks[id].map.y, 8), kr = curv(ref.x, ref.y), m = kr.length, n = t.kappa.length;
  const ka = Array.from({length: m}, (_, i) => Math.abs(t.kappa[Math.round(i * n / m) % n])); let best = [0, -Infinity];
  for (let s = -10; s <= 10; s++) { let c = 0; for (let i = 0; i < m; i++) c += ka[i] * Math.abs(kr[((i + s) % m + m) % m]); if (c > best[1]) best = [s, c]; } return best[0] * 8; }
const out = [];
for (const r of rows) {
  const t = track(r.track, r.season), n = t.kappa.length, L = n * t.ds, c = Math.round(r.lap_share * n), h = Math.max(Math.round(0.01 * n), Math.round(40 / t.ds));
  let ia = c; for (let k = -h; k <= h; k++) { const i = ((c + k) % n + n) % n; if (Math.abs(t.kappa[i]) > Math.abs(t.kappa[((ia % n) + n) % n])) ia = c + k; }
  ia = ((ia % n) + n) % n;
  const sg = Math.sign(t.kappa[ia]), cap = Math.round(500 / t.ds);
  const defl = th => { let s = 0; for (let k = 0; k <= cap; k++) { const v = t.kappa[(ia + k) % n]; if (Math.sign(v) !== sg || Math.abs(v) < th) break; s += v; }
    for (let k = 1; k <= cap; k++) { const v = t.kappa[((ia - k) % n + n) % n]; if (Math.sign(v) !== sg || Math.abs(v) < th) break; s += v; } return Math.abs(s * t.ds); };
  const turn = t.corners.reduce((b, q) => { const d = Math.min(Math.abs(q.s - ia * t.ds), L - Math.abs(q.s - ia * t.ds)); return d < 80 && (!b || d < b.d) ? {d, q} : b; }, null);
  const row = {track: r.track, season: r.season, corner_id: r.corner_id, turn: turn ? String(turn.q.number) + (turn.q.letter || '') : '',
    meas: r.apex_kph_meas, model: r.apex_kph_model, y: Math.log(r.apex_kph_meas / r.apex_kph_model),
    thetaDeg: defl(1 / 1000) * 180 / Math.PI, thetaDeg2000: defl(1 / 2000) * 180 / Math.PI, Rref: 1 / Math.abs(t.kappa[ia])};
  // corridor at the apex
  const G = geo(r.track), f = ia / n;
  if (G) {
    const i8 = Math.round(f * G.m) % G.m, j = G.idx.reduce((b, v, k) => Math.min(Math.abs(v - i8), G.m - Math.abs(v - i8)) < Math.min(Math.abs(G.idx[b] - i8), G.m - Math.abs(G.idx[b] - i8)) ? k : b, 0), w = G.lo[j] - G.ro[j], inL = sg > 0; // left turn: inside = left edge (+ normal)
    const fromIn = v => inL ? G.lo[j] - v : v - G.ro[j];
    Object.assign(row, {wSrc: G.edges, w, refFromInsideM: fromIn(0), mcFromInsideM: fromIn(G.mc[j]), refShare: fromIn(0) / w, mcShare: fromIn(G.mc[j]) / w});
    if (G.edges === 'TUM') { const Rl = 1 / Math.abs(G.kLine[j]), Rr = 1 / Math.abs(G.kRef[j]); row.g = 0.5 * Math.log(Rl / Rr);
      // post-hoc sensitivity (labelled): tightest radius of each path within ±40 m
      let kl = 0, kr = 0; for (let k = -5; k <= 5; k++) { const q = (j + k + G.n) % G.n; kl = Math.max(kl, Math.abs(G.kLine[q])); kr = Math.max(kr, Math.abs(G.kRef[q])); }
      row.gMin = 0.5 * Math.log(kr / kl); }
  } else { row.wSrc = lapsimTrackWidths[r.track] ? 'stated' : 'assumed'; row.w = lapsimTrackWidths[r.track]?.m ?? 12; }
  out.push(row);
}

// statistics
const rng = (s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)(30);
function ols(X, y) { // X rows with intercept; returns beta
  const p = X[0].length, A = Array.from({length: p}, () => new Float64Array(p)), b = new Float64Array(p);
  X.forEach((x, i) => { for (let a = 0; a < p; a++) { b[a] += x[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += x[a] * x[c]; } });
  for (let i = 0; i < p; i++) { let m = i; for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
    for (let r = 0; r < p; r++) if (r !== i) { const f = A[r][i] / A[i][i]; for (let c = i; c < p; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; } }
  return Array.from(b, (v, i) => v / A[i][i]);
}
function inv(M) { const p = M.length, A = M.map((r, i) => [...r, ...Array.from({length: p}, (_, j) => +(i === j))]);
  for (let i = 0; i < p; i++) { let m = i; for (let r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r; [A[i], A[m]] = [A[m], A[i]]; const d = A[i][i]; for (let c = 0; c < 2 * p; c++) A[i][c] /= d;
    for (let r = 0; r < p; r++) if (r !== i) { const f = A[r][i]; for (let c = 0; c < 2 * p; c++) A[r][c] -= f * A[i][c]; } } return A.map(r => r.slice(p)); }
function cr1(X, y, cl, beta) { // cluster-robust (CR1) SE
  const p = X[0].length, n = X.length, XtX = Array.from({length: p}, (_, a) => Array.from({length: p}, (_, c) => X.reduce((s, x) => s + x[a] * x[c], 0))), Bi = inv(XtX);
  const G = new Map(); X.forEach((x, i) => { const e = y[i] - x.reduce((s, v, k) => s + v * beta[k], 0); const u = G.get(cl[i]) || new Array(p).fill(0); x.forEach((v, k) => u[k] += v * e); G.set(cl[i], u); });
  const meat = Array.from({length: p}, () => new Array(p).fill(0)); for (const u of G.values()) for (let a = 0; a < p; a++) for (let c = 0; c < p; c++) meat[a][c] += u[a] * u[c];
  const g = G.size, adj = g / (g - 1) * (n - 1) / (n - p), V = Bi.map(r => Bi[0].map((_, c) => r.reduce((s, v, k) => s + v * meat[k].reduce((t, w, l) => t + w * Bi[l][c], 0), 0) * adj));
  return V.map((r, i) => Math.sqrt(r[i]));
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))]; };
function fit(rs, cols) {
  const X = rs.map(r => [1, ...cols.map(c => r[c])]), y = rs.map(r => r.y), beta = ols(X, y), se = cr1(X, y, rs.map(r => r.track), beta);
  const tracks = [...new Set(rs.map(r => r.track))], by = new Map(tracks.map(t => [t, rs.filter(r => r.track === t)])), B = [];
  for (let k = 0; k < 10000; k++) { const s = []; for (let i = 0; i < tracks.length; i++) s.push(...by.get(tracks[Math.floor(rng() * tracks.length)]));
    const Xs = s.map(r => [1, ...cols.map(c => r[c])]); try { const b = ols(Xs, s.map(r => r.y)); if (b.every(Number.isFinite)) B.push(b); } catch { /* singular draw */ } }
  return {n: rs.length, tracks: tracks.length, coef: ['a', ...cols].map((c, i) => ({term: c, est: beta[i], seCR1: se[i], ci95: [q(B.map(b => b[i]), 0.025), q(B.map(b => b[i]), 0.975)]})), draws: B.length};
}
function meanCI(rs, key = 'y') {
  const tracks = [...new Set(rs.map(r => r.track))], by = new Map(tracks.map(t => [t, rs.filter(r => r.track === t)])), M = [];
  for (let k = 0; k < 10000; k++) { let s = 0, c = 0; for (let i = 0; i < tracks.length; i++) for (const r of by.get(tracks[Math.floor(rng() * tracks.length)])) { s += r[key]; c++; } M.push(s / c); }
  return {n: rs.length, tracks: tracks.length, mean: rs.reduce((s, r) => s + r[key], 0) / rs.length, ci95: [q(M, 0.025), q(M, 0.975)]};
}
for (const r of out) r.theta = r.thetaDeg * Math.PI / 180;
const BANDS = {'60-120': [0, 120], '120-180': [120, 180], '180-240': [180, 240], '>=240': [240, 1e9], '120-240': [120, 240]};
const lags = Object.fromEntries([...new Set(out.map(r => r.track))].map(id => [id, lagM(id, pageTrack.get(id + out.find(r => r.track === id).season))]));
const res = {lagKappaVsMapM: lags, prereg: 'claude/prereg-step30a-line-vs-grip-2026-11-25.md sha256 d66215b8b96cac90219696e3dc1228e4133cfab29687bbe5fc552666354ce4ba',
  inputs: {csv: sha(csvText), racingLines: sha(readFileSync('worker/lapsim/racing-lines-data.js')), tracks: sha(readFileSync('worker/lapsim/tracks-data.js'))},
  rows: out.length, refPoints: Object.fromEntries([...lineGeo].filter(([, g]) => g).map(([k, g]) => [k, {line: g.n, map8m: g.m, edgeMidFromRefMedianM: +q(g.midOffM, 0.5).toFixed(2)}])), bands: {}};
for (const [b, [lo, hi]] of Object.entries(BANDS)) {
  const rs = out.filter(r => r.meas >= lo && r.meas < hi), mes = rs.filter(r => r.wSrc === 'TUM' || r.wSrc === 'TUM-widths');
  const th = rs.map(r => r.theta);
  res.bands[b] = {mean: meanCI(rs), medianKph: q(rs.map(r => r.meas), 0.5), theta: fit(rs, ['theta']), thetaRangeRad: [q(th, 0.1), q(th, 0.9)],
    width: fit(rs, ['w']), widthMeasured: mes.length > 5 ? fit(mes, ['w']) : null, joint: fit(rs, ['theta', 'w']), theta2000: fit(rs.map(r => ({...r, theta: r.thetaDeg2000 * Math.PI / 180})), ['theta'])};
}
const hp = out.filter(r => r.thetaDeg >= 150); res.hairpins = {...meanCI(hp), list: hp.map(r => `${r.track} ${r.season} T${r.turn} ${r.meas}/${r.model.toFixed(0)}`)};
const gr = out.filter(r => Number.isFinite(r.g)); res.lineGain = {all: fit(gr, ['g']), band120_240: fit(gr.filter(r => r.meas >= 120 && r.meas < 240), ['g']),
  gMean: meanCI(gr, 'g'), posthocTightest: fit(gr.map(r => ({...r, g: r.gMin})), ['g'])};
const sh = out.filter(r => Number.isFinite(r.refShare)); res.corridor = {tracks: [...new Set(sh.map(r => r.track))].map(t => { const a = sh.filter(r => r.track === t);
  return {track: t, edges: a[0].wSrc, n: a.length, wMedianM: q(a.map(r => r.w), 0.5), refFromInsideMedianM: q(a.map(r => r.refFromInsideM), 0.5), mcFromInsideMedianM: q(a.map(r => r.mcFromInsideM), 0.5), refShareMedian: q(a.map(r => r.refShare), 0.5), mcShareMedian: q(a.map(r => r.mcShare), 0.5)}; })};

const f3 = v => Number.isFinite(v) ? +v.toFixed(4) : '';
const cols = ['track', 'season', 'corner_id', 'turn', 'meas', 'model', 'y', 'thetaDeg', 'thetaDeg2000', 'Rref', 'wSrc', 'w', 'refFromInsideM', 'mcFromInsideM', 'refShare', 'mcShare', 'g', 'gMin'];
const body = cols.join(',') + '\n' + out.map(r => cols.map(c => typeof r[c] === 'number' ? f3(r[c]) : (r[c] ?? '')).join(',')).join('\n') + '\n';
writeFileSync(D + 'posthoc-step30a-corners.csv', body);
const js = JSON.stringify(res, null, 1) + '\n'; writeFileSync(D + 'posthoc-step30a-result.json', js);
writeFileSync(D + 'posthoc-step30a-result.json.sha256', sha(js) + '  posthoc-step30a-result.json\n' + sha(body) + '  posthoc-step30a-corners.csv\n');
console.log(out.length, 'rows');
