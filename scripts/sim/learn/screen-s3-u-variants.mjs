// S3 add-on: raw u per 20 km/h bin (p95 and p80) for each curvature variant, plus the share of tracks whose own p95 ratio > 1.
import {readFileSync, writeFileSync} from 'node:fs';
const D = '/home/claude/f1-data-analyst-deploy/worker/lapsim/';
const {lapsimKernel} = await import(D + 'kernel.js'), {lapsimCalibration: C} = await import(D + 'calibration-data.js');
const K = lapsimKernel(), d = JSON.parse(readFileSync(process.argv[2])), M = d.mass;
const EDGES = Array.from({length: 13}, (_, j) => 80 + 20 * j), KPH = EDGES.slice(0, -1).map(e => e + 10), VG = Array.from({length: 161}, (_, j) => 40 + 2 * j);
let nonce = 0;
function capCurve(car, rho, grip) { const vs = VG.map(v => v / 3.6); let a = vs.map(() => 30);
  for (let it = 0; it < 4; it++) { const kappa = Float64Array.from(vs, (v, i) => a[i] / (v * v)); let P;
    K.simulateLap({kappa, ds: 5}, car, {rho, grip}, {kernelStep: 2, probe: p => { P = p; }, nonce: ++nonce}); a = vs.map((v, i) => P.lat(v, i)); } return a; }
const interp = (xs, ys, x) => { if (x <= xs[0]) return ys[0]; for (let j = 1; j < xs.length; j++) if (x <= xs[j]) return ys[j - 1] + (ys[j] - ys[j - 1]) * (x - xs[j - 1]) / (xs[j] - xs[j - 1]); return ys.at(-1); };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y), h = (s.length - 1) * p, lo = Math.floor(h); return s[lo] + (s[Math.min(lo + 1, s.length - 1)] - s[lo]) * (h - lo); };
const med = a => q(a, 0.5), binOf = v => EDGES.findIndex((e, j) => j < 12 && v >= e && v < EDGES[j + 1]);
const res = {};
for (const [y, T] of Object.entries(d.seasons)) { const car = C.seasons[y].car; const caps = {};
  for (const [tr, o] of Object.entries(T)) caps[tr] = capCurve(car, med(o.v.map((v, i) => o.x[i] * 2 * M / (v / 3.6) ** 2)), C.seasons[y].tracks[tr]?.grip ?? 1);
  for (const vr of ['base', 'min20', 'ma80']) { const pool = KPH.map(() => []), perT = KPH.map(() => []);
    for (const [tr, o] of Object.entries(T)) { const tb = KPH.map(() => []);
      o.v.forEach((v, i) => { const b = binOf(v); if (b < 0) return; const r = o[vr][i] / interp(VG, caps[tr], v); pool[b].push(r); tb[b].push(r); });
      tb.forEach((a, b) => { if (a.length >= 20) perT[b].push(q(a, 0.95)); }); }
    res[`${y} ${vr}`] = {p95: pool.map(a => a.length >= 50 ? +q(a, 0.95).toFixed(2) : null), p80: pool.map(a => a.length >= 50 ? +q(a, 0.8).toFixed(2) : null),
      tracksAbove1: perT.map(a => a.length ? `${a.filter(x => x > 1).length}/${a.length}` : '-')}; } }
writeFileSync(process.argv[3], JSON.stringify({kph: KPH, res}, null, 1));
for (const [k, r] of Object.entries(res)) console.log(k.padEnd(11), 'p95', r.p95.slice(0, 8).join(' '), '| p80', r.p80.slice(0, 8).join(' '), '| tracks>1', r.tracksAbove1.slice(0, 8).join(' '));
