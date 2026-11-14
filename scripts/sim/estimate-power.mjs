// Direct estimate of F1 wheel power and drag from telemetry (evidence layer 3: physics applied to measured speed).
// On near-straight full-throttle points between LO and HI km/h:  v·(m·k·a + rolling + grade) = P_wheel − CdA·(ρ/2)·v³.
// A straight-line fit over all points of a season gives P_wheel (intercept) and CdA (slope). Corner-mode points
// (outside low-drag zones) are the primary set. Reads .cache/lapsim/traces.json; writes scripts/sim/data/f1-power-estimate.json.
import {readFile, writeFile} from 'node:fs/promises';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {PRIOR} from '../../worker/lapsim/cars.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';

const LO = 180, HI = 260, MAX_LAT = 6, YEARS = [2023, 2024, 2025];
const traces = JSON.parse(await readFile('.cache/lapsim/traces.json', 'utf8'));
const at = (arr, ds, s) => { const n = arr.length, x = ((s / ds) % n + n) % n, i = Math.floor(x), f = x - i; return arr[i] * (1 - f) + arr[(i + 1) % n] * f; };
const fit = pts => { const n = pts.length; let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const p of pts) { sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; } const b = (n * sxy - sx * sy) / (n * sxx - sx * sx); return {power: (sy - b * sx) / n, cdA: -b}; };
const out = {source: 'scripts/sim/estimate-power.mjs on the pinned .cache/lapsim/traces.json (OpenF1 qualifying laps, positions 1-3)', method: `full throttle for 5 samples, no brake, ${LO}-${HI} km/h, lateral under ${MAX_LAT} m/s2, outside low-drag zones; mass, rolling resistance and rotating-mass factor from the season prior`, evidenceLayer: 3, seasons: {}};
for (const year of YEARS) {
  const car = PRIOR[year], pts = [];
  for (const t of traces) {
    if (t.year !== year || t.weather?.rain || !t.throttle || !lapsimTracks[t.track]) continue;
    const tr = trackFromData(lapsimTracks[t.track]), env = conditionsFromWeather(t.weather || {}), v = t.v.map(x => x / 3.6);
    for (let i = 2; i < t.s.length - 2; i++) {
      let ok = true; for (let j = -2; j <= 2; j++) if (t.throttle[i + j] < 99 || (t.brake && t.brake[i + j])) ok = false;
      const ds = t.s[i + 1] - t.s[i - 1], kph = t.v[i];
      if (!ok || ds < 8 || kph < LO || kph >= HI || v[i] * v[i] * Math.abs(at(tr.kappa, tr.ds, t.s[i])) > MAX_LAT) continue;
      if (tr.aeroLow[Math.round(t.s[i] / tr.ds) % tr.kappa.length]) continue;
      const a = v[i] * (v[i + 1] - v[i - 1]) / ds, g = tr.grade ? at(tr.grade, tr.ds, t.s[i]) : 0, N = car.mass * 9.81 + 0.5 * env.rho * car.clA * v[i] ** 2;
      pts.push({track: t.track, x: 0.5 * env.rho * v[i] ** 3, y: v[i] * (car.mass * car.inertiaFactor * a + car.cRoll * N + car.mass * 9.81 * Math.sin(g))});
    }
  }
  const all = fit(pts), names = [...new Set(pts.map(p => p.track))];
  // spread: leave one track out
  const jk = names.map(n => fit(pts.filter(p => p.track !== n)).power), m = jk.reduce((a, b) => a + b, 0) / jk.length;
  const se = Math.sqrt((jk.length - 1) / jk.length * jk.reduce((a, b) => a + (b - m) ** 2, 0));
  const pIce = all.power / car.etaDrive - (car.ers.pMax || 0) * car.etaErs;
  out.seasons[year] = {points: pts.length, tracks: names.length, wheelPowerW: Math.round(all.power), wheelPowerSeW: Math.round(se), cdA: +all.cdA.toFixed(3), pIceW: Math.round(pIce), pIceOverPrior: +(pIce / car.pIce).toFixed(3),
    assumes: `ERS-K at ${(car.ers.pMax || 0) / 1e3} kW on these points, etaDrive ${car.etaDrive}, etaErs ${car.etaErs}, rotating-mass factor ${car.inertiaFactor}, mass ${car.mass} kg`};
}
await writeFile('scripts/sim/data/f1-power-estimate.json', JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out.seasons, null, 1));
