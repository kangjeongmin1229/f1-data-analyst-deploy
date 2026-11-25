// Step 32 A3.1: A2-baseline model speed per quali session (reference for the frame lag of every measured lap, and the baseline rows).
// 2023–25: step31-baseline.mjs stage (2025 car, A2 grip, production weather, the event's DRS zones); 2026: step32-stage2026.mjs stage.
// usage: node scripts/sim/learn/step32-models.mjs <events.json [[year, event, track], ...]> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {carsFor, realConditions} from '../../../worker/lapsim/scenario.js';
import {K, sim26, a2Grip26} from './step32-stage2026.mjs';

const ZT = readFileSync('scripts/sim/data/f1-delta/zone-mapping-table.csv', 'utf8').trim().split(/\r?\n/), split = l => l.split(','), zh = split(ZT.shift());
const Z = {}; for (const l of ZT) { const r = Object.fromEntries(split(l).map((v, i) => [zh[i], v])); if (r.sim_from_m && +r.year >= 2023 && +r.year <= 2025) (Z[r.year + '|' + r.event] ??= []).push([+r.sim_from_m, +r.sim_to_m]); }
const FOLD = [...new Set(Object.values(JSON.parse(readFileSync('scripts/sim/data/f1-envelope/traces.json', 'utf8')).events).map(e => e.track))].sort();
const grip = id => carsFor(id)['2025'].grip || 1, a2Grip = held => Math.exp(FOLD.filter(t => t !== held).reduce((a, t) => a + Math.log(grip(t)), 0) / (FOLD.length - 1));
const envOf = id => { const cs = realConditions(id), r = cs['2025'] || cs['2026'] || Object.values(cs)[0] || {}, p = (k, f) => Number.isFinite(r[k]) ? r[k] : f;
  return K.conditionsFromWeather({airTempC: p('airTempC', 25), trackTempC: p('trackTempC', 35), humidityPct: p('humidityPct', 50), pressureHpa: p('pressureHpa', 1013.25), windSpeed: p('windSpeed', 0), windFromDeg: p('windFromDeg', 0)}); };
const out = {};
for (const [y, ev, id] of JSON.parse(readFileSync(process.argv[2], 'utf8'))) {
  if (y < 2023) throw new Error('2022 is locked');
  if (y === 2026) { const s = sim26(id, null, a2Grip26(id)); out[y + '|' + ev] = {track: id, ds: s.ds, v: s.v, lap: s.lap, zones: []}; continue; }
  const d = T[id], zs = Z[y + '|' + ev] || [];
  let tr = K.trackFromData(d); tr = {...tr, aeroLow: zs.length ? K.trackFromData({...d, aeroZones: zs}, {aero: 'fia'}).aeroLow : new Uint8Array(d.kappa.length)};
  const g = a2Grip(id), r = K.simulateLap({...tr, mu: Float64Array.from(tr.mu, m => m * g)}, carsFor(id)['2025'].car, envOf(id));
  out[y + '|' + ev] = {track: id, ds: d.ds, v: Array.from(r.v, x => x * 3.6), lap: r.lapTime, zones: zs};
}
writeFileSync(process.argv[3], JSON.stringify(out));
console.log(Object.keys(out).length, 'sessions');
