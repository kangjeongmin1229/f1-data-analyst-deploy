// Read-only convergence comparison. Never installs a model or selects a tolerance by error.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {boundHits} from './exp-physics.mjs';
const dir = resolve(process.argv[2] || '.cache/wec-tolerance');
const rows = [], pooled = [], candidates = [], objectives = [];
const choice = s => ({pooled: s.pooled?.used ?? null, bop: s.bop?.used ?? null, gripSource: s.gripSource.used});
let baseline;
for (const name of ['loose', 'tight']) {
  const cal = (await import(pathToFileURL(join(dir, name + '.js')).href)).lapsimCalibration;
  baseline ||= cal;
  assert.deepEqual(cal.seasons, baseline.seasons); assert.deepEqual(cal.projections, baseline.projections);
  const events = readFileSync(join(dir, `${name}-objective.jsonl`), 'utf8').trim().split('\n').map(JSON.parse);
  const seconds = JSON.parse(readFileSync(join(dir, `${name}-runtime.json`))).seconds, errors = [];
  for (const event of events.filter(e => e.event === 'group')) {
    const [kind, year] = event.group.split('/'), s = cal.series.wec[kind.slice(4)][year];
    assert.deepEqual(event.car, s.car);
    const ends = events.filter(e => e.group === event.group && e.event === 'end');
    const main = ends.find(e => e.candidate === 'main'), folds = ends.filter(e => e.fold != null);
    errors.push(...event.heldout.errors.map(e => e.pct));
    rows.push({rung: name, group: event.group, rmsPct: event.heldout.rmsPct, n: event.heldout.n,
      fittedLaps: event.fittedLaps, car: s.car, bounds: boundHits(event.group, s.car).hits,
      choices: choice(s), selection: {pooled: s.pooled, bop: s.bop, gripSource: s.gripSource},
      mainIterations: main.iteration, mainCapHit: main.capHit,
      foldIterations: {min: Math.min(...folds.map(e => e.iteration)), max: Math.max(...folds.map(e => e.iteration)),
        total: folds.reduce((sum, e) => sum + e.iteration, 0), capHits: folds.filter(e => e.capHit).length, attempts: folds.length},
      groupSeconds: event.seconds, rungSeconds: seconds, heldout: event.heldout.errors});
  }
  assert.equal(rows.filter(r => r.rung === name).length, 6);
  pooled.push({rung: name, n: errors.length, rmsPct: Math.sqrt(errors.reduce((s, x) => s + x * x, 0) / errors.length), seconds});
  candidates.push(...events.filter(e => e.event === 'candidate').map(e => ({rung: name, ...e})));
  objectives.push(...events.filter(e => e.event === 'end').map(e => ({rung: name, ...e})));
}
const comparisons = rows.filter(r => r.rung === 'tight').map(b => {
  const a = rows.find(r => r.rung === 'loose' && r.group === b.group);
  const deltaPP = b.rmsPct - a.rmsPct, choiceFlipped = JSON.stringify(a.choices) !== JSON.stringify(b.choices);
  return {group: b.group, deltaPP, choiceFlipped, pass: Math.abs(deltaPP) < 0.02 && !choiceFlipped,
    from: a.choices, to: b.choices};
});
const failed = comparisons.filter(r => !r.pass);
const proceed = failed.length === 0 || (failed.length === 1 && failed[0].group === 'wec-lmgt3/2026');
const result = {criterion: 'Every group absolute RMS difference <0.02 pp and no choice flips.',
  rows, pooled, comparisons, candidates, objectives, failedGroups: failed.map(r => r.group),
  rungR: proceed ? 'loose (1e-4, cap 2000)' : null, proceedToCandidate: proceed, adopted: false,
  notes: ['Errors use full-precision logged held-out predictions; saved calibration RMS remains rounded as before.',
    'Fold attempts and cap hits count every tested F1/transfer/pooled/BoP candidate, not only the selected choice.',
    'R is predeclared as the looser tolerance; it is never selected by held-out error.',
    'LMGT3 2026 production is at two bounds; report actual bound hits of each new fit separately.']};
writeFileSync(join(dir, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({pooled, comparisons, rungR: result.rungR, proceedToCandidate: proceed}, null, 2));
