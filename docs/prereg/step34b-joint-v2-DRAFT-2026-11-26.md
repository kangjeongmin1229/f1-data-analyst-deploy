# DRAFT pre-reg — Step 34b "WEC joint v2" (2026-11-26 ~06:20 KST; central 05:40). Hashed as a draft, NOT RUN.

Rows: Hypercar lap (definition-100 row 5.7), Hypercar traps/sectors. Family H (LMH + LMDh). One attempt. Report-only runs (N5, X3, X4)
informed the design and are disclosed in §7; none of their numbers is used as an input value. Measured data untouched (trap speeds,
sector times, laps); 2022 LOCKED closed; no merge of model code.

## 1. One variant V2 (three parts, one idea: honest aero on the car's real line, anchored by lap time)
1. **Objective = X3's:** base lap term (wTime 2, as the shipped class fit) + traps (residual / 2 km/h, wTrap = (3.6/2)² per (m/s)²) +
   sector lines w_k·(r_k / σ_rep,k)² (σ_rep run 45562051769). Power fixed at the event BoP kW **as wheel power (assumption)**, mass BoP kg
   + 80 kg (assumption), 2026 = 2025 class median (assumption), grip source as the base run (same laps).
2. **Priors:** Hypercar **ClA 4.15 m², sd 10 %** ("press (primary article not located)"); CdA 1.04 sd 10 %; μy 1.75 sd 15 %.
   **Bounds as `series.js`** (Hypercar μy [1.3, 2.2], ClA [2, 7], CdA [0.7, 1.6]) — X3's lifted bounds were report-only.
3. **Line:** the WEC class fit drives the **least-curvature line inside the track width** instead of today's line, where a width is
   known (§3), flag `LAPSIM_WEC_GEOM=line`; F1 and FE keep their geometry (byte-identical).

## 2. Trap mapping (data fix, before any run; commit 61e80bf on fork s34b/trapmap-2026-11-26)
- **Sakhir:** printed trap (650 m, 2023 625 m; estimated) fell in T1 on our geometry. Placed at 561 m (2023 536 m) by the printed
  trap-to-SCL2 gap with SCL2 at our straight end (description "pit straight before T1"); ±50 m. X4 re-run: model peak ±100 m vs measured
  +2.2 to +4.6 km/h. Printed values kept in the CSV; `TRAP_FIX` in `scripts/sim/wec-trap-pos.mjs`.
- **Interlagos: no change.** Sourced S1/S2 (1234, 3155 m) land where described on our geometry (±50 m after the 4230/4309 m length
  scale); the trap (125 m) is on our main straight 110 m before its end; the straight's grade matches an independent DEM line
  (geom-indep a3: pit straight flat, +4 m to T1, climb 3400 → 3600 m). A missing 2 % grade would move speed by ~3 km/h, not 20–40.
  The +20 to +42 km/h model-vs-trap gap is therefore **not a mapping error**; it stays in the objective as measured.
- Observation (not changed): Al Kamel distances are used unscaled at every track (lap length differs by 0.4–1.4 %); the sector lines
  carry the same ±50 m placement uncertainty already in their σ.

## 3. The line (what exists, what it changes)
- **Today's WEC geometry is not a centreline:** every WEC track row is built from OpenF1 F1 qualifying car positions (a driven F1
  racing line; `tracks-data.js` sources). V2's change is "F1 driven line → least-curvature line inside the width".
- Source of the new line: `scripts/sim/data/geom-indep/tracks-a3.json` (OSM centreline → least-curvature line inside W/2 − 1.2 m with
  `racing-line.js`, DEM grade/banking), the era holding 2026, all 8 WEC tracks present, none "source incomplete". Widths (build report):
  Lusail 12 m and Imola 10 m (`track-widths.js`), Sakhir 12, Interlagos 10, Spa 10, Austin 13, Catalunya 11, Monza 10 (FIA list).
  Line vs today's length: −0.1 % (Interlagos) to −1.1 % (Lusail, Austin).
- Measured distances (traps incl. §2, sector lines) are mapped old s → new s with `mapDist` (geom-indep); speeds and times unchanged.
- **Disclosure:** this geometry was the "independent geometry" idea, rejected three times for F1 (attempt 3: P1 9/20 tracks closer,
  p 0.75; 120–180 km/h band guard failed; "the idea stops", results-a3.json). Using it here for WEC reopens a stopped geometry source in
  a new family; central decides (§8 Q1).

## 4. Base and power check (before V2 is opened)
- Base = a new run of the same build with all three parts off (shipped class fit, today's line), trap fix included (it changes the base's
  Sakhir trap comparison). Both on the fork, wec_only, research mode.
- Family H power check on that base: MDE = 1.84·SD_track/√n (n = 8 tracks); recorded before V2 is opened. LMGT3 joins only if its MDE ≤
  family H's (else report-only; on base 45566297648 it was 0.352 > 0.244).

## 5. Pass rule — honest-parameter gate (central 19:35), family H, m = 1 (m = 2 with LMGT3, α Bonferroni)
1. No fitted parameter (ClA, CdA, μy) at or within 0.5 % of a `series.js` bound in any class-season or fold; AND
2. lap held-out harm, one-sided 95 % t upper bound of mean d (per track, base vs V2) ≤ **0.15 pp**; AND
3. no single track worse than **+1.0 pp**.
"Better" only if the mean gain ≥ MDE. Guards: energy closure ≤ 0.1 %, F1/FE byte-identical (wec_only), compute ≤ +20 % (the line is
precomputed; no extra solve). A parameter > 2 prior sd from its prior is reported (model-error flag), no pass role.

## 6. Report
Hash; run ids (base, V2); per-gate-item verdict; bound table (0.5 % rule, every fold); Hessian table (posterior sd vs prior sd, r, cond;
|r| > 0.9 or post sd > 0.8 × prior sd = not separable); per-track d with 2026 rows apart (assumption); trap bias per track; sector
residual by speed bin; LMGT3 rows.

## 7. Evidence already seen (report-only, disclosed; no value taken from it)
- V (45608430485): lap weight 0 → μy at its bound, +10.9 pp. **FAIL.**
- X3 (45623102429): with the lap anchoring, data want ClA 2.8–4.0 m² (two class-seasons μy–ClA not separable, |r| 0.94/0.97), held-out
  +0.88 pp vs base, Lusail +3.0 pp. A sd 10 % prior at 4.15 sits above most X3 values: expect ClA pulled toward 3.7–4.2.
- N5 (45616741256): load sensitivity worsens every class-season.
- X4: Sakhir mapping (fixed, §2); Interlagos model too fast by 20–42 km/h at the trap (unexplained).
- Expectation stated before the run: Lusail (+3.0 pp in X3) alone likely breaks item 3 unless the new line changes its fast sweepers;
  a FAIL is the likely outcome.

## 8. Open questions for central (before hashing a final)
1. Use the a3 line (stopped F1 idea) for WEC, or build the least-curvature line from today's line plus the width (same `racing-line.js`,
   no OSM step)? The second keeps today's s-axis and distances; the first has DEM grade.
2. LMGT3 with the same priors as V (P 334 kW sd 8 %, CdA 1.16 sd 15 %, ClA 1.4 sd 25 %)? X3 put LMGT3 CdA at its 1.3 bound.
3. Keep Interlagos' trap in the objective (no mapping error found) or report-only until its gap is explained?

## 9. Attempt count
New idea "WEC joint v2": attempt 1 of 1 (central 05:40). Idea "WEC aero + power at the wheels" (V) stays FAIL.
