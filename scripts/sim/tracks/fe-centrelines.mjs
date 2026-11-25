// Step 35b (geometry audit): the map centre line of every built Formula E track, in metres at the printed length (the same
// lineOf/orientLine/metres path as build-fe.mjs), for scripts/sim/tracks/fe-geometry-audit.py. Out: JSON on stdout.
import {readFileSync} from 'node:fs';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {lineOf, metres, orientLine} from '../learn/fe-lines.mjs';
const maps = JSON.parse(readFileSync('scripts/sim/data/learn/fe-maps.json', 'utf8')).events, out = {};
for (const [id, t] of Object.entries(lapsimFeTracks)) {
  const url = (/https?:\/\/\S+/.exec((t.sources || [])[0] || '') || [])[0], m = maps.find(e => e.url === url); if (!m) continue;
  const L = t.officialLengthM, l0 = lineOf(m); if (!l0) continue; const o = orientLine(l0, m, L), g = metres(o.line, L);
  out[id] = {map: `${m.season} ${m.event}`, officialLengthM: L, lineLengthM: t.length, x: Array.from(g.x, v => +v.toFixed(1)), y: Array.from(g.y, v => +v.toFixed(1)), osmLine: /OpenStreetMap/.test(JSON.stringify(t.sources))};
}
process.stdout.write(JSON.stringify(out));
