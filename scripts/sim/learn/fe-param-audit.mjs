// Step 35 FE parameter audit (central 17:50 items 1 and 3; report only, nothing enters the model).
// Tags each fit row with its car mode by rule, then asks which car value would make the in-lap split right: the measured sector error
// (corners too slow, straights too fast) is regressed on how each value moves the model's sector shares. Lap scale cancels (shares).
//   node scripts/sim/learn/fe-param-audit.mjs <fe-sector-lines.json> <fe-duel-rows.json> [outDir] [--duel-only]
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {feCarFor, feIsGroup} from '../../../worker/lapsim/fe-cars.js';
import {gripSet} from '../../../worker/lapsim/fe-gen4.js';
import {parseCsv} from './build-endurance.mjs';

const args = process.argv.slice(2), DUEL_ONLY = args.includes('--duel-only'), [SLF, DUELF, OUT = 'out/fe-param'] = args.filter(a => !a.startsWith('--'));
const D = 'scripts/sim/data/learn/'; mkdirSync(OUT, {recursive: true});
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, FIT = JSON.parse(readFileSync(D + 'fe-fit.json', 'utf8'));
const SL = JSON.parse(readFileSync(SLF, 'utf8')).tracks, DF = JSON.parse(readFileSync(DUELF, 'utf8')).files;
const r = (x, d = 2) => Number.isFinite(x) ? +x.toFixed(d) : null, mean = a => a.reduce((s, v) => s + v, 0) / a.length;
const ENV = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
const NAME = {'são paolo': 'São Paulo', 'sao paulo': 'São Paulo', 'mexico city': 'Mexico', madrid: 'Jarama'};
const venueOf = s => { const v = s.replace(/^R\d+\s+/, '').trim(); return NAME[v.toLowerCase()] || v; };
const sectorOk = l => SL[l] && (SL[l].labelVsPrintedM == null || SL[l].labelVsPrintedM <= 150);
// Car mode by rule. Gen3 (S9-S10): groups 300 kW, duels 350 kW, rear drive only. Gen3 Evo (S11-S12): groups 300 kW (4WD mode only
// authorised in duels, SR 2024-25 33.6), duels 350 kW with 4WD mode, front powertrain ≤ 50 kW / 60 Nm (SR 33.6). The kernel has
// no front power cap, so a duel is bracketed: rear drive (lower) and full four-tyre traction (upper, today's model).
const modeOf = (key, session) => { const g = feIsGroup(session), evo = key === 'fe-gen3evo';
  return {kW: g ? 300 : 350, axles: !evo || g ? 'rear' : 'rear + front ≤ 50 kW', modelAxles: evo ? 'four-tyre traction (no front cap)' : 'rear'}; };
const shares = (lay, car) => { const res = K.simulateLap(K.trackFromData(ALL[lay]), car, ENV), n = res.time.length, sl = SL[lay];
  const tAt = f => res.time[Math.min(n - 1, Math.round(f * n))], m = [tAt(sl.f1), tAt(sl.f2) - tAt(sl.f1), res.lapTime - tAt(sl.f2)]; return {s: m.map(x => x / res.lapTime), lap: res.lapTime}; };
const PERT = { // value changes whose share effects are measured (+10 % unless stated)
  muY: c => ({...c, ...gripSet(c.muY * 1.1)}), cdA: c => ({...c, cdA: c.cdA * 1.1, cdALow: c.cdALow * 1.1}), pIce: c => ({...c, pIce: c.pIce * 1.1}),
  mass: c => ({...c, mass: c.mass * 1.1}), clA: c => ({...c, clA: c.clA * 1.1, clALow: c.clALow * 1.1}), rearOnly: c => ({...c, awdAboveKph: null})};
// measured sectors: the duel lap (same time in the duel analysis rows), else the fastest dry group lap of that event
const duelRows = DF.flatMap(f => f.rows.map(q => ({...q, season: f.season, event: f.event, session: f.session})));
const cars = parseCsv(gunzipSync(readFileSync(D + 'fe-cars.csv.gz')).toString()), grp = {};
for (const g of cars) { if (g.type !== 'Q' || !/Group/i.test(g.session) || +g.rainShare > 0.02 || ![g.best, g.s1, g.s2, g.s3].every(v => +v > 0)) continue;
  const lay = FIT.layouts.find(l => l.venue === venueOf(g.event) && Math.abs(+g.lenKm * 1000 / l.lengthM - 1) < 0.004)?.id; if (lay) { const k = `${lay}|${g.season}`; if (!grp[k] || +g.best < +grp[k].best) grp[k] = g; } }
