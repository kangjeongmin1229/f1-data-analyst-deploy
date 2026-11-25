// Step 32 (docs/prereg/step32-empirical-ggv-2026-11-25.md v2 f96f3571…, A1 b4b89126…, A2+A3 adc8a73f…, A4 66bff3c9…, A5 a22fd470…):
// empirical g-g-v tables (lateral, braking, traction: p95 per 20 km/h bin from the training tracks' top-10 quali laps on the driven line)
// + CdA level θ_s and DRS drag cut c_DRS,s per season on straight-end speed (pIce 540 kW, DRS 54 m delay), leave-one-track-out against
// the step 28 A2 baseline; physical decomposition and physics/energy checks per fold. Research only. 2022 never read (asserted).
// Scoring, corridor and DRS Δ copied from step31-fit.mjs (step 31 code unchanged). f_kerb = 0 (widths only).
// Usage (repo root):
//   node step32-loto.mjs kappa <out>             driven-line κ per track (input of step32_samples.py)
//   node step32-loto.mjs precheck <out>          all-track tables + decomposition + table checks + bootstrap (A2.5 feasibility, A3.4)
//   node step32-loto.mjs limits <precheck> <out> flag-on object for the G-S / G-T guards
//   node step32-loto.mjs fold <held> <out>       one 2023–25 fold
//   node step32-loto.mjs fold26 <held> <out>     one 2026 fold (report-only: own MDE 4.28 km/h > 3)
import {readFileSync, writeFileSync} from 'node:fs';
import {lapsimAllTracks as T} from '../../../worker/lapsim/tracks.js';
import {lapsimKernel} from '../../../worker/lapsim/kernel.js';
import {carsFor, realConditions} from '../../../worker/lapsim/scenario.js';
import {stage26, a2Grip26} from './step32-stage2026.mjs';

const K = lapsimKernel(), here = new URL('../data/', import.meta.url), G = 9.81;
const ALL = Object.values(JSON.parse(readFileSync(new URL('step32/traces-top10.json', here))).events);
const EV = ALL.filter(e => e.year <= 2025), EV26 = ALL.filter(e => e.year === 2026);
const COR = JSON.parse(readFileSync(new URL('step31/corridor.json', here)));
const CASES = readFileSync(new URL('f1-delta/f1-delta-cases-pooled-2026-11-24.csv', here), 'utf8').trim().split(/\r?\n/);
const ZT = readFileSync(new URL('f1-delta/zone-mapping-table.csv', here), 'utf8').trim().split(/\r?\n/), zh = splitCsv(ZT.shift());
const ZONES = {}; for (const l of ZT) { const r = Object.fromEntries(splitCsv(l).map((v, i) => [zh[i], v])); if (r.sim_from_m !== '' && +r.year >= 2023 && +r.year <= 2025) (ZONES[r.year + '|' + r.event] ??= []).push({n: +r.zone, z: [+r.sim_from_m, +r.sim_to_m]}); }
const head = CASES.shift().split(','), cases = CASES.map(l => Object.fromEntries(splitCsv(l).map((v, i) => [head[i], v]))).filter(c => c.kept === '1');
for (const x of [...ALL, ...cases]) if (!(+x.year >= 2023 && +x.year <= 2026)) throw new Error('year outside 2023-2026: ' + x.year); // 2022 LOCKED
// pre-reg constants: v2 §3 bins/N, §4 CdA prior and anchor; A3.2 c_DRS prior and 54 m delay; A2.1 decomposition constants and ranges
const SEASONS = [2023, 2024, 2025], P_ICE = 540000, FK = 0, BIN0 = 60, BINW = 20, BINS = 15, NMIN = 200, TMIN = 3, Q = 0.95, DELAY_M = 54;
const TH = {prior: [1.35, 0.12], lo: 0.99, hi: 1.71}, CD = {prior: [0.20, 0.015], lo: 0.155, hi: 0.245}, CDA_REF = 1.2820, VSE = 5;
const GRID = Array.from({length: 77}, (_, i) => i * 5), DMU = -5e-5, FZ0 = 3000, M_CAR = 806, REAR = 0.55, RHO_REF = 1.2, CLA_LOW_RATIO = 4.6 / 8;
const RANGE = {muY: [1.4, 2.2], clA: [4.5, 9.0], muRatio: [0.8, 1.2]};
const FOLD = [...new Set(EV.map(e => e.track))].sort(), shippedGrip = id => carsFor(id)['2025'].grip || 1;
const a2Grip = held => Math.exp(FOLD.filter(t => t !== held).reduce((a, t) => a + Math.log(shippedGrip(t)), 0) / (FOLD.length - 1));

function splitCsv(l) { const o = []; let c = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { o.push(c); c = ''; } else c += ch; } o.push(c); return o; }
const envOf = id => { const cs = realConditions(id), r = cs['2025'] || cs['2026'] || Object.values(cs)[0] || {}, p = (k, f) => Number.isFinite(r[k]) ? r[k] : f;
  return K.conditionsFromWeather({airTempC: p('airTempC', 25), trackTempC: p('trackTempC', 35), humidityPct: p('humidityPct', 50), pressureHpa: p('pressureHpa', 1013.25), windSpeed: p('windSpeed', 0), windFromDeg: p('windFromDeg', 0)}); };
const L = id => T[id].kappa.length * T[id].ds;

