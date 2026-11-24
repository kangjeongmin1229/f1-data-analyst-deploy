// pIce profile diagnostic (claude/status-2026-11-24-pice-profile.md; probe branch only, no gate, no production change).
// With LAPSIM_PICE_FIX=<factor> calibrate.mjs fixes pIce at factor × prior, refits the rest, and calls diagnose() on the joint fit:
// the data-only loss of every lap (no track-factor prior, no bound penalty), split as the fit's own objective is split.
import {prepGroups, lapScore, lapMult} from './joint-bcd.mjs';

// corner bands by the real apex speed (km/h): < 120, 120–180, 180–240, > 240; they add up to the corner term
const BAND = k => k < 120 ? 0 : k < 180 ? 1 : k < 240 ? 2 : 3;
const near = (v, b) => Math.abs(v / b - 1) < 2e-3;

export function diagnose(groups, joint, o, drop) {
  const dropped = new Set(drop.map(([k, n]) => k + ' ' + n)), laps = [];
  for (const g of prepGroups(groups)) for (const l of g.laps) {
    const car = joint.cars[g.key], f = joint.factors[l.name] || {grip: 1, drag: 1}, m = lapMult(l, joint.adj);
    const e = lapScore(l, car, f, o, m), v = e.res.v, ds = l.track.ds, n = v.length, h = Math.round(50 / ds), ts = l.timeScale ?? 1;
    // (a) corner minima and (b) straight-end maxima of the real trace vs the simulated extreme within ±50 m (extremaRms split)
    const ext = l.obs?.ext || []; let corner = 0, straight = 0; const band = [0, 0, 0, 0], nb = [0, 0, 0, 0];
    for (const x of ext) {
      const i0 = Math.round(x.s / ds); let y = x.min ? Infinity : -Infinity;
      for (let j = -h; j <= h; j++) { const w = v[((i0 + j) % n + n) % n]; y = x.min ? Math.min(y, w) : Math.max(y, w); }
      if (x.min) { corner += (y - x.v) ** 2; const b = BAND(x.v * 3.6); band[b] += (y - x.v) ** 2; nb[b]++; } else straight += (y - x.v) ** 2;
    }
    const N = ext.length || 1, dt = e.res.lapTime - l.lapSeconds / m;
    let sec = 0; if (o.wSector && l.sectors && e.res.sectors) for (let k = 0; k < 3; k++) if (Number.isFinite(l.sectors[k])) sec += (e.res.sectors[k] - l.sectors[k] / m) ** 2;
    const c = {corner: corner / N, straight: straight / N, lap: o.wTime * ts * dt * dt, sector: o.wSector * ts * sec};
    const total = c.corner + c.straight + c.lap + c.sector;
    if (Math.abs(total - e.score) > 1e-9 * Math.max(1, e.score)) throw new Error(`split ${total} != score ${e.score} (${g.key} ${l.name})`);
    // (e) trap: simulated top speed − real top speed (km/h); not in the F1 objective (no trapKph), reported as a residual
    const trap = e.res.vMaxKph - Math.max(...l.obs.v) * 3.6;
    // full-throttle samples (real throttle >= 98) vs the rest, pointwise speed RMS (diagnostic, not in the objective)
    let sf = 0, nf = 0, so = 0, no = 0;
    if (l.thr?.length === l.obs.s.length) for (let k = 0; k < l.obs.s.length; k++) {
      const x = l.obs.s[k] / ds, i = Math.floor(x) % n, fr = x - Math.floor(x), d = (v[i] * (1 - fr) + v[(i + 1) % n] * fr - l.obs.v[k]) ** 2;
      if (l.thr[k] >= 98) { sf += d; nf++; } else { so += d; no++; }
    }
    laps.push({cornerBand: band.map(z => z / N), nBand: nb, season: g.key, name: l.name, pos: l.meta?.position, w: l.weight ?? 1, dropped: dropped.has(g.key + ' ' + l.name), ...c, total, dt,
      trapKph: trap, ftRmsKph: nf ? Math.sqrt(sf / nf) * 3.6 : null, otherRmsKph: no ? Math.sqrt(so / no) * 3.6 : null, nMin: ext.filter(x => x.min).length, nMax: ext.filter(x => !x.min).length});
  }
  // bound hits: car parameters at a fit bound, track factors at their limits, development rate at ±0.05
  const bounds = [];
  for (const g of groups) for (const p of g.params) { const val = joint.cars[g.key][p.path];
    if (p.min != null && near(val, p.min)) bounds.push({season: g.key, key: p.key, bound: 'min', value: val});
    if (p.max != null && near(val, p.max)) bounds.push({season: g.key, key: p.key, bound: 'max', value: val}); }
  for (const [name, f] of Object.entries(joint.factors)) {
    if (near(f.grip, o.lo) || near(f.grip, o.hi)) bounds.push({track: name, key: 'grip', bound: near(f.grip, o.lo) ? 'min' : 'max', value: f.grip});
    if (o.trackDrag && (near(f.drag, o.dragLo) || near(f.drag, o.dragHi))) bounds.push({track: name, key: 'drag', bound: near(f.drag, o.dragLo) ? 'min' : 'max', value: f.drag});
  }
  for (const [k, a] of Object.entries(joint.adj || {})) if (Math.abs(Math.abs(a.dev) - 0.05) < 1e-6) bounds.push({season: +k, key: 'dev', bound: a.dev > 0 ? 'max' : 'min', value: a.dev});
  const cars = Object.fromEntries(Object.entries(joint.cars).map(([k, c]) => [k, {muY: c.muY, clA: c.clA, cdA: c.cdA, cdALow: c.cdALow, pIce: c.pIce}]));
  return {laps, bounds, cars, factors: joint.factors, adj: joint.adj, score: joint.score};
}
