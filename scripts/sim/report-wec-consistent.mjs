// Read-only paired report. Uses full-precision logged predictions; never adopts a fit.
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {compare, heldOut} from './exp-compare.mjs';
import {gate} from './gate.mjs';
import {boundHits, physicalDiagnostics, comparePhysical} from './exp-physics.mjs';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {withGrip} from './calibrate-lib.mjs';
import {lapMult} from './joint-bcd.mjs';
import {rechargeLimitMJ} from '../../worker/lapsim/energy-limits.js';
import {sha256} from './wec-eligibility.mjs';

const dir = resolve(process.argv[2] || '.cache/wec-consistent-rounds');
const json = p => JSON.parse(readFileSync(p, 'utf8'));
assert.equal(json(join(dir, 'complete.json')).complete, true, 'Incomplete experiment');
const load = async p => (await import(pathToFileURL(resolve(p)).href)).lapsimCalibration;
const frozen = await load('worker/lapsim/calibration-data.js');
const cal = {control: await load(join(dir, 'control.js')), candidate: await load(join(dir, 'candidate.js'))};
if (existsSync(join(dir, 'secondary.js'))) cal.secondary = await load(join(dir, 'secondary.js'));
const bRounds = json(join(dir, 'B-rounds.json'));
const round5Converged = bRounds.phases.every(p => { const r = p.find(r => r.round === 5); return r && r.decreasePct >= 0 && r.decreasePct < 1; });
const rows = [], physics = {}, audits = {}, events = {};
const choices = s => ({pooled: s.pooled?.used ?? null, bop: s.bop?.used ?? null, gripSource: s.gripSource?.used ?? null});
const rms = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length);
const tr = trackFromData(lapsimTracks.interlagos);
function replay(season) {
  const t = season.tracks.interlagos;
  const simSec = simulateLap(withGrip(tr, t.grip), season.car, conditionsFromWeather(t.weather || {})).lapTime;
  return {realSec: t.realLap, simSec, errorSec: simSec - t.realLap, errorPct: (simSec / t.realLap - 1) * 100, savedFitErrorSec: t.errorSec,
    definition: 'Season car with saved track grip and weather; no raced-session correction or per-event BoP patch'};
}
for (const [name, c] of Object.entries(cal)) {
  assert.deepEqual(c.seasons, frozen.seasons, 'STOP 5.3: F1 seasons changed');
  assert.deepEqual(c.projections, frozen.projections, 'STOP 5.3: F1 projections changed');
  audits[name] = json(join(dir, `${name}-historical-reproduction.json`));
  assert.equal(audits[name].pass, true, 'STOP 5.3: dry historical reproduction failed');
  physics[name] = physicalDiagnostics(c, json(join(dir, `validate-${name}.json`)));
  events[name] = readFileSync(join(dir, `${name}-objective.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  const groupEvents = events[name].filter(e => e.event === 'group');
  assert.equal(groupEvents.length, 6);
  for (const event of groupEvents) {
    const [kind, year] = event.group.split('/'), s = c.series.wec[kind.slice(4)][year];
    assert.deepEqual(event.car, s.car);
    const ends = events[name].filter(e => e.group === event.group && e.event === 'end');
    const main = ends.find(e => e.candidate === 'main'), folds = ends.filter(e => e.fold != null);
    rows.push({variant: name, group: event.group, rmsPct: event.heldout.rmsPct, n: event.heldout.n,
      fittedLaps: event.fittedLaps, car: s.car, bounds: boundHits(event.group, s.car).hits,
      choices: choices(s), selection: {pooled: s.pooled, bop: s.bop, gripSource: s.gripSource},
      mainIterations: main.iteration, mainCapHit: main.capHit,
      foldIterations: {min: Math.min(...folds.map(e => e.iteration)), max: Math.max(...folds.map(e => e.iteration)),
        total: folds.reduce((n, e) => n + e.iteration, 0), capHits: folds.filter(e => e.capHit).length, attempts: folds.length},
      groupSeconds: event.seconds, heldout: event.heldout.errors,
      reproduction: audits[name].rows.find(r => r.group === event.group), interlagos: replay(s),
      frozenProduction: {car: frozen.series.wec[kind.slice(4)][year].car,
        choices: choices(frozen.series.wec[kind.slice(4)][year]), interlagos: replay(frozen.series.wec[kind.slice(4)][year])}});
  }
}
const groups = rows.filter(r => r.variant === 'candidate').map(b => {
  const a = rows.find(r => r.variant === 'control' && r.group === b.group);
  const prior = new Map(a.heldout.map(e => [e.name, e.pct]));
  assert.deepEqual([...prior.keys()].sort(), b.heldout.map(e => e.name).sort());
  return {group: b.group, deltaRmsPP: b.rmsPct - a.rmsPct,
    gate: gate(b.heldout.map(e => prior.get(e.name)), b.heldout.map(e => e.pct)),
    choiceFlip: JSON.stringify(a.choices) !== JSON.stringify(b.choices), from: a.choices, to: b.choices};
});
const errors = name => rows.filter(r => r.variant === name).flatMap(r => r.heldout.map(e => ({key: `${r.group}/${e.name}`, pct: e.pct}))).sort((a,b) => a.key.localeCompare(b.key));
const a = errors('control'), b = errors('candidate');
assert.deepEqual(a.map(e => e.key), b.map(e => e.key));
const pooled = {n: a.length, controlRmsPct: rms(a.map(e => e.pct)), candidateRmsPct: rms(b.map(e => e.pct)),
  gate: gate(a.map(e => e.pct), b.map(e => e.pct))};
let secondary = null;
if (cal.secondary) {
  const c = errors('secondary');
  assert.deepEqual(a.map(e => e.key), c.map(e => e.key));
  secondary = {n: c.length, rmsPct: rms(c.map(e => e.pct)),
    pass: {dryReproduction: audits.secondary.pass && audits.secondary.maxAbsErrorSec === 0, f1Unchanged: true, pooledWecNotWorse: rms(c.map(e => e.pct)) <= pooled.controlRmsPct, noCapHits: rows.filter(r => r.variant === 'secondary').every(r => !r.mainCapHit && r.foldIterations.capHits === 0), bMainConverged: round5Converged},
    status: round5Converged ? 'Diagnostic round-five arm' : 'Diagnostic arm only: the round-five B fit fails the agreed convergence rule',
    deltaVsControlPP: rms(c.map(e => e.pct)) - pooled.controlRmsPct,
    deltaFinalVsRound5PP: pooled.candidateRmsPct - rms(c.map(e => e.pct)),
    gate: gate(a.map(e => e.pct), c.map(e => e.pct)),
    groups: rows.filter(r => r.variant === 'secondary').map(r => ({group:r.group,
      gate: (() => { const base = rows.find(a => a.variant === 'control' && a.group === r.group); const prior = new Map(base.heldout.map(e => [e.name,e.pct])); return gate(r.heldout.map(e => prior.get(e.name)),r.heldout.map(e => e.pct)); })(),
      deltaVsControlPP: r.rmsPct - rows.find(a => a.variant === 'control' && a.group === r.group).rmsPct,
      deltaFinalVsRound5PP: rows.find(a => a.variant === 'candidate' && a.group === r.group).rmsPct - r.rmsPct}))};
}
const f1Held = heldOut(frozen), traces = json(join(dir, 'control/.cache/lapsim/traces.json'));
const f1 = Object.entries(frozen.seasons).map(([year, s]) => {
  const h = Object.entries(f1Held).filter(([k]) => k.startsWith(`f1/${year}|`)).map(([,v]) => v);
  const obs = traces.find(t => String(t.year) === year && t.track === 'interlagos' && t.position === 1);
  let interlagos = null;
  if (obs && !obs.weather.rain && s.tracks.interlagos) {
    const t = s.tracks.interlagos, car = {...s.car, cdA: s.car.cdA * (t.drag || 1), cdALow: s.car.cdALow * (t.drag || 1)};
    const mj = Number(year) >= 2026 ? rechargeLimitMJ('interlagos', +year) : null;
    const weather = mj ? {...obs.weather, rechargeMJ: mj} : obs.weather;
    const tau = Math.max(0, Math.min(1.1, (Date.parse(obs.date) - Date.UTC(+year, 2, 1)) / (Date.UTC(+year, 11, 15) - Date.UTC(+year, 2, 1))));
    const simSec = simulateLap(withGrip(tr, t.grip), car, conditionsFromWeather(weather)).lapTime * lapMult({group: year, team: obs.team, tau}, {[year]: s.adj});
    interlagos = {realSec: obs.lap_seconds, simSec, errorSec: simSec - obs.lap_seconds, identicalAcrossAllArms: true};
  }
  return {group: `f1/${year}`, n: h.length, rmsPct: h.length ? rms(h) : null, unchanged: true, car: s.car,
    bounds: boundHits(`f1/${year}`, s.car).hits, interlagos, wetInterlagosExcluded: obs?.weather.rain ?? null};
});
const pass = {dryReproduction: Object.values(audits).every(r => r.pass && r.maxAbsErrorSec === 0), f1Unchanged: true,
  pooledWecNotWorse: pooled.candidateRmsPct <= pooled.controlRmsPct,
  noCapHits: rows.every(r => !r.mainCapHit && r.foldIterations.capHits === 0)};
const result = {setting: {tolerance: 1e-4, cap: 2000}, manifest: json(join(dir, 'manifest.json')),
  pass: {...pass, declaredCandidatePass: pass.dryReproduction && pass.f1Unchanged && pass.pooledWecNotWorse && pass.noCapHits},
  pooled, secondary, bRounds, groups, rows, f1, audits, physics, physicalComparison: comparePhysical(physics.control, physics.candidate),
  secondaryPhysicalComparison: cal.secondary ? comparePhysical(physics.control, physics.secondary) : null,
  savedRoundedComparison: compare(cal.control, cal.candidate),
  runtimes: json(join(dir, 'runtime.json')), adopted: false,
  hashes: Object.fromEntries(['control.js','candidate.js','B-repository-geometry.js','rebuilt-B.js',...(cal.secondary?['secondary.js','round-5-B.js']:[])].map(p => [p,sha256(readFileSync(join(dir,p)))])),
  notes: ['Full-precision objective logs supply held-out errors; exp-compare also reports the saved rounded rows.',
    'Control is current production inputs refitted at R on repository geometry; frozen production replay is separate.',
    'With n=5/6, a gain below about 0.1 pp is unestablished even if the gate accepts. No model adoption.',
    'WEC corners are unavailable. Simulated lap maximum versus measured trap is not a positioned-trap test.']};
writeFileSync(join(dir, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({pass: result.pass, pooled, groups}, null, 2));
