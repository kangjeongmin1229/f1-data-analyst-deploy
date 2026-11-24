// Step 30a post-hoc (labelled, not pre-registered): how much apex radius does a wider corridor give? TUM-edge tracks only.
// Least-curvature line (worker/lapsim/racing-line.js) inside the stored TUM edges, car centre 1 m from the edge (racing-lines.mjs),
// then with each edge moved out by 1.3 m (median iRacing kerb use beyond the white line, kerb-use-data.js) and by 2.5 m.
// Out: scripts/sim/data/step30a-kerb-whatif.json. Report only.
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimRacingLines} from '../../../worker/lapsim/racing-lines-data.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {minCurvatureLine} from '../../../worker/lapsim/racing-line.js';
const D = 'scripts/sim/data/', rows = readFileSync(D + 'step30a-corners.csv', 'utf8').trim().split('\n'), H = rows[0].split(',');
const C = rows.slice(1).map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], v === '' || isNaN(+v) ? v : +v])));
function curv(x, y) { const m = x.length, k = new Float64Array(m); for (let j = 0; j < m; j++) { const a = (j - 2 + m) % m, b = (j + 2) % m, ax = x[j] - x[a], ay = y[j] - y[a], bx = x[b] - x[j], by = y[b] - y[j];
  k[j] = 2 * (ax * by - ay * bx) / (Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(x[b] - x[a], y[b] - y[a]) || 1); } return k.map((v, j) => (k[(j - 1 + m) % m] + 2 * v + k[(j + 1) % m]) / 4); }
const med = a => { const s = a.filter(Number.isFinite).sort((p, q) => p - q); return s.length ? s[(s.length - 1) >> 1] : NaN; };
const out = {extraPerSideM: [0, 1.3, 2.5], tracks: {}, rows: []};
for (const id of Object.keys(lapsimRacingLines.tracks)) {
  const L = lapsimRacingLines.tracks[id]; if (L.edges !== 'TUM') continue;
  const mx = L.left.map((l, i) => (l[0] + L.right[i][0]) / 2), my = L.left.map((l, i) => (l[1] + L.right[i][1]) / 2), hw = L.left.map((l, i) => Math.hypot(l[0] - L.right[i][0], l[1] - L.right[i][1]) / 2);
  const K = out.extraPerSideM.map(e => { const p = minCurvatureLine(mx, my, hw.map(h => Math.max(0.3, h - 1 + e))); return curv(p.x, p.y); });
  const n = mx.length, td = lapsimTracks[id], nk = td.kappa.length;
  for (const r of C.filter(r => r.track === id)) {
    // apex: kernel point whose radius is the row's Rref, nearest to nothing else needed (unique within the track)
    let ia = -1; for (let i = 0; i < nk; i++) if (Math.abs(1e5 / Math.abs(td.kappa[i]) - r.Rref) < 1e-3 * r.Rref) { ia = i; break; } if (ia < 0) continue;
    const j = Math.round(ia / nk * n), R = K.map(k => { let m = 0; for (let d = -5; d <= 5; d++) m = Math.max(m, Math.abs(k[(j + d + n) % n])); return 1 / m; });
    out.rows.push({track: id, season: r.season, meas: r.meas, y: r.y, thetaDeg: r.thetaDeg, Rref: r.Rref, R0: R[0], R13: R[1], R25: R[2]});
  }
}
for (const [lo, hi] of [[0, 120], [120, 180], [180, 240], [120, 240], [240, 999]]) {
  const b = out.rows.filter(r => r.meas >= lo && r.meas < hi), g = k => med(b.map(r => 0.5 * Math.log(r[k] / r.Rref)));
  out[lo + '-' + hi] = {n: b.length, tracks: new Set(b.map(r => r.track)).size, meanY: b.reduce((s, r) => s + r.y, 0) / b.length, medianHalfLnR: {line: g('R0'), kerb13: g('R13'), kerb25: g('R25')}};
}
writeFileSync(D + 'step30a-kerb-whatif.json', JSON.stringify(out, null, 1) + '\n');
for (const k of Object.keys(out)) if (k.includes('-')) console.log(k, JSON.stringify(out[k]));
