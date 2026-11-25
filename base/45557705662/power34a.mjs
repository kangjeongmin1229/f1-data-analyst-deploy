// Step 34a power check (A5 §5 / r1 §5), fixed before the base numbers were read.
// Input: the base run's calibration-data.js. Sector: per held-out track (class-seasons pooled per track), r_track = √mean over its rows
// and k = 1, 2 of (sectorSec_k / realLap · 100)²; MDE = 1.84 · SD(r_track) / √n_tracks; judgeable if MDE ≤ 10 % of the pooled base
// sector RMS. Trap: per class, held-out trap residuals (sim − real, km/h, at the mapped position); resolvable if the 95 % t half-width
// ≤ 2 km/h. Reading of r1's "r_k²": the per-track sector RMS (units of the base sector RMS); stated in the output.
//   node power34a.mjs <calibration-data.js> <run id>
const [file, run] = process.argv.slice(2);
const {lapsimCalibration: c} = await import(file);
const T95 = n => [0, 12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131, 2.120, 2.110, 2.101, 2.093, 2.086][n - 1] ?? 1.96;
const sd = a => { const m = a.reduce((p, q) => p + q, 0) / a.length; return Math.sqrt(a.reduce((p, q) => p + (q - m) ** 2, 0) / (a.length - 1)); };
const byTrack = new Map(), trap = {}, rows = [];
for (const [cls, ys] of Object.entries(c.series.wec)) for (const [y, s] of Object.entries(ys)) for (const t of s.holdout?.tracks || []) {
  const lap = s.tracks[t.track]?.realLap; if (!lap) continue;
  if (t.sectorSec) { const r = t.sectorSec.map(x => (100 * x / lap) ** 2); (byTrack.get(t.track) || byTrack.set(t.track, []).get(t.track)).push(...r); rows.push(...r); }
  if (Number.isFinite(t.trapKph)) (trap[cls] ||= []).push(t.trapKph);
}
const rTrack = [...byTrack.values()].map(a => Math.sqrt(a.reduce((p, q) => p + q, 0) / a.length)), n = rTrack.length;
const pooled = Math.sqrt(rows.reduce((p, q) => p + q, 0) / rows.length), mde = 1.84 * sd(rTrack) / Math.sqrt(n);
const sector = {nTracks: n, nValues: rows.length, baseSectorRmsPct: +pooled.toFixed(4), sdTrackRmsPct: +sd(rTrack).toFixed(4), mdePct: +mde.toFixed(4),
  limitPct: +(0.1 * pooled).toFixed(4), judgeable: mde <= 0.1 * pooled};
const traps = Object.fromEntries(Object.entries(trap).map(([k, a]) => { const m = a.reduce((p, q) => p + q, 0) / a.length, h = a.length > 1 ? T95(a.length - 1) * sd(a) / Math.sqrt(a.length) : Infinity;
  return [k, {n: a.length, biasKph: +m.toFixed(2), half95Kph: +h.toFixed(2), resolvable: h <= 2}]; }));
const out = {step: '34a', check: 'power (A5 §5, r1 §5)', run, reading: "r1 'r_k²' read as per-track sector RMS (% of lap), class-seasons pooled per track",
  sector, trap: traps, judgeable: sector.judgeable && Object.values(traps).every(t => t.resolvable)};
console.log(JSON.stringify(out, null, 1));
