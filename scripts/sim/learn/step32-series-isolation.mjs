// Step 32 A4.1 guard G-S: every non-F1 page lap (tool.js simulate = the page/tool path) is byte-identical to base 589b6b3, with the
// step 32 flag off and on. Enumeration: every track × every carsFor(id) entry whose series is not F1.
// usage: node scripts/sim/learn/step32-series-isolation.mjs <repo root to import from> <out manifest.json> [limits.json → flag on]
//        node scripts/sim/learn/step32-series-isolation.mjs compare <base manifest> <manifest> [<manifest> ...]
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const [a0, a1, ...rest] = process.argv.slice(2);
if (a0 === 'compare') {
  const base = JSON.parse(readFileSync(a1, 'utf8')); let bad = 0;
  for (const p of rest) { const m = JSON.parse(readFileSync(p, 'utf8')), keys = Object.keys(base.laps);
    const diff = keys.filter(k => m.laps[k] !== base.laps[k]); bad += diff.length + (Object.keys(m.laps).length !== keys.length ? 1 : 0);
    console.log(p, 'laps', Object.keys(m.laps).length, 'base', keys.length, 'different', diff.length, diff.slice(0, 5).join(' ')); }
  if (bad) { console.error('G-S FAIL'); process.exit(1); } console.log('G-S PASS'); process.exit(0);
}
const R = s => pathToFileURL(a0 + '/worker/lapsim/' + s).href;
const [{simulate}, sc, {lapsimAllTracks: T}] = await Promise.all([import(R('tool.js')), import(R('scenario.js')), import(R('tracks.js'))]);
if (rest[0]) { if (!sc.setStep32Limits) throw new Error('flag-on needs the step 32 scenario.js'); sc.setStep32Limits(JSON.parse(readFileSync(rest[0], 'utf8'))); }
const isF1 = e => !(e.series || e.car?.series), laps = {}, t0 = Date.now();
for (const id of Object.keys(T).sort()) for (const [k, e] of Object.entries(sc.carsFor(id))) {
  if (isF1(e)) continue;
  const r = simulate({track: id, car: k});
  laps[id + '|' + k] = createHash('sha256').update(JSON.stringify({result: r.result, uncertainty: r.uncertainty, status: r.status})).digest('hex');
}
writeFileSync(a1, JSON.stringify({root: a0, flag: rest[0] ? 'on' : 'off', n: Object.keys(laps).length, seconds: (Date.now() - t0) / 1e3, laps}));
console.log('laps', Object.keys(laps).length, 'in', (Date.now() - t0) / 1e3, 's');
