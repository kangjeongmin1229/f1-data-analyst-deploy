// I3 flag (claude/gate-i3-geometry-prereg-2026-11-23.md): with LAPSIM_GEOM_I3=1, replace the four test tracks in the CI workspace by the
// car-independent geometry of scripts/sim/data/i3/geometry.json before the fit. Experiment branches only; nothing runs without the flag.
// Changed in the workspace: worker/lapsim/tracks-data.js (kappa, grade, heading, ds, length, sectors, corners of the four rows; the
// drawn map is kept), worker/lapsim/f1-zones-data.js (zone and mark distances), .cache/lapsim/traces.json (sample distances only:
// measured values are not changed, only placed on the new line by the distance map).
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

export const mapper = sMap => { const L0 = sMap.at(-1)[0] + (sMap[1][0] - sMap[0][0]);
  return (s, Lnew) => { const x = ((s % L0) + L0) % L0; let i = Math.min(sMap.length - 2, Math.floor(x / (sMap[1][0] - sMap[0][0])));
    while (i > 0 && sMap[i][0] > x) i--; const [a, b] = [sMap[i], i + 1 < sMap.length ? sMap[i + 1] : [L0, Lnew]], f = (x - a[0]) / ((b[0] - a[0]) || 1); return +(a[1] + f * (b[1] - a[1])).toFixed(1); }; };

if (process.argv[1]?.endsWith('apply.mjs')) {
  if (process.env.LAPSIM_GEOM_I3 !== '1') { console.log('LAPSIM_GEOM_I3 not set: nothing changed'); process.exit(0); }
  const G = JSON.parse(readFileSync('scripts/sim/data/i3/geometry.json', 'utf8')).tracks;
  const TF = 'worker/lapsim/tracks-data.js', lines = readFileSync(TF, 'utf8').split('\n'), li = lines.findIndex(l => l.startsWith('export const lapsimTracks='));
  const T = JSON.parse(lines[li].slice('export const lapsimTracks='.length).replace(/;$/, '')), M = {};
  for (const [id, g] of Object.entries(G)) {
    const t = T[id]; if (!t) throw new Error(id + ' not in tracks-data'); if (!g.grade) throw new Error(id + ': no elevation, run refused');
    const L = g.kappa.length * g.ds, f = mapper(g.sMap); M[id] = s => f(s, L);
    T[id] = {...t, ds: g.ds, length: Math.round(L), kappa: g.kappa, grade: g.grade, heading: g.heading, sectors: (t.sectors || []).map(s => Math.round(M[id](s))),
      corners: (t.corners || []).map(c => ({...c, s: Math.round(M[id](c.s))})), quality: {...t.quality, i3: {osm: g.osmSource, width: g.width, centreVsOfficialPct: g.centreVsOfficialPct, elevation: g.elevation?.source, gridM: g.elevation?.gridM}}};
    console.log(id, 'length', t.length, '->', T[id].length, 'sectors', t.sectors, '->', T[id].sectors);
  }
  lines[li] = 'export const lapsimTracks=' + JSON.stringify(T) + ';'; writeFileSync(TF, lines.join('\n'));
  const ZF = 'worker/lapsim/f1-zones-data.js', zt = readFileSync(ZF, 'utf8'), zm = zt.match(/export const lapsimF1Zones = (\{[\s\S]*\});?\s*$/);
  if (zm) { const Z = JSON.parse(zm[1]);
    for (const id of Object.keys(M)) for (const y of Object.keys(Z.tracks?.[id] || {})) { const z = Z.tracks[id][y];
      for (const q of z.zones || []) for (const k of ['from', 'to', 'low']) if (Number.isFinite(q[k])) q[k] = Math.round(M[id](q[k]));
      for (const q of z.marks || []) if (Number.isFinite(q.s)) q.s = Math.round(M[id](q.s)); }
    writeFileSync(ZF, zt.slice(0, zm.index) + 'export const lapsimF1Zones = ' + JSON.stringify(Z) + ';\n'); } else throw new Error('f1-zones-data.js format not recognised');
  const TR = (process.env.LAPSIM_CACHE || '.cache/lapsim') + '/traces.json';
  if (existsSync(TR)) { const tr = JSON.parse(readFileSync(TR, 'utf8')); let n = 0; for (const t of tr) if (M[t.track]) { t.s = t.s.map(M[t.track]); n++; } writeFileSync(TR, JSON.stringify(tr)); console.log('traces remapped', n); }
}
