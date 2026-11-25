// Step 35 (docs/prereg/step35-fe-2026-11-25.md): Formula E noise floors, geometry quality, V1 blended-braking check (flag
// car.brakeAxle), Attack Mode physics check, Gen4 Jarama grip check, energy and compute-time checks. Report only: writes nothing
// under worker/. Run after build-fe.mjs (reads its fe-fit.json layouts and fe-data.js / fe-tracks-data.js).
//   node scripts/sim/learn/fe-step35.mjs [outDir]
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {lapsimTracks, lapsimExtraTracks} from '../../../worker/lapsim/tracks-data.js';
import {lapsimFeTracks} from '../../../worker/lapsim/fe-tracks-data.js';
import {lapsimFe} from '../../../worker/lapsim/fe-data.js';
import {FE_GENS, FE_FIT_ONLY, feKeyOf} from '../../../worker/lapsim/fe-cars.js';
import {modeCar, gripSet, FE_GEN4_PRIOR} from '../../../worker/lapsim/fe-gen4.js';
import {kForVariants} from '../gate.mjs';
import {parseCsv} from './build-endurance.mjs';
import {lineOf} from './fe-lines.mjs';

const OUT = process.argv[2] || 'out/fe-step35', D = 'scripts/sim/data/learn/'; mkdirSync(OUT, {recursive: true});
const INPUTS = [D + 'fe-cars.csv.gz', D + 'fe-duels.csv', D + 'fe-maps.json', 'scripts/sim/data/tracks/fe-osm-lines.json', D + 'fe-race-w12.json'];
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex'), hashes0 = Object.fromEntries(INPUTS.map(f => [f, sha(f)]));
const K = lapsimKernel(), ALL = {...lapsimTracks, ...lapsimExtraTracks, ...lapsimFeTracks}, trk = {}, T = id => trk[id] ||= K.trackFromData(ALL[id]);
const FIT = JSON.parse(readFileSync(D + 'fe-fit.json', 'utf8')), mean = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => Math.sqrt(a.reduce((s, x) => s + (x - mean(a)) ** 2, 0) / (a.length - 1)), rmsA = a => Math.sqrt(mean(a.map(x => x * x)));
const median = a => { const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
const r = (x, d = 3) => x == null || !Number.isFinite(x) ? null : +x.toFixed(d);
const NAME = {'são paolo': 'São Paulo', 'mexico city': 'Mexico', 'ad diriyah': 'Diriyah', madrid: 'Jarama', 'new york city': 'New York'};
const venueOf = s => { const v = s.replace(/^R\d+\s+/, '').replace(/\s+(rookie\s+)?testing$/i, '').trim(); return NAME[v.toLowerCase()] || v; };
const layoutOf = (venue, lenM) => { const id = FIT.layouts.find(l => l.venue === venue && Math.abs(lenM / l.lengthM - 1) < 0.004)?.id; return ALL[id] ? id : undefined; };
const V1 = {rearMaxW: 350e3, eta: 0.95}; // pre-reg §4: Gen3 / Gen3 Evo rear motor regen cap (600 kW = 250 front + 350 rear), η prior 0.95
const envOf = w => K.conditionsFromWeather({pressureHpa: +w.hpa || 1013.25, airTempC: +w.airC || 25, humidityPct: +w.hum || 50, trackTempC: +w.trackC || 35, windSpeed: 0, windFromDeg: 0});
const fullCar = key => (FE_GENS[key] || FE_FIT_ONLY[key]).car;

// 1. Geometry quality (pre-reg §2)
const maps = JSON.parse(readFileSync(D + 'fe-maps.json', 'utf8')).events;
const geomFe = FIT.geometry || [];
function corners(t) { const k = t.kappa.map(x => Math.abs(x) / 1e5), ds = t.ds, w = Math.max(1, Math.round(12.5 / ds)), n = k.length;
  const s = k.map((_, i) => { let a = 0; for (let j = -w; j <= w; j++) a += k[(i + j + n) % n]; return a / (2 * w + 1); });
  const pk = []; for (let i = 0; i < n; i++) if (s[i] > 1 / 100 && s[i] >= s[(i - 1 + n) % n] && s[i] > s[(i + 1) % n]) pk.push(i);
  const merged = []; for (const i of pk) { const last = merged.at(-1); if (last != null && (i - last) * ds < 50) { if (s[i] > s[last]) merged[merged.length - 1] = i; } else merged.push(i); }
  if (merged.length > 1 && (merged[0] + n - merged.at(-1)) * ds < 50) merged.pop(); return merged.length; }
const geometry = {};
for (const l of FIT.layouts) { const t = ALL[l.id]; if (!t || !t.kappa) continue;
  const src = (t.sources || [])[0] || '', url = (/https?:\/\/\S+/.exec(src) || [])[0], m = url && maps.find(e => e.url === url);
  // printed turn numbers = integer labels within 80 m of the map's lap line (the rule fe-lines.mjs orientLine uses)
  const line = m && lineOf(m), sc = line ? (t.officialLengthM || l.lengthM) / line.lenPt : 0;
  const nearLine = w => line.pts.some(q => Math.hypot(q[0] - w.x, q[1] - (w.y - w.h / 2)) * sc < 80);
  const nums = line ? m.words.filter(w => /^\d{1,2}$/.test(w.t) && nearLine(w)).map(w => +w.t) : [];
  // turn numbering runs 1..N; other integers near the line (distance boards 50, 100) are not turns: N = longest run from 1
  let printed = null; if (nums.length) { const set = new Set(nums); printed = 0; while (set.has(printed + 1)) printed++; }
  const turn = geomFe.find(g => g.id === l.id)?.turn, closure = turn == null ? (lapsimFeTracks[l.id] ? null : 0) : Math.abs(Math.abs(turn) - 360);
  const ratio = (t.length || t.kappa.length * t.ds) / (t.officialLengthM || l.lengthM), c = corners(t);
  const good = closure != null && closure <= 5 && ratio >= 0.95 && ratio <= 1.005 && printed != null && Math.abs(c - printed) <= 2;
  geometry[l.id] = {source: lapsimFeTracks[l.id] ? (/OpenStreetMap/.test(JSON.stringify(t.sources)) ? 'OSM ways matched to the FIA map' : 'FIA FE map vector line') : 'existing simulator track',
    closureDeg: r(closure, 1), lengthRatio: r(ratio, 4), cornersSim: c, cornersPrinted: printed, good}; }

// 2. Rows: best dry duel lap per layout × season × rule set (pre-reg §1)
const base = parseCsv(gunzipSync(readFileSync(D + 'fe-cars.csv.gz')).toString());
const duels = parseCsv(readFileSync(D + 'fe-duels.csv', 'utf8')).flatMap(d => { const g = base.find(x => x.season === d.season && x.event === d.event && x.entry === d.entry && x.type === 'Q');
  return g ? [{...d, lenM: +g.lenKm * 1000}] : []; });
const best = new Map(), noDuel = [];
for (const d of duels) { const season = +d.season, key = feKeyOf(season), lay = layoutOf(venueOf(d.event), d.lenM);
  if (!key || key === 'fe-gen4' || !lay || +d.rainShare > 0.02 || !(+d.best > 0)) continue; const k = `${lay}|${season}|${key}`;
  if (!best.has(k) || +d.best < best.get(k).real) best.set(k, {layout: lay, season, key, real: +d.best, w: d, session: d.session, event: d.event}); }
for (const f of FIT.rows) if (!best.has(`${f.layout}|${f.season}|${f.key}`)) noDuel.push(`${f.layout} ${f.season} ${f.key}`);
const rows = [...best.values()];
const lapOf = (id, car, env) => K.simulateLap(T(id), car, env).lapTime;
for (const x of rows) { const env = envOf(x.w), car = fullCar(x.key); x.simBase = lapOf(x.layout, car, env); x.simV1 = lapOf(x.layout, {...car, brakeAxle: V1}, env); }
// diagnostic: best duel ÷ best group lap (track evolution and power together)
const groupBest = {}; for (const g of base) { if (g.type !== 'Q' || !/Group/i.test(g.session) || +g.rainShare > 0.02) continue; const lay = layoutOf(venueOf(g.event), +g.lenKm * 1000), k = `${lay}|${g.season}`;
  if (lay && +g.best > 0 && (!groupBest[k] || +g.best < groupBest[k])) groupBest[k] = +g.best; }
for (const x of rows) x.duelOverGroup = groupBest[`${x.layout}|${x.season}`] ? r(x.real / groupBest[`${x.layout}|${x.season}`], 4) : null;

// 3. Fit (same as build-fe: G per rule set free, T per layout ridge σ 0.05) and leave-one-event-out
function fit(rs, sim) { const G = {}, Tt = {}, lam = (0.01 / 0.05) ** 2; for (const x of rs) x.y = Math.log(x.real / x[sim]);
  for (let it = 0; it < 200; it++) { for (const k of new Set(rs.map(x => x.key))) { const a = rs.filter(x => x.key === k); G[k] = mean(a.map(x => x.y - (Tt[x.layout] || 0))); }
    for (const l of new Set(rs.map(x => x.layout))) { const a = rs.filter(x => x.layout === l); Tt[l] = a.reduce((s, x) => s + x.y - G[x.key], 0) / (a.length + lam); } }
  return {G, T: Tt}; }
const pct = x => (Math.exp(x) - 1) * 100;
function heldOut(sim) { return rows.map(x => { const rest = rows.filter(o => o !== x), f = fit(rest, sim), y = Math.log(x.real / x[sim]);
  return {layout: x.layout, season: x.season, key: x.key, e: pct(y - (f.G[x.key] ?? 0) - (f.T[x.layout] || 0))}; }); }
function inSample(sim) { const f = fit(rows, sim); return rows.map(x => ({layout: x.layout, key: x.key, e: pct(Math.log(x.real / x[sim]) - f.G[x.key] - (f.T[x.layout] || 0))})); }
const evo = x => x.key === 'fe-gen3evo';
const perLayout = (eb, ev, sel) => { const g = {}; eb.forEach((b, i) => { if (!sel(b)) return; (g[b.layout] ||= []).push([b.e, ev[i].e]); });
  return Object.entries(g).map(([l, a]) => ({layout: l, base2: mean(a.map(p => p[0] ** 2)), v12: mean(a.map(p => p[1] ** 2)), n: a.length})); };
const goodSel = b => evo(b) && geometry[b.layout]?.good;
// power check (pre-reg §4): all rows fitted, per-layout paired loss SD → UB half-width in RMS pp
const isB = inSample('simBase'), isV = inSample('simV1'), pl0 = perLayout(isB, isV, goodSel), nG = pl0.length;
const rmsUB = (pl, k) => { const b = Math.sqrt(mean(pl.map(p => p.base2))), loss = pl.map(p => p.v12 - p.base2), mL = mean(loss), se = sd(loss) / Math.sqrt(pl.length);
  return {baseRms: b, candRms: Math.sqrt(Math.max(0, b * b + mL)), ub: Math.sqrt(Math.max(0, b * b + mL + k * se)) - b, half: Math.sqrt(b * b + k * se) - b}; };
const k1 = nG >= 5 ? kForVariants(1, nG) : null, power = k1 ? rmsUB(pl0, k1) : null, judgeable = power && power.half <= 0.10;
let verdict = 'not enough data', ho = null;
if (judgeable) { const hb = heldOut('simBase'), hv = heldOut('simV1'), pl = perLayout(hb, hv, goodSel), u = rmsUB(pl, k1);
  ho = {n: pl.length, k: r(k1), baseRmsPct: r(u.baseRms), candRmsPct: r(u.candRms), ubLossPp: r(u.ub), medAbsBase: r(median(hb.filter(goodSel).map(b => Math.abs(b.e)))), medAbsV1: r(median(hv.filter(goodSel).map(b => Math.abs(b.e)))),
    allRowsBaseRms: r(rmsA(hb.filter(evo).map(b => b.e))), allRowsV1Rms: r(rmsA(hv.filter(evo).map(b => b.e))), perLayout: pl.map(p => ({...p, base2: r(p.base2), v12: r(p.v12)}))};
  verdict = u.ub <= 0.10 ? 'pass (non-inferior)' : 'fail (guard)'; } else if (power) verdict = 'not judgeable at this n';

// report-only (pre-reg §2: report-only circuits stay in the fit, no decision): held-out on all Gen3 Evo rows, baseline and V1
const hbA = heldOut('simBase'), hvA = heldOut('simV1'), plA = perLayout(hbA, hvA, evo), kA = kForVariants(1, plA.length), uA = rmsUB(plA, kA);
const diagAll = {note: 'report only: includes circuits whose geometry check failed', n: plA.length, k: r(kA), baseRmsPct: r(uA.baseRms), v1RmsPct: r(uA.candRms), ubLossPp: r(uA.ub),
  rowsBaseRmsPct: r(rmsA(hbA.filter(evo).map(b => b.e))), rowsV1RmsPct: r(rmsA(hvA.filter(evo).map(b => b.e))), medAbsBase: r(median(hbA.filter(evo).map(b => Math.abs(b.e)))), medAbsV1: r(median(hvA.filter(evo).map(b => Math.abs(b.e)))),
  rows: hbA.map((b, i) => ({...b, e: r(b.e), eV1: r(hvA[i].e)})), simShiftPct: r(mean(rows.filter(evo).map(x => (x.simV1 / x.simBase - 1) * 100)))};
// 4. σ_meas (pre-reg §3): group A vs group B, Gen3 Evo dry
const ev = {}; for (const g of base) { if (g.type !== 'Q' || +g.season < 2025 || +g.rainShare > 0.02) continue; const m = /Group ([AB])/i.exec(g.session); if (!m) continue;
  const e = (ev[g.season + '|' + g.event] ||= {}), s = (e[m[1]] ||= {best: Infinity, s: [Infinity, Infinity, Infinity], car: null});
  if (+g.best > 0 && +g.best < s.best) { s.best = +g.best; s.car = g; } [g.s1, g.s2, g.s3].forEach((v, i) => { if (+v > 0) s.s[i] = Math.min(s.s[i], +v); }); }
const pairs = Object.entries(ev).filter(([, e]) => e.A && e.B && Number.isFinite(e.A.best) && Number.isFinite(e.B.best));
const floor = d => ({n: d.length, statPct: r(sd(d) / Math.SQRT2 * 100), sysPct: r(Math.abs(mean(d)) / Math.SQRT2 * 100), measPct: r(rmsA(d) / Math.SQRT2 * 100)});
const sigma = {lap: floor(pairs.map(([, e]) => Math.log(e.A.best / e.B.best))),
  sectors: [0, 1, 2].map(i => floor(pairs.filter(([, e]) => Number.isFinite(e.A.s[i]) && Number.isFinite(e.B.s[i])).map(([, e]) => Math.log(e.A.s[i] / e.B.s[i])))),
  bestVsIdealPct: r(median(pairs.flatMap(([, e]) => [e.A.car, e.B.car]).filter(c => +c.ideal > 0).map(c => (+c.best / +c.ideal - 1) * 100)))};

// 5. Energy and limits on V1 laps (pre-reg §4), every good Gen3 Evo layout, default weather
const energy = [];
for (const id of Object.keys(geometry).filter(l => rows.some(x => x.layout === l && evo(x)))) {
  const car = {...fullCar('fe-gen3evo'), brakeAxle: V1}, tr = T(id), res = K.simulateLap(tr, car, {}), v = res.v, n = v.length, ds = tr.ds, m = car.mass, mE = m * (car.inertiaFactor ?? 1), g = 9.81, rho = 1.18; // kernel RHO_REF for env {}
  let eOut = 0, eBrake = 0, eDrag = 0, eRoll = 0, eGrade = 0, maxRearKW = 0, maxDriveKW = 0;
  const rs = car.rearWeight ?? 0.55, ra = car.rearAero ?? 0.55, hw = (car.cogHeight ?? 0.29) / car.wheelbase;
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, vm = Math.max(1, (v[i] + v[j]) / 2), dt = ds / vm, a = (v[j] * v[j] - v[i] * v[i]) / (2 * ds);
    const L = 0.5 * rho * car.clA * vm * vm, drag = 0.5 * rho * car.cdA * vm * vm, roll = car.cRoll * (m * g + L), gr = tr.grade ? m * g * Math.sin(tr.grade[i]) : 0, f = (a >= 0 ? mE : m) * a + drag + roll + gr; // kernel: inertia factor on drive only
    eDrag += drag * vm * dt; eRoll += roll * vm * dt; eGrade += gr * vm * dt;
    // the kernel caps the drive force at P/v at the step's start speed (forward pass), so the power check uses v[i]
    if (f >= 0) { eOut += f * vm * dt; maxDriveKW = Math.max(maxDriveKW, f * v[i] / 1e3); }
    else { eBrake += -f * vm * dt; const N = m * g + L, nr = Math.max(0, (m * g) * rs + L * ra + mE * a * hw), fTy = -f; // a < 0: load moves forward
      const frontCap = car.muX * (N - nr), rearNeed = Math.max(0, fTy - frontCap); maxRearKW = Math.max(maxRearKW, rearNeed * Math.min(v[i], v[j]) * V1.eta / 1e3); } } // approximate: linear front tyre (no load sensitivity, no ellipse)
  const ke = 0.5 * mE * (v[0] ** 2 - v[n - 1] ** 2), resid = eOut - eBrake - eDrag - eRoll - eGrade;
  energy.push({track: id, outKWh: r(eOut / 3.6e6, 4), brakeKWh: r(eBrake / 3.6e6, 4), residualPctOfOut: r(resid / eOut * 100, 4), maxDriveWheelKW: r(maxDriveKW, 1), capWheelKW: r(car.pIce * car.etaDrive / 1e3, 1),
    maxRearRegenKWApprox: r(maxRearKW, 1), closureNote: 'residual is an identity here (forces rebuilt from the same speed trace); a real closure test needs the kernel power channels', pass: Math.abs(resid / eOut) <= 1e-3 && maxDriveKW <= car.pIce * car.etaDrive / 1e3 * (1 + 1e-6) + 1e-9 }); }

