// Screen S3 (report-only, central 07:15 26 Nov; scan note claude/status-2026-11-26-screen-S3.md): driver margin from measured traces.
// u(v) = p95 of measured |a_y| ÷ the base car's lateral capacity at that sample's speed, track air density and track grip, per 20 km/h
// bin (80–320 km/h, ≥ 50 samples) and season; leave one track out (a track's u comes from the other tracks of its season).
// Samples: step 36 X2 run 45623025846 (step 32 top-10 quali traces, |a_x| < 0.3 g, low-drag off). Base car: worker/lapsim calibration.
// u is capped at 1 (a margin, not extra grip); the raw value is kept next to it. Label: "model (from measured traces)".
//   node scripts/sim/learn/screen-s3-u.mjs <x2-samples.json> <out.json> [base calibration-data.js; default: the worker's]
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';

const K = lapsimKernel(), [inp, outPath, calPath] = process.argv.slice(2),
  {lapsimCalibration: C} = await import(calPath ? new URL(calPath, `file://${process.cwd()}/`).href : '../../../worker/lapsim/calibration-data.js'), d = JSON.parse(readFileSync(inp, 'utf8')), M = d.mass;
const EDGES = Array.from({length: 13}, (_, j) => 80 + 20 * j), KPH = EDGES.slice(0, -1).map(e => e + 10), NMIN = 50, Q = 0.95;
const VG = Array.from({length: 161}, (_, j) => 40 + 2 * j); // km/h grid of the capacity curve
let nonce = 0;
// lateral capacity a(v) (m/s²) on flat ground; the axle model's load transfer is evaluated at the capacity itself (fixed point)
function capCurve(car, rho, grip) {
  const vs = VG.map(v => v / 3.6); let a = vs.map(() => 30);
  for (let it = 0; it < 4; it++) {
    const kappa = Float64Array.from(vs, (v, i) => a[i] / (v * v)); let P = null;
    K.simulateLap({kappa, ds: 5}, car, {rho, grip}, {kernelStep: 2, probe: p => { P = p; }, nonce: ++nonce});
    a = vs.map((v, i) => P.lat(v, i));
  }
  return a;
}
const interp = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let j = 1; j < xs.length; j++) if (x <= xs[j]) return ys[j - 1] + (ys[j] - ys[j - 1]) * (x - xs[j - 1]) / (xs[j] - xs[j - 1]); return ys.at(-1); };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); }; // numpy 'linear'
const med = a => q(a, 0.5);

const out = {label: 'model (from measured traces)', kph: KPH, source: {samples: 'step36 X2 run 45623025846 x2-samples.json', mass: M, q: Q, nmin: NMIN, cap: 'u ≤ 1'}, seasons: {}, raw: {}, n: {}, base: {}};
for (const [y, T] of Object.entries(d.seasons)) {
  const car = C.seasons[y].car; out.base[y] = {clA: car.clA, muY: car.muY};
  const ratio = {}; // per track: [bin, a/cap]
  for (const [tr, o] of Object.entries(T)) {
    const rho = med(o.v.map((v, i) => o.x[i] * 2 * M / (v / 3.6) ** 2)), grip = C.seasons[y].tracks[tr]?.grip ?? 1, cap = capCurve(car, rho, grip);
    ratio[tr] = o.v.map((v, i) => [EDGES.findIndex((e, j) => j < 12 && v >= e && v < EDGES[j + 1]), o.ay[i] / interp(VG, cap, v)]).filter(r => r[0] >= 0);
  }
  const uOf = skip => { const bins = KPH.map(() => []);
    for (const [tr, rs] of Object.entries(ratio)) if (tr !== skip) for (const [b, r] of rs) bins[b].push(r);
    const raw = bins.map(b => b.length >= NMIN ? q(b, Q) : null), n = bins.map(b => b.length);
    const filled = raw.map((u, j) => u ?? raw[raw.reduce((best, x, k) => x != null && (best < 0 || Math.abs(k - j) < Math.abs(best - j)) ? k : best, -1)]); // nearest bin with data
    return {raw: raw.map(u => u == null ? null : +u.toFixed(4)), n, u: filled.map(u => +Math.min(1, u).toFixed(4))}; };
  const all = uOf(null); out.seasons[y] = {__all: all.u}; out.raw[y] = {__all: all.raw}; out.n[y] = {__all: all.n};
  for (const tr of new Set([...Object.keys(T), ...Object.keys(C.seasons[y].tracks)])) { const r = uOf(tr); out.seasons[y][tr] = r.u; out.raw[y][tr] = r.raw; }
}
writeFileSync(outPath, JSON.stringify(out, null, 1));
for (const y of Object.keys(out.seasons)) console.log(y, 'u', out.seasons[y].__all.join(' '), '| raw', out.raw[y].__all.join(' '), '| n', out.n[y].__all.join(' '));
