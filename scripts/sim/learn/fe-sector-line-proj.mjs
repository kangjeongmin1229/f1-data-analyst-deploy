// Screen S9 follow-up (report only): official sector-line positions (printed "I1 @ … m / I2 @ … m" on the FIA/FE circuit map, distance
// from the finish line along the track) mapped onto our driven line by projection, vs our current mapping (same fraction of the line).
import {readFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {minCurvatureLine} from '../../../worker/lapsim/racing-line.js';
const SL = JSON.parse(readFileSync(process.argv[2], 'utf8')).tracks, A = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, out = {};
for (const [id, sl] of Object.entries(SL)) { const t = A[id]; if (!t?.map || t.series !== 'fe') continue;
  const cx = t.map.x, cy = t.map.y, n0 = cx.length, half = t.quality.halfWidthM, rl = minCurvatureLine(cx, cy, new Array(n0).fill(half));
  const arc = [0]; for (let i = 1; i < n0; i++) arc.push(arc[i - 1] + Math.hypot(rl.x[i] - rl.x[i - 1], rl.y[i] - rl.y[i - 1]));
  const tot = arc.at(-1) + Math.hypot(rl.x[0] - rl.x[n0 - 1], rl.y[0] - rl.y[n0 - 1]);
  // official point on the centre line at printed distance d (centre arc), then the nearest line point → its line distance
  const carc = [0]; for (let i = 1; i < n0; i++) carc.push(carc[i - 1] + Math.hypot(cx[i] - cx[i - 1], cy[i] - cy[i - 1]));
  const ctot = carc.at(-1) + Math.hypot(cx[0] - cx[n0 - 1], cy[0] - cy[n0 - 1]);
  const proj = d => { const s = d / sl.lengthM * ctot, j = carc.findIndex(a => a >= s); let b = 0, bd = Infinity;
    for (let i = 0; i < n0; i++) { const q = Math.hypot(rl.x[i] - cx[j], rl.y[i] - cy[j]); if (q < bd) { bd = q; b = i; } } return arc[b] / tot * t.length; };
  const ours = [sl.f1 * t.length, sl.f2 * t.length], off = [proj(sl.i1M), proj(sl.i2M)];
  out[id] = {printed: [sl.i1M, sl.i2M], printedLengthM: sl.lengthM, lineLengthM: t.length, oursM: ours.map(Math.round), officialOnLineM: off.map(Math.round),
    shiftM: off.map((o, k) => Math.round(o - ours[k])), labelCheckM: sl.labelVsPrintedM ?? null, map: sl.map}; }
console.log(JSON.stringify(out, null, 1));