// corridor κ multiplier, copied from step31-fit.mjs (f_kerb 0 here)
const COR_MULT = new Map();
function corridorMult(id, fk) {
  const c = COR.tracks[id]; if (!c || fk == null) return null;
  const key = id + '|' + fk; if (COR_MULT.has(key)) return COR_MULT.get(key);
  const n = T[id].kappa.length, ds = T[id].ds, fs = COR.fs, m = new Float64Array(n).fill(1);
  for (const r of c.corners) {
    const sc = r.scale.map((x, i) => Math.min(...r.scale.slice(0, i + 1)));
    const j = Math.min(fs.length - 2, Math.floor(fk / (fs[1] - fs[0]))), w = (fk - fs[j]) / (fs[j + 1] - fs[j]), s = sc[j] + w * (sc[j + 1] - sc[j]);
    for (let k = 0; k < n; k++) {
      const d = Math.min(Math.abs(k - r.ia), n - Math.abs(k - r.ia)) * ds;
      const mk = d <= COR.core_m ? s : d <= COR.taper_m ? s + (1 - s) * (d - COR.core_m) / (COR.taper_m - COR.core_m) : 1;
      if (mk < m[k]) m[k] = mk;
    }
  }
  COR_MULT.set(key, m); return m;
}
const withCorridor = (id, tr) => { const m = corridorMult(id, FK); return m ? {...tr, kappa: Float64Array.from(tr.kappa, (x, i) => x * m[i])} : tr; };
function trackFor(id, zones, grip, cand) { // candidate: corridor + DRS low-drag state 54 m after activation (A3.2); baseline: as A2
  const d = T[id], zs = cand ? zones.map(([a, b]) => [(a + DELAY_M) % L(id), b]) : zones;
  let tr = K.trackFromData(d);
  tr = {...tr, aeroLow: zs.length ? K.trackFromData({...d, aeroZones: zs}, {aero: 'fia'}).aeroLow : new Uint8Array(d.kappa.length)};
  if (cand) tr = withCorridor(id, tr);
  return {...tr, mu: Float64Array.from(tr.mu, x => x * grip)};
}

// ---- tables (v2 §3, A2.6) ---------------------------------------------------------------------------------------------------
function pchip(x, y) { // copied from kernel.js lateralCapFn (Fritsch–Carlson), x in km/h
  const n = x.length, h = [], d = [], m = new Array(n).fill(0);
  for (let j = 0; j < n - 1; j++) { h[j] = x[j + 1] - x[j]; d[j] = (y[j + 1] - y[j]) / h[j]; }
  if (n > 1) { m[0] = d[0]; m[n - 1] = d[n - 2]; }
  for (let j = 1; j < n - 1; j++) m[j] = d[j - 1] * d[j] <= 0 ? 0 : 3 * (h[j - 1] + h[j]) / ((2 * h[j] + h[j - 1]) / d[j - 1] + (h[j] + 2 * h[j - 1]) / d[j]);
  return v => { if (n === 1 || v <= x[0]) return y[0]; if (v >= x[n - 1]) return y[n - 1]; let j = 0; while (v > x[j + 1]) j++;
    const s = (v - x[j]) / h[j], s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * y[j] + (s3 - 2 * s2 + s) * h[j] * m[j] + (-2 * s3 + 3 * s2) * y[j + 1] + (s3 - s2) * h[j] * m[j + 1]; };
}
const pct = (a, q) => { const s = Float64Array.from(a).sort(), x = q * (s.length - 1), i = Math.floor(x); return i + 1 < s.length ? s[i] + (x - i) * (s[i + 1] - s[i]) : s[i]; }; // numpy linear
function isotonic(y, w) { // weighted pool-adjacent-violators, non-decreasing
  const b = y.map((v, i) => ({v, w: w[i], n: 1}));
  for (let i = 0; i < b.length - 1;) { if (b[i].v > b[i + 1].v) { const W = b[i].w + b[i + 1].w; b.splice(i, 2, {v: (b[i].v * b[i].w + b[i + 1].v * b[i + 1].w) / W, w: W, n: b[i].n + b[i + 1].n}); i = Math.max(0, i - 1); } else i++; }
  return b.flatMap(x => Array(x.n).fill(x.v));
}
const binsOf = pts => { // one pass into 20 km/h bins (same result as filtering per bin)
  const a = Array.from({length: BINS}, () => []), t = Array.from({length: BINS}, () => new Set());
  for (const p of pts) { const j = Math.floor((p.v - BIN0) / BINW); if (j >= 0 && j < BINS) { a[j].push(p.a); t[j].add(p.t); } }
  return a.map((x, j) => ({lo: BIN0 + j * BINW, c: BIN0 + j * BINW + BINW / 2, n: x.length, tracks: t[j].size, p95: x.length ? pct(x, Q) : null})); };
