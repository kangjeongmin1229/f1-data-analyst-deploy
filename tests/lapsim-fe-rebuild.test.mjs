// One FE rebuild in the pipeline (central 2026-11-25 14:39): fe-rebuild.mjs (report job) must give byte-identical files to step 35's own
// path (node build-fe.mjs, then copy the rebuilt files), and to itself on a second run, before step 35's rebuild is removed.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {feRebuild, FE_OUTPUTS} from '../scripts/sim/learn/fe-rebuild.mjs';

test('FE rebuild: fe-rebuild.mjs = step 35 path (build-fe.mjs) byte for byte, and deterministic', () => {
  const committed = Object.fromEntries(FE_OUTPUTS.map(f => [f, readFileSync(f)]));
  try {
    const a = mkdtempSync(join(tmpdir(), 'fe-a-')), b = mkdtempSync(join(tmpdir(), 'fe-b-'));
    feRebuild(a);
    assert.deepEqual(readFileSync(a + '/fe-fit-shipped.json'), committed[FE_OUTPUTS[0]], 'the shipped fit is saved before the rebuild');
    for (const f of FE_OUTPUTS) writeFileSync(f, committed[f]); // back to the committed state, then step 35's path
    const r = spawnSync(process.execPath, ['scripts/sim/learn/build-fe.mjs'], {encoding: 'utf8', maxBuffer: 1 << 26});
    assert.equal(r.status, 0, r.stderr);
    for (const f of FE_OUTPUTS) assert.ok(readFileSync(f).equals(readFileSync(a + '/fe/' + f.split('/').pop())), `${f}: the two paths differ`);
    for (const f of FE_OUTPUTS) writeFileSync(f, committed[f]);
    feRebuild(b);
    for (const f of FE_OUTPUTS) { const n = f.split('/').pop(); assert.ok(readFileSync(a + '/fe/' + n).equals(readFileSync(b + '/fe/' + n)), `${n}: not deterministic`); }
  } finally { for (const f of FE_OUTPUTS) writeFileSync(f, committed[f]); }
});
