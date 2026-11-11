// Step 2 of new-track geometry: turn the OpenStreetMap raceway ways of a venue into closed laps.
// The ways are split where they meet, then every simple closed loop is listed with its length. A layout is ACCEPTED only
// when a loop is within 0.5 % of the official lap length stored in track-requests.json (lengthM with lengthSource).
// Without an official length the loops are only listed. © OpenStreetMap contributors, ODbL.
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
const FIA = existsSync('.cache/lapsim/osm/fia-circuits.json') ? JSON.parse(readFileSync('.cache/lapsim/osm/fia-circuits.json', 'utf8')).rows : [];
const DIR = '.cache/lapsim/osm', REQ = JSON.parse(readFileSync('scripts/sim/data/track-requests.json', 'utf8')).tracks;
const hav = (a, b) => { const R = 6371008.8, r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos((a[0] + b[0]) / 2 * r), y = (b[0] - a[0]) * r; return R * Math.hypot(x, y); };
const key = p => p[0].toFixed(7) + ',' + p[1].toFixed(7);
const SKIP = /kart|motocross|rallycross|off_road|bmx|drag|rc_car|speedway_dirt/i, SKIPNAME = /pit ?lane|pitlane|boxengasse|피트|ピット|kart|drag|rally|drift|ドリフト|カート|motocross|skid|glisse|driving center/i;

export function totalTurnDeg(pts) {
  const n = pts.length - (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1] ? 1 : 0), c = Math.cos(pts[0][0] * Math.PI / 180); let t = 0;
  const h = i => Math.atan2(pts[(i + 1) % n][0] - pts[i][0], (pts[(i + 1) % n][1] - pts[i][1]) * c);
  for (let i = 0; i < n; i++) { let d = h((i + 1) % n) - h(i); while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; t += d; }
  return t * 180 / Math.PI;
}

export function loops(elements, {maxM = 30000, minM = 1500, cap = 200000} = {}) {
  const ways = elements.filter(e => e.type === 'way' && e.geometry?.length > 1 && e.tags?.highway === 'raceway' && !SKIP.test(e.tags?.sport || '') && !SKIPNAME.test(e.tags?.name || '') && !/dirt|ground|unpaved|gravel|grass|sand/i.test(e.tags?.surface || ''))
    .map(e => ({name: e.tags?.name || null, pts: e.geometry.map(g => [g.lat, g.lon])}));
  // split ways at every point that another way (or the same way) also touches
  const count = new Map(); for (const w of ways) w.pts.forEach((p, i) => { const k = key(p); count.set(k, (count.get(k) || 0) + (i === 0 || i === w.pts.length - 1 ? 2 : 1)); });
  const edges = [];
  for (const w of ways) { let s = 0; for (let i = 1; i < w.pts.length; i++) if (i === w.pts.length - 1 || count.get(key(w.pts[i])) > 1) { const pts = w.pts.slice(s, i + 1); edges.push({a: key(pts[0]), b: key(pts[pts.length - 1]), pts, m: pts.slice(1).reduce((t, p, j) => t + hav(pts[j], p), 0), name: w.name}); s = i; } }
  // merge chains through nodes of degree 2 so the search works on junctions only
  const adj = new Map(); edges.forEach((e, i) => { for (const n of [e.a, e.b]) (adj.get(n) || adj.set(n, []).get(n)).push(i); });
  const found = new Map(); let steps = 0;
  const nodes = [...adj.keys()].filter(n => adj.get(n).length !== 2);
  const starts = nodes.length ? nodes : [...adj.keys()].slice(0, 1);
  function walk(start, node, len, used, path) {
    if (++steps > cap) return;
    for (const i of adj.get(node)) {
      if (used.has(i)) continue; const e = edges[i], next = e.a === node ? e.b : e.a, L = len + e.m;
      if (L > maxM) continue;
      if (next === start) { if (L >= minM) { const sig = [...path, i].sort((x, y) => x - y).join('.'); if (!found.has(sig)) found.set(sig, {m: L, path: [...path, i], start}); } continue; }
      if (path.some(j => edges[j].a === next || edges[j].b === next) && next !== start) { // already visited node: not a simple loop
        const seen = new Set([start]); let n = start; for (const j of path) { n = edges[j].a === n ? edges[j].b : edges[j].a; seen.add(n); } if (seen.has(next)) continue; }
      used.add(i); path.push(i); walk(start, next, L, used, path); path.pop(); used.delete(i);
    }
  }
  for (const s of starts) { walk(s, s, 0, new Set(), []); if (steps > cap) break; }
  const line = l => { let n = l.start; const out = []; for (const j of l.path) { const e = edges[j], fwd = e.a === n; out.push(...(fwd ? e.pts : [...e.pts].reverse()).slice(out.length ? 1 : 0)); n = fwd ? e.b : e.a; } return out; };
  return {ways: ways.length, edges: edges.length, junctions: nodes.length, searchCapped: steps > cap, loops: [...found.values()].sort((a, b) => b.m - a.m).map(l => ({m: Math.round(l.m), names: [...new Set(l.path.map(j => edges[j].name).filter(Boolean))], line: () => line(l)}))};
}