function table(pts, traction = false) {
  const bins = binsOf(pts), ok = bins.map(b => b.n >= NMIN && b.tracks >= TMIN); let best = [0, -1];
  for (let i = 0; i < BINS; i++) if (ok[i]) { let j = i; while (j + 1 < BINS && ok[j + 1]) j++; if (j - i > best[1] - best[0]) best = [i, j]; i = j; }
  let [i0, i1] = best; if (i1 < i0) throw new Error('no bin with N >= 200 from >= 3 tracks');
  if (traction) { let jm = i0; for (let j = i0; j <= i1; j++) if (bins[j].p95 > bins[jm].p95) jm = j; i1 = Math.min(i1, Math.max(jm, i0 + 1)); } // A2.6: ≥ 2 bins
  if (i1 - i0 < 1) throw new Error('data range < 2 bins');
  const R = bins.slice(i0, i1 + 1), yi = isotonic(R.map(b => b.p95), R.map(b => b.n)), xc = R.map(b => b.c), f = pchip(xc, yi);
  const edge = (idx, e) => { const ve = xc[e] / 3.6, ye = yi[e]; let sn = 0, sd = 0; for (const k of idx) { const dv = (xc[k] / 3.6) ** 2 - ve * ve; sn += (yi[k] - ye) * dv; sd += dv * dv; }
    return {ve, ye, b: sd > 0 ? Math.max(0, sn / sd) : 0}; };
  const m = xc.length, lo = edge([0, 1, 2].filter(k => k < m), 0), hi = edge([m - 1, m - 2, m - 3].filter(k => k >= 0), m - 1);
  const a = GRID.map(v => v < xc[0] ? Math.max(0.5 * lo.ye, lo.ye + lo.b * ((v / 3.6) ** 2 - lo.ve ** 2)) : v > xc[m - 1] ? hi.ye + hi.b * ((v / 3.6) ** 2 - hi.ve ** 2) : f(v));
  for (let k = 1; k < a.length; k++) if (a[k] < a[k - 1] - 1e-9) throw new Error('table not monotone'); // self-check
  return {kph: GRID, a, at: pchip(GRID, a), range: [R[0].lo, R[R.length - 1].lo + BINW], centres: xc,
    bins: bins.map((b, j) => ({lo: b.lo, n: b.n, tracks: b.tracks, p95: b.p95, iso: j >= i0 && j <= i1 ? yi[j - i0] : null}))};
}
const SAMPLES = (() => { try { return JSON.parse(readFileSync(new URL('step32/samples.json', here))); } catch { return null; } })();
function pointsFor(keys, dr, inertia) { // per-sample drag/roll correction, then p95 (A2.6)
  const lat = [], brk = [], trc = [], trcLow = []; // A6.3: corner-mode tables from state-0 samples only; low-state traction separately
  for (const k of keys) { const s = SAMPLES[k]; if (!s) continue; // laps dropped by the A6.1 normalisation check have no samples
    for (let i = 0; i < s.v.length; i++) { const v = s.v[i], ax = s.ax[i] * G, lowS = s.low[i] > 0;
      if (s.exit[i] && ax > 0) (lowS ? trcLow : trc).push({v, a: ax * inertia + dr(s.track, v, lowS), t: s.track}); // kernel drive: (f − drag − roll)/(m·inertia)
      if (lowS) continue;
      lat.push({v, a: s.ay[i] * G, t: s.track});
      if (ax < 0) brk.push({v, a: -ax - dr(s.track, v, false), t: s.track}); } } // kernel braking: (fx + drag + roll)/m, no inertia factor
  return {lat, brk, trc, trcLow};
}
const tablesOf = P => { let trcLow = null; try { trcLow = table(P.trcLow, true); } catch { trcLow = null; } // < 2 valid bins → corner traction × load ratio (A6.3)
  return {lat: table(P.lat), brk: table(P.brk), trc: table(P.trc, true), trcLow}; };
const drOf = (car, rhoOf) => (id, vk, low) => { const v = vk / 3.6, aero = 0.5 * rhoOf(id) * v * v; return (aero * (low ? car.cdALow ?? car.cdA : car.cdA) + (car.cRoll ?? 0.012) * (car.mass * G + aero * (low ? car.clALow ?? car.clA : car.clA))) / car.mass; };