const rows = [];
for (const f of FIT.rows) { if (!sectorOk(f.layout)) continue;
  const d = duelRows.find(q => Math.abs(q.time - f.real) < 0.0015), g = feIsGroup(f.session) ? grp[`${f.layout}|${f.season}`] : null;
  const lapMatched = g && Math.abs(+g.best - f.real) < 0.0015, src = d ? 'duel lap (same lap)' : lapMatched ? 'group lap (same lap)' : grp[`${f.layout}|${f.season}`] ? 'group best (other mode)' : null;
  if (!src || (DUEL_ONLY && !/same lap/.test(src))) continue;
  const gb = grp[`${f.layout}|${f.season}`], ss = d ? [d.s1, d.s2, d.s3] : [+gb.s1, +gb.s2, +gb.s3], tot = ss[0] + ss[1] + ss[2];
  const car = feCarFor(f.key, f.season, f.session, 'Q'), base = shares(f.layout, car);
  const e = [0, 1, 2].map(s => (ss[s] / tot - base.s[s]) * 100); // + = model sector too fast (share too small)
  const dS = Object.fromEntries(Object.entries(PERT).map(([k, p]) => { const q = shares(f.layout, p(car)); return [k, q.s.map((x, s) => (x - base.s[s]) * 100)]; }));
  rows.push({layout: f.layout, season: f.season, key: f.key, session: f.session, mode: modeOf(f.key, f.session), src, e, dS}); }
// e_s ≈ Σ_k a_k · dS_k,s : a_k = implied change in units of +10 % (a = −1 means the value should be 10 % lower). One value at a time
// (the shares of most values are collinear), plus muY+cdA jointly. Layout-clustered bootstrap, 90 % CI.
const pts = rows.flatMap(x => [0, 1, 2].map(s => ({layout: x.layout, e: x.e[s], d: Object.fromEntries(Object.keys(PERT).map(k => [k, x.dS[k][s]]))})));
function solve(rs, ks) { const p = ks.length, A = Array.from({length: p}, () => new Float64Array(p + 1));
  for (const q of rs) for (let a = 0; a < p; a++) { A[a][p] += q.d[ks[a]] * q.e; for (let c = 0; c < p; c++) A[a][c] += q.d[ks[a]] * q.d[ks[c]]; }
  for (let a = 0; a < p; a++) { for (let q = 0; q < p; q++) if (q !== a) { const k = A[q][a] / A[a][a]; for (let c = a; c <= p; c++) A[q][c] -= k * A[a][c]; } }
  return A.map((row, a) => row[p] / row[a]); }
let seed = 35; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, lays = [...new Set(pts.map(q => q.layout))];
const ss0 = pts.reduce((s, q) => s + q.e * q.e, 0);
function fit(ks) { const a = solve(pts, ks), draws = [];
  for (let i = 0; i < 2000; i++) { const pick = lays.map(() => lays[Math.floor(rnd() * lays.length)]); const b = solve(pick.flatMap(l => pts.filter(q => q.layout === l)), ks); if (b.every(Number.isFinite)) draws.push(b); }
  const ci = j => { const s = draws.map(b => b[j]).sort((x, y) => x - y); return [r(s[Math.floor(0.05 * s.length)] * 10, 1), r(s[Math.floor(0.95 * s.length)] * 10, 1)]; };
  const res = pts.reduce((s, q) => s + (q.e - ks.reduce((t, k, j) => t + a[j] * q.d[k], 0)) ** 2, 0);
  return {values: Object.fromEntries(ks.map((k, j) => [k, {impliedChangePct: r(a[j] * 10, 1), ci90: ci(j)}])), shareRmsBefore: r(Math.sqrt(ss0 / pts.length)), shareRmsAfter: r(Math.sqrt(res / pts.length)), r2: r(1 - res / ss0)}; }
const single = Object.fromEntries(Object.keys(PERT).map(k => [k, fit([k])])); // rearOnly: implied change 10 = a full switch to rear drive
const out = {note: 'report only; implied change = how much the car value would move (in %) to fix the measured sector split; lap scale cancels',
  duelOnly: DUEL_ONLY, nRows: rows.length, nSectorPts: pts.length, nLayouts: lays.length, sources: rows.reduce((o, x) => (o[x.src] = (o[x.src] || 0) + 1, o), {}),
  modes: rows.reduce((o, x) => { const k = `${x.key} ${x.mode.kW} kW ${x.mode.axles} (model: ${x.mode.modelAxles})`; o[k] = (o[k] || 0) + 1; return o; }, {}),
  single, muY_cdA: fit(['muY', 'cdA']), muY_pIce: fit(['muY', 'pIce']),
  rearOnlyEffect: {meanAbsSharePp: r(mean(rows.filter(x => x.key === 'fe-gen3evo').flatMap(x => x.dS.rearOnly.map(Math.abs))), 3)},
  meanSectorErr: [0, 1, 2].map(s => r(mean(rows.map(x => x.e[s]))))};
writeFileSync(OUT + '/fe-param-audit.json', JSON.stringify({...out, rows}, null, 1));
console.log(JSON.stringify(out, null, 1));
