// WEC speed-trap position per track and season (step 34 data fix; physics rules §4.3 limit 2: the trap was compared with the lap
// maximum). Source: scripts/sim/data/fia-docs/wec-timing-lines-2023-2025.csv (Al Kamel circuit maps; "sourced" = printed distance,
// "estimated" = digitised on the map, ±25 m). Placement as printed: metres from our s = 0 (timing line).
// A season without a row takes the position only when every published season shows the same distance (≥ 2 seasons), as the
// step 21 sector lines; otherwise null (the fit keeps the old lap-maximum comparison there).
import {readFileSync} from 'node:fs';

const ID = {'Qatar / Lusail': 'lusail', Imola: 'imola', 'Spa-Francorchamps': 'spa-francorchamps', 'Le Mans': 'le-mans', 'São Paulo / Interlagos': 'interlagos',
  COTA: 'austin', Fuji: 'fuji', Bahrain: 'sakhir', 'Portimão': 'portimao', Monza: 'monza', Sebring: 'sebring'};
// minimal CSV with quoted fields
const parse = t => t.replace(/^﻿/, '').trim().split('\n').map(l => { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; });
export function trapTable(file = 'scripts/sim/data/fia-docs/wec-timing-lines-2023-2025.csv') {
  const [h, ...L] = parse(readFileSync(file, 'utf8')), k = n => h.indexOf(n), T = {};
  for (const r of L) if (/speed trap/i.test(r[k('line')]) && ID[r[k('circuit')]]) (T[ID[r[k('circuit')]]] ||= {})[r[k('year')]] = {m: +r[k('distance_m')], status: r[k('status')]};
  return T;
}
// Mapping fixes (step 34b, central 2026-11-26 05:40; data mapping only — measured trap speeds and the source CSV are unchanged).
// sakhir: the printed 625/650 m (estimated on the Al Kamel map, grid-start scale) lands in T1 on our geometry (our main straight
// 4977 → 635 m, T1 apex 700 m; X4 audit: model 119–123 km/h there). The same map puts SCL2 at 725 m, also "pit straight before
// T1", so the map runs ≥ 90 m long against our s on this straight. Fix (description-constrained, ±50 m): SCL2 at our straight end
// and the printed trap-to-SCL2 gap kept: 635 − (725 − 650)·(5337 / 5412) = 561 m, every season (2023's 625 m printed, same rule:
// 635 − 100·0.986 = 536 m). interlagos: no change — the sourced S1/S2 lines (1234, 3155 m) land where their descriptions say on our
// geometry (±50 m after the 4230/4309 length scale), the trap (125 m) is on our main straight 110 m before its end, and the grade of
// that straight matches an independent DEM line (geom-indep a3); the +20 to +42 km/h model-vs-trap gap is not a mapping error.
export const TRAP_FIX = {sakhir: {2023: 536, 2024: 561, 2025: 561}};
let T = null;
export function trapAt(track, year) {
  if (!T) { T = trapTable(); for (const [id, ys] of Object.entries(TRAP_FIX)) for (const [y, m] of Object.entries(ys)) if (T[id]?.[y]) T[id][y] = {...T[id][y], m, status: 'geometry fix', printed: T[id][y].m}; }
  const t = T[track]; if (!t) return null;
  if (t[year]) return t[year];
  const v = Object.values(t); return v.length >= 2 && v.every(x => x.m === v[0].m) ? {...v[0], carried: true} : null;
}
