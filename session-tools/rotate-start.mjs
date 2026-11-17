// Move per-point and lap-distance data of tracks whose start line moved (finish-line fix 2026-11-17).
import {readFileSync, writeFileSync} from 'node:fs';
const A = (await import('/home/claude/work/tracks-data.before-sf.js')).lapsimExtraTracks, B = (await import('/home/claude/f1-data-analyst-deploy/worker/lapsim/tracks-data.js')).lapsimExtraTracks;
const ids = process.argv.slice(2), shift = {};
for (const id of ids) {
  const a = A[id].map, b = B[id].map, N = a.x.length; if (b.x.length !== N) throw new Error(id + ': map length changed');
  let k = 0, best = Infinity; for (let j = 0; j < N; j++) { const d = Math.hypot(a.x[j] - b.x[0], a.y[j] - b.y[0]); if (d < best) { best = d; k = j; } }
  // check the whole rotation: new[i] ~ old[(i + k) % N]
  let rms = 0; for (let i = 0; i < N; i++) rms += (a.x[(i + k) % N] - b.x[i]) ** 2 + (a.y[(i + k) % N] - b.y[i]) ** 2; rms = Math.sqrt(rms / N);
  const L = B[id].length; shift[id] = {k, N, ds: Math.round(k / N * L), rmsM: +rms.toFixed(2), L};
  console.log(id, shift[id]);
}
// map-shape-data: per-point arrays follow the new point order
const f = '/home/claude/f1-data-analyst-deploy/worker/lapsim/map-shape-data.js', src = readFileSync(f, 'utf8'), [head, body] = src.split('\nexport const lapsimMapShape = ');
const data = JSON.parse(body.trim().replace(/;$/, ''));
const rot = (arr, k) => arr.map((_, i) => arr[(i + k) % arr.length]);
for (const id of ids) { const e = data.tracks[id]; if (!e) continue; const {k, N} = shift[id];
  if (e.corr) { if (e.corr.length !== N) console.log(id, 'corr length', e.corr.length, '!= map', N); e.corr = rot(e.corr, Math.round(k * e.corr.length / N)); }
  if (e.warp) { e.warp.x = rot(e.warp.x, Math.round(k * e.warp.x.length / N)); e.warp.y = rot(e.warp.y, Math.round(k * e.warp.y.length / N)); }
  console.log(id, 'map-shape', Object.keys(e).join(',')); }
writeFileSync(f, head + '\nexport const lapsimMapShape = ' + JSON.stringify(data) + ';\n');
// corner names: lap distance from the new start
const g = '/home/claude/f1-data-analyst-deploy/worker/lapsim/corner-names-data.js', gs = readFileSync(g, 'utf8'), m = gs.match(/^([\s\S]*?export const \w+ = )([\s\S]*);\s*$/);
const cn = JSON.parse(m[2]); const T = cn.tracks || cn;
for (const id of ids) { const e = T[id]; if (!e) continue; const {ds, L} = shift[id];
  for (const q of e.names || []) q.s = ((q.s - ds) % L + L) % L; (e.names || []).sort((p, q) => p.s - q.s); console.log(id, 'corner names', (e.names || []).length); }
writeFileSync(g, m[1] + JSON.stringify(cn) + ';\n');
writeFileSync('/home/claude/work/start-shift.json', JSON.stringify(shift, null, 1));