// 6. Attack Mode physics check (pre-reg §6), nothing fitted
const W = JSON.parse(readFileSync(D + 'fe-race-w12.json', 'utf8')), f12 = 0.7737, am = [];
for (const e of W.events.filter(e => e.gen === 'Gen3 Evo' && e.weather_class === 'dry' && e.am_gain_s && e.am_gain_s.n > 0 && ALL[e.track_key])) {
  const c350 = fullCar('fe-gen3evo'), c300 = {...c350, pIce: 300e3, awdAboveKph: null}, sc = Math.exp((lapsimFe.G['fe-gen3evo'] || 0) + (lapsimFe.tracks[e.track_key]?.T || 0));
  const pred = f12 * (lapOf(e.track_key, c350, {}) - lapOf(e.track_key, c300, {})) * sc, meas = e.am_gain_s.median, s = e.am_gain_s.iqr / 1.349 / Math.sqrt(e.am_gain_s.n);
  am.push({event: e.event, track: e.track_key, predS: r(pred), measS: r(meas), sigmaS: r(s), z: r((pred - meas) / s, 2)}); }
const amSum = am.length ? {n: am.length, rmsS: r(rmsA(am.map(a => a.predS - a.measS))), meanSignedS: r(mean(am.map(a => a.predS - a.measS))), rmsZ: r(rmsA(am.map(a => a.z)), 2), meanSigmaS: r(mean(am.map(a => a.sigmaS)))} : null;

