// Step 32 "F1 measured line" draft: MDE of the judged corner row on the base (36's candidate calibration = measured car, geometry line).
// Row: RMS of (model − measured) corner minimum speed over every 2023–25 corner with measured v_min in [120, 240) km/h (step 32 score(),
// ±40 m), held-out car as N4 (fit car × median drag/grip of the other tracks). SE: track bootstrap 2000, seed 7. Report-only.
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as S from '../learn/step32-loto.mjs';
const [calF, out] = process.argv.slice(2), cal = (await import(pathToFileURL(calF).href)).lapsimCalibration;
const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const heldCar = (id, y) => { const s = cal.seasons[String(y)], o = Object.entries(s.tracks).filter(([t]) => t !== id), dr = med(o.map(([, t]) => t.drag ?? 1));
  return {car: {...s.car, cdA: s.car.cdA * dr, cdALow: (s.car.cdALow ?? s.car.cdA) * dr}, grip: med(o.map(([, t]) => t.grip))}; };
const C = [];
for (const e of S.EV) { if (e.year > 2025) continue; const h = heldCar(e.track, e.year);
  const r = S.K.simulateLap(S.trackFor(e.track, e.zones, h.grip, false), h.car, S.envOf(e.track));
  for (const c of S.score(e, {v: Array.from(r.v, x => x * 3.6), lap: r.lapTime}).corners) if (Number.isFinite(c.apex) && c.meas >= 120 && c.meas < 240) C.push({track: e.track, year: e.year, meas: c.meas, err: c.apex}); }
const tracks = [...new Set(C.map(c => c.track))].sort(), by = Object.fromEntries(tracks.map(t => [t, C.filter(c => c.track === t).map(c => c.err)]));
const stat = ts => { const x = ts.flatMap(t => by[t]); return Math.sqrt(x.reduce((p, q) => p + q * q, 0) / x.length); };
let s = 7; const u = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const B = []; for (let i = 0; i < 2000; i++) B.push(stat(tracks.map(() => tracks[Math.floor(u() * tracks.length)])));
const m = B.reduce((p, q) => p + q, 0) / B.length, se = Math.sqrt(B.reduce((p, q) => p + (q - m) ** 2, 0) / (B.length - 1)), base = stat(tracks);
const res = {calibration: calF, nCorners: C.length, nTracks: tracks.length, base, se, mde_m2: 2.8 * se, mde_m2_share: 2.8 * se / base, z: '(z_{1-0.05/2}=1.96)+(z_{0.8}=0.84)=2.80',
  perTrack: tracks.map(t => ({track: t, n: by[t].length, rms: Math.sqrt(by[t].reduce((p, q) => p + q * q, 0) / by[t].length), mean: by[t].reduce((p, q) => p + q, 0) / by[t].length}))};
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify({...res, perTrack: undefined}));
