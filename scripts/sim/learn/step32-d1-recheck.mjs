// Step 32 D1 ledger note (central decision claude/decision-central-32-c3-2026-11-25.md item 5): the run-45524888217 fold outputs with the
// P3a power check redone by the fixed check (kernel drive force vs power limit, powerOkProbe), same code line as the run (kernel 69c7385).
// Only checks.power of each held lap changes; nothing is refitted. usage: node step32-d1-recheck.mjs <fold dir in> <fold dir out>
import {readFileSync, writeFileSync, readdirSync, mkdirSync} from 'node:fs';
import {EV, keyOf} from './step32-loto.mjs';
import {car25, simSession} from './step32-forward.mjs';
const [IN, OUT] = process.argv.slice(2); mkdirSync(OUT, {recursive: true}); let n = 0, was = 0, now = 0;
for (const f of readdirSync(IN).filter(x => x.endsWith('.json'))) {
  const F = JSON.parse(readFileSync(`${IN}/${f}`, 'utf8')), byKey = Object.fromEntries(EV.filter(e => e.track === F.held).map(e => [keyOf(e), e]));
  for (const h of F.heldScores) { const e = byKey[h.key]; if (!e) throw new Error('lap not found ' + h.key);
    const p = simSession(e, car25(e.track, F.fits[e.year].params), 1).power; n++; was += !h.checks.power.ok; now += !p.ok;
    h.checks.power = {...p, asRun: h.checks.power}; }
  writeFileSync(`${OUT}/${f}`, JSON.stringify(F));
}
console.log(JSON.stringify({heldLaps: n, P3aFailAsRun: was, P3aFailFixed: now}));
