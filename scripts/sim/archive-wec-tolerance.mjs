// Preserve the complete diagnostic, including lossless compressed objective logs.
import {readFile, writeFile, mkdir, copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {join, resolve} from 'node:path';
const source = resolve(process.argv[2] || '.cache/wec-tolerance');
const target = resolve(process.argv[3] || 'scripts/sim/results/wec-tolerance-2026-11-10');
await mkdir(target, {recursive: true});
const hashes = {}, hash = bytes => createHash('sha256').update(bytes).digest('hex');
const files = ['manifest.json', 'results.json', 'runtime.json', 'identity.json',
  ...['identity70', 'loose', 'tight'].flatMap(n => [`${n}.js`, `${n}-runtime.json`, `${n}-calibrate.log`,
    `${n}-calibrate.stderr`, `${n}-validate.log`, `${n}-validate.stderr`, `validate-${n}.json`])];
for (const file of files) {
  const bytes = await readFile(join(source, file));
  await writeFile(join(target, file), bytes); hashes[file] = hash(bytes);
}
for (const name of ['loose', 'tight']) {
  const raw = await readFile(join(source, `${name}-objective.jsonl`)), compressed = gzipSync(raw);
  await writeFile(join(target, `${name}-objective.jsonl.gz`), compressed);
  hashes[`${name}-objective.jsonl`] = hash(raw);
  hashes[`${name}-objective.jsonl.gz`] = hash(compressed);
}
for (const [a, b] of [['.cache/wec-tolerance-tests.log', 'tests.log'],
  ['.cache/wec-tolerance-build.log', 'build.log'], ['.cache/wec-tolerance-validate-artifact.log', 'artifact-validation.log']]) {
  await copyFile(a, join(target, b)); hashes[b] = hash(await readFile(a));
}
const code = {};
for (const name of ['calibrate.mjs', 'calibrate-lib.mjs', 'wec-nm-stop.mjs', 'gate.mjs', 'objective-trace.mjs']) {
  const a = await readFile(join(source, 'loose/scripts/sim', name));
  const b = await readFile(join(source, 'tight/scripts/sim', name));
  if (!a.equals(b)) throw new Error(`Source differs between tolerance runs: ${name}`);
  code[name] = hash(a);
}
await writeFile(join(target, 'sha256.json'), JSON.stringify({files: hashes, runSource: code}, null, 2) + '\n');
await writeFile(join(target, 'README.md'), '# WEC tolerance diagnostic\n\nNo production values adopted. See docs/lapsim-handoff-physics.md section 18.\n\nThe manifest was declared before fitting. results.json includes full-precision errors, choices, bounds, iterations, cap hits and runtime. The two .jsonl.gz files preserve every logged iteration losslessly; decompress with gzip or Node node:zlib.gunzipSync. sha256.json identifies both compressed and uncompressed content and the exact fitter sources used.\n');
console.log(target);
