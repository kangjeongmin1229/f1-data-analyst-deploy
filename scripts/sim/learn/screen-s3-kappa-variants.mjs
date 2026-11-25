// S3 add-on (report-only): X2 lateral samples with the a_y computed from three curvature variants of the same driven-line κ
// (step 32 kappa.json): base (= X2), min over ±20 m (alignment-proof lower bound), mean |κ| over ±40 m (80 m window, step 30b check).
// Same filters as X2 (|a_x| < 0.3 g, low-drag off). Run from the X2 commit (step36-x2 3494875).
import {readFileSync, writeFileSync} from 'node:fs';
const R = process.cwd() + '/scripts/sim/learn/';
const S = await import(R + 'step32-loto.mjs'), {regrid, deriv} = await import(R + 'step32-process.mjs'), {USED} = await import(R + 'step32-forward.mjs');
const KJ = JSON.parse(readFileSync(process.cwd() + '/scripts/sim/data/step32/kappa.json')), G = 9.81, M = 808;
const win = (k, ds, h, f) => { const n = k.length, w = Math.round(h / ds), o = new Float64Array(n); for (let i = 0; i < n; i++) { let a = f === 'min' ? Infinity : 0;
  for (let j = -w; j <= w; j++) { const x = Math.abs(k[(i + j + n) % n]); a = f === 'min' ? Math.min(a, x) : a + x; } o[i] = f === 'min' ? a : a / (2 * w + 1); } return o; };
const out = {}, cache = {};
for (const e of S.EV) { const k = USED[S.keyOf(e)]; if (k == null || e.year > 2025) continue;
  const kap = KJ.kappa[e.track], low = KJ.low[e.session], ds = e.ds;
  const V = cache[e.track] ??= {base: Float64Array.from(kap, Math.abs), min20: win(kap, ds, 20, 'min'), ma80: win(kap, ds, 40, 'mean')};
  const rho = S.envOf(e.track).rho ?? 1.2, o = ((out[e.year] ??= {})[e.track] ??= {v: [], x: [], base: [], min20: [], ma80: []});
  const a = regrid(e.n, e.xs, e.sp.map(x => x * k)), {vf, dv, ok} = deriv(a, ds);
  for (let i = 0; i < e.n; i++) { if (!ok[i]) continue; const mi = ((i - e.shift) % e.n + e.n) % e.n, ax = vf[i] * dv[i];
    if (low[mi] > 0 || Math.abs(ax) >= 0.3 * G) continue; const v2 = vf[i] * vf[i];
    o.v.push(+(vf[i] * 3.6).toFixed(2)); o.x.push(+(rho * v2 / (2 * M)).toFixed(5));
    for (const q of ['base', 'min20', 'ma80']) o[q].push(+(v2 * V[q][mi]).toFixed(4)); } }
writeFileSync(process.argv[2], JSON.stringify({mass: M, seasons: out}));
const n = Object.values(out).flatMap(T => Object.values(T)).reduce((s, o) => s + o.v.length, 0); console.log({samples: n});
