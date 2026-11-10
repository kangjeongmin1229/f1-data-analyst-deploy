// Read-only replay. No fitting and no production output writes.
// node scripts/sim/replay-interlagos.mjs <archive-tracks.js> <cal-B.js> <output.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {lapsimCalibration as production} from '../../worker/lapsim/calibration-data.js';
import {lapsimTracks as repository} from '../../worker/lapsim/tracks-data.js';
import {lapsimTransferGrip} from '../../worker/lapsim/transfer-grip-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {rechargeLimitMJ} from '../../worker/lapsim/energy-limits.js';
import {withGrip} from './calibrate-lib.mjs';
import {lapMult} from './joint-bcd.mjs';
import {sha256} from './wec-eligibility.mjs';
const [archiveFile, bFile, output] = process.argv.slice(2);
if (!output) throw new Error('Provide archive geometry, B calibration and report paths');
const load = async p => import(pathToFileURL(resolve(p)).href);
const archive = (await load(archiveFile)).lapsimTracks, B = (await load(bFile)).lapsimCalibration;
const traces = JSON.parse(readFileSync('.cache/lapsim/traces.json', 'utf8'));
const geometries = {repository: trackFromData(repository.interlagos), archive: trackFromData(archive.interlagos)};
const tau = (date, year) => Math.max(0, Math.min(1.1, (Date.parse(date) - Date.UTC(year, 2, 1)) / (Date.UTC(year, 11, 15) - Date.UTC(year, 2, 1))));
const replay = (car, grip, weather, real, mult = 1) => Object.fromEntries(Object.entries(geometries).map(([k, tr]) => {
  const raw = simulateLap(withGrip(tr, grip), car, conditionsFromWeather(weather)).lapTime;
  const sim = raw * mult; return [k, {rawSec: raw, simSec: sim, errorSec: sim - real, errorPct: (sim / real - 1) * 100}];
}));
const rows = [];
for (const [year, season] of Object.entries(production.seasons)) {
  const obs = traces.find(t => String(t.year) === year && t.track === 'interlagos' && t.position === 1);
  if (!obs) continue;
  const r = season.tracks.interlagos, shared = r || production.seasons[2025].tracks.interlagos;
  const car = {...season.car, cdA: season.car.cdA * (shared.drag || 1), cdALow: season.car.cdALow * (shared.drag || 1)};
  const mj = Number(year) >= 2026 ? rechargeLimitMJ('interlagos', +year) : null;
  const weather = mj ? {...obs.weather, rechargeMJ: mj} : obs.weather;
  const multiplier = lapMult({group: year, team: obs.team, tau: tau(obs.date, +year)}, {[year]: season.adj});
  rows.push({group: `f1/${year}`, realSec: obs.lap_seconds, rain: obs.weather.rain, fitted: !!r,
    note: r ? 'Saved car, grip, drag and rounded team/development adjustment' : 'Wet observation, excluded from fit; dry-model replay with shared 2025 factors is not a validation metric',
    grip: shared.grip, drag: shared.drag, multiplier, savedSimSec: r?.simLap,
    ...replay(car, shared.grip, weather, obs.lap_seconds, multiplier)});
}
for (const [cls, years] of Object.entries(production.series.wec)) for (const [year, season] of Object.entries(years)) {
  const r = season.tracks.interlagos;
  rows.push({group: `wec-${cls}/${year}`, realSec: r.realLap, rain: r.weather?.rain || false, fitted: true,
    grip: r.grip, savedSimSec: r.simLap, ...replay(season.car, r.grip, r.weather || {}, r.realLap)});
}
const bGrip = {};
for (const year of Object.keys(B.seasons).sort()) for (const [id, t] of Object.entries(B.seasons[year].tracks)) bGrip[id] = +t.grip.toFixed(4);
const report = {inputs: {archiveGeometry: sha256(readFileSync(archiveFile)), repositoryGeometry: sha256(readFileSync('worker/lapsim/tracks-data.js')),
  B: sha256(readFileSync(bFile)), production: sha256(readFileSync('worker/lapsim/calibration-data.js'))},
  sources: Object.fromEntries(Object.entries({repository: repository.interlagos, archive: archive.interlagos}).map(([key, tr]) => [key, {year: tr.year, sessionKey: tr.sessionKey, lengthM: tr.ds * tr.kappa.length, sources: tr.sources}])),
  transferEqualsB: JSON.stringify(Object.entries(bGrip).sort()) === JSON.stringify(Object.entries(lapsimTransferGrip.grip).sort()),
  BInterlagos: bGrip.interlagos, rows};
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
