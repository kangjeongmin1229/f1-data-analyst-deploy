// Step 36 → data-limit oracle (report-only): F1 braking rows per track × speed bin, signed, on one calibration's car with no own-track
// factor (the step-36 harness rule: 2023–25 season car, grip and drag = median of the other tracks; measured per-track inputs if the
// track row carries them). Braking = step 32's envelope kind 'brk' (−a_x on braking samples, DRS state off), p95 per 20 km/h bin.
// err = (p95 model − p95 measured) / g, positive = model brakes harder. A track × bin row needs ≥ NMIN samples on both sides.
// Output CSV for scripts/sim/scoreboard/oracle.py generic: row,track,group,season,err (group = speed bin). Default: seasons 2023–25
// pooled (season 2023-2025); --per-season: one row per track × season × bin.
//   node scripts/sim/learn/step36-braking-rows.mjs <calibration-data.js> <out.csv> [--per-season]
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as S from './step32-loto.mjs';
import {processLap, simAtXs, envelope, USED} from './step32-forward.mjs';

const [calF, out] = process.argv.slice(2), cal = (await import(pathToFileURL(calF).href)).lapsimCalibration, G = 9.81, NMIN = 30;
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const measured = (t, c) => t?.cdMult == null ? c : {...c, cdA: c.cdA * t.cdMult, cdALow: c.cdALow * t.cdMult, pIce: c.pIce * t.pIceMult, ...(t.iceDensityOff ? {iceDensityOff: true} : {})};
const heldCar = (id, y) => { const s = cal.seasons[String(y)], o = Object.entries(s.tracks).filter(([t]) => t !== id), dr = med(o.map(([, t]) => t.drag ?? 1));
  return {car: measured(s.tracks[id], {...s.car, cdA: s.car.cdA * dr, cdALow: (s.car.cdALow ?? s.car.cdA) * dr}), grip: med(o.map(([, t]) => t.grip))}; };
const memo = new Map(), simOf = e => { const k = e.track + '|' + e.year; if (!memo.has(k)) { const h = heldCar(e.track, e.year);
  const r = S.K.simulateLap(S.trackFor(e.track, e.zones, h.grip, false), h.car, S.envOf(e.track)); memo.set(k, Array.from(r.v, x => x * 3.6)); } return memo.get(k); };
const PER = process.argv.includes('--per-season');
const laps = S.EV.filter(e => USED[S.keyOf(e)] != null && e.year <= 2025).map(e => ({track: e.track, season: PER ? String(e.year) : '2023-2025', meas: processLap(e, e.sp, USED[S.keyOf(e)]), model: processLap(e, simAtXs(e, simOf(e)))}));
const rows = ['row,track,group,season,err'];
for (const [t, y] of [...new Set(laps.map(l => l.track + '|' + l.season))].sort().map(k => k.split('|'))) {
  const L = laps.filter(l => l.track === t && l.season === y), M = envelope(L.map(l => ({track: t, samples: l.meas}))).brk, P = envelope(L.map(l => ({track: t, samples: l.model}))).brk;
  M.forEach((b, j) => { if (b.n >= NMIN && P[j].n >= NMIN && b.p95 != null && P[j].p95 != null) { const lo = S.BIN0 + j * S.BINW;
    rows.push(`${PER ? y + ' ' : ''}${t} ${lo}-${lo + S.BINW},${t},brk ${lo}-${lo + S.BINW},${y},${((P[j].p95 - b.p95) / G).toFixed(4)}`); } });
}
writeFileSync(out, rows.join('\n') + '\n'); console.log({laps: laps.length, rows: rows.length - 1});
