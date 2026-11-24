// Step 30c (report-only): export kernel geometry, shipped-model speed on the step 28 baseline laps, and the 2025/2026 pole laps + page model.
// Model stage copied from scripts/sim/learn/f1-envelope-baseline.py (2025 car, grip, production weather, event DRS zones).
// Usage (repo root): node scripts/sim/learn/step30c-export.mjs <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {carsFor, realConditions} from '../../../worker/lapsim/scenario.js';
import {lapsimF1RealTel} from '../../../worker/lapsim/f1-real-telemetry-data.js';
import {lapsimF1WetQuali} from '../../../worker/lapsim/f1-wet-quali-data.js';
import {cleanTel} from '../../../worker/lapsim/real-tel-gaps.js';
import {page} from './f1-pedal-metrics.mjs';

const TRACKS = ['austin', 'hungaroring', 'interlagos', 'mexico-city', 'montreal', 'monza', 'sakhir', 'shanghai', 'silverstone',
  'spa-francorchamps', 'spielberg', 'suzuka', 'zandvoort', 'kuala-lumpur'];
const K = lapsimKernel(), tr = JSON.parse(readFileSync('scripts/sim/data/f1-envelope/traces.json', 'utf8'));
const out = {tracks: {}, model: {}, realtel: {}};
for (const id of TRACKS) {
  const d = T[id], t = K.trackFromData(d);
  out.tracks[id] = {ds: d.ds, kappa: Array.from(t.kappa), mapx: d.map.x, mapy: d.map.y, heading: Array.from(t.heading), corners: d.corners};
}
for (const [key, e] of Object.entries(tr.events)) {
  if (!TRACKS.includes(e.track)) continue;
  if (e.year < 2023) throw new Error('2022 is locked');
  const d = T[e.track], c = carsFor(e.track)['2025'], cs = realConditions(e.track), real = cs['2025'] || cs['2026'] || Object.values(cs)[0] || {};
  const p = (k, f) => Number.isFinite(real[k]) ? real[k] : f;
  const env = K.conditionsFromWeather({airTempC: p('airTempC', 25), trackTempC: p('trackTempC', 35), humidityPct: p('humidityPct', 50),
    pressureHpa: p('pressureHpa', 1013.25), windSpeed: p('windSpeed', 0), windFromDeg: p('windFromDeg', 0)});
  let t = K.trackFromData(d); const zs = e.zones || [];
  t = {...t, aeroLow: zs.length ? K.trackFromData({...d, aeroZones: zs}, {aero: 'fia'}).aeroLow : new Uint8Array(d.kappa.length)};
  const g = c.grip || 1; t = {...t, mu: Float64Array.from(t.mu, m => m * g)};
  const r = K.simulateLap(t, c.car, env);
  out.model[key] = {n: r.v.length, v: Array.from(r.v, x => x * 3.6)};
}
for (const id of TRACKS) for (const y of ['2025', '2026']) {
  const r = lapsimF1RealTel[id]?.[y]; if (!r || lapsimF1WetQuali[id]?.[y]) continue;
  const c = cleanTel(r), P = page(id, y);
  out.realtel[id + '|' + y] = {len: r.len, share: c.share, gaps: c.gaps, x: c.x, v: c.speed, modelOk: !!P,
    mx: P ? P.x : null, mv: P ? P.v.map(v => v * 3.6) : null};
}
writeFileSync(process.argv[2], JSON.stringify(out));
console.log(Object.keys(out.model).length, 'model laps;', Object.keys(out.realtel).length, 'pole laps');