// ---- physical decomposition and table checks (A2.1) ----------------------------------------------------------------------------
const loadPerMass = (clA, vk) => (M_CAR * G + 0.5 * RHO_REF * clA * (vk / 3.6) ** 2) / M_CAR;
function decompose(tb) {
  const c = tb.lat.centres, y = c.map(v => tb.lat.at(v)), w = c.map(v => tb.lat.bins.find(b => b.c === v)?.n || 1);
  let best = null;
  for (let clA = 0; clA <= 20.0001; clA += 0.01) { // μ0 has a closed form at fixed ClA (a = μ0·Fz/m + dμ(Fz/4 − Fz0)·Fz/m)
    const Fz = c.map(v => loadPerMass(clA, v) * M_CAR), cc = Fz.map(f => f / M_CAR), bb = Fz.map(f => DMU * (f / 4 - FZ0) * f / M_CAR);
    const mu0 = c.reduce((s, _, i) => s + w[i] * (y[i] - bb[i]) * cc[i], 0) / c.reduce((s, _, i) => s + w[i] * cc[i] ** 2, 0);
    const sse = c.reduce((s, _, i) => s + w[i] * (y[i] - mu0 * cc[i] - bb[i]) ** 2, 0); if (!best || sse < best.sse) best = {clA, mu0, sse};
  }
  const muY = c.map(v => tb.lat.at(v) / loadPerMass(best.clA, v)); // implied μ_y at each bin load
  const both = tb.brk.centres.filter(v => v >= tb.lat.range[0] && v < tb.lat.range[1]), ratio = both.map(v => tb.brk.at(v) / tb.lat.at(v));
  const muX = v => tb.brk.at(v) / loadPerMass(best.clA, v), rearLim = tb.trc.centres.map(v => ({v, trac: tb.trc.at(v), lim: muX(v) * (REAR * G + REAR * 0.5 * RHO_REF * best.clA * (v / 3.6) ** 2 / M_CAR)}));
  const P1 = muY.every(m => m >= RANGE.muY[0] && m <= RANGE.muY[1]) && best.clA >= RANGE.clA[0] && best.clA <= RANGE.clA[1];
  const P2 = tb.brk.a.every(a => a >= 0) && ratio.every(r => r >= RANGE.muRatio[0] && r <= RANGE.muRatio[1]);
  const P3b = rearLim.every(r => r.trac <= r.lim);
  return {clA: best.clA, mu0: best.mu0, rmsFit: Math.sqrt(best.sse / w.reduce((a, b) => a + b, 0)), muY: c.map((v, i) => ({v, muY: muY[i]})),
    muRatio: both.map((v, i) => ({v, ratio: ratio[i]})), rearLimit: rearLim, checks: {P1, P2, P3b}};
}
const lowLoadOf = dec => ({clA: dec.clA, clALow: dec.clA * CLA_LOW_RATIO, mu0: dec.mu0, dmu: DMU, fz0: FZ0});
const withTables = (car, tb, dec) => ({...car, lateralCap: {kind: 'table', kph: tb.lat.kph, ay: tb.lat.a, rhoRef: RHO_REF, lowLoad: lowLoadOf(dec)},
  decoupled: {brake: {kph: tb.brk.kph, a: tb.brk.a}, trac: {kph: tb.trc.kph, a: tb.trc.a}, ...(tb.trcLow ? {tracLow: {kph: tb.trcLow.kph, a: tb.trcLow.a}} : {}), lowLoad: lowLoadOf(dec)}});
// A5 G-TR: traction table inside the 95 % track-cluster bootstrap CI of each bin's p95 (200 resamples, seed 32)
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function tractionCI(pts, tb) {
  const r = rng(32), trk = [...new Set(pts.map(p => p.t))], by = Object.fromEntries(trk.map(t => [t, pts.filter(p => p.t === t)]));
  const bs = Array.from({length: 200}, () => { const s = trk.map(() => trk[Math.floor(r() * trk.length)]).flatMap(t => by[t]); return binsOf(s); });
  return tb.trc.centres.map(c => { const j = (c - BIN0 - BINW / 2) / BINW, xs = bs.map(b => b[j].p95).filter(x => x != null).sort((a, b) => a - b);
    const lo = xs[Math.floor(0.025 * (xs.length - 1))], hi = xs[Math.ceil(0.975 * (xs.length - 1))], v = tb.trc.at(c); return {v: c, table: v, lo, hi, ok: v >= lo && v <= hi}; });
}

// ---- cars, sims, checks -------------------------------------------------------------------------------------------------------
const RHO = {}, rho = id => (RHO[id] ??= envOf(id).rho ?? 1.2), INERTIA = carsFor(FOLD[0])['2025'].car.inertiaFactor ?? 1;
const SHIP = {}, ship = (id, y) => (SHIP[id + y] ??= carsFor(id)[y].car); // carsFor is costly; the shipped car per track is fixed
const CDA_MEMO = new Map(), cdaCar = (id, th, c) => { const key = id + '|' + th + '|' + c; if (CDA_MEMO.has(key)) return CDA_MEMO.get(key);
  const s = ship(id, '2025'), k = th / CDA_REF, o = {...s, pIce: P_ICE, cdA: s.cdA * k, cdALow: s.cdA * k * (1 - c), clALow: s.clA * CLA_LOW_RATIO}; if (CDA_MEMO.size > 5000) CDA_MEMO.clear(); CDA_MEMO.set(key, o); return o; };
function energyOk(r) { // A2.2: ERS flows close within 0.1 %, deploy within the budget
  if (!r.flow || !r.energy) return true; const sum = a => a.reduce((x, y) => x + y, 0), e = r.energy, tol = x => Math.max(1, 1e-3 * Math.abs(x));
  return Math.abs(sum(r.flow.dep) - e.deployJ) <= tol(e.deployJ) && Math.abs(sum(r.flow.brk) + sum(r.flow.thr) - e.regenJ) <= tol(e.regenJ) && e.deployJ <= e.budgetJ * 1.001;
}
// D1 (diagnostics f718796d…): the check as run used the step's midpoint speed and was stricter than the kernel's own step (0.01 m/s²
// excess at 270–277 km/h, Montreal); fixed: the kernel's drive force (opts.probe) ≤ (P_ICE·η_d + P_ERS·η_k·η_d)/v at every drive step.
function powerOkProbe(PR, car, r) { const v = r.v, n = v.length, eta = car.etaDrive ?? 0.96, pm = car.pIce * eta + (car.ers?.pMax ?? 0) * (car.etaErs ?? 0.95) * eta; let worst = -Infinity;
  for (let i = 0; i < n; i++) { if (!(v[(i + 1) % n] > v[i]) || v[i] < 5) continue; worst = Math.max(worst, PR.drive(v[i], i).fx - pm / v[i]); } return {ok: worst <= 1, worst}; }
