// WEC final hold-out guard (step 34 A1 §6): opened once. Scoring code calls openFinal() first; it throws when the set is not approved,
// does not match its hash, or was already opened, and otherwise records the opening (run id, date) in the lock file.
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

export const LOCK = 'scripts/sim/data/wec-final-holdout.json';
export function openFinal(run, file = LOCK, now = new Date().toISOString()) {
  const L = JSON.parse(readFileSync(file, 'utf8'));
  if (L.opened) throw new Error(`WEC final hold-out already opened (run ${L.opened.run}, ${L.opened.date}); it is never opened twice`);
  if (!L.set || !L.approved_run || String(run) !== String(L.approved_run)) throw new Error('WEC final hold-out: no central approval for this run');
  if (createHash('sha256').update(JSON.stringify(L.set)).digest('hex') !== L.set_sha256) throw new Error('WEC final hold-out: set does not match its hash');
  L.opened = {run: String(run), date: now}; writeFileSync(file, JSON.stringify(L, null, 1) + '\n'); return L.set;
}
