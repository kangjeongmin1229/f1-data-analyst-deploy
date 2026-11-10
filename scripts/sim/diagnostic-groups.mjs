// Fits 2023–2026 car parameters to real qualifying laps on the built tracks, then projects
// 2027 and 2028. Reads worker/lapsim/tracks-data.js and .cache/lapsim/traces.json (from
// build-geometry.mjs); writes worker/lapsim/calibration-data.js and docs/lapsim-report.md.
import {readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fitBTransferRounds, badTracks, transferCalibration} from './b-transfer-rounds.mjs';
import {modelBopLookup} from './wec-model-bop.mjs';
import {objectiveTrace} from './objective-trace.mjs';
import {wecNmStop} from './wec-nm-stop.mjs';
import {splitWecSessions} from './wec-session-scope.mjs';
import {gate} from './gate.mjs';
import {join} from 'node:path';
import {lapsimTracks} from '../../worker/lapsim/tracks-data.js';
import {trackFromData} from '../../worker/lapsim/tracks.js';
import {poleTrend} from '../../worker/lapsim/pole-trend.js';
import {rechargeLimitMJ} from '../../worker/lapsim/energy-limits.js';
import {PRIOR, applyRules, applyDevelopment, RULE_CHANGES} from '../../worker/lapsim/cars.js';
import {simulateLap} from '../../worker/lapsim/engine.js';
import {conditionsFromWeather} from '../../worker/lapsim/atmosphere.js';
import {fitSeason, withGrip, holdout, fitJoint, holdoutJoint, addBanking} from './calibrate-lib.mjs';
import {fitJointBCD, holdoutBCD, backtestBCD, poleMult} from './joint-bcd.mjs';
import {SERIES} from '../../worker/lapsim/series.js';
import {lapsimWecBop} from '../../worker/lapsim/wec-bop-data.js';
import {applyWecTiming, timingMapping} from './wec-timing.mjs';
import {eligibilityInputs, verifyEligibility, rowEligibility} from './wec-eligibility.mjs';

const CACHE = process.env.LAPSIM_CACHE || '.cache/lapsim';
const ITERS = Number(process.env.LAPSIM_ITERS || 70), HOLDOUT_ITERS = Number(process.env.LAPSIM_HOLDOUT_ITERS || 25);
// experiment knobs (defaults are the published settings)
const WTIME = Number(process.env.LAPSIM_WTIME || 2);
const E = process.env;
const WEC_NM_STOP = wecNmStop(E);
const objectiveLog = objectiveTrace(E.LAPSIM_OBJECTIVE_LOG);
const FITTER = E.LAPSIM_FITTER || 'nm';
const BCD = {rounds: Number(E.LAPSIM_ROUNDS || 4), iters: Number(E.LAPSIM_BCD_ITERS || 150), wTime: WTIME, wSector: Number(E.LAPSIM_WSECTOR || 0),
  trackDrag: E.LAPSIM_TRACK_DRAG === 'on', teams: E.LAPSIM_TEAMS === 'on', residual: E.LAPSIM_RESIDUAL === 'on', residualLambda: Number(E.LAPSIM_RESIDUAL_LAMBDA || 1), wPrior: Number(E.LAPSIM_WPRIOR || 2), log: m => console.log(m)};
