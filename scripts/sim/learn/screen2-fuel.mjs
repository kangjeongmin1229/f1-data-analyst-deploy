// Screen2 quali fuel (report-only, central 11:15): lap-time sensitivity of the H0-F1 car to ±5 kg of qualifying fuel, no refit.
// Each season car and track row as the calibration's own track rows (grip, measured CdA/power mods). Model label: "model".
//   node scripts/sim/learn/screen2-fuel.mjs [calibration-data.js]   (default: worker/lapsim/calibration-data.js)
import {simulateLap} from '../../../worker/lapsim/engine.js';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../../worker/lapsim/tracks.js';
const cal = process.argv[2], {lapsimCalibration: C} = await import(cal ? new URL(cal, `file://${process.cwd()}/`).href : '../../../worker/lapsim/calibration-data.js');
const mod = (t, c) => t?.cdMult == null ? c : {...c, cdA: c.cdA * t.cdMult, cdALow: (c.cdALow ?? c.cdA) * t.cdMult, pIce: c.pIce * t.pIceMult, ...(t.iceDensityOff ? {iceDensityOff: true} : {})};
for (const y of ['2023', '2024', '2025', '2026']) { const S = C.seasons[y]; if (!S?.car) continue; const rows = [];
  for (const [id, t] of Object.entries(S.tracks || {})) { if (!lapsimTracks[id]) continue;
    const tr = trackFromData(lapsimTracks[id], {aero: 'fia'}), g = {...tr, mu: Float64Array.from(tr.mu ?? tr.kappa.map(() => 1), m => m * (t.grip ?? 1))};
    const c = mod(t, S.car), lap = dm => simulateLap(g, {...c, mass: c.mass + dm}, {}).lapTime, t0 = lap(0);
    rows.push({id, t0, dPlus: lap(5) - t0, dMinus: lap(-5) - t0}); }
  const mean = k => rows.reduce((a, r) => a + r[k], 0) / rows.length, pct = rows.reduce((a, r) => a + r.dPlus / r.t0, 0) / rows.length * 100;
  console.log(y, 'mass', S.car.mass, 'tracks', rows.length, '+5 kg', mean('dPlus').toFixed(3), 's', '−5 kg', mean('dMinus').toFixed(3), 's', '(+5 kg', pct.toFixed(3), '%; per 10 kg', (pct * 2).toFixed(3), '%)',
    'range +5', Math.min(...rows.map(r => r.dPlus)).toFixed(3), '…', Math.max(...rows.map(r => r.dPlus)).toFixed(3)); }
