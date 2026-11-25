// Step 35 report (central 18:30): drivetrain efficiency and rolling resistance vs the FE in-lap split. Report only, nothing ships.
// For each variant car: lap and straight-time change, the grip scale that restores each track's lap (stand-in for the refit), then the
// duel-matched sector split again.   node scripts/sim/learn/fe-eta-crr-audit.mjs <fe-sector-lines.json> <fe-duel-rows.json> [out.json]
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {feCarFor} from '../../../worker/lapsim/fe-cars.js';
import {gripSet} from '../../../worker/lapsim/fe-gen4.js';
const [SLF, DUELF, OUTF] = process.argv.slice(2), D = 'scripts/sim/data/learn/';
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, FIT = JSON.parse(readFileSync(D + 'fe-fit.json', 'utf8'));
const SL = JSON.parse(readFileSync(SLF, 'utf8')).tracks, DUEL = JSON.parse(readFileSync(DUELF, 'utf8')).files.flatMap(f => f.rows);
const ENV = K.conditionsFromWeather({pressureHpa: 1013.25, airTempC: 25, humidityPct: 50, trackTempC: 35, windSpeed: 0, windFromDeg: 0});
const TRACKS = ['monte-carlo', 'fe-tokyo', 'fe-jeddah', 'fe-london', 'fe-shanghai', 'fe-sao-paulo'];
const VAR = {base: c => c, eta95: c => ({...c, etaDrive: 0.95}), crr010: c => ({...c, cRoll: 0.010}), both: c => ({...c, etaDrive: 0.95, cRoll: 0.010})};
const sim = (lay, car) => { const res = K.simulateLap(K.trackFromData(ALL[lay]), car, ENV), n = res.time.length, sl = SL[lay], tAt = f => res.time[Math.min(n - 1, Math.round(f * n))];
  let tStr = 0; for (let i = 0; i < n; i++) if (res.limit[i] === 2) tStr += (i + 1 < n ? res.time[i + 1] : res.lapTime) - res.time[i];
  return {lap: res.lapTime, tStr, s: [tAt(sl.f1), tAt(sl.f2) - tAt(sl.f1), res.lapTime - tAt(sl.f2)].map(x => x / res.lapTime * 100)}; };
const rows = [];
for (const f of FIT.rows) { if (!TRACKS.includes(f.layout)) continue; const d = DUEL.find(q => Math.abs(q.time - f.real) < 0.0015); if (!d) continue;
  const car = feCarFor(f.key, f.season, f.session, 'Q'), b = sim(f.layout, car), meas = [d.s1, d.s2, d.s3].map(x => x / d.time * 100), out = {layout: f.layout, season: f.season, key: f.key, meas, v: {}};
  for (const [k, fn] of Object.entries(VAR)) { const c0 = fn(car), q0 = sim(f.layout, c0);
    // grip scale that brings the lap back to the base lap (what the refit would absorb), bisection on μ_y
    let lo = 0.7, hi = 1.3, q = q0; for (let it = 0; it < 30 && k !== 'base'; it++) { const m = (lo + hi) / 2; q = sim(f.layout, {...c0, ...gripSet(car.muY * m)}); if (q.lap > b.lap) lo = m; else hi = m; }
    out.v[k] = {lapPct: +((q0.lap / b.lap - 1) * 100).toFixed(3), straightTimePct: +((q0.tStr / b.tStr - 1) * 100).toFixed(2), muScale: k === 'base' ? 1 : +((lo + hi) / 2).toFixed(4), shares: q.s, err: meas.map((m, s) => m - q.s[s])}; }
  rows.push(out); }
const rms = a => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length), summary = {};
for (const k of Object.keys(VAR)) { const all = rows.flatMap(x => x.v[k].err), by = {};
  for (const x of rows) (by[x.layout] ||= []).push(...x.v[k].err);
  summary[k] = {sectorErrRmsPp: +rms(all).toFixed(3), byTrack: Object.fromEntries(Object.entries(by).map(([l, a]) => [l, +rms(a).toFixed(3)])),
    lapPct: +(rows.reduce((s, x) => s + x.v[k].lapPct, 0) / rows.length).toFixed(2), straightTimePct: +(rows.reduce((s, x) => s + x.v[k].straightTimePct, 0) / rows.length).toFixed(2),
    muScale: +(rows.reduce((s, x) => s + x.v[k].muScale, 0) / rows.length).toFixed(4)}; }
const out = {note: 'report only; duel-matched sector shares (% of lap); μ rescaled per row to restore the base lap', n: rows.length, summary, rows};
if (OUTF) writeFileSync(OUTF, JSON.stringify(out, null, 1)); console.log(JSON.stringify({n: rows.length, summary}, null, 1));
