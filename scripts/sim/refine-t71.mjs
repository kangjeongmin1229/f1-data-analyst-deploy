// Offline, exploratory refinement around the CURRENT calibrated car. No writes
// to production parameters and no sector residual correction. Inputs stay local.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {carsFor} from '../../worker/lapsim/scenario.js';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';

const [inputFile, outputDir] = process.argv.slice(2);
if (!inputFile || !outputDir) throw Error('Usage: node scripts/sim/refine-t71.mjs INPUT.json OUTPUT_DIRECTORY');
const bytes = fs.readFileSync(inputFile), rows = JSON.parse(bytes);
if (!Array.isArray(rows) || rows.length < 2 || !rows.some(r => r.split === 'train') || !rows.some(r => r.split === 'holdout')) throw Error('Need separate training and holdout observations');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const modelFiles = ['kernel', 'engine', 'tracks', 'tracks-data', 'atmosphere', 'scenario', 'calibration-data', 'cars', 'rules-data', 'series', 'track-changes-data', 'change-effects-data'];
const provenance = {node: process.version, inputSha256: sha(bytes), runnerSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))), modelSha256: Object.fromEntries(modelFiles.map(n => [n, sha(fs.readFileSync(path.join(root, 'worker/lapsim', n + '.js')))]))};
const signature = sha(JSON.stringify(provenance));
const cases = rows.map(r => {
  if (!lapsimTracks[r.track] || !Number.isFinite(r.target) || r.target <= 0 || !['train', 'holdout'].includes(r.split)) throw Error('Invalid track, target or split');
  const year = r.year ?? 2025, preset = carsFor(r.track)[year];
  if (!preset || preset.kind !== 'calibrated') throw Error('A calibrated base car is required');
  const track = trackFromData(lapsimTracks[r.track]);
  track.mu.fill(preset.grip);
  return {row: r, year, track, preset, env: conditionsFromWeather(r.weather)};
});
if (new Set(cases.map(c => c.year)).size !== 1) throw Error('Do not mix vehicle generations in a shared fit');
const trainTracks = new Set(rows.filter(r => r.split === 'train').map(r => r.track));
if (rows.some(r => r.split === 'holdout' && trainTracks.has(r.track))) throw Error('Holdout tracks must be separate');
fs.mkdirSync(outputDir, {recursive: true});
const lock = path.join(outputDir, 'refine.lock');
// Persistent lock: after an interrupted process, verify it is gone before
// removing the stale lock. Never steal a lock based only on elapsed time.
const fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, String(process.pid));
const checkpoint = path.join(outputDir, 'checkpoint.json');
const atomic = (name, data) => { const p = path.join(outputDir, name); fs.writeFileSync(p + '.tmp', JSON.stringify(data, null, 2) + '\n'); fs.renameSync(p + '.tmp', p); };
try {
  const state = fs.existsSync(checkpoint) ? JSON.parse(fs.readFileSync(checkpoint)) : {signature, provenance, evaluations: {}};
  if (state.signature !== signature) throw Error('Checkpoint does not match inputs, model or runtime; use a new output directory');
  let computed = 0;
  // Narrow shared lateral-grip adjustment: +/-2%, 0.1 percentage-point steps.
  for (let i = -20; i <= 20; i++) {
    const factor = 1 + i / 1000, key = factor.toFixed(3);
    if (state.evaluations[key]) continue;
    state.evaluations[key] = cases.map(({row, year, track, preset, env}) => {
      const car = {...structuredClone(preset.car), muY: preset.car.muY * factor};
      const sim = simulateLap(track, car, env);
      if (!Number.isFinite(sim.lapTime) || sim.lapTime <= 0) throw Error('Invalid simulation output');
      return {track: row.track, split: row.split, target: row.target, seconds: sim.lapTime, errorPct: 100 * (sim.lapTime / row.target - 1), year, geometryYear: lapsimTracks[row.track].year};
    });
    computed++; state.updatedAt = new Date().toISOString(); atomic('checkpoint.json', state);
  }
  const rmse = a => Math.sqrt(a.reduce((s, r) => s + r.errorPct ** 2, 0) / a.length);
  const candidates = Object.entries(state.evaluations).map(([factor, result]) => ({factor: Number(factor), trainRmsePct: rmse(result.filter(r => r.split === 'train')), rows: result}));
  const best = candidates.sort((a, b) => a.trainRmsePct - b.trainRmsePct || Math.abs(a.factor - 1) - Math.abs(b.factor - 1))[0];
  const report = {status: 'exploratory_not_admitted', provenance, computedGridPoints: computed, totalGridPoints: candidates.length, best, boundaryHit: best.factor === .98 || best.factor === 1.02, baseline: state.evaluations['1.000'], productionUpdated: false, limitations: ['Input lap identity and vehicle conditions remain unverified.', 'Existing track grip/drag are frozen; geometry and earlier calibration may already contain target information.', 'The holdout is excluded only from this parameter selection, not from all earlier model construction.', 'One shared muY factor only; all other physics parameters and equations unchanged.', 'No sector residual correction or observation deletion. No claim of 0.000% accuracy.']};
  atomic('result.json', report); console.log(JSON.stringify(report, null, 2));
} finally { fs.closeSync(fd); fs.unlinkSync(lock); }
