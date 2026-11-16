// Pit loss and pit speed per F1 track, learned from the measured pit losses (task A5; owner rule: measured data is never changed).
//   node scripts/sim/pit-loss-fit.mjs   -> prints the table; writes scripts/sim/data/learn/pit-loss-fit.json
// Measured: worker/lapsim/race-data.js pitLoss = in-lap + out-lap − 2 × the driver's clean race lap (median per track, F1 races).
// Model: the car leaves the lap at the pit entry and rejoins at the pit exit (worker/lapsim/pit-lane-data.js, OpenStreetMap path).
// On the pit path it brakes from its lap speed at the entry (BRAKE_MS2) down to the limit, holds the limit, and accelerates back to its
// lap speed at the exit (ACCEL_MS2). Drive loss = pit path time − lap time from entry to exit. Measured loss = drive loss + C, where C
// (stop, box in and out, cold tyres on the out-lap) is one number for all tracks, fitted at 80 km/h (Sporting Regulations B1.6.3a).
// A track whose residual is closer to the 60 km/h drive loss is reported as "60 km/h?" for the Race Director's notes to confirm.
import {writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../worker/lapsim/kernel.js';
import {lapsimAllTracks as T} from '../../worker/lapsim/tracks.js';
import {lapsimRace} from '../../worker/lapsim/race-data.js';
import {lapsimPitLanes} from '../../worker/lapsim/pit-lane-data.js';
import {carsFor} from '../../worker/lapsim/scenario.js';

const K = lapsimKernel(), BRAKE_MS2 = 20, ACCEL_MS2 = 9, rows = [];
const ENV = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
function driveLoss(v, ds, len, pit, lim) {
  const n = v.length, at = s => v[Math.min(n - 1, Math.round(((s % len) + len) % len / ds))];
  let tTrack = 0; const span = ((pit.exitS - pit.entryS) % len + len) % len; for (let s = 0; s < span; s += ds) tTrack += ds / Math.max(at(pit.entryS + s), 1);
  const ve = Math.max(at(pit.entryS), lim), vx = Math.max(at(pit.exitS), lim), L = pit.lengthM;
  const dB = (ve * ve - lim * lim) / (2 * BRAKE_MS2), dA = (vx * vx - lim * lim) / (2 * ACCEL_MS2);
  const tB = (ve - lim) / BRAKE_MS2, tA = (vx - lim) / ACCEL_MS2, tPit = dB + dA <= L ? tB + tA + (L - dB - dA) / lim : tB + tA; // a very short lane: no constant part
  return tPit - tTrack;
}
for (const [id, r] of Object.entries(lapsimRace.tracks)) {
  const pit = lapsimPitLanes.tracks[id]; if (!pit || !(r.pitLoss > 0) || !T[id]) continue;
  const car = carsFor(id)['2025']?.car; if (!car) continue;
  const t = K.trackFromData(T[id]), res = K.simulateLap(t, car, ENV);
  rows.push({id, measured: r.pitLoss, d80: driveLoss(res.v, t.ds, T[id].length, pit, 80 / 3.6), d60: driveLoss(res.v, t.ds, T[id].length, pit, 60 / 3.6), pitM: pit.lengthM});
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
if (!rows.length) { console.log('no F1 track with both a pit lane and a measured pit loss'); process.exit(0); }
const C = median(rows.map(r => r.measured - r.d80));
for (const r of rows) { r.res80 = r.measured - C - r.d80; r.res60 = r.measured - C - r.d60; r.kph = Math.abs(r.res60) < Math.abs(r.res80) ? 60 : 80; }
const rms = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
console.log(`C (stop, box, out-lap tyres) = ${C.toFixed(2)} s; residual rms at 80 km/h ${rms(rows.map(r => r.res80)).toFixed(2)} s, best of 60/80 ${rms(rows.map(r => r.kph === 60 ? r.res60 : r.res80)).toFixed(2)} s`);
for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) console.log(r.id.padEnd(20), String(r.pitM).padStart(5), 'm  measured', r.measured.toFixed(1), ' drive@80', r.d80.toFixed(1), ' @60', r.d60.toFixed(1), ' residual@80', r.res80.toFixed(1), r.kph === 60 ? '  -> 60 km/h?' : '');
writeFileSync('scripts/sim/data/learn/pit-loss-fit.json', JSON.stringify({C, brakeMs2: BRAKE_MS2, accelMs2: ACCEL_MS2, rows}, null, 1) + '\n');
