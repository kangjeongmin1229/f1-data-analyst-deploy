// Brake-limit A1 §4: simulate one refit's F1 cars (worker/lapsim/calibration-data.js of that run, copied into the step 32 checkout) on the
// step 32 top-10 sessions; the candidate car gets the leave-one-track-out measured cap. Runs from the step 32 checkout (s32/).
// usage: node scripts/sim/learn/brake-cap-test.mjs <base|cand> <brake-cap-measured.json> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import * as S from './step32-loto.mjs';
import {carsFor} from '../../../worker/lapsim/scenario.js';
import {lapsimCalibration as CAL} from '../../../worker/lapsim/calibration-data.js';
const [label, capPath, outPath] = process.argv.slice(2), CAP = JSON.parse(readFileSync(capPath, 'utf8'));
const laps = [], ses = {}, cars = {};
for (const y of ['2023', '2024', '2025', '2026']) { const c = CAL.seasons?.[y]?.car; if (c) cars[y] = {muY: c.muY, muX: c.muX, muXTrac: c.muXTrac, clA: c.clA, cdA: c.cdA, cdALow: c.cdALow, pIce: c.pIce, brakeEnv: c.brakeEnv ?? null, brakeDecelMax: c.brakeDecelMax ?? null}; }
if (label === 'cand' && !cars['2025']?.brakeEnv) throw new Error('candidate calibration has no brakeEnv: flag not applied');
if (label === 'base' && cars['2025']?.brakeEnv) throw new Error('baseline calibration has brakeEnv');
for (const e of [...S.EV, ...S.EV26]) {
  // carsFor() returns 2025 and 2026 only: for 2023–24 take the track's 2025 entry (powertrain, per-track drag factor) and that season's car
  const cf = carsFor(e.track), ent = cf?.[e.year] ?? cf?.[2025], sc = CAL.seasons?.[e.year]?.car; if (!ent?.car || !sc) continue;
  const dragK = ent.car.cdA / (CAL.seasons[ent.year ?? (e.year >= 2026 ? 2026 : 2025)]?.car?.cdA ?? ent.car.cdA);
  let car = cf?.[e.year] ? ent.car : {...ent.car, muY: sc.muY, muX: sc.muX, muXTrac: sc.muXTrac, clA: sc.clA, clALow: sc.clALow, pIce: sc.pIce, cdA: sc.cdA * dragK, cdALow: sc.cdALow * dragK,
    ...(sc.brakeEnv ? {brakeEnv: sc.brakeEnv, brakeDecelMax: sc.brakeDecelMax} : {})};
  if (label === 'cand') { const c = CAP.seasons[e.year]?.loto?.[e.track] ?? CAP.seasons[e.year]?.all; car = {...car, brakeEnv: [c[0], c[1]], brakeDecelMax: c[2]}; }
  const v = (ses[e.session] ??= Array.from(S.K.simulateLap(S.trackFor(e.track, e.zones, ent.grip ?? 1, false), car, S.envOf(e.track)).v, x => x * 3.6)), n = e.n;
  laps.push({track: e.track, year: e.year, ds: e.ds, meas: e.a, model: Array.from({length: n}, (_, k) => +v[((k - e.shift) % n + n) % n].toFixed(2))});
}
writeFileSync(outPath, JSON.stringify({label, cars, laps})); console.log(label, laps.length, JSON.stringify(cars));
