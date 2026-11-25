// Night N3 (rule docs/night/step32-n3-rule-2026-11-25.md 2e128de2…): per-corner rows with the A2 LOTO baseline error and covariates
// from data already in the repo. Report-only. usage: node scripts/sim/night/n3-rows.mjs <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import * as S from '../learn/step32-loto.mjs';
import {carsFor} from '../../../worker/lapsim/scenario.js';
const here = new URL('../data/', import.meta.url), KJ = JSON.parse(readFileSync(new URL('step32/kappa.json', here)));
const FL = JSON.parse(readFileSync(new URL('step32/flatout-top10.json', here))).laps, COR = JSON.parse(readFileSync(new URL('step31/corridor.json', here)));
const G = {}, SH = {}, ses = {}, rows = [];
for (const e of S.EV) { if (e.year > 2025) continue;
  const n = e.n, ds = e.ds, w = Math.trunc(40 / ds), W = Math.trunc(200 / ds), mi = k => ((k - e.shift) % n + n) % n;
  const v = (ses[e.session] ??= Array.from(S.K.simulateLap(S.trackFor(e.track, e.zones, (G[e.track] ??= S.a2Grip(e.track)), false), (SH[e.track] ??= carsFor(e.track)['2025'].car), S.envOf(e.track)).v, x => x * 3.6));
  const vm = k => v[mi(k)], kap = KJ.kappa[e.track], gr = S.T[e.track].grade, f = FL[S.keyOf(e)], cor = COR.tracks[e.track];
  const flatAt = k => { if (!f) return null; let j = e.xs.findIndex(x => x >= k); if (j < 0) j = e.xs.length - 1; return f[j] === '1'; };
  const g = k => (gr ? gr[mi(k)] : 0) / 1e4; // rad
  for (const [i] of e.corners) {
    const meas = e.a[i]; if (meas == null) continue;
    let e40 = Infinity; for (let q = -w; q <= w; q++) e40 = Math.min(e40, vm(i + q));
    let best = Infinity, off = 0; for (let q = -W; q <= W; q++) if (vm(i + q) < best) { best = vm(i + q); off = q; }
    let kmax = 0, koff = 0, k40 = 0; for (let q = -W; q <= W; q++) { const k = Math.abs(kap[mi(i + q)]); if (k > kmax) { kmax = k; koff = q; } if (Math.abs(q) <= w) k40 = Math.max(k40, k); }
    const b100 = Math.trunc(100 / ds), b300 = Math.trunc(300 / ds); let dz = 0, ent = 0;
    for (let q = -b100; q < 0; q++) dz += Math.sin(g(i + q)) * ds;
    for (let q = -b300; q < 0; q++) { const a = e.a[((i + q) % n + n) % n]; if (a != null) ent = Math.max(ent, a); }
    const err = e40 - meas, errLocal = best - meas, flat = flatAt(i), aym = (meas / 3.6) ** 2 * k40 / 9.81;
    const cls = err <= 20 ? '-' : (Math.abs(koff * ds) >= 100 || errLocal < 10) ? 'C' : flat ? 'D' : (meas <= 130 && aym <= 2.5) ? 'B' : 'A';
    rows.push({key: S.keyOf(e), track: e.track, year: e.year, i, ds, meas, err, koff_m: koff * ds, flat, cls,
      R_geom: k40 ? 1 / k40 : null, vcurv: (g(i + w) - g(i - w)) / (2 * w * ds), dz_entry: dz,
      kerb: cor ? (cor.corners.some(c => c.ok && Math.min(Math.abs(c.ia - mi(i)), n - Math.abs(c.ia - mi(i))) * ds <= 40) ? 1 : 0) : null,
      complex: e.corners.some(([j]) => j !== i && Math.min(Math.abs(j - i), n - Math.abs(j - i)) * ds <= 150) ? 1 : 0,
      entry_kph: ent, lappos: mi(i) / n}); } }
writeFileSync(process.argv[2], JSON.stringify(rows)); console.log(rows.length, 'corner rows');
