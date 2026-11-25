// Step 32 A2.0 (docs/prereg/step32-empirical-ggv-A2A3-2026-11-25.md): measured data is never changed. Every measured input file is
// byte-identical to the sha256 recorded when step 32 fixed its inputs (scripts/sim/data/step32/measured-manifest.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const M = JSON.parse(readFileSync('scripts/sim/data/step32/measured-manifest.json', 'utf8'));
test('step 32: measured input files are byte-identical to the manifest', () => {
  for (const [f, h] of Object.entries(M.files)) assert.equal(createHash('sha256').update(readFileSync(f)).digest('hex'), h, f + ' changed');
});
