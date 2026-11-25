// Step 34b X4 (report only, data question; central 22:20): audit of every WEC trap position used by the class fit.
// node scripts/sim/x4-trap-audit.mjs <calibration-output dir of base 45566297648>
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {withGrip} from './calibrate-lib.mjs';
import {trapTable} from './wec-trap-pos.mjs';
const [, , dir] = process.argv; const m = await import(dir + '/worker/lapsim/calibration-data.js'); const d = m.default || m; let w;
const f = o => { if (!o || typeof o !== 'object' || w) return; if (o.lmh && o.lmdh && o.lmgt3) { w = o; return; } for (const k in o) f(o[k]); }; f(d);
const KS = 1 / 500; // straight: |κ| < 1/500 m⁻¹ (radius > 500 m)
const rows = [];
for (const c of ['lmh', 'lmdh', 'lmgt3']) for (const [y, s] of Object.entries(w[c] || {})) for (const [id, t] of Object.entries(s.tracks || {})) {
  if (t.trapAtM == null || !lapsimTracks[id]) continue;
  const tr = trackFromData(lapsimTracks[id]), ds = tr.ds, n = tr.kappa.length, L = n * ds, i0 = Math.round(t.trapAtM / ds) % n;
  const res = simulateLap(withGrip(tr, t.grip), s.car, conditionsFromWeather(t.weather || {})), v = j => res.v[((j % n) + n) % n] * 3.6;
  const win = mm => { let x = 0; for (let j = i0 - Math.round(mm / ds); j <= i0 + Math.round(mm / ds); j++) x = Math.max(x, v(j)); return x; };
  let a = i0, b = i0; while (Math.abs(tr.kappa[((a - 1) % n + n) % n]) < KS && i0 - a < n) a--; while (Math.abs(tr.kappa[(b + 1) % n]) < KS && b - i0 < n) b++;
  const onStraight = Math.abs(tr.kappa[i0]) < KS, vmax = Math.max(...res.v) * 3.6;
  rows.push({c, y, id, pos: t.trapAtM, status: t.trapPos, L: Math.round(L), onStraight, strFrom: Math.round(((a * ds) % L + L) % L), strTo: Math.round((b * ds) % L), intoStraight: Math.round((i0 - a) * ds), toEnd: Math.round((b - i0) * ds),
    vAt: v(i0), v100: win(100), v300: win(300), vLapMax: vmax, real: t.trapKph});
}
const f1 = x => x.toFixed(1);
console.log('| class-season | track | printed m (status) | lap m | on straight | straight [from–to] m; trap from start / to end | model at point | max ±100 m | max ±300 m (fit) | lap max | measured | ±100 − measured |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const r of rows.sort((p, q) => (p.id === 'interlagos' ? -1 : 0) - (q.id === 'interlagos' ? -1 : 0) || p.id.localeCompare(q.id) || p.c.localeCompare(q.c) || p.y.localeCompare(q.y)))
  console.log(`| ${r.c} ${r.y} | ${r.id} | ${r.pos} (${r.status}) | ${r.L} | ${r.onStraight ? 'yes' : '**no**'} | ${r.strFrom}–${r.strTo}; ${r.intoStraight} / ${r.toEnd} | ${f1(r.vAt)} | ${f1(r.v100)} | ${f1(r.v300)} | ${f1(r.vLapMax)} | ${r.real ?? '–'} | ${r.real != null ? (r.v100 - r.real > 0 ? '+' : '') + f1(r.v100 - r.real) : '–'} |`);
console.log('\nTrap table (all printed rows):', JSON.stringify(trapTable()));
