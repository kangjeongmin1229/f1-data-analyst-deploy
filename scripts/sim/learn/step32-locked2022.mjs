// Step 32 A3.5: the 2022 LOCKED set is opened ONCE, only after central approval. This gate runs before any 2022 file is read:
// it refuses if the opened marker exists, if docs/gate-ledger.md already has a "step 32 locked 2022" result line, or if the approval doc
// (local copy of the Project decision) and its sha256 are not given or do not match. Then it writes the marker FIRST and exits 0;
// the scoring (A3.5 rows and pass rule) runs only after this exit code, in the approved run. Never run before approval.
// usage: node scripts/sim/learn/step32-locked2022.mjs <approval doc path> <approval sha256> [repo root]
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
export function openLocked2022(doc, sha, root = '.') {
  const marker = `${root}/scripts/sim/data/step32/locked2022-opened.json`;
  if (existsSync(marker)) throw new Error('REFUSED: the 2022 LOCKED set was already opened for step 32 (' + marker + ')');
  const ledger = existsSync(`${root}/docs/gate-ledger.md`) ? readFileSync(`${root}/docs/gate-ledger.md`, 'utf8') : '';
  if (/step 32 locked 2022/i.test(ledger)) throw new Error('REFUSED: docs/gate-ledger.md already has a step 32 locked 2022 line');
  if (!doc || !sha || !existsSync(doc)) throw new Error('REFUSED: central approval doc and its sha256 are required');
  const h = createHash('sha256').update(readFileSync(doc)).digest('hex');
  if (h !== sha) throw new Error(`REFUSED: approval sha256 ${h} does not match ${sha}`);
  writeFileSync(marker, JSON.stringify({opened_at: new Date().toISOString(), approval: doc, approval_sha256: sha}));
  return marker;
}
if (process.argv[1]?.endsWith('step32-locked2022.mjs')) {
  try { console.log('opened marker written:', openLocked2022(process.argv[2], process.argv[3], process.argv[4] || '.')); }
  catch (e) { console.error(e.message); process.exit(2); }
}
