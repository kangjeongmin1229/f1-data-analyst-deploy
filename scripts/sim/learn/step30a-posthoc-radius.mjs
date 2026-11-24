// Step 30a post-hoc (labelled): apex radius of the kernel path vs the 8 m map path and the stored least-curvature line, implied lateral g. Run from the repo root.
// post-hoc (labelled): radius at the apex from (a) kernel kappa, (b) 8 m map estimator of the same path, (c) least-curvature line (8 m estimator)
import {readFileSync} from 'node:fs';
const R = process.cwd() + '/';
const {lapsimTracks: T} = await import(R + 'worker/lapsim/tracks-data.js'), {lapsimRacingLines: RL} = await import(R + 'worker/lapsim/racing-lines-data.js');
const rows = readFileSync(R + 'scripts/sim/data/step30a-corners.csv', 'utf8').trim().split('\n'), H = rows[0].split(',');
const C = rows.slice(1).map(l => Object.fromEntries(l.split(',').map((v, i) => [H[i], isNaN(+v) || v === '' ? v : +v])));
function resample(x, y, step) { const s = [0]; for (let i = 1; i <= x.length; i++) s.push(s[i - 1] + Math.hypot(x[i % x.length] - x[i - 1], y[i % x.length] - y[i - 1]));
  const L = s.at(-1), n = Math.round(L / step), X = [], Y = []; for (let k = 0, j = 0; k < n; k++) { const t = k * L / n; while (s[j + 1] < t) j++; const f = (t - s[j]) / (s[j + 1] - s[j] || 1), b = (j + 1) % x.length; X.push(x[j] + f * (x[b] - x[j])); Y.push(y[j] + f * (y[b] - y[j])); } return {x: X, y: Y}; }
function curv(x, y, h = 2) { const m = x.length, k = new Float64Array(m); for (let j = 0; j < m; j++) { const a = (j - h + m) % m, b = (j + h) % m, ax = x[j] - x[a], ay = y[j] - y[a], bx = x[b] - x[j], by = y[b] - y[j];
  k[j] = 2 * (ax * by - ay * bx) / (Math.hypot(ax, ay) * Math.hypot(bx, by) * Math.hypot(x[b] - x[a], y[b] - y[a]) || 1); } return k.map((v, j) => (k[(j - 1 + m) % m] + 2 * v + k[(j + 1) % m]) / 4); }
const med = a => { const s = a.filter(Number.isFinite).sort((p, q) => p - q); return s[(s.length - 1) >> 1]; };
const out = [];
for (const r of C) {
  const td = T[r.track], n = td.kappa.length, L = RL.tracks[r.track];
  // kernel apex = Rref from step30a (the page kappa); position: tightest kernel point near lap share is not stored, so recompute from Rref match
  const kk = td.kappa.map(v => Math.abs(v / 1e5)); let ia = -1; for (let i = 0; i < n; i++) if (Math.abs(1 / kk[i] - r.Rref) < 1e-3 * r.Rref) { ia = i; break; }
  if (ia < 0) continue;
  const f = ia / n, ref = resample(td.map.x, td.map.y, 8), m = ref.x.length, kr = curv(ref.x, ref.y), i8 = Math.round(f * m) % m;
  let kmax = 0; for (let k = -5; k <= 5; k++) kmax = Math.max(kmax, Math.abs(kr[(i8 + k + m) % m]));
  let kl = 0, rlLine = null; if (L) { const kl8 = curv(L.line.map(p => p[0]), L.line.map(p => p[1])), nl = kl8.length, jl = Math.round(f * nl); for (let k = -5; k <= 5; k++) kl = Math.max(kl, Math.abs(kl8[(jl + k + nl) % nl])); rlLine = 1 / kl; }
  out.push({...r, Rmap8: 1 / kmax, Rline: rlLine, kernelOverMap: kmax ? (1 / kmax) / r.Rref : NaN});
}
for (const [lo, hi] of [[0, 120], [120, 180], [180, 240], [240, 999]]) {
  const b = out.filter(r => r.meas >= lo && r.meas < hi);
  const gMeasLine = b.map(r => (r.meas / 3.6) ** 2 / r.Rline / 9.81), gMeasK = b.map(r => (r.meas / 3.6) ** 2 / r.Rref / 9.81);
  console.log(lo, hi, 'n', b.length, 'Rkernel med', med(b.map(r => r.Rref)).toFixed(0), 'Rmap8(tightest ±40m) med', med(b.map(r => r.Rmap8)).toFixed(0), 'Rline med', med(b.map(r => r.Rline)).toFixed(0),
    '| Rmap8/Rkernel med', med(b.map(r => r.Rmap8 / r.Rref)).toFixed(2), 'Rline/Rkernel med', med(b.map(r => r.Rline / r.Rref)).toFixed(2), '| meas g on kernel R', med(gMeasK).toFixed(2), 'on line R', med(gMeasLine).toFixed(2),
    '| corr y vs ln(Rline/Rk)', (() => { const x = b.map(r => 0.5 * Math.log(r.Rline / r.Rref)), y = b.map(r => r.y), mx = x.reduce((s, v) => s + v) / x.length, my = y.reduce((s, v) => s + v) / y.length; let sxy = 0, sxx = 0, syy = 0; x.forEach((v, i) => { sxy += (v - mx) * (y[i] - my); sxx += (v - mx) ** 2; syy += (y[i] - my) ** 2; }); return (sxy / Math.sqrt(sxx * syy)).toFixed(2) + ' slope ' + (sxy / sxx).toFixed(2) + ' mean ½ln ' + mx.toFixed(3) + ' mean y ' + my.toFixed(3); })());
}
