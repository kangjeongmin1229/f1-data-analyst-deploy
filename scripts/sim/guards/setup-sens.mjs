// SetupSim sensitivity sanity check (ship guard, central 2026-11-26 14:28). Fixed set, frozen here before any number was read:
// 3 tracks per series × 4 setup changes, each a lap Δ against the same car at the mid setup (s = 0.5) and standard conditions.
//   changes: aero wing s = 0.2 and s = 0.8 (the page's own setup windows: setup-plan aeroWindow for F1, hypercar-setup WINDOW for WEC),
//            mass +10 kg, ICE power +10 kW.
//   F1 (2025 season car): monza, monte-carlo, silverstone.  WEC (LMH 2025, LMDh 2025, LMGT3 2025 class cars): le-mans, spa-francorchamps, sakhir.
// Run from a repo root: SETUP_CAL=<calibration-data.js> node <this> <out.json>
import {writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

const ROOT = process.cwd(), imp = p => import(pathToFileURL(resolve(ROOT, p)).href);
const {lapsimKernel} = await imp('worker/lapsim/kernel.js');
const {lapsimTracks, lapsimExtraTracks} = await imp('worker/lapsim/tracks-data.js');
const {aeroWindow, withSetup: f1Setup} = await imp('worker/lapsim/setup-plan.js');
const {WINDOW, withSetup: hySetup} = await imp('worker/lapsim/hypercar-setup.js');
const {lapsimCalibration: C} = await import(pathToFileURL(resolve(process.env.SETUP_CAL || 'worker/lapsim/calibration-data.js')).href);
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks}, env = K.conditionsFromWeather({});
const CARS = {
  'f1-2025': {car: C.seasons['2025'].car, tracks: ['monza', 'monte-carlo', 'silverstone'], aero: (c, s) => f1Setup(c, s, aeroWindow(c, 'f1'))},
  ...Object.fromEntries(['lmh', 'lmdh', 'lmgt3'].map(k => ['wec-' + k + '-2025', {car: C.series.wec[k]['2025'].car, tracks: ['le-mans', 'spa-francorchamps', 'sakhir'], aero: (c, s) => hySetup(c, s, WINDOW)}])),
};
const CHANGES = {'wing s 0.2': (c, a) => a(c, 0.2), 'wing s 0.8': (c, a) => a(c, 0.8), 'mass +10 kg': (c, a) => ({...a(c, 0.5), mass: c.mass + 10}), 'power +10 kW': (c, a) => ({...a(c, 0.5), pIce: c.pIce + 10e3})};
const out = [];
for (const [id, {car, tracks, aero}] of Object.entries(CARS)) for (const t of tracks) {
  const tr = K.trackFromData(ALL[t]), base = K.simulateLap(tr, aero(car, 0.5), env).lapTime;
  for (const [ch, f] of Object.entries(CHANGES)) out.push({car: id, track: t, change: ch, dLapS: +(K.simulateLap(tr, f(car, aero), env).lapTime - base).toFixed(4)});
}
writeFileSync(process.argv[2] || 'setup-sens.json', JSON.stringify(out, null, 1));
console.log(out.length, 'cases');
