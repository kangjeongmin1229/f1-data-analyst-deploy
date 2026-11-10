// Restore only the GitHub-pinned inputs needed by run-wec-consistent.mjs.
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve, join} from 'node:path';
import assert from 'node:assert/strict';
import {sha256} from './wec-eligibility.mjs';
const archive = resolve(process.argv[2] || 'lapsim-inputs.tgz');
const saved = 'scripts/sim/results/wec-consistent-2026-11-10';
const manifest = JSON.parse(await readFile(join(saved, 'manifest.json'), 'utf8'));
const timing = JSON.parse(await readFile('scripts/sim/wec-timing-experiment.json', 'utf8'));
const checks = {};
async function check(name, path, expected) {
  const bytes = await readFile(path), actual = sha256(bytes);
  assert.equal(actual, expected, `STOP: input hash mismatch: ${name}`);
  checks[name] = {sha256: actual, matched: true};
  return bytes;
}
await check('archive', archive, timing.inputSha256);
const stage = '.cache/wec-consistent-inputs';
await mkdir(stage); // Never overwrite a prior preparation.
execFileSync('tar', ['-xzf', archive, '-C', stage]);
await check('archiveGeometry', join(stage, 'worker/lapsim/tracks-data.js'), '4fc1b3ecb014434b70d54be520803da3af7bf9ff19b63508c9518f29dd3b67f1');
await check('archiveTraces', join(stage, '.cache/lapsim/traces.json'), manifest.inputs.archiveTraces);
const raw = await check('rawWec', join(stage, '.cache/lapsim/wec.json'), 'aa40cae3646ea33a3d1692c0f523196a4716bd707b84b38476bcf96da9d54626');
for (const [name, path] of Object.entries({geometry: 'worker/lapsim/tracks-data.js', seed: 'worker/lapsim/calibration-data.js',
  oldB: 'worker/lapsim/transfer-grip-data.js', timing71: 'scripts/sim/data/t71-wec-extra.json'})) await check(name, path, manifest.inputs[name]);
const hashes = JSON.parse(await readFile(join(saved, 'sha256.json'), 'utf8'));
await check('distanceOverride', join(saved, 'interlagos-distance-override.json'), hashes['interlagos-distance-override.json']);
await check('projectionAudit', join(saved, 'projection-audit.json'), hashes['projection-audit.json']);
const tolerance = 'scripts/sim/results/wec-tolerance-2026-11-10';
const toleranceHashes = JSON.parse(await readFile(join(tolerance, 'sha256.json'), 'utf8'));
await check('acceptedToleranceResult', join(tolerance, 'results.json'), toleranceHashes.files['results.json']);
// Preserve the exact historical preprocessing bytes as well as the shared fit/audit scope.
const rows = JSON.parse(raw), wet = JSON.parse(await readFile('scripts/sim/data/wet-sessions.json', 'utf8')).wec;
for (const row of rows) if (wet[row.year + ' ' + row.track] && row.weather) row.weather.rain = true;
const excluded = JSON.stringify(rows);
assert.equal(sha256(excluded), manifest.inputs.wec, 'STOP: excluded WEC hash mismatch');
checks.excludedWec = {sha256: sha256(excluded), matched: true};
const old = '.cache/wec-sector-run/baseline';
for (const dir of [join(old, '.cache/lapsim'), join(old, 'worker/lapsim'), '.cache/wec-experiment', '.cache/wec-tolerance'])
  await mkdir(dir, {recursive: true});
await writeFile(join(old, '.cache/lapsim/wec.json'), excluded);
await copyFile(join(stage, '.cache/lapsim/traces.json'), join(old, '.cache/lapsim/traces.json'));
await copyFile('worker/lapsim/transfer-grip-data.js', join(old, 'worker/lapsim/transfer-grip-data.js'));
await copyFile('worker/lapsim/calibration-data.js', '.cache/wec-experiment/production.js');
await copyFile(join(tolerance, 'results.json'), '.cache/wec-tolerance/results.json');
await copyFile('scripts/sim/results/wec-sectors-2026-11-10/offline-test-guard.mjs', '.cache/no-external-network.mjs');
await writeFile(join(stage, 'verified-inputs.json'), JSON.stringify(checks, null, 2) + '\n');
console.log(JSON.stringify(checks, null, 2));