function powerOk(tr, car, r, env) { // A2.1 traction (a): drive acceleration never above the power limit (full ICE + ERS, lowest drag)
  const n = r.v.length, ds = tr.ds, pmax = car.pIce * (car.etaDrive ?? 1) + (car.ers?.pMax ?? 0) * (car.etaErs ?? 1), aF = 0.5 * (env.rho ?? 1.2);
  let worst = -Infinity;
  for (let i = 0; i < n; i++) { const v0 = r.v[i], v1 = r.v[(i + 1) % n]; if (v1 <= v0 || v0 < 5) continue;
    const a = (v1 * v1 - v0 * v0) / (2 * ds), vm = 0.5 * (v0 + v1), drag = aF * Math.min(car.cdA, car.cdALow ?? car.cdA) * vm * vm, roll = (car.cRoll ?? 0.012) * car.mass * G;
    const lim = (pmax / vm - drag - roll) / (car.mass * (car.inertiaFactor ?? 1)) + G * Math.max(0, -Math.sin(tr.grade ? tr.grade[i] : 0));
    worst = Math.max(worst, a - lim); }
  return {ok: worst <= 1e-6, worst};
}
const memo = new Map();
function sim(id, zones, car, grip, cand) {
  const k = JSON.stringify([id, zones, car.cdA, car.cdALow, car.pIce, car.lateralCap?.ay, car.decoupled?.brake?.a, car.decoupled?.trac?.a, car.lateralCap?.lowLoad, grip, cand]);
  if (memo.has(k)) return memo.get(k);
  const tr = trackFor(id, zones, grip, cand), env = envOf(id), r = K.simulateLap(tr, car, env);
  const out = {v: Array.from(r.v, x => x * 3.6), time: r.time, lap: r.lapTime, ds: T[id].ds, energyOk: energyOk(r), power: cand ? powerOk(tr, car, r, env) : null,
    lowR: cand && car.lateralCap?.lowLoad ? lowRatios(tr, car, r, env) : null};
  if (memo.size > 400) memo.clear(); memo.set(k, out); return out;
}
function lowRatios(tr, car, r, env) { // A2.1 / G-P4: the load ratio wherever the low-drag state is active (same formula as kernel lowR)
  const LL = car.lateralCap.lowLoad, mg = car.mass * G, muFz = F => (LL.mu0 + LL.dmu * (F / 4 - LL.fz0)) * F, out = [];
  for (let i = 0; i < r.v.length; i++) { const low = Math.min(1, Math.max(0, Number(tr.aeroLow[i]) || 0)); if (!low) continue;
    const q = 0.5 * (env.rho ?? 1.2) * r.v[i] ** 2; out.push(muFz(mg + q * (LL.clA + low * (LL.clALow - LL.clA))) / muFz(mg + q * LL.clA)); }
  return out.length ? {n: out.length, max: Math.max(...out), min: Math.min(...out), ok: Math.max(...out) < 1} : {n: 0, ok: true};
}

// ---- scores (copied from step31-fit.mjs score) + straight-end residuals -----------------------------------------------------
function score(e, r) {
  const n = e.n, ds = e.ds, meas = e.a.map(x => x == null ? NaN : x), vm = k => r.v[(((k - e.shift) % n) + n) % n], w = Math.trunc(40 / ds);
  const apex = [], entry = [], exit = [], st = e.straights;
  e.corners.forEach(([i], j) => {
    let vmin = Infinity; for (let q = -w; q <= w; q++) vmin = Math.min(vmin, vm(i + q));
    apex.push({meas: meas[i], err: vmin - meas[i]});
    if (st.length < 2) return;
    const a0 = st[j], a1 = st[(j + 1) % st.length], seg = []; for (let q = a0; q <= a1 + (a1 <= a0 ? n : 0); q++) seg.push(q % n);
    const k0 = seg.indexOf(i); if (k0 < 0) return;
    const vv = seg.map(q => meas[q]), dt = seg.map((q, z) => Number.isFinite(vv[z]) ? ds / (vm(q) / 3.6) - ds / (vv[z] / 3.6) : 0);
    let lo = k0, hi = k0; const lim = 1.05 * meas[i];
    while (lo > 0 && Number.isFinite(vv[lo - 1]) && vv[lo - 1] <= lim) lo--;
    while (hi < seg.length - 1 && Number.isFinite(vv[hi + 1]) && vv[hi + 1] <= lim) hi++;
    entry.push(dt.slice(0, lo).reduce((a, b) => a + b, 0)); exit.push(dt.slice(hi + 1).reduce((a, b) => a + b, 0));
  });
  const rms = xs => xs.length ? Math.sqrt(xs.reduce((s, x) => s + x * x, 0) / xs.length) : null, mean = xs => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
  const band = (lo, hi) => rms(apex.filter(c => c.meas >= lo && c.meas < hi).map(c => c.err)), se = strEnd(e, r);
  return {apex60_120: band(60, 120), apex120_180: band(120, 180), apex180_240: band(180, 240), apex120_240: band(120, 240), apexAll: rms(apex.map(c => c.err)),
    entry: rms(entry), exit: rms(exit), exitMean: mean(exit), lapErr: 100 * (r.lap - e.lap_meas_s) / e.lap_meas_s, strEndBias: mean(se), strEndRms: rms(se)};
}
function strEnd(e, r) { // model max v within ±40 m of each measured straight end, minus the measured v there (km/h)
  const n = e.n, w = Math.trunc(40 / e.ds), vm = k => r.v[(((k - e.shift) % n) + n) % n];
  return e.straights.filter(k => e.a[k] != null).map(k => { let m = -Infinity; for (let q = -w; q <= w; q++) m = Math.max(m, vm(k + q)); return m - e.a[k]; });
}
function golden(f, lo, hi, it) {
  const g = (Math.sqrt(5) - 1) / 2; let c = hi - g * (hi - lo), d = lo + g * (hi - lo), fc = f(c), fd = f(d);
  for (let i = 0; i < it; i++) { if (fc < fd) { hi = d; d = c; fd = fc; c = hi - g * (hi - lo); fc = f(c); } else { lo = c; c = d; fc = fd; d = lo + g * (hi - lo); fd = f(d); } }
  return (lo + hi) / 2;
}
// DRS Δ for one pooled case, copied from step31-fit.mjs drsPred
function drsPred(c, run) {
  const zl = ZONES[c.year + '|' + c.event]; if (!zl) return null; const zones = zl.map(q => q.z), z = zl.find(q => q.n === +c.zone)?.z; if (!z) return null;
  const Ln = L(c.track), a = z[0], end = (z[1] < z[0] ? z[1] + Ln : z[1]) + 150, others = zones.filter(q => q !== z);
  const tAt = (r, s) => { const lap = r.lap, ex = s >= Ln ? lap : 0, x = (s % Ln) / r.ds, i = Math.floor(x), m = r.time.length, t0 = r.time[i % m], t1 = i + 1 < m ? r.time[i + 1] : lap; return ex + t0 + (t1 - t0) * (x - i); };
  const on = run(zones), off = run(others);
  return (tAt(on, end) - tAt(on, a)) - (tAt(off, end) - tAt(off, a));
}

