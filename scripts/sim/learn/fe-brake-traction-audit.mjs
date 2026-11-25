// Step 35 report (central 18:35): FE braking share, rear-regen demand over 350 kW, traction-limited share below 120 km/h, per car mode.
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {FE_GENS} from '../../../worker/lapsim/fe-cars.js';
const K = lapsimKernel(), A = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, c0 = FE_GENS['fe-gen3evo'].car;
const env = K.conditionsFromWeather({pressureHpa: 1013, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
const cars = {awd: c0, v1duel: {...c0, frontMaxW: 50e3}, rear300: {...c0, awdAboveKph: null, pIce: 300e3}};
for (const id of ['monte-carlo', 'fe-tokyo', 'fe-jeddah', 'fe-london']) { const t = K.trackFromData(A[id]), out = [];
  for (const [k, c] of Object.entries(cars)) { const r = K.simulateLap(t, c, env), n = r.v.length; let tt = 0, tr = 0, br = 0, ac = 0, rearOver = 0, brT = 0;
    for (let i = 0; i < n; i++) { const dt = (i + 1 < n ? r.time[i + 1] : r.lapTime) - r.time[i]; tt += dt; const v = r.v[i];
      if (r.limit[i] === 3) { br += dt; const a = (v ** 2 - r.v[(i + 1) % n] ** 2) / (2 * t.ds); const P = 0.42 * c.mass * a * v; brT += dt; if (P > 350e3) rearOver += dt; }
      if (v < 120 / 3.6 && (r.limit[i] === 1 || r.limit[i] === 2)) { ac += dt; if (r.limit[i] === 1) tr += dt; } }
    out.push({car: k, lap: +r.lapTime.toFixed(2), brakingSharePct: +(br / tt * 100).toFixed(1), accelBelow120SharePct: +(ac / tt * 100).toFixed(1), tractionLimitedOfThatPct: +(tr / ac * 100).toFixed(0), rearRegenOver350OfBrakingPct: +(rearOver / brT * 100).toFixed(1)}); }
  console.log(id); console.table(out); }
