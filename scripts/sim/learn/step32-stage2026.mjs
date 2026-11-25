// Step 32 (docs/prereg/step32-empirical-ggv-2026-11-25.md + A1): 2026 model stage and measured 2026 pole laps.
// Stage = the A2 stage of step31-baseline.mjs with the shipped 2026 car, as tool.js runs it without options or sector correction:
// production zones (withZones), real 2026 weather, recharge limit, C5.12 ramp (PU_RAMP), timeScale. Wet-quali laps are left out (30c).
// Export: node scripts/sim/learn/step32-stage2026.mjs <out.json>  (model laps at A2 grip + the cleaned measured laps)
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {carsFor, realConditions} from '../../../worker/lapsim/scenario.js';
import {withZones, puRampOf, PU_RAMP} from '../../../worker/lapsim/zones.js';
import {rechargeLimitMJ} from '../../../worker/lapsim/energy-limits.js';
import {lapsimF1RealTel} from '../../../worker/lapsim/f1-real-telemetry-data.js';
import {lapsimF1WetQuali} from '../../../worker/lapsim/f1-wet-quali-data.js';
import {cleanTel} from '../../../worker/lapsim/real-tel-gaps.js';

export const K = lapsimKernel();
export const TRACKS26 = Object.keys(lapsimF1RealTel).filter(id => lapsimF1RealTel[id]['2026'] && !lapsimF1WetQuali[id]?.['2026'] && T[id]).sort();
const grip = id => carsFor(id)['2026'].grip || 1;
export const a2Grip26 = held => Math.exp(TRACKS26.filter(t => t !== held).reduce((a, t) => a + Math.log(grip(t)), 0) / (TRACKS26.length - 1));
export function stage26(id) { // track (zones), env, shipped 2026 car entry
  const d = {...T[id], id}, c = carsFor(id)['2026'], r = realConditions(id)['2026'] || {}, p = (k, f) => Number.isFinite(r[k]) ? r[k] : f;
  const mj = rechargeLimitMJ(id, 2026), env = K.conditionsFromWeather({airTempC: p('airTempC', 25), trackTempC: p('trackTempC', 35), humidityPct: p('humidityPct', 50),
    pressureHpa: p('pressureHpa', 1013.25), windSpeed: p('windSpeed', 0), windFromDeg: p('windFromDeg', 0), rechargeMJ: mj ?? undefined});
  return {d, c, tr: withZones(K, d, K.trackFromData(d), c), env: PU_RAMP ? {...env, puRamp: puRampOf(d, id)} : env};
}
export function sim26(id, car, g, trMod = x => x) {
  const s = stage26(id), tr = trMod(s.tr), r = K.simulateLap({...tr, mu: Float64Array.from(tr.mu, m => m * g)}, car || s.c.car, s.env);
  return {v: Array.from(r.v, x => x * 3.6), time: Array.from(r.time), lap: r.lapTime * (s.c.timeScale || 1), ds: s.d.ds};
}
if (process.argv[1]?.endsWith('step32-stage2026.mjs') && process.argv[2]) {
  const out = {tracks: TRACKS26, events: {}};
  for (const id of TRACKS26) {
    const m = lapsimF1RealTel[id]['2026'], cl = cleanTel(m), s = sim26(id, null, a2Grip26(id));
    out.events[id] = {track: id, year: 2026, grip: a2Grip26(id), lap_meas_s: m.lap, lap_model_s: s.lap, ds: s.ds, v_model: s.v.map(x => Math.round(x * 100) / 100),
      len: m.len, x: cl.x, speed: cl.speed};
  }
  writeFileSync(process.argv[2], JSON.stringify(out));
  console.log(TRACKS26.length, 'dry 2026 tracks:', TRACKS26.join(' '));
}
