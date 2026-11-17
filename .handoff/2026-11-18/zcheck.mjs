import {lapsimF1Zones as Z} from '/home/claude/wt-c/worker/lapsim/f1-zones-data.js';
import {lapsimAllTracks as T} from '/home/claude/wt-c/worker/lapsim/tracks.js';
import {lapsimTrackView} from '/home/claude/wt-c/worker/lapsim/track-view-data.js';
const ids = process.argv.slice(2);
for (const id of ids) { const t = T[id], z = Z.tracks[id]; if (!t || !z) { console.log(id, 'no data'); continue; }
  const C = (t.corners?.length ? t.corners : lapsimTrackView[id]?.corners) || [], L = t.length;
  const inside = (a, b) => C.filter(c => { const s = c.s; return a <= b ? s >= a && s <= b : s >= a || s <= b; }).map(c => 'T' + c.number + (c.letter || ''));
  const near = s => { let best = null, bd = 1e9; for (const c of C) { const d = ((s - c.s) % L + L) % L; if (d < bd) { bd = d; best = c; } } return best ? 'T' + best.number + '+' + Math.round(bd) : '?'; };
  const out = [id + ' (' + Math.round(L) + ' m)'];
  for (const y of Object.keys(z)) { const e = z[y];
    out.push('  ' + y + ' ' + e.kind + ': ' + e.zones.map(q => q.n + '[' + near(q.from) + '→' + near(q.to) + ' ' + Math.round(((q.to - q.from) % L + L) % L) + 'm' + (inside(q.from, q.to).length ? ' over ' + inside(q.from, q.to).join(',') : '') + ']').join(' ') + ' | ' + (e.marks || []).map(m => m.label + '@' + near(m.s)).join(' ')); }
  console.log(out.join('\n')); }
