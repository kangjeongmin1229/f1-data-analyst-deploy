// Broadcast orientation of the F1 track maps (owner 2026-11-15: the map should open the way fans know it, e.g. Monza with the main
// straight along the bottom). MultiViewer's circuit info (the source F1 graphics follow) gives each circuit's outline in the raw F1
// position frame and the rotation it is shown at. The simulator map is in true east/north, so the opening turn of our map is the
// MultiViewer rotation minus the turn from the raw frame to true (fitted with alignClosed). Out: scripts/sim/data/learn/mv-rotation.json.
// Needs network: run in Actions (lapsim-learn.yml). Only the derived angles are stored.
import {writeFileSync} from 'node:fs';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {alignClosed, applyAlignment} from '../../../worker/lapsim/geometry.js';

const KEYS = {madring: [153, 2026], 'kuala-lumpur': [83, 2017], mugello: [76, 2020], 'nurburgring-gp': [20, 2020], portimao: [75, 2021], hockenheim: [30, 2019], 'paul-ricard-f1': [33, 2021], istanbul: [9, 2021], sochi: [61, 2020], 'nurburgring-gp': [20, 2020], 'sakhir-outer': [63, 2020], 'paul-ricard-f1': [33, 2021], portimao: [75, 2021], mugello: [76, 2020], hockenheim: [30, 2019]};
const out = {}, log = [];
const all = {...lapsimTracks, ...lapsimExtraTracks};
for (const [id, t] of Object.entries(all)) {
  const [key, year] = t.circuitKey ? [t.circuitKey, t.year] : KEYS[id] || [];
  if (!key || !t.map?.x?.length) continue;
  try {
    const r = await fetch(`https://api.multiviewer.app/api/v1/circuits/${key}/${year}`, {headers: {'user-agent': 'kongboda-lapsim'}});
    if (!r.ok) { log.push(`${id}: HTTP ${r.status}`); continue; }
    const mv = await r.json();
    if (!mv.x?.length) { log.push(`${id}: no outline`); continue; }
    const al = alignClosed(mv.x, mv.y, t.map.x, t.map.y), theta = al.theta * 180 / Math.PI;
    const rot = (((mv.rotation - theta) % 360) + 540) % 360 - 180;
    // official corner numbers (MultiViewer, the numbering F1 graphics use), placed on our lap by the nearest map point
    const mp = (mv.corners || []).filter(c => c.trackPosition), P = applyAlignment(al, mp.map(c => c.trackPosition.x), mp.map(c => c.trackPosition.y)), n = t.map.x.length;
    const corners = mp.map((c, k) => { let bi = 0, bd = Infinity; for (let i = 0; i < n; i++) { const d = (t.map.x[i] - P.x[k]) ** 2 + (t.map.y[i] - P.y[k]) ** 2; if (d < bd) { bd = d; bi = i; } } return {number: c.number, letter: c.letter || '', s: Math.round(bi / n * t.length), offM: Math.round(Math.sqrt(bd))}; }).sort((a, b) => a.s - b.s);
    out[id] = {circuitKey: key, year, mvRotation: mv.rotation, rawToTrueDeg: +theta.toFixed(1), mirror: al.mirror, fitRmsM: +al.rms.toFixed(1), openDeg: +rot.toFixed(1), corners};
    console.log(id, out[id]);
    await new Promise(res => setTimeout(res, 400));
  } catch (e) { log.push(`${id}: ${e.message}`); }
}
writeFileSync('scripts/sim/data/learn/mv-rotation.json', JSON.stringify({source: 'api.multiviewer.app circuit info (rotation and outline); derived angles only', tracks: out, log}, null, 1));
console.log(Object.keys(out).length, 'tracks', log);
