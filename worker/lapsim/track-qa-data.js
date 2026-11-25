// Geometry QA data correction (spec claude/spec-geometry-qa-2026-11-26.md A1, sha256 56fbd495…; central 06:05 KST 26 Nov 2026).
// Narrow rule: a 6 g-flagged point is fixed only where the measured line radius ≥ 1.25 × the geometry radius → Shanghai T16 only.
// Line: TracingInsights FastF1 x/y (pinned 2023–25 commits), top-10 quali laps, quadratic Savitzky–Golay 90 m, median per grid index.
// Applied on the build's κ (integers ×1e5): κ = (1 − w)·κ_raw + w·κ_line, w = 1 within ±75 m, linear to 0 at 100 m. Only with LAPSIM_TRACK_QA=on.
export const lapsimTrackQa = {shanghai: {n: 1088, idx: [1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030, 1031, 1032, 1033, 1034, 1035, 1036, 1037, 1038, 1039, 1040, 1041, 1042, 1043, 1044, 1045, 1046, 1047, 1048, 1049, 1050, 1051, 1052, 1053, 1054], w: [0.2, 0.4, 0.6, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.8, 0.6, 0.4, 0.2],
  line: [93, 104, 118, 133, 152, 184, 232, 290, 358, 450, 567, 675, 807, 927, 1090, 1275, 1460, 1595, 1594, 1598, 1591, 1567, 1483, 1388, 1205, 1049, 900, 751, 570, 444, 345, 230, 159, 98, 61, 38, 24, 17, 16], raw: [-7, -6, -5, -1, -25, 38, 72, 121, 192, 290, 421, 124, 262, 512, 506, 1095, 2121, 2772, 3230, 4770, 4053, 2544, 1272, 910, 433, 48, 8, -15, 93, 36, 4, -13, -25, -30, -34, -36, -36, -33, -29]}};
// in place on a lapsimTracks object; returns one line per track (raw window = the committed one, or not)
export function applyTrackQa(tracks) {
  return Object.entries(lapsimTrackQa).map(([id, q]) => { const d = tracks[id];
    if (!d || d.kappa.length !== q.n) throw new Error(`track QA: ${id} has ${d?.kappa.length} points, patch expects ${q.n}`);
    const same = q.idx.every((i, j) => d.kappa[i] === q.raw[j]), k = [...d.kappa];
    q.idx.forEach((i, j) => { if (q.w[j] > 0) k[i] = Math.round((1 - q.w[j]) * d.kappa[i] + q.w[j] * q.line[j]); });
    d.kappa = k; return `track QA: ${id} κ patched at ${q.idx.length} points (raw window ${same ? 'equals' : 'differs from'} the committed one)`; });
}