// ---- fit per season (v2 §4 + A3.2): tables at the prior mean → θ (c fixed) → c → tables at θ → θ → c ---------------------------
const keyOf = e => `${e.session}|${e.drv}`;
function seasonFit(train, s) {
  const ev = train.filter(e => e.year === s), keys = ev.map(keyOf);
  const build = (th, c) => { const pts = pointsFor(keys, (id, vk, low) => drOf(cdaCar(id, th, c), rho)(id, vk, low), INERTIA), tb = tablesOf(pts); return {pts, tb, dec: decompose(tb)}; };
  let th = TH.prior[0], c = CD.prior[0], B = build(th, c); const log = [];
  const J = (x, y) => ev.reduce((a, e) => a + strEnd(e, sim(e.track, e.zones, withTables(cdaCar(e.track, x, y), B.tb, B.dec), 1, true)).reduce((q, r) => q + (r / VSE) ** 2, 0), 0)
    + ((x - TH.prior[0]) / TH.prior[1]) ** 2 + ((y - CD.prior[0]) / CD.prior[1]) ** 2;
  for (let pass = 0; pass < 2; pass++) {
    th = golden(x => J(x, c), TH.lo, TH.hi, 20); c = golden(y => J(th, y), CD.lo, CD.hi, 20); log.push({pass, th, c, J: J(th, c)});
    if (pass === 0) B = build(th, c);
  }
  const grid = (lo, hi) => Array.from({length: 9}, (_, i) => lo + i * (hi - lo) / 8), Jm = J(th, c);
  const prof = (xs, f) => { const v = xs.map(x => ({x, J: f(x)})), ins = v.filter(q => q.J - Jm <= 2.71).map(q => q.x); return {grid: v, interval90: ins.length ? [Math.min(...ins), Math.max(...ins)] : null}; };
  const atEnd = (x, lo, hi) => (x - lo) / (hi - lo) < 0.005 || (hi - x) / (hi - lo) < 0.005;
  return {th, c, zTh: (th - TH.prior[0]) / TH.prior[1], zC: (c - CD.prior[0]) / CD.prior[1], thAtEnd: atEnd(th, TH.lo, TH.hi), cAtEnd: atEnd(c, CD.lo, CD.hi),
    profileTh: prof(grid(TH.lo, TH.hi), x => J(x, c)), profileC: prof(grid(CD.lo, CD.hi), y => J(th, y)), tb: B.tb, dec: B.dec, trCI: tractionCI(B.pts.trc, B.tb), log};
}
const slimTb = tb => Object.fromEntries(Object.entries(tb).filter(([, t]) => t).map(([k, t]) => [k, {a: t.a.map(x => Math.round(x * 1e4) / 1e4), range: t.range, bins: t.bins}]));
const slimFit = f => ({cdA_median_track: f.th, c_drs: f.c, zTh: f.zTh, zC: f.zC, thAtEnd: f.thAtEnd, cAtEnd: f.cAtEnd, profileTh: f.profileTh, profileC: f.profileC,
  decomposition: f.dec, tractionCI: f.trCI, tables: slimTb(f.tb), log: f.log});

