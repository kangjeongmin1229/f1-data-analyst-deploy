// Step 32 A6.4 guard G-T: page compute time with the flag on ≤ 1.20 × flag off. tool.js simulate for the 2025 and 2026 cars on the first
// 20 F1 tracks (sorted); 5 repeats per state, each in a fresh process (the kernel's lap cache would otherwise hide the cost), states
// alternated; per-lap median over repeats, summed.
// usage: node scripts/sim/learn/step32-compute-time.mjs <limits.json> <out.json>
import {readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const [lim, out] = process.argv.slice(2);
if (lim === '--one') { // child: one sweep, prints per-lap ms
  const [{simulate}, sc, {lapsimAllTracks: T}] = await Promise.all([import('../../../worker/lapsim/tool.js'), import('../../../worker/lapsim/scenario.js'), import('../../../worker/lapsim/tracks.js')]);
  if (out !== 'off') sc.setStep32Limits(JSON.parse(readFileSync(out, 'utf8')));
  const ids = Object.keys(T).sort().filter(id => sc.carsFor(id)['2025']).slice(0, 20), ms = {};
  for (const id of ids) for (const car of ['2025', '2026']) { const t0 = process.hrtime.bigint(); simulate({track: id, car}); ms[id + '|' + car] = Number(process.hrtime.bigint() - t0) / 1e6; }
  console.log(JSON.stringify(ms)); process.exit(0);
}
const runs = {off: [], on: []};
for (let r = 0; r < 5; r++) for (const st of r % 2 ? ['on', 'off'] : ['off', 'on'])
  runs[st].push(JSON.parse(execFileSync('node', [new URL(import.meta.url).pathname, '--one', st === 'on' ? lim : 'off'], {maxBuffer: 1e8}).toString().trim().split('\n').pop()));
const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
const keys = Object.keys(runs.off[0]), sum = st => keys.reduce((a, k) => a + med(runs[st].map(r => r[k])), 0);
const res = {off_ms: sum('off'), on_ms: sum('on'), laps: keys.length}; res.ratio = res.on_ms / res.off_ms; res.pass = res.ratio <= 1.2;
writeFileSync(out, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res));
