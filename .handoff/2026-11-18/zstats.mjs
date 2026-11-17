import {lapsimF1Zones as Z} from '/home/claude/wt-c/worker/lapsim/f1-zones-data.js';
import {lapsimAllTracks as T} from '/home/claude/wt-c/worker/lapsim/tracks.js';
const ids = 'melbourne shanghai suzuka sakhir jeddah miami imola monte-carlo catalunya montreal spielberg silverstone spa-francorchamps hungaroring zandvoort monza baku singapore austin mexico-city interlagos las-vegas lusail yas-marina-circuit madring'.split(' ');
const rows = [];
for (const id of ids) { const t = T[id], z = Z.tracks[id]; if (!t || !z) continue; const n = t.kappa.length, ds = t.ds, L = n * ds;
  for (const y of Object.keys(z)) { const e = z[y];
    for (const q of e.zones) { const len = ((q.to - q.from) % L + L) % L; let mk = 0; for (let d = 0; d <= len; d += ds) { const i = Math.round(((q.from + d) % L) / ds) % n; let m = 0; for (let j = -5; j <= 5; j++) m += t.kappa[(i + j + n) % n] / 1e5; mk = Math.max(mk, Math.abs(m / 11)); }
      const det = (e.marks || []).filter(m => m.kind === 'det').map(m => ((q.from - m.s) % L + L) % L).sort((a, b) => a - b)[0];
      rows.push([id, +y, e.kind, q.n, Math.round(len), Math.round(mk ? 1 / mk : 99999), det == null ? -1 : Math.round(det), e.est ? 1 : 0]); } } }
console.log(JSON.stringify(rows));
