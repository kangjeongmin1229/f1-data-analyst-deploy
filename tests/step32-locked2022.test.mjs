// Step 32 A3.5: the locked 2022 gate refuses a second opening, a missing approval, a wrong hash, and an existing ledger line.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {openLocked2022} from '../scripts/sim/learn/step32-locked2022.mjs';
const repo = () => { const r = mkdtempSync(tmpdir() + '/s32-'); mkdirSync(r + '/scripts/sim/data/step32', {recursive: true}); mkdirSync(r + '/docs'); writeFileSync(r + '/docs/gate-ledger.md', '# ledger\n'); return r; };
test('step 32 locked 2022: needs approval, opens once, then refuses', () => {
  const r = repo(), doc = r + '/approval.md'; writeFileSync(doc, 'approved'); const sha = createHash('sha256').update('approved').digest('hex');
  assert.throws(() => openLocked2022(null, null, r), /approval/);
  assert.throws(() => openLocked2022(doc, '0'.repeat(64), r), /does not match/);
  assert.ok(existsSync(openLocked2022(doc, sha, r)));
  assert.throws(() => openLocked2022(doc, sha, r), /already opened/);
});
test('step 32 locked 2022: refuses when the ledger already has the result line', () => {
  const r = repo(), doc = r + '/approval.md'; writeFileSync(doc, 'ok'); writeFileSync(r + '/docs/gate-ledger.md', '| step 32 locked 2022 | pass |\n');
  assert.throws(() => openLocked2022(doc, createHash('sha256').update('ok').digest('hex'), r), /ledger/);
});
test('step 32 locked 2022: the repo marker does not exist yet', () => assert.ok(!existsSync('scripts/sim/data/step32/locked2022-opened.json')));