// 7. Gen4 at Jarama: grip the prior needs for the press-reported 1:24.344 (report only, fe-gen4.js unchanged)
const JAR = 84.344, scJ = Math.exp(lapsimFe.tracks.jarama?.T || 0), gen4 = {};
for (const [name, mode, aero] of [['qualifying 600 kW HDF', 'qualifying', null], ['600 kW LDF', 'qualifying', 'ldf']]) {
  const mk = mu => { const c = modeCar(mode, gripSet(mu)); return aero ? {...c, clA: 2.0, cdA: 0.65, clALow: 2.0, cdALow: 0.65} : c; };
  let lo = 1.0, hi = 2.6; const at = mu => lapOf('jarama', mk(mu), {}) * scJ;
  const lapPrior = at(FE_GEN4_PRIOR.muY.start); for (let it = 0; it < 30; it++) { const mid = (lo + hi) / 2; if (at(mid) > JAR) lo = mid; else hi = mid; }
  gen4[name] = {priorMuY: FE_GEN4_PRIOR.muY.start, priorLapS: r(lapPrior), neededMuY: r((lo + hi) / 2), priorBounds: [FE_GEN4_PRIOR.muY.lo, FE_GEN4_PRIOR.muY.hi], atBound: (lo + hi) / 2 <= 1.0001 || (lo + hi) / 2 >= 2.5999}; }

