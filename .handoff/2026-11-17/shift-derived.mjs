// Move lap-distance fields of derived per-track data by the start-line shift (work/start-shift.json from rotate-start.mjs)
import {readFileSync, writeFileSync} from 'node:fs';
const shift = JSON.parse(readFileSync('/home/claude/work/start-shift.json', 'utf8')), KEYS = new Set(['s', 'from', 'to', 'low', 'entryS', 'exitS', 'detectionM', 'activationM']);
for (const f of ['f1-zones-data', 'fe-zones-data', 'pit-lane-data', 'corner-numbers-data', 'pu-est-data']) {
  const p = '/home/claude/f1-data-analyst-deploy/worker/lapsim/' + f + '.js', src = readFileSync(p, 'utf8'), m = src.match(/^([\s\S]*?export const \w+ = )([\s\S]*?);\s*$/);
  const D = JSON.parse(m[2]), T = D.tracks || D; let moved = 0;
  const walk = (o, L, ds) => { if (Array.isArray(o)) { o.forEach(x => walk(x, L, ds)); return; } if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) { if (KEYS.has(k) && typeof v === 'number') { o[k] = Math.round(((v - ds) % L + L) % L); moved++; } else if (k !== 'pts') walk(v, L, ds); } };
  for (const [id, sh] of Object.entries(shift)) if (T[id]) walk(T[id], sh.L, sh.ds);
  // keep zone/corner lists in lap order
  for (const id of Object.keys(shift)) { const e = T[id]; if (!e) continue; for (const v of Object.values(e)) if (v && Array.isArray(v.marks)) v.marks.sort((a, b) => a.s - b.s); if (Array.isArray(e.corners)) e.corners.sort((a, b) => a.s - b.s); }
  writeFileSync(p, m[1] + JSON.stringify(D) + ';\n'); console.log(f, 'moved', moved);
}
