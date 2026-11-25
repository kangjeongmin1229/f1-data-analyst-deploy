// Step 35 A2 (docs/prereg/step35-fe-A2-diagnosis-2026-11-25.md): where does the Formula E sector-share error come from? Report only.
// Run after build-fe.mjs and fe-sector-lines.mjs.  node scripts/sim/learn/fe-sector-diagnosis.mjs [outDir] [fe-speeds.csv]
import {readFileSync, writeFileSync, mkdirSync, existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {FE_GENS} from '../../../worker/lapsim/fe-cars.js';
import {parseCsv} from './build-endurance.mjs';

const OUT = process.argv[2] || 'out/fe-diag', SPEEDS = process.argv[3], D = 'scripts/sim/data/learn/'; mkdirSync(OUT, {recursive: true});
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, FIT = JSON.parse(readFileSync(D + 'fe-fit.json', 'utf8'));
const SL = JSON.parse(readFileSync(D + 'fe-sector-lines.json', 'utf8')).tracks, r = (x, d = 3) => Number.isFinite(x) ? +x.toFixed(d) : null;
const NAME = {'são paolo': 'São Paulo', 'mexico city': 'Mexico', 'ad diriyah': 'Diriyah', madrid: 'Jarama', 'new york city': 'New York'};
const venueOf = s => { const v = s.replace(/^R\d+\s+/, '').replace(/\s+(rookie\s+)?testing$/i, '').trim(); return NAME[v.toLowerCase()] || v; };
const layoutOf = (venue, lenM) => { const id = FIT.layouts.find(l => l.venue === venue && Math.abs(lenM / l.lengthM - 1) < 0.004)?.id; return ALL[id] ? id : undefined; };
const envOf = w => K.conditionsFromWeather({pressureHpa: +w.hpa || 1013.25, airTempC: +w.airC || 25, humidityPct: +w.hum || 50, trackTempC: +w.trackC || 35, windSpeed: 0, windFromDeg: 0});
const ok = l => SL[l] && (SL[l].labelVsPrintedM == null || SL[l].labelVsPrintedM <= 150); // pre-reg: label check ≤ 150 m
const car = {...FE_GENS['fe-gen3evo'].car, pIce: 300e3, awdAboveKph: null};

// fastest car of each dry group, Gen3 Evo seasons
const base = parseCsv(gunzipSync(readFileSync(D + 'fe-cars.csv.gz')).toString()), grp = {};
for (const g of base) { if (g.type !== 'Q' || +g.season < 2025 || +g.rainShare > 0.02) continue; const m = /Group ([AB])/i.exec(g.session); if (!m || !(+g.best > 0) || ![g.s1, g.s2, g.s3].every(v => +v > 0)) continue;
  const k = `${g.season}|${g.event}|${m[1]}`; if (!grp[k] || +g.best < +grp[k].best) grp[k] = g; }
const feats = {}, rows = [];
function featuresOf(lay, res) { const tr = K.trackFromData(ALL[lay]), v = res.v, t = res.time, n = v.length, ds = tr.ds, vmax = Math.max(...v), sl = SL[lay];
  const b = [0, Math.round(sl.f1 * n), Math.round(sl.f2 * n), n], f = [];
  for (let k = 0; k < 3; k++) { let tc = 0, tSec = 0, dS = 0, dSec = 0, tSlow = 0, brakes = 0;
    for (let i = b[k]; i < b[k + 1]; i++) { const j = (i + 1) % n, dt = (j ? t[j] : res.lapTime) - t[i]; tSec += dt; dSec += ds; if (v[i] < 0.8 * vmax) tc += dt; if (v[i] < 0.5 * vmax) tSlow += dt; if (v[i] >= 0.9 * vmax) dS += ds; }
    // braking zones starting in the sector: runs of falling speed ≥ 20 m with peak deceleration ≥ 1.5 g
    for (let i = b[k]; i < b[k + 1]; i++) { const ip = (i - 1 + n) % n; if (!(v[(i + 1) % n] < v[i] && !(v[i] < v[ip]))) continue; let j = i, pk = 0;
      while (v[(j + 1) % n] < v[j % n] && j - i < n) { pk = Math.max(pk, (v[j % n] ** 2 - v[(j + 1) % n] ** 2) / (2 * ds) / 9.81); j++; } if ((j - i) * ds >= 20 && pk >= 1.5) brakes++; }
    f.push({c: tc / tSec, s: dS / dSec, b: brakes, slow: tSlow / tSec}); }
  return {f, vAt: [b[1], b[2], 0].map(i => v[i] * 3.6), vmaxKph: vmax * 3.6}; }
for (const [k, g] of Object.entries(grp)) { const lay = layoutOf(venueOf(g.event), +g.lenKm * 1000); if (!lay || !ok(lay)) continue;
  const res = K.simulateLap(K.trackFromData(ALL[lay]), car, envOf(g)), n = res.time.length, sl = SL[lay], tAt = f => res.time[Math.min(n - 1, Math.round(f * n))];
  const m = [tAt(sl.f1), tAt(sl.f2) - tAt(sl.f1), res.lapTime - tAt(sl.f2)], sm = m[0] + m[1] + m[2], ss = [+g.s1, +g.s2, +g.s3], sr = ss[0] + ss[1] + ss[2];
  const F = feats[lay] ||= featuresOf(lay, res); for (let s = 0; s < 3; s++) rows.push({key: k, layout: lay, sector: s + 1, e: (m[s] / sm) / (ss[s] / sr) * 100 - 100, ...F.f[s]}); }

// OLS with layout-clustered bootstrap (seed 35)
function ols(X, y) { const p = X[0].length, A = Array.from({length: p}, () => new Float64Array(p)), bv = new Float64Array(p);
  X.forEach((x, i) => { for (let a = 0; a < p; a++) { bv[a] += x[a] * y[i]; for (let c = 0; c < p; c++) A[a][c] += x[a] * x[c]; } });
  for (let a = 0; a < p; a++) { let m = a; for (let q = a + 1; q < p; q++) if (Math.abs(A[q][a]) > Math.abs(A[m][a])) m = q; [A[a], A[m]] = [A[m], A[a]]; [bv[a], bv[m]] = [bv[m], bv[a]];
    for (let q = 0; q < p; q++) if (q !== a) { const f = A[q][a] / A[a][a]; for (let c = a; c < p; c++) A[q][c] -= f * A[a][c]; bv[q] -= f * bv[a]; } }
  return Array.from(bv, (v, a) => v / A[a][a]); }
const r2 = (X, y, b) => { const my = y.reduce((s, v) => s + v, 0) / y.length; let ss = 0, st = 0; X.forEach((x, i) => { const f = x.reduce((s, v, a) => s + v * b[a], 0); ss += (y[i] - f) ** 2; st += (y[i] - my) ** 2; }); return 1 - ss / st; };
let seed = 35; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const lays = [...new Set(rows.map(x => x.layout))], cols = ['c', 's', 'b'];
function fitSet(rs, use) { const X = rs.map(x => [1, ...use.map(k => x[k])]), y = rs.map(x => x.e), b = ols(X, y); return {b, r2: r2(X, y, b)}; }
function boot(use) { const full = fitSet(rows, use), draws = [];
  for (let d = 0; d < 2000; d++) { const pick = lays.map(() => lays[Math.floor(rnd() * lays.length)]), rs = pick.flatMap(l => rows.filter(x => x.layout === l));
    try { const f = fitSet(rs, use); if (f.b.every(Number.isFinite)) draws.push(f.b); } catch {} }
  const ci = a => { const s = draws.map(b => b[a]).sort((x, y) => x - y); return [r(s[Math.floor(0.05 * s.length)]), r(s[Math.floor(0.95 * s.length)])]; };
  return {use, r2: r(full.r2), coef: Object.fromEntries(use.map((k, i) => [k, {beta: r(full.b[i + 1]), ci90: ci(i + 1)}])), draws: draws.length}; }
const all = boot(cols), alone = cols.map(k => boot([k]));
const partial = Object.fromEntries(cols.map(k => { const without = fitSet(rows, cols.filter(c => c !== k)).r2, w = fitSet(rows, cols).r2; return [k, r((w - without) / (1 - without))]; }));
const verdict = Object.fromEntries(cols.map(k => { const c = all.coef[k]; return [k, c.ci90[0] > 0 || c.ci90[1] < 0 ? (partial[k] >= 0.10 ? 'carries the error' : 'CI excludes 0, partial R² < 0.10') : 'CI includes 0']; }));
// width cue: slow-corner (v < 0.5 v_max) vs fast-corner share, reported
const split = boot(['slow', 'c']);
// trap / line speeds if the Al Kamel speed columns exist
let speeds = null;
if (SPEEDS && existsSync(SPEEDS)) { const txt = readFileSync(SPEEDS, 'utf8').trim().split('\n').slice(1), bias = {};
  for (const line of txt) { const p = line.split(','), [season, event, session, type] = p; if (type !== 'Q' || !/Group/i.test(session) || +season < 11) continue;
    const lay = layoutOf(venueOf(event), FIT.layouts.find(l => l.venue === venueOf(event))?.lengthM || 0); if (!lay || !feats[lay]) continue;
    for (let i = 6; i + 2 < p.length; i += 3) { const col = p[i], val = +p[i + 1]; if (!(val > 0)) continue; const at = /I1/i.test(col) ? 0 : /I2/i.test(col) ? 1 : /FL|FINISH/i.test(col) ? 2 : /TOP/i.test(col) ? 3 : null; if (at == null) continue;
      const mv = at === 3 ? feats[lay].vmaxKph : feats[lay].vAt[at]; ((bias[lay] ||= {})[col] ||= []).push(mv - val); } }
  speeds = Object.fromEntries(Object.entries(bias).map(([l, o]) => [l, Object.fromEntries(Object.entries(o).map(([c, a]) => [c, {n: a.length, meanKph: r(a.reduce((s, v) => s + v, 0) / a.length, 1)}]))])); }
const out = {prereg: 'docs/prereg/step35-fe-A2-diagnosis-2026-11-25.md', run: process.env.GITHUB_RUN_ID || 'local (not reproduced)', nRows: rows.length, nLayouts: lays.length,
  sectorMeans: [1, 2, 3].map(s => r(rows.filter(x => x.sector === s).reduce((a, x) => a + x.e, 0) / rows.filter(x => x.sector === s).length, 2)),
  sectorRms: [1, 2, 3].map(s => { const a = rows.filter(x => x.sector === s).map(x => x.e); return r(Math.sqrt(a.reduce((q, v) => q + v * v, 0) / a.length), 2); }),
  multiple: all, partialR2: partial, alone, verdict, widthSplit: split, speeds, features: Object.fromEntries(Object.entries(feats).map(([l, F]) => [l, F.f.map(f => ({c: r(f.c), s: r(f.s), b: f.b, slow: r(f.slow)}))]))};
writeFileSync(OUT + '/fe-sector-diagnosis.json', JSON.stringify({...out, rows}, null, 1));
console.log(JSON.stringify(out, null, 1));
