// Report only. Reads the isolated experiment; never installs a candidate model.
import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {compare, heldOut} from './exp-compare.mjs';
import {physicalDiagnostics, comparePhysical, boundHits} from './exp-physics.mjs';
const dir = resolve(process.argv[2] || '.cache/wec-sector-run');
const variants = ['baseline', 'b2', 'b1', 'b4', 'baseline140'];
const cal = {}, physics = {};
for (const name of variants) {
  cal[name] = (await import(pathToFileURL(join(dir, `${name}.js`)).href)).lapsimCalibration;
  physics[name] = physicalDiagnostics(cal[name], JSON.parse(readFileSync(join(dir, `validate-${name}.json`), 'utf8')));
}
const rows = [];
for (const name of variants) {
  assert.deepEqual(cal[name].seasons, cal.baseline.seasons, `${name}: F1 seasons changed`);
  assert.deepEqual(cal[name].projections, cal.baseline.projections, `${name}: F1 projections changed`);
  const held = heldOut(cal[name]);
  for (const [cls, years] of Object.entries(cal[name].series.wec)) for (const [year, season] of Object.entries(years)) {
    const group = `wec-${cls}/${year}`, errors = Object.entries(held).filter(([k]) => k.startsWith(group + '|')).map(([, v]) => v);
    rows.push({variant: name, group, rmsPct: Math.sqrt(errors.reduce((a, x) => a + x * x, 0) / errors.length),
      savedRmsPct: season.holdout.rmsPct, n: errors.length, fittedLaps: season.laps,
      muY: season.car.muY, ClA: season.car.clA, CdA: season.car.cdA, score: season.score,
      bounds: boundHits(group, season.car).hits, pooled: season.pooled, bop: season.bop, gripSource: season.gripSource});
  }
}
const comparisons = Object.fromEntries(variants.slice(1).map(name => [name, {
  heldOut: compare(cal.baseline, cal[name]), physical: comparePhysical(physics.baseline, physics[name])}]));
const primary = comparisons.b2.heldOut;
const primaryRows = rows.filter(r => r.variant === 'b2');
const changes = primaryRows.map(r => {
  const a = rows.find(x => x.variant === 'baseline' && x.group === r.group);
  const choices = x => ({pooled: x.pooled?.used ?? null, bop: x.bop?.used ?? null, gripSource: x.gripSource.used});
  return {group: r.group, deltaRmsPP: r.rmsPct - a.rmsPct, baseline: choices(a), b2: choices(r),
    choiceFlipped: JSON.stringify(choices(a)) !== JSON.stringify(choices(r)),
    downforceMovedOffBound: a.bounds.some(b => b.parameter === 'clA') && !r.bounds.some(b => b.parameter === 'clA')};
});
const diagnostic = rows.filter(r => r.variant === 'baseline140').map(r => {
  const a = rows.find(x => x.variant === 'baseline' && x.group === r.group);
  return {group: r.group, deltaRmsPP: r.rmsPct - a.rmsPct, deltaMuY: r.muY - a.muY, deltaClA: r.ClA - a.ClA, deltaCdA: r.CdA - a.CdA,
    baselineScore: a.score, doubledScore: r.score, scoreChangePct: (r.score / a.score - 1) * 100,
    choices: {baseline: {pooled: a.pooled?.used ?? null, bop: a.bop?.used ?? null, gripSource: a.gripSource.used},
      diagnostic: {pooled: r.pooled?.used ?? null, bop: r.bop?.used ?? null, gripSource: r.gripSource.used}}};
});
const gateAccepted = primary.wec.reason.startsWith('accepted:');
const noClassSeasonWorse = changes.every(x => x.deltaRmsPP <= 0);
const physicalPass = Object.entries(comparisons.b2.physical).filter(([g]) => g.startsWith('wec-'));
const result = {baselineCheck: JSON.parse(readFileSync(join(dir, 'baseline-check.json'), 'utf8')),
  eligibility: JSON.parse(readFileSync(join(dir, 'eligibility.json'), 'utf8')).coverage,
  primaryWeight: 2, sensitivityOnly: [1, 4], f1Unchanged: true,
  caution: 'With n=5 or 6, a gain below about 0.1 pp is not established even if the gate accepts; a geometry change moved LMDh 2025 by 0.37 pp.',
  pass: {gateAccepted, noClassSeasonWorse, f1Unchanged: true, declaredLapPass: gateAccepted && noClassSeasonWorse},
  rows, changes, diagnostic, comparisons, physics, physicalComparisons: physicalPass};
writeFileSync(join(dir, 'results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({pass: result.pass, pooled: Object.fromEntries(Object.entries(comparisons).map(([k, v]) => [k, v.heldOut.wec])), changes, diagnostic}, null, 2));
