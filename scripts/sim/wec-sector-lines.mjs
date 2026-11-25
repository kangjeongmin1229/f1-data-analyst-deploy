// WEC sector lines and frozen weights for the sector term of the WEC fit (step 34 V1 = step 21 pre-reg r1 §2–§3, Project
// claude/gate-wec-sector-objective-prereg-2026-11-24.md). Lines S1 / S2 as printed on the Al Kamel circuit maps (metres from s = 0,
// scripts/sim/data/fia-docs/wec-timing-lines-2023-2025.csv); σ = half the time error of the line placement, w = 2·s0²/(s0² + σ²),
// s0 = 0.10 s (top-3 shape spread). Frozen here before the run; never tuned.
// Seasons: 2025 at every listed track; 2026 only where the lines were identical in every published year and no layout change
// (imola, spa, interlagos, austin); catalunya (no lines) and monza (one year) stay lap-only.
export const S0 = 0.10;
export const LINES = {lusail: [2072, 3664], imola: [1214, 2728], 'spa-francorchamps': [2243.5, 5112.7], interlagos: [1234, 3155], sakhir: [1804, 3562], austin: [1311, 3568]};
// σ (s) per line: [S1, S2] for the Hypercar classes and for LMGT3
const SIGMA = {
  hyper: {lusail: [0.092, 0.137], imola: [0.079, 0.161], 'spa-francorchamps': [0.123, 0.334], interlagos: [0.155, 0.648], sakhir: [0.239, 0.461], austin: [0.246, 0.385]},
  gt3: {lusail: [0.101, 0.159], imola: [0.096, 0.186], 'spa-francorchamps': [0.144, 0.393], interlagos: [0.180, 0.672], sakhir: [0.283, 0.534], austin: [0.283, 0.424]}};
const Y2026 = new Set(['imola', 'spa-francorchamps', 'interlagos', 'austin']);
export const weight = s => 2 * S0 * S0 / (S0 * S0 + s * s);
// {lines, w} for a class / track / season, or null (lap-only)
export function sectorSpec(cls, track, year) {
  if (!LINES[track] || (+year >= 2026 && !Y2026.has(track)) || +year < 2025) return null;
  return {lines: LINES[track], w: SIGMA[cls === 'lmgt3' ? 'gt3' : 'hyper'][track].map(weight)};
}
// a lap's sectors add up to its lap (same lap) within 0.06 s
export const sectorsOk = (lap, s) => Array.isArray(s) && s.length === 3 && s.every(x => x > 0) && Math.abs(s[0] + s[1] + s[2] - lap) <= 0.06;
