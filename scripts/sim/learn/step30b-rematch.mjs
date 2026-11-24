// Step 30b corner-matching audit (central 2026-11-25, decision 1; report-only, post-hoc).
// Old table (f1-pedal-corners.mjs): measured corners paired with model corners by lap share ±1.5 %.
// New: the step-24 offset method (scripts/sim/f1-delta-offset.py): measured speed trace on the model grid (share × L), lag by
// cross-correlation with the page model speed over ±200 m, per third of the lap (positive lag = telemetry ahead). Then measured and model
// speed minima are paired mutual-nearest in the aligned frame within ±50 m. Same corner detector (metrics) and same cleaning as before.
// Out: scripts/sim/data/step30b/corners-rematched-<years>.csv (+ .sha256) and rematch-audit-<years>.json.
// 2023-24 pole laps (scripts/sim/data/f1-pole-tel-2023-2024.json) run against the 2025 car on the page, as the step-26 throttle LOTO.
// Usage: node scripts/sim/learn/step30b-rematch.mjs 2025,2026   (2022 is refused)
import {writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {lapsimF1RealTel} from '../../../worker/lapsim/f1-real-telemetry-data.js';
import {lapsimF1WetQuali} from '../../../worker/lapsim/f1-wet-quali-data.js';
import {isLockedF1} from '../locked-set.mjs';
import {cleanTel} from '../../../worker/lapsim/real-tel-gaps.js';
import {page, kapOf, metrics, pairs} from './f1-pedal-metrics.mjs';

const years = (process.argv[2] || '2025,2026').split(',');
if (years.includes('2022')) throw new Error('2022 is the locked set');
const old = JSON.parse(readFileSync('scripts/sim/data/f1-pole-tel-2023-2024.json', 'utf8'));
const sha = t => createHash('sha256').update(t).digest('hex');
const tel = (tr, y) => (+y >= 2025 ? lapsimF1RealTel[tr]?.[y] : old.laps[tr]?.[y]) || null;
const tracks = [...new Set([...Object.keys(lapsimF1RealTel), ...Object.keys(old.laps)])].sort();
const LAG = 200, WIN = 50, DS = 5, f3 = x => Number.isFinite(x) ? +x.toFixed(3) : '';

function lagOf(a, b, lo, hi) { // a measured, b model, both on the same circular grid
  const n = b.length; let best = -2, bl = 0;
  for (let L = -LAG / DS; L <= LAG / DS; L++) {
    let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, k = 0;
    for (let i = lo; i < hi; i++) { const x = a[i], y = b[((i - L) % n + n) % n]; if (!Number.isFinite(x)) continue; sx += x; sy += y; sxx += x * x; syy += y * y; sxy += x * y; k++; }
    if (k < 20) continue; const c = (sxy - sx * sy / k) / Math.sqrt((sxx - sx * sx / k) * (syy - sy * sy / k));
    if (c > best) { best = c; bl = L; }
  }
  return [bl * DS, best];
}
const interp = (xs, ys, x) => { if (x < xs[0] || x > xs.at(-1)) return NaN; let lo = 0, hi = xs.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; } const f = (x - xs[lo]) / ((xs[hi] - xs[lo]) || 1); return ys[lo] + f * (ys[hi] - ys[lo]); };

