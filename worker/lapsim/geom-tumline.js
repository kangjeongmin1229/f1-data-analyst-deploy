// Step 30b diagnostic (pre-reg 0ae7db0a… + A1 c500ba31…; report only, never shipped): with LAPSIM_GEOM_TUMLINE=on, the kernel drives
// kappa taken from the TUM min-curvature raceline on 14 tracks (scripts/sim/data/step30b/geom-tumline-kappa.json, built by
// scripts/sim/learn/step30b_tumline_kappa.py). Lap length, grade, corners and sectors stay as they are. Patches the shared track objects in place.
import {readFileSync} from 'node:fs';
export function applyGeomTumLine(tracks, file = 'scripts/sim/data/step30b/geom-tumline-kappa.json') {
  const G = JSON.parse(readFileSync(file, 'utf8'));
  for (const [id, g] of Object.entries(G.tracks)) {
    const k = tracks[id].kappa; if (k.length !== g.kappa.length) throw new Error(`${id}: kappa length ${k.length} != ${g.kappa.length}`);
    for (let i = 0; i < k.length; i++) k[i] = g.kappa[i];
  }
  return Object.keys(G.tracks);
}
