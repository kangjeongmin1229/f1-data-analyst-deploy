// Fits 2023–2026 car parameters to real qualifying laps on the built tracks, then projects
// 2027 and 2028. Reads worker/lapsim/tracks-data.js and .cache/lapsim/traces.json (from
// build-geometry.mjs); writes worker/lapsim/calibration-data.js and docs/lapsim-report.md.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {medianKappa} from './kappa-median.mjs';
import {existsSync} from 'node:fs';
import {gate} from './gate.mjs';
import {trapAt} from './wec-trap-pos.mjs';
import {sectorSpec, sectorsOk} from './wec-sector-lines.mjs';
import {join} from 'node:path';
import {lapsimTracks, lapsimExtraTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {poleTrend} from '../../worker/lapsim/pole-trend.js';
import {rechargeLimitMJ} from '../../worker/lapsim/energy-limits.js';
import {PRIOR, applyRules, applyDevelopment, RULE_CHANGES} from '../../worker/lapsim/cars.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {fitSeason, withGrip, holdout, fitJoint, holdoutJoint, addBanking, hessianAt} from './calibrate-lib.mjs';
import {fitJointBCD, holdoutBCD, backtestBCD, poleMult} from './joint-bcd.mjs';
import {SERIES} from '../../worker/lapsim/series.js';
import {lapsimF1Zones} from '../../worker/lapsim/f1-zones-data.js';
import {otWholeLap, PARTIAL} from '../../worker/lapsim/zones.js';
import {lapsimPuDocs} from '../../worker/lapsim/pu-docs-data.js';
import {capCurvature} from '../../worker/lapsim/geometry.js';
import {traceGaps} from '../../worker/lapsim/real-tel-gaps.js';
import {lapsimWecBop} from '../../worker/lapsim/wec-bop-data.js';
import {lapsimCarMeasured} from '../../worker/lapsim/car-measured-data.js';

const CACHE = process.env.LAPSIM_CACHE || '.cache/lapsim';
const ITERS = Number(process.env.LAPSIM_ITERS || 70), HOLDOUT_ITERS = Number(process.env.LAPSIM_HOLDOUT_ITERS || 25);
// WEC held-out rule v2 (central decision 2026-11-23, claude/decision-central-wec-holdout-rule-v2-2026-11-23.md; AGENTS.md Gate G):
// every WEC leave-one-track-out fold fit runs Nelder–Mead from three start steps (0.08, 0.05, 0.12), each until the relative simplex
// spread of the objective is < 1e-6 or 400 iterations, and keeps the start with the lowest objective. Noise check: the same held-out
// from the best of {0.08, 0.05} is stored next to it (holdout.noise); fold-car bound hits are stored.
// LAPSIM_WEC_HOLDOUT=legacy: the old 25-iteration fold fits; =v1: rule v1 (one start, second-start re-run at 0.05).
const WEC_RULE = process.env.LAPSIM_WEC_HOLDOUT || 'v2';
const WEC_STARTS = [0.08, 0.05, 0.12];
const WEC_HO = WEC_RULE === 'legacy' ? {iters: HOLDOUT_ITERS} : {iters: 400, nm: {relTol: 1e-6}, ...(WEC_RULE === 'v1' ? {} : {starts: WEC_STARTS})};
const WEC_START2 = 0.05;
// F1 second-start spread (information only, rule item 4): LAPSIM_F1_NOISE=on re-runs the F1 held-out with Nelder–Mead step 0.04
const F1_NOISE = process.env.LAPSIM_F1_NOISE === 'on';
// fold-car bound hits, grouped: [{key, bound, tracks}]
const boundHits = fits => { const m = new Map(); for (const f of fits || []) for (const b of f.bounds || []) { const k = b.key + ' ' + b.bound; (m.get(k) ?? m.set(k, {key: b.key, bound: b.bound, folds: []}).get(k)).folds.push(f.test.join('+')); } return [...m.values()]; };
// experiment knobs. Defaults = the published F1 fit (CI run 42398451242, 2026-11-07): joint BCD fit over all four seasons
// 2023–2026, 5 rounds x 200 steps, lap time x20, sectors x2, track drag, team pace, prior weight 8. G1 (2026-11-18): 3 rounds
// instead of 5 raised the held-out error on all 34 poles 1.014 -> 1.205 % (Gate G reject)
const WTIME = Number(process.env.LAPSIM_WTIME || 20);
const E = process.env;
const FITTER = E.LAPSIM_FITTER || 'bcd';
const BCD = {rounds: Number(E.LAPSIM_ROUNDS || 5), iters: Number(E.LAPSIM_BCD_ITERS || 200), wTime: WTIME, wSector: Number(E.LAPSIM_WSECTOR || 2),
  trackDrag: E.LAPSIM_TRACK_DRAG !== 'off', centre: E.LAPSIM_TRACK_CENTRE === 'on', teams: E.LAPSIM_TEAMS !== 'off', residual: E.LAPSIM_RESIDUAL === 'on', residualLambda: Number(E.LAPSIM_RESIDUAL_LAMBDA || 1), wPrior: Number(E.LAPSIM_WPRIOR || 8), log: m => console.log(m)};
const MAX_POS = Number(E.LAPSIM_MAX_POS || 3);
const HOLDOUT_YEARS = (E.LAPSIM_HOLDOUT_YEARS || '2025,2026').split(',').map(Number);
const fitAll = gs => FITTER === 'bcd' ? fitJointBCD(gs, BCD) : fitJoint(gs, {iters: ITERS, wTime: WTIME});
const holdoutOf = (gs, key, extra = {}) => FITTER === 'bcd' ? holdoutBCD(gs, key, {...BCD, rounds: Math.max(2, BCD.rounds - 1), ...extra}) : holdoutJoint(gs, key, {iters: HOLDOUT_ITERS, wTime: WTIME});
const HO_FOLDS = 4; // holdoutBCD default; the split run has one piece per (season, fold)
const GRIP_LIMITS = E.LAPSIM_GRIP_LO ? [Number(E.LAPSIM_GRIP_LO), Number(E.LAPSIM_GRIP_HI)] : FITTER === 'bcd' ? [0.7, 1.3] : [0.85, 1.15];
BCD.lo = GRIP_LIMITS[0]; BCD.hi = GRIP_LIMITS[1];
// LAPSIM_CDA_MEASURED=on (step 2a, claude/gate-cda-measured-prereg-2026-11-23.md; off by default): drag measured from TracingInsights
// qualifying telemetry (worker/lapsim/car-measured-data.js, scripts/sim/measure-car.mjs) replaces the free per-track drag factor: the
// factor of a measured track is fixed to its measured wing-level ratio, and the 2023-25 season CdA and DRS CdA are fixed to the measured
// values. Unmeasured tracks keep the free factor; 2026 keeps its fitted drag level.
const CDA_MEASURED = E.LAPSIM_CDA_MEASURED === 'on' ? lapsimCarMeasured : null;
if (CDA_MEASURED) BCD.fixedDrag = Object.fromEntries(Object.entries(CDA_MEASURED.dragRatio).map(([id, r]) => [id, r.ratio]));
// season progress 0 (1 March) … 1 (15 December), for in-season development
const tauOf = (date, year) => { if (!date) return 0.5; const a = Date.UTC(year, 2, 1), b = Date.UTC(year, 11, 15); return Math.max(0, Math.min(1.1, (Date.parse(date) - a) / (b - a))); };
const ONLY_YEARS = process.env.LAPSIM_SEASONS ? process.env.LAPSIM_SEASONS.split(',').map(Number) : null;
// LAPSIM_ONLY=wec: refit the WEC classes only; F1 seasons and projections are kept from the current calibration
const ONLY_WEC = E.LAPSIM_ONLY === 'wec';
// Split CI run (GitHub jobs stop at 6 h): LAPSIM_PART=f1-joint | f1-ho-<year> | wec-<class> computes that one piece (loading the
// pieces it needs from LAPSIM_PARTS_DIR), writes it and exits; LAPSIM_PART=merge loads every piece and writes the calibration.
// Unset = one process, as before. Same code and order either way, so the output is the same (tests/lapsim-split.test.mjs).
const PART = E.LAPSIM_PART || null, PARTS_DIR = E.LAPSIM_PARTS_DIR || '.cache/lapsim/parts';
const piece = async (key, compute, placeholder) => {
  if (!PART) return compute();
  const f = join(PARTS_DIR, key + '.json');
  if (existsSync(f)) return JSON.parse(await readFile(f, 'utf8'));
  if (PART === key) { const v = await compute(); await mkdir(PARTS_DIR, {recursive: true}); await writeFile(f, JSON.stringify(v)); console.log(`LapSim part ${key} written`); process.exit(0); }
  if (PART === 'merge' || placeholder === undefined) throw new Error(`LapSim part ${key} missing in ${PARTS_DIR}`);
  return placeholder; // a piece this part does not need
};
const prevCal = ONLY_WEC ? (await import('../../worker/lapsim/calibration-data.js')).lapsimCalibration : null;
const traces = ONLY_WEC ? [] : JSON.parse(await readFile(join(CACHE, 'traces.json'), 'utf8'));
// LAPSIM_TRACE_MASK=1: samples inside broken stretches (rule A+, speed only; AGENTS.md "broken telemetry is not measured data") are
// dropped, a lap more than half broken is dropped (claude/gate-trace-mask-prereg-2026-11-22.md). Off: byte-identical.
if (E.LAPSIM_TRACE_MASK === '1') { let cut = 0, gone = 0;
  for (let k = traces.length - 1; k >= 0; k--) { const t = traces[k], {gaps, share} = traceGaps(t); if (!gaps.length) continue;
    if (share > 0.5) { traces.splice(k, 1); gone++; continue; }
    const n = t.s.length, keep = t.s.map(s => !gaps.some(([a, b]) => s >= a && s < b)); cut += keep.filter(x => !x).length;
    for (const key of Object.keys(t)) if (Array.isArray(t[key]) && t[key].length === n) t[key] = t[key].filter((_, i) => keep[i]); }
  console.log(`trace mask: ${cut} samples dropped, ${gone} laps dropped`); }
// LAPSIM_KAPPA_CAP_G=6.5: the speed-implied curvature cap (geometry.js) on tracks whose stored data predates it (experiment inputs)
if (E.LAPSIM_KAPPA_CAP_G && !ONLY_WEC) for (const [id, d] of Object.entries(lapsimTracks)) { if (d.quality?.kappaCap || id === 'zandvoort') continue;
  const dry = traces.filter(x => x.track === id && !x.weather?.rain && x.position <= 3), own = dry.filter(x => x.year === d.year), laps = own.length ? own : dry;
  if (laps.length) d.kappa = capCurvature(d.kappa, d.ds, laps, Number(E.LAPSIM_KAPPA_CAP_G)).kappa; }
// LAPSIM_KAPPA_MED_M=35: the stored line curvature replaced by its rolling median over that many metres, every track (corner-speed
// attempt 3, claude/gate-kappa-median-prereg-2026-11-23.md: narrow spikes such as Suzuka 130R at 99 m against the named 130 m);
// LAPSIM_KAPPA_MED_WRITE=on writes the filtered tracks so the page and tool use the line the cars were fitted on. Off: byte-identical.
if (Number(E.LAPSIM_KAPPA_MED_M) > 0 && !ONLY_WEC) {
  for (const d of Object.values(lapsimTracks)) if (d.kappa?.length) d.kappa = medianKappa(d.kappa, d.ds, Number(E.LAPSIM_KAPPA_MED_M));
  if (E.LAPSIM_KAPPA_MED_WRITE === 'on') await writeFile('worker/lapsim/tracks-data.js', (await readFile('worker/lapsim/tracks-data.js', 'utf8')).replace(/export const lapsimTracks=[\s\S]*?;\n/, () => `export const lapsimTracks=${JSON.stringify(lapsimTracks)};\n`)); }
const tracks = Object.fromEntries(Object.entries(lapsimTracks).map(([id, d]) => [id, trackFromData(d)]));
// F1 cars open DRS (to 2025) or Straight Mode (2026) only in the FIA zones of the event notes (f1-zones-data.js); without a
// document the automatic straight finder stands in. LAPSIM_FIA_ZONES=on (2026-11-15: the finder gave Jeddah 880 m of DRS, the FIA 2025 m)
// LAPSIM_PU_QUALI=on (owner 2026-11-16): a 2026 qualifying lap from round 4 on runs on the Base – Overtake ERS-K curve (FIA Power Unit
// Information: "Any Practice Session incl. Qualifying Sessions: Base – Overtake"); rounds 1–3 on Base – Standard (worker/lapsim/zones.js)
// the real 2026 qualifying's race-control state (f1-zones-data.js real, from OpenF1 race control): Low Grip Conditions = Alt zones with
// partial activation (B7.1.2 b, zones.js PARTIAL), Overtake disabled = no Overtake curve (Interlagos 2026: both)
const real26 = (id, year) => year === 2026 ? lapsimF1Zones.tracks?.[id]?.['2026']?.real || null : null;
const PUQ = E.LAPSIM_PU_QUALI === 'on', puRule = (id, year) => PUQ && otWholeLap(id, year) && real26(id, year)?.ot !== 'off';
// the team's use of the higher curve is chosen once per track with the starting car (whole lap, one SM zone or none: the greedy deployment
// of extra power can cost energy later), stored as otChoice so the page and the tool rebuild the same lap
const OTC = {}, f1TrackZ = (id, year) => { const t = f1TrackZones(id, year); if (!t || !puRule(id, year)) return t; const k = OTC[id] ?? 'none'; if (k === 'none') return t; if (k === 'all') return {...t, otOn: true};
  const q = lapsimF1Zones.tracks?.[id]?.['2026']?.zones?.[k]; if (!q) return t; const d = tracks[id], n = d.kappa.length, L = n * d.ds, o = new Uint8Array(n), i0 = Math.round(q.from / d.ds), len = Math.round((((q.to - q.from) % L) + L) % L / d.ds); for (let j = 0; j <= len; j++) o[(i0 + j) % n] = 1; return {...t, otOn: o}; };
const chooseOt = (id, car, env) => { const zs = lapsimF1Zones.tracks?.[id]?.['2026']?.zones || []; let best = Infinity, bk = 'none'; for (const k of ['none', 'all', ...zs.map((_, i) => i)]) { OTC[id] = k; const r = simulateLap(f1TrackZ(id, 2026), car, env).lapTime; if (r < best) { best = r; bk = k; } } OTC[id] = bk; return bk; };
const ZT = new Map(), f1TrackZones = (id, year) => {
  if (!['on', '2025'].includes(E.LAPSIM_FIA_ZONES) || !tracks[id] || (E.LAPSIM_FIA_ZONES === '2025' && year >= 2026)) return tracks[id]; // 2025: DRS zones only
  const z = lapsimF1Zones.tracks?.[id]?.[year >= 2026 ? '2026' : '2025'], lg = real26(id, year)?.grip === 'low', key = id + ':' + (year >= 2026 ? 2026 : 2025) + (lg ? ':low' : '');
  if (!z?.zones?.length) return tracks[id];
  const L = tracks[id].kappa.length * tracks[id].ds, zs = lg ? z.zones.filter(q => q.low !== null).map(q => [q.low != null ? q.low : (q.from + 50) % L, q.to]) : z.zones.map(q => [q.from, q.to]);
  if (!ZT.has(key)) { const a = zs.length ? trackFromData({...lapsimTracks[id], aeroZones: zs}, {aero: 'fia'}).aeroLow : new Uint8Array(tracks[id].kappa.length);
    ZT.set(key, {...tracks[id], aeroLow: lg ? Float32Array.from(a, x => x * PARTIAL) : a}); }
  return ZT.get(key);
};
// S3 candidate: axle-level car (load transfer, aero balance vs weight split, degressive tyre load law).
// Track widths (m) are typical values for each class; roll-stiffness split 50/50.
const AXLE = tw => E.LAPSIM_AXLE === 'on' ? {axle: true, loadExp: Number(E.LAPSIM_LOADEXP || 0.85), trackWidth: tw, rollFront: Number(E.LAPSIM_ROLLFRONT || 0.5)} : {};
// S2 candidate: banking of corners with a published angle (scripts/sim/data/banking.json)
if (E.LAPSIM_BANK === 'on') { const bd = JSON.parse(await readFile('scripts/sim/data/banking.json', 'utf8')); for (const [id, tr] of Object.entries(tracks)) addBanking(id, tr, bd); }
// S2 candidate: vertical curvature from the measured grade (crests unload, dips load the tyres)
if (E.LAPSIM_KV === 'on') for (const tr of Object.values(tracks)) if (tr.grade) {
  const g = tr.grade, n = g.length; tr.kv = Float64Array.from(g, (_, i) => (g[(i + 1) % n] - g[(i - 1 + n) % n]) / (2 * tr.ds));
}
const PARAMS = ['muY', 'clA', 'cdA', 'cdALow', 'pIce'];
// physical bounds, so geometry error cannot be absorbed by impossible cars. ClA up to 8 m²:
// modern F1 cars make about 3.5x their weight in downforce near 300 km/h (ClA ≈ 6.5–7). The fitted
// values are effective ones: they also absorb what the quasi-steady-state model leaves out.
const BOUNDS = {muY: [1.5, 2.4], clA: [2.5, 8], cdA: [0.7, 1.9], cdALow: [0.45, 1.6], pIce: [0.85, 1.15]};

const seasons = {};
if (ONLY_WEC) Object.assign(seasons, prevCal.seasons);
const report = ['# Lap simulator calibration', '', `Generated ${new Date().toISOString().slice(0, 10)}. Real qualifying laps from OpenF1 on tracks built from OpenF1 car positions.`, ''];
// F1: all seasons fitted together (common rule): one car per season, one grip factor per track
// shared by every season (same asphalt and line), so a car can be predicted on a track it has not
// raced yet with the factor learned from another season.
// 2026+ qualifying laps: the per-event ERS recharge limit is part of the conditions
const withEnergy = (w, id, year) => { const mj = year >= 2026 && process.env.LAPSIM_ENERGY_LIMITS !== 'off' ? rechargeLimitMJ(id, year) : null; const o = mj ? {...w, rechargeMJ: mj} : w; return year >= 2026 && E.LAPSIM_PU_RAMP === 'on' ? {...o, puRamp: rampOf(id)} : o; };
// LAPSIM_PU_RAMP=on (owner 2026-11-16): C5.12 power-reduction shape (kernel forward(), C5.12 ramp) with each event's PU document, else 100 kW/s
const PUR = E.LAPSIM_PU_RAMP === 'on';
const rampOf = id => { const p = lapsimPuDocs?.events?.[id], d = tracks[id], k = p?.centrelineKm && d ? d.kappa.length * d.ds / (p.centrelineKm * 1000) : 1, sc = z => ({...z, from: z.from * k, to: z.to * k}); return {rateKWs: p?.rampKWs || 100, bigCut: (p?.bigCut || []).map(sc), speed: (p?.speed || []).map(sc)}; };
const groups = [];
for (const year of [...new Set(traces.map(t => t.year))].sort()) {
  const prior = PRIOR[year]; if (!prior || (ONLY_YEARS && !ONLY_YEARS.includes(year))) continue;
  if (PUQ && year >= 2026) for (const t of traces.filter(t => t.year === year && tracks[t.track] && !t.weather.rain && t.position === 1)) if (puRule(t.track, year) && OTC[t.track] == null) chooseOt(t.track, prior, conditionsFromWeather(withEnergy(t.weather, t.track, year)));
  const laps = traces.filter(t => t.year === year && tracks[t.track] && !t.weather.rain && t.s.length > 100 && t.position <= MAX_POS)
    .map(t => ({name: t.track, track: f1TrackZ(t.track, year), lapSeconds: t.lap_seconds, weight: t.position === 1 ? 1 : 0.5,
      // non-pole laps: other cars, so by default they count for the speed trace shape only
      timeScale: t.position === 1 || E.LAPSIM_NONPOLE === 'time' || BCD.teams ? 1 : 0, sectors: t.sectors, date: t.date, team: t.team, tau: tauOf(t.date, year),
      feat: {ftf: t.throttle?.length ? t.throttle.filter(x => x >= 98).length / t.throttle.length : null, vmean: tracks[t.track].kappa.length * tracks[t.track].ds / t.lap_seconds},
      obs: {s: t.s, v: t.v.map(x => x / 3.6)}, weather: withEnergy(t.weather, t.track, year), meta: {sessionKey: t.session_key, driver: t.driver_number, position: t.position}}));
  if (laps.length < 4) { report.push(`${year}: not enough laps (${laps.length})`); continue; }
  const base = {...structuredClone(prior), linkMu: true, ...AXLE(1.55)};
  if (process.env.LAPSIM_THROTTLE_HARVEST === 'off' && base.ers) base.ers.throttleHarvest = false;
  // LAPSIM_ERS_LAW=b (step 10b, claude/gate-ers-law-prereg-2026-11-23.md §9; off by default): ERS law (b) on the F1 cars (kernel
  // car.ers.law = 'b': brake-force regen, 2014–25 deploy at every full-throttle point, 2026 strategy B) and the 2023–25 pIce prior
  // 540 kW (P_wheel 628 ± 21 kW measured, §8; the relative bounds move with it)
  if (E.LAPSIM_ERS_LAW === 'b' && base.ers) { base.ers = {...base.ers, law: 'b'}; if (year <= 2025) base.pIce = 540e3; }
  // LAPSIM_PICE_FIXED=<kW> (wave 3 (a), claude/gate-wave3-fit-restructure-prereg-2026-11-24.md; off by default): 2023–25 pIce fixed to
  // the measured value and not fitted (the laps do not identify power: claude/status-2026-11-24-pice-profile.md)
  const piceFixed = E.LAPSIM_PICE_FIXED && year <= 2025;
  if (piceFixed) base.pIce = Number(E.LAPSIM_PICE_FIXED) * 1e3;
  const cdM = CDA_MEASURED?.seasons?.[year]?.cdA?.value;
  if (cdM) { base.cdA = cdM; base.cdALow = cdM * CDA_MEASURED.seasons[year].drsRatio.value; }
  const params = PARAMS.filter(k => !(cdM && (k === 'cdA' || k === 'cdALow')) && !(piceFixed && k === 'pIce')).map(k => {
    const [lo, hi] = BOUNDS[k], rel = k === 'pIce';
    return {key: k, path: k, base: base[k], step: 0.08, min: rel ? lo * base[k] : lo, max: rel ? hi * base[k] : hi};
  });
  groups.push({key: year, laps, base, params});
}
if (!ONLY_WEC) {
const J = await piece('f1-joint', async () => {
  const r0 = report.length, t0 = Date.now();
  let joint = await fitAll(groups), drop = [];
  // clean data (common rule): a lap more than 4% off after the fit is not a normal dry lap
  // (wet track, red flag, wrong lap); drop that season's laps on that track and fit again
  const bad = joint.perLap.filter(p => Math.abs(p.dt / p.realLap) > 0.04);
  if (bad.length) {
    drop = bad.map(p => [p.group, p.name]);
    for (const g of groups) { const d = new Set(bad.filter(p => p.group === g.key).map(p => p.name)); g.laps = g.laps.filter(l => !d.has(l.name)); }
    report.push(`Dropped (lap more than 4% off after the first fit): ${[...new Set(bad.map(p => p.group + ' ' + p.name))].join(', ')}`, '');
    joint = await fitAll(groups);
  }
  report.push(`F1 joint fit of ${groups.map(g => g.key).join(' and ')}: ${((Date.now() - t0) / 1000).toFixed(0)} s, score ${joint.score.toFixed(3)}.`, '');
  return {joint, drop, report: report.splice(r0)};
});
const joint = J.joint;
for (const g of groups) { const d = new Set(J.drop.filter(([k]) => k === g.key).map(([, n]) => n)); if (d.size) g.laps = g.laps.filter(l => !d.has(l.name)); }
report.push(...J.report);
for (const g of groups) {
  const year = g.key, car = joint.cars[year]; delete car.linkMu;
  const perTrack = {};
  for (const p of joint.perLap.filter(x => x.group === year)) {
    if (p.meta?.position !== 1 && perTrack[p.name]) continue;
    const trace = traces.find(t => t.year === year && t.track === p.name && t.session_key === p.meta?.sessionKey && t.position === p.meta?.position);
    perTrack[p.name] = {grip: +p.grip.toFixed(4), drag: p.drag != null && p.drag !== 1 ? +p.drag.toFixed(4) : undefined, rmsKph: +p.rmsKph.toFixed(1), errorSec: +p.dt.toFixed(3), simLap: +p.simLap.toFixed(3), realLap: p.realLap,
      sessionKey: p.meta?.sessionKey, driver: p.meta?.driver, position: p.meta?.position ?? 1, weather: trace?.weather || null,
      realSectors: trace?.sectors?.length === 3 && trace.sectors.every(Number.isFinite) ? trace.sectors.map(x => +x.toFixed(3)) : undefined};
  }
  // holdout: this season's laps on a quarter of the tracks left out, predicted with the factor the
  // other season gives that track
  const none = {h: {n: 0, errors: [], rmsPct: null}, hF1b: null};
  // split run: one piece per fold (f1-ho-<year>-<fold>); the errors joined in fold order are the one-process result
  const heldOut = async () => {
    if (!PART || FITTER !== 'bcd') return holdoutOf(groups, year);
    const fs = [];
    for (let f = 0; f < HO_FOLDS; f++) fs.push(await piece(`f1-ho-${year}-${f}`, () => holdoutOf(groups, year, {fold: f}), null));
    if (fs.some(x => !x)) return null;
    const errors = fs.flatMap(x => x.errors);
    return {errors, rmsPct: errors.length ? Math.sqrt(errors.reduce((a, e) => a + e.pct ** 2, 0) / errors.length) : null, n: errors.length};
  };
  const h = HOLDOUT_YEARS.includes(year) ? await heldOut() ?? none.h : none.h;
  const hF1b = F1_NOISE && h.n && FITTER === 'bcd' ? await piece('f1-noise-' + year, () => holdoutBCD(groups, year, {...BCD, rounds: Math.max(2, BCD.rounds - 1), nmStep: 0.04}), null) : null;
  if (hF1b) report.push(`F1 ${year}: held-out second start (step 0.04) ${hF1b.rmsPct.toFixed(3)} % vs ${h.rmsPct.toFixed(3)} % (spread ${Math.abs(hF1b.rmsPct - h.rmsPct).toFixed(3)} pp, information only)`);
  const adj = joint.adj?.[year];
  if (adj) report.push(`### ${year} team pace and development`, '', `Development over the season: ${(adj.dev * 100).toFixed(2)}% lap time from March to December.`, '',
    ...Object.entries(adj.teams).sort((a, b) => a[1] - b[1]).map(([t, v]) => `- ${t}: ${v > 0 ? '+' : ''}${(v * 100).toFixed(2)}%`), '');
  seasons[year] = {car, tracks: perTrack, laps: g.laps.length, adj: adj || undefined,
    holdout: {rmsPct: h.rmsPct != null ? +h.rmsPct.toFixed(2) : null, n: h.n, tracks: h.errors.map(e => ({track: e.name, errorSec: +e.dt.toFixed(3)})),
      ...(hF1b ? {noise: {step: 0.04, rmsPct: +hF1b.rmsPct.toFixed(3), spreadPp: +Math.abs(hF1b.rmsPct - h.rmsPct).toFixed(3), tracks: hF1b.errors.map(e => ({track: e.name, errorSec: +e.dt.toFixed(3)}))}} : {})}};
  report.push(`## ${year}`, '', `${g.laps.length} laps. Holdout: ${h.n ? `predicted ${h.n} unseen pole laps, typical error ${h.rmsPct.toFixed(2)}% (RMS)` : 'no track had a factor from another season'}.`, '',
    `Car: grip μy ${car.muY.toFixed(3)}, downforce ClA ${car.clA.toFixed(2)} m², drag CdA ${car.cdA.toFixed(3)} m², low-drag CdA ${car.cdALow.toFixed(3)} m², ICE ${(car.pIce / 1e3).toFixed(0)} kW.`, '',
    '| Track | Real | Sim | Error | Corner/straight speed error | Track grip (shared) |', '|---|---|---|---|---|---|',
    ...Object.entries(perTrack).map(([id, r]) => `| ${id} | ${r.realLap.toFixed(3)} | ${r.simLap.toFixed(3)} | ${r.errorSec > 0 ? '+' : ''}${r.errorSec.toFixed(3)} | ${r.rmsKph} km/h | ${r.grip}${r.drag ? ` / drag ${r.drag}` : ''}${r.grip <= GRIP_LIMITS[0] + 0.001 || r.grip >= GRIP_LIMITS[1] - 0.001 ? ' (at limit: check this track)' : ''} |`), '');
}

// Predictions for 2026 tracks not raced yet (e.g. Las Vegas, Qatar, Abu Dhabi): the 2026 car on
// the track factors learned from earlier seasons, weather of the latest real qualifying there, and
// the 2026 recharge limit of that event. Error range: the 2026 holdout error.
if (seasons[2026]) {
  const car26 = joint.cars[2026], preds = {};
  for (const id of Object.keys(joint.grips)) {
    if (seasons[2026].tracks[id] || !tracks[id]) continue;
    if (id === 'sakhir') continue; // the 2026 Bahrain GP ran at Sepang (kuala-lumpur, raced); Sakhir 11257 was cancelled (AGENTS.md)
    const last = [...traces].filter(t => t.track === id && t.position === 1 && !t.weather.rain).sort((a, b) => b.year - a.year)[0];
    if (!last) continue;
    const drag = joint.factors?.[id]?.drag ?? 1, c = drag !== 1 ? {...car26, cdA: car26.cdA * drag, cdALow: car26.cdALow * drag} : car26;
    const w = withEnergy(last.weather, id, 2026), res = simulateLap(withGrip(f1TrackZ(id, 2026), joint.grips[id]), c, conditionsFromWeather(w));
    const date26 = last.date ? '2026' + last.date.slice(4) : null, mult = poleMult(joint.adj?.[2026], tauOf(date26, 2026));
    res.lapTime *= mult; if (res.sectors) res.sectors = res.sectors.map(x => x * mult);
    preds[id] = {lap: +res.lapTime.toFixed(3), date: date26?.slice(0, 10) ?? null, poleMult: mult !== 1 ? +mult.toFixed(5) : undefined, sectors: res.sectors?.map(x => +x.toFixed(3)), grip: +joint.grips[id].toFixed(4), drag: drag !== 1 ? +drag.toFixed(4) : undefined,
      weatherFrom: last.year, rechargeMJ: w.rechargeMJ ?? null, lastPole: {year: last.year, lap: last.lap_seconds}};
  }
  seasons[2026].predictions = preds;
  const h = seasons[2026].holdout?.rmsPct;
  report.push('## 2026 predictions (tracks not raced yet in 2026)', '', '| Track | Predicted pole | ± (holdout) | Last real pole | Weather from | Recharge limit |', '|---|---|---|---|---|---|',
    ...Object.entries(preds).map(([id, p]) => `| ${id} | ${p.lap.toFixed(3)} | ${h != null ? '±' + (p.lap * h / 100).toFixed(2) + ' s' : '–'} | ${p.lastPole.lap.toFixed(3)} (${p.lastPole.year}) | ${p.weatherFrom} | ${p.rechargeMJ ?? '–'} MJ |`), '');
}

// Forecast test (strictest): each 2026 qualifying predicted from data dated before it only
if (FITTER === 'bcd' && E.LAPSIM_BACKTEST === 'on' && groups.some(g => g.key === 2026)) {
  const b = await backtestBCD(groups, 2026, {...BCD, rounds: 2, iters: Math.round(BCD.iters * 0.6)});
  seasons[2026].backtest = {rmsPct: b.rmsPct != null ? +b.rmsPct.toFixed(2) : null, n: b.n, tracks: b.errors.map(e => ({track: e.name, date: e.date, errorSec: +e.dt.toFixed(3)}))};
  report.push('## 2026 forecast test', '', `Each 2026 pole lap predicted from earlier data only: ${b.rmsPct?.toFixed(2) ?? '–'}% RMS over ${b.n} laps.`, '',
    '| Date | Track | Error (s) |', '|---|---|---|', ...b.errors.map(e => `| ${e.date} | ${e.name} | ${e.dt > 0 ? '+' : ''}${e.dt.toFixed(3)} |`), '');
}

}
// Projections from the latest calibrated season (2026)
const projections = {};
const s26 = seasons[2026];
if (s26 && !ONLY_WEC) {
  const ids = Object.keys(s26.tracks);
  const lapAt = (car, id) => {
    const r = s26.tracks[id];
    return simulateLap(withGrip(f1TrackZ(id, 2026), r.grip), car, conditionsFromWeather(r.weather || {})).lapTime;
  };
  const meanChange = (a, b) => ids.reduce((acc, id) => acc + (lapAt(b, id) / lapAt(a, id) - 1), 0) / ids.length * 100;
  // find the development factor that gives the target lap-time change (%)
  const solveDev = (car, target) => {
    let lo = 0, hi = 0.4;
    for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (meanChange(car, applyDevelopment(car, mid)) > target) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  // note: applyDevelopment(applyDevelopment(c, a), b) ≈ applyDevelopment(c, a + b) for small a, b
  const step = k => poleTrend.steps[k] || {meanOfMedians: -1, min: -1.5, max: -0.5};
  let dPrev = 0, rulesPrev = s26.car;
  for (const [year, k] of [[2027, '1'], [2028, '2']]) {
    const rules = applyRules(s26.car, year);
    const target = step(k).meanOfMedians;
    // rule effect with development held fixed, then this year's development on top
    const rulesEffect = meanChange(applyDevelopment(rulesPrev, dPrev), applyDevelopment(rules, dPrev));
    const d = dPrev + solveDev(applyDevelopment(rules, dPrev), target);
    const car = applyDevelopment(rules, d);
    car.label = String(year);
    projections[year] = {car, development: +d.toFixed(4), developmentTargetPct: target, bandPct: [step(k).max, step(k).min],
      rulesEffectPct: +rulesEffect.toFixed(2), rules: RULE_CHANGES[year].note};
    dPrev = d; rulesPrev = rules;
  }
  report.push('## Projections', '', ...Object.entries(projections).map(([y, p]) => `- ${y}: rules ${p.rulesEffectPct}% lap time, development ${p.developmentTargetPct}% (historical range ${p.bandPct.join(' to ')}%).`), '');
}

// WEC classes, same rules: BoP values fixed; drag, downforce and tyre grip fitted to the best
// qualifying/Hyperpole laps (lap time + speed trap). Track factors are shared from the F1 fit.
const series = {};
// LAPSIM_WEC_SEL=lmgt3:2025,... keeps only those class-seasons (small checks, e.g. the split-run equality check)
const TRAP_POS = E.LAPSIM_WEC_TRAP_POS !== 'off';
// step 34 flags (all off by default; Project claude/prereg-step34-wec-imsa-2026-11-25.md): LAPSIM_WEC_SECTORS=on (sector term in the
// objective) | report (held-out sector residuals stored, not fitted); LAPSIM_WEC_BOP_PHYS=on (event BoP as physics, no gate);
// LAPSIM_WEC_AERO_LD=on (Hypercar ClA = L/D × CdA, L/D in [3.8, 4.4])
// A1 §4 kerbs (input in every step 34 arm): LAPSIM_WEC_KERBS=on → WEC fit tracks use the step 31 corridor at f = 1 (iRacing closed-wheel
// kerbs, 1.3 m default), scripts/sim/data/step34/wec-corridor.json: κ × scale within ±60 m of each apex, back to 1 at ±120 m
const WEC_COR = E.LAPSIM_WEC_KERBS === 'on' ? JSON.parse(await readFile('scripts/sim/data/step34/wec-corridor.json', 'utf8')) : null, WEC_TRK = new Map();
// screen 2b S12 (report only, central 11:15): LAPSIM_WEC_LINE=iracing → WEC fit uses the iRacing driving-line curvature where a line
// exists (Spa, Austin from 3 GT3 cars; Monza from 1 GT4 car), scripts/sim/data/screens/wec-iracing-line.json, labelled model (iRacing).
// Same length and grid as the track; elevation, width and the rest unchanged. Unset = before.
// LAPSIM_WEC_LINE=ratio (Stage 2c, central 05:50 27 Nov): every WEC track, κ_WEC = κ_F1line × r(|κ|), r from the iRacing GT3 laps
// (Spa, Austin, Monza), leave-one-track-out for those three; file scripts/sim/data/screens/wec-line-ratio.json, "model (iRacing GT3 line ratio)".
const WEC_LINE_FILE = {iracing: 'wec-iracing-line.json', ratio: 'wec-line-ratio.json'}[E.LAPSIM_WEC_LINE];
const WEC_LINE = WEC_LINE_FILE ? JSON.parse(await readFile('scripts/sim/data/screens/' + WEC_LINE_FILE, 'utf8')).tracks : null;
const wecLine = (id, t) => { const l = WEC_LINE?.[id]; if (!l || !t) return t; if (l.n !== t.kappa.length) throw new Error(`iRacing line ${id}: n ${l.n} ≠ ${t.kappa.length}`);
  return {...t, kappa: Float64Array.from(l.kappa)}; };
const wecTrack0 = id => { const c = WEC_COR?.tracks[id]; if (!c || !tracks[id]) return tracks[id]; if (WEC_TRK.has(id)) return WEC_TRK.get(id);
  const t = tracks[id], n = t.kappa.length, ds = t.ds, m = new Float64Array(n).fill(1);
  for (const r of c.corners) { const s = Math.min(...r.scale); // f = 1, non-increasing in f (step 31 rule)
    for (let k = 0; k < n; k++) { const d = Math.min(Math.abs(k - r.ia), n - Math.abs(k - r.ia)) * ds, mk = d <= WEC_COR.core_m ? s : d <= WEC_COR.taper_m ? s + (1 - s) * (d - WEC_COR.core_m) / (WEC_COR.taper_m - WEC_COR.core_m) : 1; if (mk < m[k]) m[k] = mk; } }
  const v = {...t, kappa: Float64Array.from(t.kappa, (x, i) => x * m[i])}; WEC_TRK.set(id, v); return v; };
const WEC_LT = new Map(), wecTrack = id => { if (!WEC_LINE) return wecTrack0(id); if (!WEC_LT.has(id)) WEC_LT.set(id, wecLine(id, wecTrack0(id))); return WEC_LT.get(id); };
// A4: IMSA qualifying events in the WEC class fit (LAPSIM_WEC_IMSA=on, base and both variants): top 3 per class from the committed
// endurance-cars rows, own weather, extra-track geometry, free track grip (pooled), held-out IMSA track at grip 1 (u_t = 0)
const WEC_IMSA = E.LAPSIM_WEC_IMSA === 'on', IMSA_ID = {'daytona-international-speedway': 'daytona', 'detroit-street-course': 'detroit', 'indianapolis-motor-speedway-rc': 'indianapolis',
  'long-beach-street-circuit': 'long-beach', 'road-america': 'road-america', 'road-atlanta': 'road-atlanta', 'sebring-international-raceway': 'sebring', 'watkins-glen-international': 'watkins-glen',
  'weathertech-raceway-laguna-seca': 'laguna-seca', 'canadian-tire-motorsport-park': 'mosport', 'virginia-international-raceway': 'vir', 'lime-rock-park': 'lime-rock'};
const IMSA_ROWS = WEC_IMSA ? await (async () => { const {gunzipSync} = await import('node:zlib'), {readFileSync} = await import('node:fs');
  const [h, ...L] = gunzipSync(readFileSync('scripts/sim/data/learn/endurance-cars.csv.gz')).toString().trim().split('\n'), k = h.split(',');
  return L.map(l => Object.fromEntries(l.split(',').map((v, i) => [k[i], v]))).filter(r => r.series === 'imsa' && r.type === 'Q' && +r.best > 0 && !(+r.rainShare > 0) && IMSA_ID[r.event] && lapsimExtraTracks[IMSA_ID[r.event]]); })() : [];
const IMSA_TRK = new Map(), imsaTrack = id => IMSA_TRK.get(id) || IMSA_TRK.set(id, trackFromData(lapsimExtraTracks[id])).get(id);
const imsaClass = r => r.cls === 'GTP' ? (SERIES.wec.classes.lmh.manufacturers.test(r.manufacturer || r.vehicle || '') ? 'lmh' : 'lmdh') : /^(GTD|GTDPRO)$/.test(r.cls) ? 'lmgt3' : null;
const imsaLaps = (cls, year, medTrap) => Object.values(Object.groupBy(IMSA_ROWS.filter(r => +r.season === +year && imsaClass(r) === cls), r => r.event)).flatMap(ev => [...ev].sort((a, b) => a.best - b.best).slice(0, 3).map((r, i) => ({
  name: 'imsa:' + IMSA_ID[r.event], imsa: true, track: imsaTrack(IMSA_ID[r.event]), lapSeconds: +r.best, trapKph: +r.trapKph >= 0.92 * medTrap ? +r.trapKph : null, weight: i === 0 ? 1 : 0.5, grip: null,
  weather: {airTempC: +r.airC, trackTempC: +r.trackC, humidityPct: +r.hum, pressureHpa: +r.hpa}, meta: {event: 'IMSA ' + r.event, car: r.entry, manufacturer: r.manufacturer, session: r.session}})));
const GF = l => l.grip ?? (l.imsa ? 1 : null);
const SECTORS = ['on', 'report'].includes(E.LAPSIM_WEC_SECTORS) ? E.LAPSIM_WEC_SECTORS : null, BOP_PHYS = E.LAPSIM_WEC_BOP_PHYS === 'on', AERO_LD = E.LAPSIM_WEC_AERO_LD === 'on', CDA_PRIOR = E.LAPSIM_WEC_CDA_PRIOR === 'on', DECOUPLED = E.LAPSIM_WEC_DECOUPLED === 'on'; // A1: Hypercar CdA prior 1.04 m² ± 10 %
const WEC_SEL = E.LAPSIM_WEC_SEL ? new Set(E.LAPSIM_WEC_SEL.split(',')) : null;
// step 34b joint (research; pre-reg docs/prereg/step34b-joint-2026-11-25.md, sha256 d72979cd…): LAPSIM_WEC_JOINT=on (V) | S (sensitivity
// arm, Hypercar P = BoP kW read as before the driveline). μy, ClA, CdA (LMGT3 also P) fitted to traps (residual / 2 km/h) and sector lines
// (w_k · (r_k / σ_rep,k)²) together, lap weight 0; Hypercar power fixed at the event BoP kW as wheel power (assumption) and mass = BoP kg
// + 80 kg driver (assumption; TR Art. 4.1: BoP weight without fuel and driver); priors (x0, sd) as pre-reg §3; per-fold values and
// Hessian stored. Unset = before.
const JOINT = ['on', 'S', 'X3'].includes(E.LAPSIM_WEC_JOINT) ? E.LAPSIM_WEC_JOINT : null;
// X3 (report only, central 22:20): as V, but the lap term back at the base weight (wTime 2), ClA prior sd 50 %, ClA bounds [2, 12]
// (LMGT3 [0.6, 12]), μy bounds [1.0, 2.6]
const X3 = JOINT === 'X3';
const SIG_REP = {lmh: [0.085, 0.1319], lmdh: [0.1231, 0.1171], lmgt3: [0.1084, 0.1975]}; // σ_rep S1, S2 (s), run 45562051769
const WEC_HOJ = JOINT ? {...WEC_HO, wTime: X3 ? 2 : 0, wTrap: (3.6 / 2) ** 2, joint: true} : WEC_HO;
const wec = process.env.LAPSIM_SKIP_WEC ? [] : JSON.parse(await readFile(join(CACHE, 'wec.json'), 'utf8').catch(() => '[]')).filter(w => !WEC_SEL || WEC_SEL.has(`${w.cls}:${w.year}`));
const t71Extra = existsSync('scripts/sim/data/t71-wec-extra.json') ? JSON.parse(await readFile('scripts/sim/data/t71-wec-extra.json', 'utf8')).rows : [];
const wecYears = new Set(wec.map(w => +w.year));
// Track factors for WEC: by default the F1 fit's own grip. worker/lapsim/transfer-grip-data.js (if present) holds
// factors from an F1 fit WITHOUT per-track drag, which transfer better to other cars (gate 2026-11-09, docs/lapsim-handoff-physics.md §5).
// LAPSIM_WEC_GRIP=f1 forces the F1 fit's own grip.
const TRANSFER = E.LAPSIM_WEC_GRIP === 'f1' ? null : await import('../../worker/lapsim/transfer-grip-data.js').then(m => m.lapsimTransferGrip).catch(() => null);
// WEC uses its own frozen track grip (owner 2026-11-21: F1 model changes must not move WEC); LAPSIM_WEC_FROZEN_GRIP=off = the old shared F1 grip
const WEC_FROZEN = process.env.LAPSIM_WEC_FROZEN_GRIP === 'off' ? null : (await import('../../worker/lapsim/wec-track-grip-data.js')).lapsimWecTrackGrip.grip;
const f1GripOwn = id => WEC_FROZEN?.[id] ?? Object.keys(seasons).sort().reverse().map(y => seasons[y]?.tracks?.[id]?.grip).find(g => g != null) ?? null;
const transferGrip = id => TRANSFER?.grip[id] ?? null;
for (const [cls, def] of Object.entries(SERIES.wec.classes)) {
  const W = await piece('wec-' + cls, async () => {
  const r0 = report.length;
  for (const year of [...new Set(wec.map(w => w.year))].sort()) {
    const sessions = wec.filter(w => w.cls === cls && w.year === year && tracks[w.track] && !w.weather?.rain && f1GripOwn(w.track) != null);
    let f1Grip = f1GripOwn;
    // data check: a class speed trap far below the same class at the same track in other years hints at a wet or
    // unusual session that the timing does not mark (add it to scripts/sim/data/wet-sessions.json after checking)
    for (const w of sessions) {
      const other = wec.filter(x => x.cls === cls && x.track === w.track && x.year !== w.year && !x.weather?.rain).map(x => x.laps[0]?.topSpeedKph).filter(Number.isFinite).sort((a, b) => a - b);
      const v = w.laps[0]?.topSpeedKph, med = other[other.length >> 1];
      if (Number.isFinite(v) && med && v < 0.9 * med) report.push(`WARNING WEC ${cls} ${year} ${w.track}: best-lap speed trap ${v} km/h vs ${med} km/h in other years — check for a wet or unusual session`);
    }
    // speed traps sit at different places on each track: use one only when it looks like a top speed
    const traps = sessions.flatMap(w => w.laps.map(l => l.topSpeedKph)).filter(Number.isFinite).sort((a, b) => a - b);
    const medTrap = traps[Math.floor(traps.length / 2)];
    // step 34 data fix: where the trap position is known (Al Kamel maps), the trap is compared with the simulated speed there and
    // kept whatever its value; elsewhere the old lap-maximum rule. LAPSIM_WEC_TRAP_POS=off = before the fix.
    const tPos = id => TRAP_POS ? trapAt(id, year) : null;
    let lapsWith = gf => sessions.flatMap(w => w.laps.map((l, i) => ({name: w.track, track: wecTrack(w.track), lapSeconds: l.lap, ...(tPos(w.track) ? {trapAtM: tPos(w.track).m, trapKph: Number.isFinite(l.topSpeedKph) ? l.topSpeedKph : null} : {trapKph: l.topSpeedKph >= 0.92 * medTrap ? l.topSpeedKph : null}),
      weight: i === 0 ? 1 : 0.5, grip: gf(w.track), weather: w.weather || {}, meta: {event: w.event, car: l.car, manufacturer: l.manufacturer, session: l.session},
      ...((SECTORS || JOINT) && sectorSpec(cls, w.track, year) && sectorsOk(l.lap, l.sectors) ? {sec: {real: l.sectors, ...sectorSpec(cls, w.track, year), ...(JOINT ? {sig: SIG_REP[cls]} : {})}, secFit: SECTORS === 'on' || !!JOINT} : {})}))).concat(imsaLaps(cls, year, medTrap));
    let laps = lapsWith(f1Grip);
    if (new Set(laps.map(l => l.name)).size < 3) { report.push(`WEC ${cls} ${year}: not enough tracks (${new Set(laps.map(l => l.name)).size})`); continue; }
    const base = {...structuredClone(def.prior), linkMu: true, ...AXLE(cls === 'lmgt3' ? 1.62 : 1.65)};
    // owner 2026-11-17 (rule 14): Hypercar braking capped at the iRacing GTP envelope, LAPSIM_BRAKE_ENV_HYPER="a0,a2" (m/s², 1/m;
    // experiment 44043761033 BE1, hypercar holdout mean 1.24 -> 1.16 %)
    if (cls !== 'lmgt3' && E.LAPSIM_BRAKE_ENV_HYPER) base.brakeEnv = E.LAPSIM_BRAKE_ENV_HYPER.split(',').map(Number);
    // A3 §2 V2: decoupled lateral (lateralCap quad a0 + k·v²), braking (b0 + b2·v²) and traction (aTr) limits, × track grip, with the
    // published / weak priors of A3 (x0, sd); the decoupled braking replaces the GTP envelope cap (that envelope is its prior). LMGT3 b2
    // is fixed at 0 (A3: x0 = 0, a log prior cannot hold 0) and LMGT3 CdA has no prior (data limit).
    const HY = cls !== 'lmgt3', DPRI = HY ? {'lateralCap.a0': [16.7, 0.15, [8, 25]], 'lateralCap.k': [0.0040, 0.20, [0.0005, 0.012]], 'decoupled.b0': [8.63, 0.15, [4, 20]], 'decoupled.b2': [0.003234, 0.15, [0.0003, 0.01]], 'decoupled.aTr': [9.8, 0.30, [4, 20]], cdA: [1.04, 0.10, def.bounds.cdA]}
      : {'lateralCap.a0': [14.7, 0.15, [8, 25]], 'lateralCap.k': [0.0015, 0.50, [0.0002, 0.008]], 'decoupled.b0': [13.7, 0.30, [6, 20]], 'decoupled.aTr': [9.8, 0.30, [4, 20]], cdA: [null, null, def.bounds.cdA]};
    if (DECOUPLED) { base.lateralCap = {kind: 'quad', a0: DPRI['lateralCap.a0'][0], k: DPRI['lateralCap.k'][0], rhoRef: 1.2}; base.decoupled = {b0: DPRI['decoupled.b0'][0], b2: HY ? DPRI['decoupled.b2'][0] : 0, aTr: DPRI['decoupled.aTr'][0]}; delete base.brakeEnv; }
    if (AERO_LD && cls !== 'lmgt3') base.ld = 4.1; // published target "about 4, slightly higher"; window [3.8, 4.4] (pre-reg §3 V2)
    const bounds = AERO_LD && cls !== 'lmgt3' ? {muY: def.bounds.muY, ld: [3.8, 4.4], cdA: def.bounds.cdA} : def.bounds;
    // A1: published CdA prior for the Hypercar classes (CzA window mid 4.15 m² / L/D 4.0 = 1.04 m², sd 10 %, weight 0.5 s² per sd²)
    const params = DECOUPLED ? Object.entries(DPRI).map(([k, [x0, sd, [lo, hi]]]) => ({key: k, path: k, base: x0 ?? base[k], step: 0.08, min: lo, max: hi, ...(x0 != null ? {prior: {x0, sd, w: 0.5}} : {})}))
      : Object.entries(bounds).map(([k, [lo, hi]]) => ({key: k, path: k, base: base[k], step: 0.08, min: lo, max: hi, ...(CDA_PRIOR && cls !== 'lmgt3' && k === 'cdA' ? {prior: {x0: 1.04, sd: 0.10, w: 0.5}} : {})}));
    // step 34b joint: priors and starting values (pre-reg §3); LMGT3 P at the wheel prior 334 kW sd 8 %, bound [250, 420] kW, kernel pIce = P / etaDrive
    const ETA = base.etaDrive ?? 0.95, MUB = X3 ? [1.0, 2.6] : def.bounds.muY, CLB = X3 ? [def.bounds.clA[0], 12] : def.bounds.clA;
    // LAPSIM_WEC_HY_CLA=press (Stage 2a H0, central 11:15; CLAUDE.md "Model honesty"): Hypercar ClA prior 4.15 sd 2.4 %, bounds [4.05, 4.25] (press window)
    const JP = !JOINT ? null : HY ? {muY: [1.75, 0.15, MUB], clA: E.LAPSIM_WEC_HY_CLA === 'press' ? [4.15, 0.024, [4.05, 4.25]] : [4.15, X3 ? 0.50 : 0.05, CLB], cdA: [1.04, 0.10, def.bounds.cdA]}
      : {muY: [1.55, 0.15, MUB], clA: [1.4, X3 ? 0.50 : 0.25, CLB], cdA: [1.16, 0.15, def.bounds.cdA], pIce: [334e3 / ETA, 0.08, [250e3 / ETA, 420e3 / ETA]]};
    if (JP) { params.splice(0, params.length, ...Object.entries(JP).map(([k, [x0, sd, [lo, hi]]]) => ({key: k, path: k, base: x0, step: 0.08, min: lo, max: hi, prior: {x0, sd, w: 0.5}})));
      for (const [k, [x0]] of Object.entries(JP)) base[k] = x0; }
    // Hypercar: event BoP kW per car as wheel power (S: as before the driveline), mass BoP kg + 80 kg; events without a public table (2026):
    // median of the class in that season, else of the latest season with a table (flagged)
    const bopAbs = l => Object.entries(lapsimWecBop[l.name]?.[year]?.cars || {}).find(([n]) => n.split(' ')[0].toLowerCase() === String(l.meta.manufacturer || l.meta.car || '').split(' ')[0].toLowerCase())?.[1];
    const jointFlags = {};
    if (JOINT && HY) {
      const med = a => { const v = [...a].sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
      const ofSeason = y => Object.values(lapsimWecBop).flatMap(t => Object.values(t[y]?.cars || {})).filter(c => c.cls === cls && c.kW);
      const yMed = [year, ...Object.keys(Object.values(lapsimWecBop)[0] || {}).sort().reverse()].find(y => ofSeason(y).length);
      const m = yMed ? {kW: med(ofSeason(yMed).map(c => c.kW)), kg: med(ofSeason(yMed).map(c => c.kg)), season: yMed} : null;
      const patchOf = b => car => ({...car, mass: b.kg + 80, pIce: b.kW * 1e3 / (JOINT === 'S' ? 1 : (car.etaDrive ?? 0.95))});
      const withJ = arr => arr.map(l => { const b = bopAbs(l); if (b?.kg && b?.kW) return {...l, patch: patchOf(b), jbop: 'table'};
        if (m) { jointFlags.medianSeason = m.season; jointFlags.median = {kW: m.kW, kg: m.kg}; return {...l, patch: patchOf(m), jbop: 'median'}; } return l; });
      const lw = lapsWith; lapsWith = gf => withJ(lw(gf)); laps = lapsWith(f1Grip);
    }
    // step 34b joint: grip source and Timing71 rows as chosen by the base run 45566297648 (same laps and grip as the base; no re-gating)
    const JOINT_GRIP = {lmh: {2025: 'f1', 2026: 'transfer'}, lmdh: {2025: 'transfer', 2026: 'transfer'}, lmgt3: {2025: 'transfer', 2026: 'transfer'}};
    const jTransfer = JOINT && JOINT_GRIP[cls]?.[year] === 'transfer';
    if (jTransfer) { f1Grip = transferGrip; laps = lapsWith(transferGrip); }
    let h = holdout(laps, base, params, {...WEC_HOJ, folds: 99, gripFor: GF});
    // Transfer track factors (F1 fit without per-track drag): used for this class-season only when its
    // leave-one-track-out error is not higher than with the F1 fit's own factors (never worse); gate verdict recorded.
    let gripSource = {used: 'f1'};
    if (JOINT) gripSource = {used: jTransfer ? 'transfer' : 'f1', fixed: 'base 45566297648'};
    else if (TRANSFER && sessions.every(w => transferGrip(w.track) != null)) {
      const lt = lapsWith(transferGrip), ht = holdout(lt, base, params, {...WEC_HOJ, folds: 99, gripFor: GF});
      const a = Object.fromEntries(h.errors.map(e => [e.name, e.pct])), b = Object.fromEntries(ht.errors.map(e => [e.name, e.pct])), names = Object.keys(a).filter(n => n in b);
      const g = gate(names.map(n => a[n]), names.map(n => b[n]), {minRows: 4});
      const use = g.rmsNew <= g.rmsCur;
      gripSource = {used: use ? 'transfer' : 'f1', f1RmsPct: +g.rmsCur.toFixed(2), transferRmsPct: +g.rmsNew.toFixed(2), gate: g.reason};
      report.push(`WEC ${cls} ${year}: transfer track factors — holdout ${g.rmsCur.toFixed(2)}% → ${g.rmsNew.toFixed(2)}%, ${use ? 'used' : 'not used (worse)'} (${g.reason})`);
      if (use) { laps = lt; h = ht; f1Grip = transferGrip; }
    }
    // Timing71 rows of the two seasons before (only seasons with no Al Kamel data), half weight; kept only if the
    // leave-one-track-out error on this season improves beyond noise (gate, docs/lapsim-t71.md)
    const extra = t71Extra.filter(r => r.cls === cls && r.year < +year && r.year >= +year - 2 && !wecYears.has(r.year) && tracks[r.track] && f1Grip(r.track) != null)
      .map(r => ({name: r.track, track: wecTrack(r.track), lapSeconds: r.lap, trapKph: r.trapKph, ...(TRAP_POS && trapAt(r.track, r.year) ? {trapAtM: trapAt(r.track, r.year).m} : {}), weight: 0.5, grip: f1Grip(r.track), weather: r.weather || {}, meta: {event: 'Timing71', car: '', manufacturer: '', session: ''}}));
    let pooled = null;
    if (extra.length && !JOINT) {
      const h2 = holdout([...laps, ...extra], base, params, {...WEC_HOJ, folds: 99, gripFor: GF});
      const a = Object.fromEntries(h.errors.map(e => [e.name, e.pct])), b = Object.fromEntries(h2.errors.map(e => [e.name, e.pct])), names = Object.keys(a).filter(n => n in b);
      const g = gate(names.map(n => a[n]), names.map(n => b[n]), {minRows: 4});
      pooled = {extraRows: extra.length, previousRmsPct: +g.rmsCur.toFixed(2), candidateRmsPct: +g.rmsNew.toFixed(2), reason: g.reason, used: g.accept};
      report.push(`WEC ${cls} ${year}: Timing71 rows ${extra.length} — holdout ${g.rmsCur.toFixed(2)}% → ${g.rmsNew.toFixed(2)}%, ${g.reason}`);
      if (g.accept) { laps.push(...extra); h = h2; }
    }
    // per-event BoP (weight, power) for each car, relative to the season mean BoP of the class: candidate, gated
    let bop = null;
    const bopOf = l => Object.entries(lapsimWecBop[l.name]?.[year]?.cars || {}).find(([n]) => n.split(' ')[0].toLowerCase() === String(l.meta.manufacturer || l.meta.car || '').split(' ')[0].toLowerCase())?.[1];
    const withBop = laps.filter(l => bopOf(l)?.kg);
    if (JOINT) bop = {joint: JOINT, ...jointFlags, bopRows: laps.filter(l => l.jbop === 'table').length, medianRows: laps.filter(l => l.jbop === 'median').length};
    else if (cls !== 'lmgt3' && withBop.length >= laps.filter(l => !l.imsa).length * 0.8) { // A4: IMSA laps carry no WEC BoP (flagged)
      const kg0 = withBop.reduce((a, l) => a + bopOf(l).kg, 0) / withBop.length, kw0 = withBop.reduce((a, l) => a + bopOf(l).kW, 0) / withBop.length;
      const cand = laps.map(l => { const b = bopOf(l); return b?.kg ? {...l, patch: car => ({...car, mass: car.mass + b.kg - kg0, pIce: car.pIce * b.kW / kw0})} : l; });
      const h2 = holdout(cand, base, params, {...WEC_HO, folds: 99, gripFor: GF});
      const a = Object.fromEntries(h.errors.map(e => [e.name, e.pct])), b = Object.fromEntries(h2.errors.map(e => [e.name, e.pct])), names = Object.keys(a).filter(n => n in b);
      const g = gate(names.map(n => a[n]), names.map(n => b[n]), {minRows: 4});
      bop = {laps: withBop.length, refKg: +kg0.toFixed(1), refKW: +kw0.toFixed(1), previousRmsPct: +g.rmsCur.toFixed(2), candidateRmsPct: +g.rmsNew.toFixed(2), reason: g.reason, used: g.accept};
      report.push(`WEC ${cls} ${year}: per-event BoP — holdout ${g.rmsCur.toFixed(2)}% → ${g.rmsNew.toFixed(2)}%, ${g.reason}`);
      if (g.accept || BOP_PHYS) { laps.splice(0, laps.length, ...cand); h = h2; }
      if (BOP_PHYS) bop.physics = true;
    } else if (BOP_PHYS && cls !== 'lmgt3') bop = {physics: true, flagged: 'event BoP not public: class median (no offset)', laps: withBop.length};
    // noise of the final WEC held-out: v2 = best of {0.08, 0.05} (stored by holdout itself); v1 = a re-run from start step 0.05
    const h05 = h.noise ? h.noise : WEC_HO.nm && h.n ? holdout(laps, base, params, {...WEC_HOJ, step0: WEC_START2, folds: 99, gripFor: GF}) : null;
    const noiseLabel = h.noise ? `best of ${h.noise.starts.join('/')}` : `start ${WEC_START2}`;
    if (h05) report.push(`WEC ${cls} ${year}: held-out ${noiseLabel} ${h05.rmsPct.toFixed(3)} % vs ${h.rmsPct.toFixed(3)} % (spread ${Math.abs(h05.rmsPct - h.rmsPct).toFixed(3)} pp); fold iterations ${h.fits.map(f => f.iters).join(', ')}; fold bound hits ${boundHits(h.fits).map(b => `${b.key} at ${b.bound} (${b.folds.length})`).join(', ') || 'none'}`);
    const fit = fitSeason(laps, base, params, {iters: ITERS, ...(JOINT ? {wTime: WEC_HOJ.wTime, wTrap: WEC_HOJ.wTrap} : {})});
    const joint = JOINT ? {arm: JOINT, priors: JP, flags: jointFlags, full: {vals: fit.vals, hess: hessianAt(fit.objective, fit.x)},
      secInfo: Object.fromEntries(laps.filter(l => l.sec && (l.weight ?? 1) >= 1).map(l => [l.name, {real: l.sec.real, lines: l.sec.lines, lenM: l.track.kappa.length * l.track.ds}])),
      folds: h.fits.map(f => ({test: f.test, vals: f.vals, bounds: f.bounds, hess: f.hess ? {sd: f.hess.sd, corr: f.hess.corr, cond: f.hess.cond} : null}))} : null;
    const car = fit.car; delete car.linkMu;
    const perTrack = {};
    for (const p of fit.perTrack) if (!perTrack[p.name] && p.meta?.event !== 'Timing71') {
      const w = sessions.find(x => x.track === p.name);
      perTrack[p.name] = {grip: +p.grip.toFixed(4), errorSec: +p.dt.toFixed(3), simLap: +p.simLap.toFixed(3), realLap: p.realLap,
        trapKph: p.vMaxReal, simTopKph: +p.vMaxSim.toFixed(1), ...(tPos(p.name) ? {trapAtM: tPos(p.name).m, trapPos: tPos(p.name).status} : {}), event: p.meta.event, car: p.meta.car, manufacturer: p.meta.manufacturer, weather: w?.weather || null};
    }
    ((series.wec ||= {})[cls] ||= {})[year] = {car, tracks: perTrack, pooled, bop, gripSource, score: +fit.score.toFixed(3), laps: laps.length, ...(joint ? {joint} : {}),
      holdout: {rmsPct: h.rmsPct != null ? +h.rmsPct.toFixed(2) : null, n: h.n, tracks: h.errors.map(e => ({track: e.name, errorSec: +e.dt.toFixed(3), ...(e.sec ? {sectorSec: e.sec.map(x => +x.toFixed(4))} : {}), ...(Number.isFinite(e.trapKph) ? {trapKph: +e.trapKph.toFixed(2)} : {})})),
        ...(h05 ? {rule: h.noise ? 'best-of-starts' : 'converged', iters: h.fits.map(f => f.iters), boundHits: boundHits(h.fits), ...(h.noise ? {starts: WEC_STARTS, chosenStarts: h.fits.map(f => f.step)} : {}),
          noise: {...(h.noise ? {starts: h.noise.starts} : {step: WEC_START2}), rmsPct: +h05.rmsPct.toFixed(3), spreadPp: +Math.abs(h05.rmsPct - h.rmsPct).toFixed(3), tracks: h05.errors.map(e => ({track: e.name, errorSec: +e.dt.toFixed(3)})), boundHits: boundHits(h05.fits)}} : {})}};
    report.push(`## WEC ${def.label.en} ${year}`, '', `${laps.length} laps on ${Object.keys(perTrack).length} tracks, fit score ${fit.score.toFixed(3)}. Holdout (one track left out at a time): ${h.rmsPct?.toFixed(2) ?? '–'}% RMS over ${h.n} laps.`, '',
      `Car: grip μy ${car.muY.toFixed(3)}, downforce ClA ${car.clA.toFixed(2)} m², drag CdA ${car.cdA.toFixed(3)} m² (mass ${car.mass} kg and ${(car.pIce / 1e3).toFixed(0)} kW fixed).`, '',
      '| Track | Real | Sim | Error | Trap | Sim top | Track factor (F1) |', '|---|---|---|---|---|---|---|',
      ...Object.entries(perTrack).map(([id, r]) => `| ${id} | ${r.realLap.toFixed(3)} | ${r.simLap.toFixed(3)} | ${r.errorSec > 0 ? '+' : ''}${r.errorSec.toFixed(3)} | ${r.trapKph ?? '–'} | ${r.simTopKph} | ${r.grip} |`), '');
  }
  return {wec: series.wec?.[cls] ?? null, report: report.splice(r0)};
  }, null);
  if (!W) continue;
  report.push(...W.report);
  if (W.wec) (series.wec ||= {})[cls] = W.wec;
}
// step 34 (LAPSIM_WEC_LMP2=on, research): a fitted LMP2 car (Oreca 07, Gibson V8, no hybrid, spec power) from the committed Al Kamel rows
// (scripts/sim/data/learn/endurance-cars.csv.gz: ELMS / AsLMS / WEC qualifying, top 3 Oreca 07 per event, dry), same fit and rule v2
// hold-out as the classes above; stored apart (series.wecLmp2) so no page reads it. Prior: spec values, labelled assumptions.
if (E.LAPSIM_WEC_LMP2 === 'on' || PART === 'wec-lmp2') {
  const W = await piece('wec-lmp2', async () => {
    if (E.LAPSIM_WEC_LMP2 !== 'on') return null; // flag off: an empty part, so the matrix job is the same in every run
    const {gunzipSync} = await import('node:zlib'), {readFileSync} = await import('node:fs');
    const [h, ...L] = gunzipSync(readFileSync('scripts/sim/data/learn/endurance-cars.csv.gz')).toString().trim().split('\n'), k = h.split(',');
    const ID = {'barcelona-catalunya': 'catalunya', 'yas-marina': 'yas-marina-circuit', imola: 'imola', 'spa-francorchamps': 'spa-francorchamps', silverstone: 'silverstone'};
    const rows = L.map(l => Object.fromEntries(l.split(',').map((v, i) => [k[i], v]))).filter(r => /^LMP2/.test(r.cls) && /^Oreca/.test(r.vehicle) && r.type === 'Q' && +r.best > 0 && !(+r.rainShare > 0) && ID[r.event] && tracks[ID[r.event]] && f1GripOwn(ID[r.event]) != null);
    const prior = {...structuredClone(SERIES.wec.classes.lmdh.prior), label: 'LMP2', ers: {}, mass: 950, pIce: 440e3, clA: 3.2, cdA: 0.95, clALow: 3.2, cdALow: 0.95, vMax: 340 / 3.6, linkMu: true, noLowDrag: true};
    const bounds = {muY: [1.3, 2.2], clA: [2, 6], cdA: [0.6, 1.4]}, out = {}, rep = [];
    for (const [year, R] of Object.entries(Object.groupBy(rows, r => r.season))) {
      const laps = Object.values(Object.groupBy(R, r => r.series + '|' + r.event)).flatMap(ev => [...ev].sort((a, b) => a.best - b.best).slice(0, 3).map((r, i) => ({name: ID[r.event], track: tracks[ID[r.event]], lapSeconds: +r.best,
        trapKph: null, weight: i === 0 ? 1 : 0.5, grip: f1GripOwn(ID[r.event]), weather: {airTempC: +r.airC, trackTempC: +r.trackC, humidityPct: +r.hum, pressureHpa: +r.hpa}, meta: {event: r.series + ' ' + r.event, car: r.entry, manufacturer: 'Oreca', session: r.session}})));
      const names = new Set(laps.map(l => l.name)); if (names.size < 4) { rep.push(`LMP2 ${year}: ${names.size} tracks (< 4), not fitted`); continue; }
      const params = Object.entries(bounds).map(([key, [lo, hi]]) => ({key, path: key, base: prior[key], step: 0.08, min: lo, max: hi}));
      const ho = holdout(laps, prior, params, {...WEC_HO, folds: 99, gripFor: l => l.grip}), fit = fitSeason(laps, prior, params, {iters: ITERS}), car = fit.car; delete car.linkMu;
      out[year] = {car, laps: laps.length, tracks: [...names], holdout: {rmsPct: ho.rmsPct != null ? +ho.rmsPct.toFixed(3) : null, n: ho.n, tracks: ho.errors.map(e => ({track: e.name, errorSec: +e.dt.toFixed(3), pct: +e.pct.toFixed(3)})), boundHits: boundHits(ho.fits)},
        perTrack: fit.perTrack.filter(p => p.meta && true).map(p => ({track: p.name, realLap: p.realLap, simLap: +p.simLap.toFixed(3), errorSec: +p.dt.toFixed(3)}))};
      rep.push(`## LMP2 ${year} (research)`, '', `${laps.length} laps, tracks ${[...names].join(', ')}. Held-out ${out[year].holdout.rmsPct} % (n ${ho.n}); ClA ${car.clA.toFixed(2)}, CdA ${car.cdA.toFixed(3)}, μy ${car.muY.toFixed(3)}; bound hits ${JSON.stringify(out[year].holdout.boundHits)}`, '');
    }
    return {lmp2: out, report: rep};
  }, null);
  if (W) { report.push(...W.report); series.wecLmp2 = W.lmp2; }
}
if (PART && PART !== 'merge') throw new Error(`LapSim part ${PART} is not a piece of this run`);

// aero 'fia': fitted with the FIA / estimated low-drag zones, so the page and the MCP tool use the same zones (worker/lapsim/zones.js)
const out = {aero: E.LAPSIM_FIA_ZONES === 'on' ? 'fia' : E.LAPSIM_FIA_ZONES === '2025' ? 'fia2025' : 'auto', realState: true, ...(PUQ ? {puQuali: true, otChoice: OTC} : {}), ...(PUR ? {puRamp: true} : {}), generatedAt: new Date().toISOString().slice(0, 10), method: 'Nelder–Mead fit of season car parameters plus a per-track grip factor to real pole laps (speed trace and lap time); WEC classes fitted to lap time and speed trap with F1 track factors.', seasons, projections: ONLY_WEC ? prevCal.projections : projections, series};
await writeFile('worker/lapsim/calibration-data.js', `// Generated by scripts/sim/calibrate.mjs. Do not edit by hand.\nexport const lapsimCalibration=${JSON.stringify(out)};\n`);
if (!ONLY_WEC) await writeFile('docs/lapsim-report.md', report.join('\n') + '\n');
console.log(report.join('\n'));