const rows = ['track,season,corner_id,lap_share,apex_kph_meas,apex_kph_model,meas_share_raw,meas_share_aligned,model_share,lag_m,old_paired_model_share,changed'];
const audit = [];
for (const y of years) for (const tr of tracks) {
  const r = tel(tr, y); if (!r || lapsimF1WetQuali[tr]?.[y] || isLockedF1(tr, y)) continue;
  const P = page(tr, +y >= 2025 ? y : '2025'); if (!P) { audit.push({track: tr, season: y, skipped: 'no page car'}); continue; }
  const c = cleanTel(r); if (c.share > 0.5) continue;
  const kap = kapOf(P.kappa), M = metrics(c.x, c.speed.map(s => s / 3.6), c.throttle.map(Number), c.brake.map(b => b > 0 ? 1 : 0), r.len, kap);
  const S = metrics(P.x, P.v, P.th, P.brOn, P.L, kap), L = P.L, n = Math.round(L / DS);
  const mC = M.corners.filter(e => !c.near(e.s * r.len)), oldPairs = pairs(mC, S.corners);
  // offset (step 24 v2): measured speed on the model grid by share × L, model speed on the same grid
  const xs = c.x.map(x => x / r.len * L), a = Array.from({length: n}, (_, i) => interp(xs, c.speed, i * DS)), b = Array.from({length: n}, (_, i) => interp(P.x, P.v, i * DS) * 3.6);
  const whole = lagOf(a, b, 0, n), thirds = [0, 1, 2].map(k => lagOf(a, b, Math.floor(k * n / 3), Math.floor((k + 1) * n / 3)));
  // a third's lag is used only if its own correlation ≥ 0.9 and it is within ±50 m of the whole-lap lag; otherwise the whole-lap lag
  const lagAt = sM => { const t = thirds[Math.min(2, Math.floor(sM / L * 3))]; return t[1] >= 0.9 && Math.abs(t[0] - whole[0]) <= 50 ? t[0] : whole[0]; };
  const mPos = mC.map(m => { const s = m.s * L; return ((s - lagAt(s)) % L + L) % L; }), sPos = S.corners.map(p => p.s * L);
  const dist = (u, v) => { const d = Math.abs(u - v) % L; return Math.min(d, L - d); };
  const nearest = (p, arr) => arr.reduce((bst, q, j) => dist(p, q) < bst[1] ? [j, dist(p, q)] : bst, [-1, Infinity]);
  const pairNew = new Map(); // measured index -> model index (mutual nearest, ≤ WIN)
  mPos.forEach((p, i) => { const [j, d] = nearest(p, sPos); if (j >= 0 && d <= WIN && nearest(sPos[j], mPos)[0] === i) pairNew.set(i, j); });
  // old rows in the same order as f1-pedal-corners.mjs (corner_id = order of old pairs)
  const oldRows = oldPairs.map(([m, p], k) => { const i = mC.indexOf(m), jNew = pairNew.has(i) ? pairNew.get(i) : -1, jOld = S.corners.indexOf(p);
    return {corner_id: k + 1, meas: m.kph, modelOld: p.kph, modelNew: jNew >= 0 ? S.corners[jNew].kph : null, sameModel: jNew === jOld,
      dAligned: dist(mPos[i], sPos[jOld]), mShare: m.s, modelShareOld: p.s}; });
  audit.push({track: tr, season: y, lag_whole_m: whole[0], corr: +whole[1].toFixed(3), lag_thirds_m: thirds.map(t => t[0]), corr_thirds: thirds.map(t => +t[1].toFixed(3)), oldRows});
  let k = 0;
  for (const [i, j] of [...pairNew].sort((u, v) => sPos[u[1]] - sPos[v[1]])) {
    const m = mC[i], p = S.corners[j], o = oldPairs.find(([mm]) => mm === m);
    rows.push([tr, y, ++k, f3(p.s), f3(m.kph), f3(p.kph), f3(m.s), f3(mPos[i] / L), f3(p.s), lagAt(m.s * L), o ? f3(o[1].s) : '', o ? +(o[1] !== p) : 'new'].join(','));
  }
}
mkdirSync('scripts/sim/data/step30b', {recursive: true});
const tag = years.join('-'), body = rows.join('\n') + '\n', OUT = `scripts/sim/data/step30b/corners-rematched-${tag}.csv`;
writeFileSync(OUT, body); writeFileSync(OUT + '.sha256', sha(body) + '  ' + OUT.split('/').pop() + '\n');
writeFileSync(`scripts/sim/data/step30b/rematch-audit-${tag}.json`, JSON.stringify(audit));
console.log(OUT, rows.length - 1, 'rows', sha(body));
