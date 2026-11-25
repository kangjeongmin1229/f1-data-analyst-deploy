// Step 36 X2 (report-only): lateral samples from step 32's top-10 quali traces, processed exactly as step 32 (processLap, team k).
// Filter: |a_x| < 0.3 g (drops braking and acceleration), low-drag state off. Output per season and track: v (km/h), |a_y| (m/s²),
// x = ρ v² / (2 m), and f = step 32's flat-out flag (1/0) for the sensitivity variant that also drops flat-out samples.
//   node scripts/sim/learn/step36-x2-extract.mjs <out.json>
import {writeFileSync} from 'node:fs';
import * as S from './step32-loto.mjs';
import {processLap, USED} from './step32-forward.mjs';
const G = 9.81, M = 808, out = {}; // m: assumption, 798 kg minimum with driver + ~10 kg quali fuel
let laps = 0, kept = 0, seen = 0;
for (const e of S.EV) { const k = USED[S.keyOf(e)]; if (k == null || e.year > 2025) continue; laps++;
  const rho = S.envOf(e.track).rho ?? 1.2, o = ((out[e.year] ??= {})[e.track] ??= {v: [], ay: [], x: [], f: []});
  for (const [v, ax, ay, , st, fl] of processLap(e, e.sp, k)) { seen++; if (st || Math.abs(ax) >= 0.3 * G) continue; const vs = v / 3.6;
    o.v.push(+v.toFixed(2)); o.ay.push(+Math.abs(ay).toFixed(4)); o.x.push(+(rho * vs * vs / (2 * M)).toFixed(5)); o.f.push(fl ? 1 : 0); kept++; } }
writeFileSync(process.argv[2], JSON.stringify({mass: M, laps, samplesSeen: seen, samplesKept: kept, seasons: out}));
console.log({laps, seen, kept});
