// Formula E Gen4 prior model: runs the uncalibrated prior car and writes what it predicts, how it compares with the
// published claims, and which unknown moves the lap time most. No fit. Output: scripts/sim/data/fe-gen4-prior.json
//   node scripts/sim/fe-gen4-prior.mjs [trackId ...]
import {writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../worker/lapsim/kernel.js';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {FE_GEN4_FIXED, FE_GEN4_PRIOR, FE_GEN4_AERO, FE_GEN4_MODES, gen4Car, modeCar, straightLine, lapEnergy, powerSplit} from '../../worker/lapsim/fe-gen4.js';

const K = lapsimKernel();
const env = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35});
const r3 = x => Math.round(x * 1000) / 1000;
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['monza', 'jeddah', 'zandvoort', 'shanghai', 'mexico-city', 'miami', 'austin', 'monte-carlo'];

// Published claims the prior is checked against (not fitted to). Sources: docs/lapsim-fe-gen4-prep.md.
const CLAIMS = {t100: 1.8, t200: 4.4, vTopKph: 335, monza: {lapTime: 92.5, vMaxKph: 320, note: 'Porsche test, unofficial, "1:32 range", used tyres, package and power not confirmed'}};

const lap = (id, car) => { const tr = K.trackFromData(lapsimTracks[id]); const r = K.simulateLap(tr, car, env); return {r, tr}; };

const out = {generated: new Date().toISOString().slice(0, 10), status: 'prior, not calibrated', fixed: FE_GEN4_FIXED, claims: CLAIMS, powerSplit: {600: powerSplit(600), 450: powerSplit(450)}, straightLine: {}, tracks: {}, sensitivity: {}, impliedGrip: {}};

for (const [aero, power] of [['ldf', 600], ['hdf', 600], ['ldf', 450], ['hdf', 450]]) {
  const s = straightLine(gen4Car({aero, powerKW: power}), {rho: env.rho});
  out.straightLine[`${aero}-${power}`] = {t100: r3(s.t100), t200: r3(s.t200), vTopKph: r3(s.vTopKph), dragLimited: s.dragLimited};
}

for (const id of ids) {
  if (!lapsimTracks[id]) continue;
  const row = {lengthM: lapsimTracks[id].length, layout: 'F1 layout in the simulator; the Formula E layout may differ', modes: {}};
  for (const mode of Object.keys(FE_GEN4_MODES)) {
    const car = modeCar(mode), {r, tr} = lap(id, car), e = lapEnergy(r, car, tr, {rho: env.rho});
    row.modes[mode] = {lapTime: r3(r.lapTime), vMaxKph: r3(r.vMaxKph), netKWh: r3(e.netKWh), outKWh: r3(e.outKWh), regenFraction: r3(e.regenFraction),
      flatOutLaps: r3(FE_GEN4_FIXED.raceEnergyKWh / e.netKWh)};
  }
  out.tracks[id] = row;
}

// One-at-a-time sensitivity at Monza, qualifying car: lap-time change over the prior range of each unknown.
{
  const base = modeCar('qualifying'), t0 = lap('monza', base).r.lapTime;
  const vary = (key, value) => lap('monza', {...base, ...(key === 'vMaxKph' ? {vMax: value / 3.6} : {[key]: value})}).r.lapTime - t0;
  for (const [k, p] of Object.entries(FE_GEN4_PRIOR)) {
    if (k === 'regenShare' || k === 'etaRegen') continue;
    out.sensitivity[k] = {lo: p.lo, hi: p.hi, dtLo: r3(vary(k, p.lo)), dtHi: r3(vary(k, p.hi))};
  }
  const b = FE_GEN4_AERO.hdf.bounds;
  for (const k of ['clA', 'cdA']) out.sensitivity[k] = {lo: b[k][0], hi: b[k][1], dtLo: r3(vary(k, b[k][0])), dtHi: r3(vary(k, b[k][1]))};
  out.sensitivity.base = {mode: 'qualifying', track: 'monza', lapTime: r3(t0)};
}

// Lateral grip each configuration would need to match the reported Monza lap (a consistency check, not a fit).
for (const [aero, power] of [['ldf', 600], ['hdf', 600], ['ldf', 450]]) {
  const f = mu => lap('monza', gen4Car({aero, powerKW: power, overrides: {muY: mu, muX: mu * 1.5 / 1.6, muXTrac: mu * 1.65 / 1.6}})).r.lapTime - CLAIMS.monza.lapTime;
  let lo = 1.0, hi = 2.6;
  if (f(lo) < 0 || f(hi) > 0) { out.impliedGrip[`${aero}-${power}`] = null; continue; }
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  out.impliedGrip[`${aero}-${power}`] = r3((lo + hi) / 2);
}

writeFileSync(new URL('./data/fe-gen4-prior.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
