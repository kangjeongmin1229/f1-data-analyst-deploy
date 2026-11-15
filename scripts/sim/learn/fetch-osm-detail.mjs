// Owner 2026-11-15 (tasks I and L): kerbs, track area (real edges, so the width), surface and corner numbers from OpenStreetMap for
// every map track. Runs in GitHub Actions (Overpass needs the network). Tags (wiki Motorsports): raceway=kerb (proposed motorsport=kerb),
// area:highway=raceway, raceway:corner_number, width=* and surface=* on highway=raceway.
// Output (committed): scripts/sim/data/learn/osm-detail.json. © OpenStreetMap contributors, ODbL.
import {readFileSync, writeFileSync} from 'node:fs';
const D = 'scripts/sim/data/', spec = JSON.parse(readFileSync(D + 'track-extra.json', 'utf8')).tracks, files = {}, OUT = D + 'learn/osm-detail.json';
const API = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
async function overpass(q, n = 0) {
  try { const r = await fetch(API[n % API.length], {method: 'POST', body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(130000), headers: {'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'kongboda-lapsim (github.com/MisterKinn/f1-data-analyst)'}});
    if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  catch (e) { if (n >= 3) throw new Error(`${API[n % API.length]}: ${e.message || e}`); await new Promise(f => setTimeout(f, 4000 * (n + 1))); return overpass(q, n + 1); }
}
const prev = (() => { try { return JSON.parse(readFileSync(OUT, 'utf8')).tracks; } catch { return {}; } })();
const out = {source: 'OpenStreetMap via Overpass API (© OpenStreetMap contributors, ODbL)', fetched: new Date().toISOString(), tracks: {}};
const g7 = g => [+g.lat.toFixed(7), +g.lon.toFixed(7)];
for (const [id, s] of Object.entries(spec)) {
  if (s.driven) continue;
  if (prev[id]?.elements) { out.tracks[id] = prev[id]; continue; } // a second run only fills the tracks that failed
  const f = files[s.file] ??= JSON.parse(readFileSync(D + 'tracks/' + s.file, 'utf8')), c = (f.tracks || f.variants)[s.candidate];
  if (!c?.centre || !c.map) { out.tracks[id] = {error: 'no map centre'}; continue; }
  const r = Math.min(4000, Math.max(...c.map.x.map((x, i) => Math.hypot(x, c.map.y[i]))) + 300), [la, lo] = c.centre, A = `(around:${Math.round(r)},${la},${lo})`;
  const q = `[out:json][timeout:120];(nwr["raceway"="kerb"]${A};nwr["motorsport"="kerb"]${A};way["area:highway"="raceway"]${A};nwr["raceway:corner_number"]${A};way["highway"="raceway"]["width"]${A};way["highway"="raceway"]["surface"]${A};);out geom tags;`;
  try {
    const d = await overpass(q);
    out.tracks[id] = {centre: c.centre, elements: d.elements.map(e => ({type: e.type, id: e.id, tags: e.tags || {},
      geom: e.type === 'node' ? [g7(e)] : (e.geometry || (e.members || []).flatMap(m => m.geometry || [])).filter(Boolean).map(g7)}))};
    const k = t => out.tracks[id].elements.filter(e => t(e.tags)).length;
    console.log(id, 'kerbs', k(t => t.raceway === 'kerb' || t.motorsport === 'kerb'), 'areas', k(t => t['area:highway'] === 'raceway'), 'corners', k(t => t['raceway:corner_number']), 'width', k(t => t.width));
  } catch (e) { out.tracks[id] = {error: String(e.message || e)}; console.log(id, 'error', e.message); }
  writeFileSync(OUT, JSON.stringify(out)); // partial results survive a timeout
  await new Promise(f => setTimeout(f, 1500));
}
writeFileSync(OUT, JSON.stringify(out));
