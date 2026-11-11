// Formula E Gen4 prior model: runs the uncalibrated prior car and writes what it predicts, how it compares with the
// published claims, and which unknown moves the lap time most. No fit. Output: scripts/sim/data/fe-gen4-prior.json
//   node scripts/sim/fe-gen4-prior.mjs [trackId ...]
import {writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../worker/lapsim/kernel.js';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {FE_GEN4_FIXED, FE_GEN4_PRIOR, FE_GEN4_AERO, FE_GEN4_MODES, gen4Car, modeCar, straightLine, lapEnergy, powerSplit, gen3EvoCar, gripSet} from '../../worker/lapsim/fe-gen4.js';

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
  const f = mu => lap('monza', gen4Car({aero, powerKW: power, overrides: gripSet(mu)})).r.lapTime - CLAIMS.monza.lapTime;
  let lo = 1.0, hi = 2.6;
  if (f(lo) < 0 || f(hi) > 0) { out.impliedGrip[`${aero}-${power}`] = null; continue; }
  for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (f(mid) > 0) lo = mid; else hi = mid; }
  out.impliedGrip[`${aero}-${power}`] = r3((lo + hi) / 2);
}

// Method check on real laps: Monaco is the one venue where Formula E uses the layout the simulator has.
// Gen3 Evo best duel laps: 1:26.217 (2026) and 1:26.315 (2025), both at 350 kW with four-wheel drive.
{
  const ref = {lapTime: 86.217, source: 'e-formula.news, Monaco 2026 semi-final duel (D. Ticktum)', claimGainS: [8, 10]};
  const t = (car) => lap('monte-carlo', car).r.lapTime;
  const solve = (f, lo, hi) => { for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; } return (lo + hi) / 2; };
  const rows = {};
  for (const [clA, cdA] of [[1.5, 0.6], [1.75, 0.62], [2.0, 0.65]]) {
    const mu = solve(m => t(gen3EvoCar(m, {clA, cdA})) - ref.lapTime, 1, 2.6);
    rows[`clA ${clA}`] = {gen3EvoMuY: r3(mu), gen4QualifyingGainS: Object.fromEntries([1, 1.05, 1.075, 1.1].map(k => [k, r3(ref.lapTime - t(gen4Car({aero: 'hdf', powerKW: 600, overrides: gripSet(mu * k)})))]))};
  }
  const mid = rows['clA 1.75'].gen3EvoMuY;
  // downforce the high package would need for the claimed 8 s gain, with 7.5 % more grip than Gen3 Evo
  const gap = cl => t(gen4Car({aero: 'hdf', powerKW: 600, overrides: {...gripSet(mid * 1.075), clA: cl, clALow: cl}})) - (ref.lapTime - 8);
  const need = gap(9) > 0 ? null : solve(gap, 2, 9);
  out.gen3EvoCheck = {track: 'monte-carlo', ref, rows, priorGainS: r3(ref.lapTime - t(modeCar('qualifying'))), clANeededFor8s: need == null ? null : r3(need),
    note: 'simulator Monaco is 3267 m against 3337 m official, so absolute times run about 2 % short; the Gen3 Evo to Gen4 difference is not affected'};
}

writeFileSync(new URL('./data/fe-gen4-prior.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(JSON.stringify(out, null, 1));