// 8. Compute time (central 4): median of 20 runs on 3 FE tracks, hook off vs on
const time = (car, id) => { const tr = T(id), ts = []; for (let i = 0; i < 20; i++) { const t0 = performance.now(); K.simulateLap(tr, car, {}); ts.push(performance.now() - t0); } return median(ts); };
const ct = ['fe-london', 'fe-jeddah', 'fe-berlin'].filter(id => ALL[id]).map(id => ({track: id, offMs: r(time(fullCar('fe-gen3evo'), id), 2), onMs: r(time({...fullCar('fe-gen3evo'), brakeAxle: V1}, id), 2)}));
const ctRatio = r(mean(ct.map(c => c.onMs)) / mean(ct.map(c => c.offMs)), 3);

// 9. Byte identity of the measured inputs, report
const hashes1 = Object.fromEntries(INPUTS.map(f => [f, sha(f)])), identical = INPUTS.every(f => hashes0[f] === hashes1[f]);
const shipped = {heldOutPct: lapsimFe.heldOutPct, generated: lapsimFe.generated};
const report = {step: 35, prereg: 'docs/prereg/step35-fe-2026-11-25.md', prereg_sha256: sha('docs/prereg/step35-fe-2026-11-25.md'), run: process.env.GITHUB_RUN_ID || 'local (not reproduced)', commit: process.env.GITHUB_SHA || null,
  inputs: hashes1, measuredUnchanged: identical, rebuild: shipped, geometry, rows: rows.map(x => ({layout: x.layout, season: x.season, key: x.key, real: x.real, session: x.session, simBase: r(x.simBase), simV1: r(x.simV1), duelOverGroup: x.duelOverGroup})),
  noDuelRows: noDuel, sigma, c1: {heldOutRmsPct: diagAll.rowsBaseRmsPct, sigmaLapPct: sigma.lap.measPct, ratio: r(diagAll.rowsBaseRmsPct / sigma.lap.measPct, 2), note: 'held-out = leave-one-event-out on all Gen3 Evo duel rows (report only)'},
  v1: {power: power && {n: nG, k: r(k1), halfWidthPp: r(power.half), judgeable}, heldOut: ho, verdict, reportOnlyAllLayouts: diagAll}, energy, attackMode: {summary: amSum, events: am}, gen4Jarama: {pressBestS: JAR, source: 'press (racer.com, autosport.com, 16 Nov 2026), not official timing', trackFactor: r(scJ, 4), modes: gen4},
  computeTime: {tracks: ct, ratio: ctRatio, pass: ctRatio <= 1.2}};
