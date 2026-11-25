// Step 35 report: corner radii of the FE least-curvature line at 8/11/14 m width vs the map centre line (Tokyo, Jeddah).
// Needs /tmp/fe-tracks-W{8,11,14}.js from build-fe.mjs with widthM 8/11/14 (local copy, not committed).
const W = {}; for (const w of [8, 11, 14]) W[w] = (await import(`/tmp/fe-tracks-W${w}.js`)).lapsimFeTracks;
const kap = (x, y, w) => { const n = x.length; return x.map((_, i) => { const a = (i - w + n) % n, b = (i + w) % n, ax = x[i] - x[a], ay = y[i] - y[a], bx = x[b] - x[i], by = y[b] - y[i]; return Math.atan2(ax * by - ay * bx, ax * bx + ay * by) / ((Math.hypot(ax, ay) + Math.hypot(bx, by)) / 2); }); };
for (const id of ['fe-tokyo', 'fe-jeddah']) { const t = W[11][id], m = t.map, n0 = m.x.length, ck = kap(m.x, m.y, 3), cds = t.quality.centreLengthM / n0, rows = [];
  for (let i = 0; i < n0; i++) { const a = Math.abs(ck[i]); if (a < 1 / 60) continue; let pk = true; for (let d = -8; d <= 8; d++) if (d && Math.abs(ck[(i + d + n0) % n0]) > a) pk = false; if (!pk) continue;
    let th = 0; for (let d = -12; d <= 12; d++) th += ck[(i + d + n0) % n0] * cds; if (Math.abs(th) < 45 * Math.PI / 180) continue;
    const R = w => { const tt = W[w][id], n = tt.kappa.length, j = Math.round(i / n0 * n); let k = 0; for (let d = -10; d <= 10; d++) k = Math.max(k, Math.abs(tt.kappa[(j + d + n) % n]) / 1e5); return +(1 / k).toFixed(1); };
    rows.push({sCentre: Math.round(i * cds), deflDeg: Math.round(Math.abs(th) * 180 / Math.PI), Rcentre: +(1 / a).toFixed(1), Rline8: R(8), Rline11: R(11), Rline14: R(14)}); }
  console.log(id, 'line length', [8, 11, 14].map(w => W[w][id].length).join('/'), 'centre', t.quality.centreLengthM); console.table(rows); }
