// Wing-level polar A1 §5: power first. Conservative unpaired MDE of the primary (straight-end RMS, lap -> session -> track) from the
// A2 LOTO baseline alone (a2Grip(track) + shipped 2025 car, as the fold's baseSim); no candidate. Exit 1 if MDE > 30 % of the baseline mean.
// usage: node scripts/sim/learn/step32-polar-power.mjs <out.json>
import {writeFileSync} from 'node:fs';
import * as S from './step32-loto.mjs';
import {carsFor} from '../../../worker/lapsim/scenario.js';
const Z = 2.2414027 + 0.8416212; // z(1 - 0.05/4) + z(0.8)
const by = {}, G = {}, SH = {};
for (const e of S.EV) { if (e.year > 2025) continue;
  const r = S.K.simulateLap(S.trackFor(e.track, e.zones, (G[e.track] ??= S.a2Grip(e.track)), false), (SH[e.track] ??= carsFor(e.track)['2025'].car), S.envOf(e.track));
  const se = S.strEnd(e, {v: Array.from(r.v, x => x * 3.6)}); if (!se.length) continue;
  ((by[e.track] ??= {})[e.session] ??= []).push(Math.sqrt(se.reduce((a, x) => a + x * x, 0) / se.length)); }
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const t = Object.values(by).map(ss => mean(Object.values(ss).map(mean))), m = mean(t), sd = Math.sqrt(t.reduce((a, x) => a + (x - m) ** 2, 0) / (t.length - 1));
const out = {primary: 'straight-end RMS', n_tracks: t.length, base_mean_kph: m, sd_tracks_kph: sd, mde_kph: Z * sd / Math.sqrt(t.length), need_kph: 0.3 * m};
out.judgeable = out.mde_kph <= out.need_kph; writeFileSync(process.argv[2], JSON.stringify(out, null, 1)); console.log(JSON.stringify(out));
if (!out.judgeable) process.exit(1);
