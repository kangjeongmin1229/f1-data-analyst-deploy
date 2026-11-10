// Archive derived experiment evidence only; raw timing/telemetry stays outside git.
import {readFile, writeFile, mkdir, readdir, copyFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {join, resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {sha256} from './wec-eligibility.mjs';
const dir = resolve(process.argv[2] || '.cache/wec-consistent-resume');
const out = 'scripts/sim/results/wec-consistent-resume-2026-11-10';
const result = JSON.parse(await readFile(join(dir, 'results.json'), 'utf8'));
assert.equal(JSON.parse(await readFile(join(dir, 'complete.json'), 'utf8')).complete, true);
await mkdir(out, {recursive: true});
for (const name of await readdir(dir)) {
  if (!/\.(json|js|log|stderr|jsonl)$/.test(name)) continue;
  const bytes = await readFile(join(dir, name));
  if (/\.(log|stderr|jsonl)$/.test(name)) await writeFile(join(out, name + '.gz'), gzipSync(bytes));
  else await writeFile(join(out, name), bytes);
}
await copyFile('.cache/reproduction-dry.json', join(out, 'reproduction-frozen-dry.json'));
await copyFile('.cache/f1-dry-reproduction.json', join(out, 'reproduction-frozen-f1.json'));
// Compare each runtime model file and the gate with the checked-out PR starting point.
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'df3d65819db9be74f5941ddda83d1b0a94a00841', 'worker/lapsim'], {encoding: 'utf8'}).trim().split('\n');
files.push('scripts/sim/gate.mjs');
const integrity = [];
for (const path of files) {
  const before = execFileSync('git', ['show', `df3d65819db9be74f5941ddda83d1b0a94a00841:${path}`]);
  const after = await readFile(path);
  assert.ok(before.equals(after), `STOP: production file changed: ${path}`);
  integrity.push({path, sha256: sha256(after), unchanged: true});
}
await writeFile(join(out, 'production-integrity.json'), JSON.stringify({unchanged: true, files: integrity}, null, 2) + '\n');
const sourcePaths = ['calibrate.mjs','calibrate-lib.mjs','wec-nm-stop.mjs','wec-session-scope.mjs','verify-wec-reproduction.mjs','run-wec-consistent.mjs','report-wec-consistent.mjs','joint-bcd.mjs','transfer-grip.mjs'];
const sources = {};
for (const name of sourcePaths) sources[name] = sha256(await readFile(join('scripts/sim', name)));
await writeFile(join(out, 'source-hashes.json'), JSON.stringify({node: process.version, sources}, null, 2) + '\n');
const hashes = {};
for (const name of (await readdir(out)).sort()) if (name !== 'sha256.json') hashes[name] = sha256(await readFile(join(out, name)));
await writeFile(join(out, 'sha256.json'), JSON.stringify(hashes, null, 2) + '\n');
console.log(JSON.stringify({files: Object.keys(hashes).length, productionUnchanged: true, pass: result.pass}));
