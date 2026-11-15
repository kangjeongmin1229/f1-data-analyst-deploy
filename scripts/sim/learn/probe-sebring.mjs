// Sebring: the OpenStreetMap lap came out 2.2 % short of the official 6.019 km. Find the missing piece: fetch the raceway ways
// again (wider radius), list every loop between 5.5 and 6.3 km with wider gap closing, and every open way end.
// Output: scripts/sim/data/learn/probe-sebring.json (derived; © OpenStreetMap contributors, ODbL).
import {writeFileSync} from 'node:fs';
import {loops, totalTurnDeg} from '../tracks/assemble.mjs';
const API = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const q = '[out:json][timeout:60];(way["highway"="raceway"](around:5000,27.455,-81.35);way["highway"]["name"~"Sebring|Ullman|Sunset|Gendebien|Hairpin|Fangio|Bishop|Collier|Cunningham|Tower|Le Mans|Big Bend|Turn",i](around:3000,27.455,-81.35););out geom tags;';
let d; for (const u of API) { try { const r = await fetch(u, {method: 'POST', body: 'data=' + encodeURIComponent(q), headers: {'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'kongboda-lapsim'}, signal: AbortSignal.timeout(90000)}); if (r.ok) { d = await r.json(); break; } } catch {} }
const out = {ways: [], tries: []};
if (d) {
  out.ways = d.elements.filter(e => e.type === 'way').map(e => ({id: e.id, name: e.tags?.name, highway: e.tags?.highway, surface: e.tags?.surface, n: e.geometry.length, a: e.geometry[0], b: e.geometry.at(-1)}));
  for (const snapM of [12, 30, 60, 120]) { const r = loops(JSON.parse(JSON.stringify(d.elements.filter(e => e.tags?.highway === 'raceway'))), {snapM, maxM: 6400, minM: 5000});
    out.tries.push({snapM, dangling: r.dangling, loops: r.loops.filter(l => l.m > 5500).slice(0, 30).map(l => ({m: Math.round(l.m), names: l.names, turn: Math.round(totalTurnDeg(l.line()))}))}); }
}
writeFileSync('scripts/sim/data/learn/probe-sebring.json', JSON.stringify(out, null, 1));
console.log(out.ways.length, 'ways', out.tries.map(t => `${t.snapM}: ${t.loops.map(l => l.m).join(' ')}`).join('\n'));