// exports for step32-forward.mjs (A7); the CLI below runs only when this file is the entry point
export {powerOkProbe, K, T, EV, EV26, ALL, COR, cases, ZONES, FOLD, a2Grip, envOf, trackFor, withCorridor, score, strEnd, golden, drsPred, energyOk, powerOk, keyOf, rho, rng, pct, CDA_REF, P_ICE, TH, CD, VSE, BIN0, BINW, BINS, NMIN, TMIN, Q, DMU, FZ0, M_CAR, RANGE, CLA_LOW_RATIO, ship};
const MAIN = process.argv[1] && new URL(import.meta.url).pathname === (await import('node:path')).resolve(process.argv[1]);
const [mode, arg, arg2] = MAIN ? process.argv.slice(2) : [];
if (!MAIN) { /* imported */ } else if (mode === 'kappa') { // driven-line κ per track + the model's low-drag state per session (A6.3: 2023–25 zones + 54 m, 2026 withZones)
  const ids = [...new Set(ALL.map(e => e.track))], low = {};
  for (const e of ALL) if (!low[e.session]) low[e.session] = Array.from(e.year === 2026 ? stage26(e.track).tr.aeroLow : trackFor(e.track, e.zones, 1, true).aeroLow, x => Math.min(1, Math.max(0, Number(x) || 0)));
  writeFileSync(arg, JSON.stringify({kappa: Object.fromEntries(ids.map(id => [id, Array.from(withCorridor(id, K.trackFromData(T[id])).kappa)])), low}));
  console.log(ids.length, 'tracks', Object.keys(low).length, 'sessions');
} else if (mode === 'precheck') { // A2.5 feasibility + A3.4 decomposition bootstrap on the all-track tables (θ, c at prior means)
  const out = {}, r = rng(32);
  for (const s of SEASONS) {
    const ev = EV.filter(e => e.year === s), dr = (id, vk, low) => drOf(cdaCar(id, TH.prior[0], CD.prior[0]), rho)(id, vk, low);
    const pts = pointsFor(ev.map(keyOf), dr, INERTIA), tb = tablesOf(pts), dec = decompose(tb), trk = [...new Set(ev.map(e => e.track))], boot = [];
    for (let b = 0; b < 200; b++) { const pick = trk.map(() => trk[Math.floor(r() * trk.length)]), keys = pick.flatMap(t => ev.filter(e => e.track === t).map(keyOf));
      try { const d = decompose(tablesOf(pointsFor(keys, dr, INERTIA))); boot.push({clA: d.clA, mu0: d.mu0, muYmin: Math.min(...d.muY.map(q => q.muY)), muYmax: Math.max(...d.muY.map(q => q.muY)), ratioMin: Math.min(...d.muRatio.map(q => q.ratio)), ratioMax: Math.max(...d.muRatio.map(q => q.ratio))}); } catch { boot.push(null); } }
    const q90 = k => { const xs = boot.filter(Boolean).map(b => b[k]).sort((a, b) => a - b); return [xs[Math.floor(0.05 * (xs.length - 1))], xs[Math.ceil(0.95 * (xs.length - 1))]]; };
    out[s] = {decomposition: dec, bootstrap90: {clA: q90('clA'), mu0: q90('mu0'), muYmin: q90('muYmin'), muYmax: q90('muYmax'), ratioMin: q90('ratioMin'), ratioMax: q90('ratioMax')},
      bootFailed: boot.filter(b => !b).length, tractionCI: tractionCI(pts.trc, tb), tables: slimTb(tb)};
  }
  const feasible = SEASONS.every(s => Object.values(out[s].decomposition.checks).every(Boolean));
  writeFileSync(arg, JSON.stringify({feasible, seasons: out}));
  console.log('feasible', feasible, JSON.stringify(Object.fromEntries(SEASONS.map(s => [s, out[s].decomposition.checks]))));
} else if (mode === 'fold') {
  const held = arg, train = EV.filter(e => e.track !== held), test = EV.filter(e => e.track === held);
  if (!test.length) throw new Error('no laps for ' + held);
  const F = Object.fromEntries(SEASONS.map(s => [s, seasonFit(train, s)])), g2 = a2Grip(held), r2 = a => a.map(x => Math.round(x * 100) / 100);
  const candCar = (id, s) => withTables(cdaCar(id, F[s].th, F[s].c), F[s].tb, F[s].dec), baseCar = id => carsFor(id)['2025'].car;
  const heldScores = test.map(e => { const rc = sim(e.track, e.zones, candCar(e.track, e.year), 1, true), rb = sim(e.track, e.zones, baseCar(e.track), g2, false);
    return {key: keyOf(e), session: e.session, year: e.year, rank: e.rank, cand: score(e, rc), base: score(e, rb),
      checks: {energyCand: rc.energyOk, energyBase: rb.energyOk, power: rc.power, lowR: rc.lowR}, vCand: e.rank === 1 ? r2(rc.v) : undefined, vBase: e.rank === 1 ? r2(rb.v) : undefined}; });
  const sessV = {}; for (const e of test) { if (!sessV[e.session]) { sessV[e.session] = {cand: r2(sim(e.track, e.zones, candCar(e.track, e.year), 1, true).v), base: r2(sim(e.track, e.zones, baseCar(e.track), g2, false).v)}; } }
  const drs = cases.filter(c => c.track === held).map(c => ({id: c.case_id, year: +c.year, meas: +c.meas_delta_s,
    cand: drsPred(c, zs => sim(c.track, zs, candCar(c.track, +c.year), 1, true)), base: drsPred(c, zs => sim(c.track, zs, baseCar(c.track), g2, false))}));
  writeFileSync(arg2, JSON.stringify({held, variant: 'V1', baseline: 'A2', corridor: !!COR.tracks[held], fits: Object.fromEntries(SEASONS.map(s => [s, slimFit(F[s])])), heldScores, sessV, drs}));
  console.log(held, 'laps', test.length, 'drs', drs.length);
} else if (mode === 'fold26') { // 2026 group (report-only, own MDE 4.28 > 3): own LOTO and tables; CdA and CdA_low per aero state (A6.3)
  const held = arg, train = EV26.filter(e => e.track !== held), test = EV26.filter(e => e.track === held); if (!test.length) throw new Error('no 2026 laps for ' + held);
  const shipC = carsFor(held)['2026'].car, R26 = {}, rho26 = id => (R26[id] ??= stage26(id).env.rho ?? 1.2), PR = {cd: [shipC.cdA, 0.1 * shipC.cdA], cdl: [shipC.cdALow ?? shipC.cdA, 0.1 * (shipC.cdALow ?? shipC.cdA)]};
  const car26 = (id, cd, cdl) => { const c = ship(id, '2026'), f = cd / shipC.cdA, fl = cdl / (shipC.cdALow ?? shipC.cdA); return {...c, cdA: c.cdA * f, cdALow: (c.cdALow ?? c.cdA) * fl}; }; // per-track trims kept
  const build = (cd, cdl) => { const pts = pointsFor(train.map(keyOf), (id, vk, low) => drOf(car26(id, cd, cdl), rho26)(id, vk, low), shipC.inertiaFactor ?? 1), tb = tablesOf(pts); return {pts, tb, dec: decompose(tb)}; };
  const memo26 = new Map();
  const run = (cand, id, car, keyx) => { const k = cand + id + keyx; if (memo26.has(k)) return memo26.get(k); const s = stage26(id), tr0 = cand ? withCorridor(id, s.tr) : s.tr, g = cand ? 1 : a2Grip26(id);
    const tr = {...tr0, mu: Float64Array.from(tr0.mu, m => m * g)}, r = K.simulateLap(tr, car, s.env);
    const o = {v: Array.from(r.v, x => x * 3.6), lap: r.lapTime * (s.c.timeScale || 1), energyOk: energyOk(r), power: cand ? powerOk(tr, car, r, s.env) : null}; memo26.set(k, o); return o; };
  let cd = PR.cd[0], cdl = PR.cdl[0], B = build(cd, cdl);
  const sessions = [...new Map(train.map(e => [e.session, e])).values()];
  const J = (x, y) => train.reduce((a, e) => a + strEnd(e, run(true, e.track, withTables(car26(e.track, x, y), B.tb, B.dec), [x, y, B.tb.lat.a[40]].join())).reduce((q, r) => q + (r / VSE) ** 2, 0), 0)
    + ((x - PR.cd[0]) / PR.cd[1]) ** 2 + ((y - PR.cdl[0]) / PR.cdl[1]) ** 2;
  const log = [];
  for (let pass = 0; pass < 2; pass++) { cd = golden(x => J(x, cdl), PR.cd[0] - 3 * PR.cd[1], PR.cd[0] + 3 * PR.cd[1], 20); cdl = golden(y => J(cd, y), PR.cdl[0] - 3 * PR.cdl[1], PR.cdl[0] + 3 * PR.cdl[1], 20); log.push({pass, cd, cdl, J: J(cd, cdl)}); if (pass === 0) B = build(cd, cdl); }
  const cand = withTables(car26(held, cd, cdl), B.tb, B.dec);
  const heldScores = test.map(e => { const rc = run(true, e.track, cand, 'held'), rb = run(false, e.track, carsFor(e.track)['2026'].car, 'base');
    return {key: keyOf(e), session: e.session, year: 2026, rank: e.rank, cand: score(e, rc), base: score(e, rb), checks: {energyCand: rc.energyOk, energyBase: rb.energyOk, power: rc.power}}; });
  writeFileSync(arg2, JSON.stringify({held, group: 2026, corridor: !!COR.tracks[held], drag: {cdA: cd, cdALow: cdl, prior: PR, zCd: (cd - PR.cd[0]) / PR.cd[1], zCdl: (cdl - PR.cdl[0]) / PR.cdl[1]},
    decomposition: B.dec, tractionCI: tractionCI(B.pts.trc, B.tb), tables: slimTb(B.tb), log, heldScores, sessions: sessions.length}));
  console.log('2026', held, 'laps', test.length);
} else if (mode === 'limits') { // flag-on object for the G-S / G-T guards (step32-limits-data.js shape) from the all-track 2025 tables
  const pre = JSON.parse(readFileSync(arg, 'utf8')).seasons['2025'], tb = Object.fromEntries(Object.entries(pre.tables).map(([k, t]) => [k, {...t, kph: GRID}]));
  const car = {pIce: P_ICE, cdAScale: TH.prior[0] / CDA_REF, cdALowRatio: 1 - CD.prior[0], ...withTables({}, tb, pre.decomposition)};
  writeFileSync(arg2, JSON.stringify({2025: {car}, 2026: {car: {lateralCap: car.lateralCap, decoupled: car.decoupled}}}));
  console.log('limits written');
} else if (MAIN) throw new Error('mode: kappa | precheck | limits | fold | fold26');
