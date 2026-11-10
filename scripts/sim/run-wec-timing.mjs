// Isolated, repeatable WEC screen. Does not write production geometry or calibration.
// prepare <PR149 reproduced snapshot> <original source snapshot>
// baseline | sectors | diagnostic
import {cp, mkdir, readFile, writeFile, copyFile} from 'node:fs/promises';
import {createWriteStream, readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {sha256, eligibilityInputs} from './wec-eligibility.mjs';
const root = process.cwd(), out = resolve('.cache/wec-sector-run');
const manifest = JSON.parse(await readFile('scripts/sim/wec-timing-experiment.json', 'utf8'));
const load = async f => (await import(pathToFileURL(f).href)).lapsimCalibration;
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('LAPSIM_')));
const names = ['baseline', 'control', 'b2', 'b1', 'b4', 'baseline140'];
async function run(name, script, args = [], extra = {}) {
  const dir = join(out, name), logName = script.split('/').at(-1).replace('.mjs', '');
  const log = createWriteStream(join(out, `${name}-${logName}.log`)), err = createWriteStream(join(out, `${name}-${logName}.stderr`));
  const started = Date.now();
  await new Promise((yes, no) => {
    const child = spawn(process.execPath, [script, ...args], {cwd: dir, windowsHide: true,
      env: {...cleanEnv, ...manifest.commonEnv, ...extra}, stdio: ['ignore', 'pipe', 'pipe']});
    child.stdout.pipe(log); child.stderr.pipe(err);
    child.on('error', no); child.on('close', code => code === 0 ? yes() : no(new Error(`${name}/${script} exited ${code}`)));
  });
  await Promise.all([new Promise(r => log.writableFinished ? r() : log.on('finish', r)), new Promise(r => err.writableFinished ? r() : err.on('finish', r))]);
  console.log(`${name} ${script}: ${((Date.now() - started) / 1000).toFixed(1)} s`);
}
async function fit(name) {
  const variant = manifest.variants.find(v => v.name === name);
  const env = {...(variant?.env || {LAPSIM_WEC_TRAP_POSITION: 'off', LAPSIM_WEC_SECTORS: 'off'}),
    ...(name === 'baseline140' ? manifest.diagnostic.env : {}), LAPSIM_WEC_ELIGIBILITY: join(out, 'eligibility.json')};
  await run(name, 'scripts/sim/calibrate.mjs', [], env);
  await copyFile(join(out, name, 'worker/lapsim/calibration-data.js'), join(out, `${name}.js`));
  await run(name, 'scripts/sim/validate.mjs', [name]);
  await copyFile(join(out, name, `probe-out/validate-${name}.json`), join(out, `validate-${name}.json`));
}
const command = process.argv[2];
if (command === 'prepare') {
  const historic = resolve(process.argv[3]), original = resolve(process.argv[4]);
  await mkdir(out, {recursive: true});
  // Refuse overwrites: a restart must not erase completed evidence.
  for (const name of names) {
    const dir = join(out, name); await mkdir(dir);
    await cp(join(name === 'control' ? original : root, 'scripts/sim'), join(dir, 'scripts/sim'), {recursive: true});
    await cp(join(root, 'worker/lapsim'), join(dir, 'worker/lapsim'), {recursive: true});
    await mkdir(join(dir, '.cache/lapsim'), {recursive: true});
    for (const file of ['wec.json', 'traces.json', 'races.json']) await copyFile(join(historic, '.cache/lapsim', file), join(dir, '.cache/lapsim', file));
    await copyFile(join(historic, 'worker/lapsim/tracks-data.js'), join(dir, 'worker/lapsim/tracks-data.js'));
    await copyFile(join(root, '.cache/wec-experiment/production.js'), join(dir, 'worker/lapsim/calibration-data.js'));
    if (name === 'control') await copyFile(join(root, 'scripts/sim/data/wec-timing-positions.json'), join(dir, 'scripts/sim/data/wec-timing-positions.json'));
    const hashes = eligibilityInputs(dir);
    for (const [key, expected] of Object.entries(manifest.inputHashes)) assert.equal(hashes[key], expected, `${name}: ${key}`);
  }
  await run('baseline', 'scripts/sim/prepare-wec-eligibility.mjs', [join(out, 'eligibility.json')]);
  const table = JSON.parse(await readFile(join(out, 'eligibility.json'), 'utf8'));
  await writeFile(join(out, 'predeclaration.json'), JSON.stringify({...manifest, eligibilitySha256: sha256(readFileSync(join(out, 'eligibility.json'))), coverage: table.coverage}, null, 2) + '\n');
  console.log(JSON.stringify({ratios: table.ratios, checks: table.checks, coverage: table.coverage, excluded: table.excluded}, null, 2));
} else if (command === 'baseline') {
  await Promise.all([fit('baseline'), fit('control')]);
  const actual = await load(join(out, 'baseline.js')), production = await load(join(root, '.cache/wec-experiment/production.js'));
  assert.deepEqual({...actual, generatedAt: null}, {...production, generatedAt: null}, 'STOP §5.3: baseline differs from production');
  const identity = {};
  for (const [label, a, b] of [['calibration', 'baseline.js', 'control.js'], ['stdout', 'baseline-calibrate.log', 'control-calibrate.log'], ['validation', 'validate-baseline.json', 'validate-control.json'], ['validationStdout', 'baseline-validate.log', 'control-validate.log']]) {
    const x = readFileSync(join(out, a)), y = readFileSync(join(out, b));
    assert.ok(x.equals(y), `Flags-off ${label} differs from original source`);
    identity[label] = {bytes: x.length, sha256: sha256(x)};
  }
  await writeFile(join(out, 'baseline-check.json'), JSON.stringify({productionExactExceptDate: true, flagsOffByteIdentity: identity}, null, 2) + '\n');
  console.log('Production reproduced exactly; flags-off calibration/stdout/validation byte-identical.');
} else if (command === 'sectors' || command === 'diagnostic') {
  assert.ok(JSON.parse(await readFile(join(out, 'baseline-check.json'), 'utf8')).productionExactExceptDate);
  if (command === 'sectors') await Promise.all(['b2', 'b1', 'b4'].map(fit));
  else await fit('baseline140');
} else throw new Error('Expected prepare, baseline, sectors, or diagnostic');