if (E.LAPSIM_BCD_CONVERGENCE === 'on') Object.assign(BCD, {convergence: true, convergenceDir: '.cache/f1-convergence'});
const MAX_POS = Number(E.LAPSIM_MAX_POS || 3);
const HOLDOUT_YEARS = (E.LAPSIM_HOLDOUT_YEARS || '2025,2026').split(',').map(Number);
const B_TRANSFER_ONLY = E.LAPSIM_B_TRANSFER_ONLY === 'on';
const bPhases = [];
const fitAll = async gs => {
  if (B_TRANSFER_ONLY) {
    if (FITTER !== 'bcd' || E.LAPSIM_SKIP_WEC !== '1' || BCD.trackDrag || BCD.rounds !== 5 || BCD.iters !== 200 || BCD.wTime !== 20 || BCD.wSector !== 2 || BCD.wPrior !== 8 || !BCD.teams) throw new Error('Unexpected B transfer settings');
    const phase = await fitBTransferRounds(gs, BCD, `.cache/b-rounds/phase-${bPhases.length + 1}`);
    bPhases.push(phase);
    return phase.fit;
  }
  return FITTER === 'bcd' ? fitJointBCD(gs, BCD) : fitJoint(gs, {iters: ITERS, wTime: WTIME});
};
const holdoutOf = (gs, key) => FITTER === 'bcd' ? holdoutBCD(gs, key, {...BCD, rounds: Math.max(2, BCD.rounds - 1)}) : holdoutJoint(gs, key, {iters: HOLDOUT_ITERS, wTime: WTIME});
const GRIP_LIMITS = E.LAPSIM_GRIP_LO ? [Number(E.LAPSIM_GRIP_LO), Number(E.LAPSIM_GRIP_HI)] : FITTER === 'bcd' ? [0.7, 1.3] : [0.85, 1.15];
BCD.lo = GRIP_LIMITS[0]; BCD.hi = GRIP_LIMITS[1];
// season progress 0 (1 March) … 1 (15 December), for in-season development
const tauOf = (date, year) => { if (!date) return 0.5; const a = Date.UTC(year, 2, 1), b = Date.UTC(year, 11, 15); return Math.max(0, Math.min(1.1, (Date.parse(date) - a) / (b - a))); };
const ONLY_YEARS = process.env.LAPSIM_SEASONS ? process.env.LAPSIM_SEASONS.split(',').map(Number) : null;
// LAPSIM_ONLY=wec: refit the WEC classes only; F1 seasons and projections are kept from the current calibration
const ONLY_WEC = E.LAPSIM_ONLY === 'wec';
const MODEL_BOP = E.LAPSIM_WEC_MODEL_BOP === 'on';
if (MODEL_BOP && !ONLY_WEC) throw Error('Model-matched BoP requires a WEC-only experiment');
const exactBop = MODEL_BOP ? modelBopLookup(JSON.parse(await readFile('scripts/sim/data/wec-model-identities.json')), JSON.parse(await readFile('scripts/sim/data/wec-bop-verified-2025.json'))) : null;
const WEC_TIMING = {trapPosition: E.LAPSIM_WEC_TRAP_POSITION === 'on', sectors: E.LAPSIM_WEC_SECTORS === 'on', sectorWeight: Number(E.LAPSIM_WEC_SECTOR_WEIGHT || 2)};
const WEC_TIMING_ON = WEC_TIMING.trapPosition || WEC_TIMING.sectors;
if (WEC_TIMING_ON && !ONLY_WEC) throw new Error('WEC timing experiments require LAPSIM_ONLY=wec');
if (WEC_TIMING.sectors && ![1, 2, 4].includes(WEC_TIMING.sectorWeight)) throw new Error('WEC sector weight must be 1, 2 or 4');
const WEC_POSITIONS = WEC_TIMING_ON ? JSON.parse(await readFile('scripts/sim/data/wec-timing-positions.json', 'utf8')) : null;
// A shared, precomputed production check: never recompute eligibility with fitted cars.
if (WEC_TIMING.sectors && !E.LAPSIM_WEC_ELIGIBILITY) throw new Error('WEC sectors require LAPSIM_WEC_ELIGIBILITY prepared before fitting');
const WEC_ELIGIBILITY = WEC_TIMING.sectors ? verifyEligibility(JSON.parse(await readFile(E.LAPSIM_WEC_ELIGIBILITY, 'utf8')), eligibilityInputs('.', CACHE)) : null;
const prevCal = ONLY_WEC ? (await import('../../worker/lapsim/calibration-data.js')).lapsimCalibration : null;
const traces = ONLY_WEC ? [] : JSON.parse(await readFile(join(CACHE, 'traces.json'), 'utf8'));
const tracks = Object.fromEntries(Object.entries(lapsimTracks).map(([id, d]) => [id, trackFromData(d)]));
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
const withEnergy = (w, id, year) => { const mj = year >= 2026 && process.env.LAPSIM_ENERGY_LIMITS !== 'off' ? rechargeLimitMJ(id, year) : null; return mj ? {...w, rechargeMJ: mj} : w; };
const groups = [];
for (const year of [...new Set(traces.map(t => t.year))].sort()) {
  const prior = PRIOR[year]; if (!prior || (ONLY_YEARS && !ONLY_YEARS.includes(year))) continue;
  const laps = traces.filter(t => t.year === year && tracks[t.track] && !t.weather.rain && t.s.length > 100 && t.position <= MAX_POS)
    .map(t => ({name: t.track, track: tracks[t.track], lapSeconds: t.lap_seconds, weight: t.position === 1 ? 1 : 0.5,
      // non-pole laps: other cars, so by default they count for the speed trace shape only
      timeScale: t.position === 1 || E.LAPSIM_NONPOLE === 'time' || BCD.teams ? 1 : 0, sectors: t.sectors, date: t.date, team: t.team, tau: tauOf(t.date, year),
      feat: {ftf: t.throttle?.length ? t.throttle.filter(x => x >= 98).length / t.throttle.length : null, vmean: tracks[t.track].kappa.length * tracks[t.track].ds / t.lap_seconds},
      obs: {s: t.s, v: t.v.map(x => x / 3.6)}, weather: withEnergy(t.weather, t.track, year), meta: {sessionKey: t.session_key, driver: t.driver_number, position: t.position}}));
  if (laps.length < 4) { report.push(`${year}: not enough laps (${laps.length})`); continue; }
  const base = {...structuredClone(prior), linkMu: true, ...AXLE(1.55)};
  if (process.env.LAPSIM_THROTTLE_HARVEST === 'off' && base.ers) base.ers.throttleHarvest = false;
  const params = PARAMS.map(k => {
    const [lo, hi] = BOUNDS[k], rel = k === 'pIce';
    return {key: k, path: k, base: base[k], step: 0.08, min: rel ? lo * base[k] : lo, max: rel ? hi * base[k] : hi};
  });
  groups.push({key: year, laps, base, params});
}
export {groups,BCD,traces,tracks};