if (process.argv[1]?.endsWith('assemble.mjs')) {
  const out = {source: 'OpenStreetMap raceway ways (© OpenStreetMap contributors, ODbL); loops found by scripts/sim/tracks/assemble.mjs', rule: 'accepted = within 0.5 % of the official lap length', tracks: {}}, lines = {};
  for (const t of REQ.filter(t => t.status === 'osm')) {
    const f = `${DIR}/${t.id}.json`; if (!existsSync(f)) { out.tracks[t.id] = {error: 'no map data'}; continue; }
    const r = loops(JSON.parse(readFileSync(f, 'utf8')).elements);
    // official lengths: every FIA-licensed layout whose name matches this venue (newest list first), plus any length stored with a source
    const re = t.fia ? new RegExp(t.fia, 'i') : null, seen = new Set();
    const fia = re ? FIA.filter(x => re.test(x.name) && !(t.fiaNot && new RegExp(t.fiaNot, 'i').test(x.name))).filter(x => !seen.has(x.name + x.lengthM) && seen.add(x.name + x.lengthM)) : [];
    const targets = [...(t.lengths || []).map(x => ({id: `${t.id} | ${x.name}`, lengthM: x.lengthM, src: x.source + (x.roundedTo ? ` [rounded to ${x.roundedTo}]` : '')})), ...fia.map(x => ({id: `${t.id} | ${x.name}`, lengthM: x.lengthM, src: `FIA list ${x.list}`, fia: x}))];
    const accepted = targets.map(g => { // nearest loops by length; a loop that crosses itself (total turn not ±360°) is not a lap
      const best = r.loops.map(l => ({l, err: Math.abs(l.m - g.lengthM) / g.lengthM})).sort((a, b) => a.err - b.err).slice(0, 40).find(c => t.crossover || Math.abs(Math.abs(totalTurnDeg(c.l.line())) - 360) < 30); if (!best) return {id: g.id, officialM: g.lengthM, source: g.src, accepted: false};
      const ok = best.err <= 0.005; if (ok) lines[g.id] = best.l.line().map(p => [+p[0].toFixed(7), +p[1].toFixed(7)]); return {id: g.id, officialM: g.lengthM, source: g.src, grade: g.fia?.grade, pole: g.fia?.pole, widthM: g.fia?.widthM, loopM: best.l.m, errorPct: +(best.err * 100).toFixed(2), accepted: ok}; });
    const distinct = []; for (const l of r.loops) if (!distinct.some(d => Math.abs(d.m - l.m) < 15)) distinct.push({m: l.m, names: l.names.slice(0, 4)});
    out.tracks[t.id] = {ways: r.ways, edges: r.edges, junctions: r.junctions, searchCapped: r.searchCapped, loopsFound: r.loops.length, loopLengthsM: distinct.slice(0, 40), accepted};
  }
  writeFileSync(`${DIR}/loops-summary.json`, JSON.stringify(out, null, 1)); writeFileSync(`${DIR}/accepted-lines.json`, JSON.stringify(lines));
  console.log(Object.entries(out.tracks).map(([k, v]) => `${k}: ${v.error || v.loopsFound + ' loops, longest ' + (v.loopLengthsM[0]?.m ?? '-')}`).join('\n'));
}