writeFileSync(OUT + '/fe-step35-report.json', JSON.stringify(report, null, 1));
const line = `FE step 35: measured unchanged ${identical}; σ_lap ${sigma.lap.measPct}% (stat ${sigma.lap.statPct}, sys ${sigma.lap.sysPct}, n ${sigma.lap.n}); sectors ${sigma.sectors.map(s => s.measPct).join('/')}%; good layouts ${Object.values(geometry).filter(g => g.good).length}/${Object.keys(geometry).length}; V1 ${verdict}${power ? ` (half-width ${r(power.half)} pp, n ${nG})` : ''}${ho ? `, held-out ${ho.baseRmsPct}→${ho.candRmsPct}% UB ${ho.ubLossPp} pp` : ''}; energy ${energy.every(e => e.pass) ? 'pass' : 'FAIL'}; AM rms ${amSum?.rmsS}s; compute ×${ctRatio}`;
console.log(line); console.log(JSON.stringify({geometry, sigma, v1: {...report.v1, reportOnlyAllLayouts: {...diagAll, rows: undefined}}, c1: report.c1, energy, am: amSum, gen4, ct}, null, 1));
if (process.env.GITHUB_ACTIONS) console.log(`::notice title=FE step 35::${line}`);
if (!identical) { console.error('measured input changed'); process.exit(1); }
