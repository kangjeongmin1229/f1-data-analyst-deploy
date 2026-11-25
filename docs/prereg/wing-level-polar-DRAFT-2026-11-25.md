# DRAFT pre-reg — new family "per-track wing level on one aero polar", attempt 1 of 3 (2026-11-25 ~18:20 KST)

**Status: DRAFT for central approval. Not run.** Central 17:40. Evidence: claude/status-2026-11-25-step32-residual-audit.md.
The load-sensitivity draft is parked (central). Measured data untouched (read-only), 2022 LOCKED closed, label "model (learned from
public telemetry) / 모델(공개 텔레메트리에서 학습)". Skills (Skill tool): experimental-method-and-error-analysis,
model-building-and-approximation, ponytail.

## 1. Hypothesis
Teams change wing level per track. One aero polar per season links downforce to drag, so the measured straight-line drag of a
track tells its downforce: low drag (Monza, Las Vegas, Baku) → less ClA; high drag (Singapore, Zandvoort, Hungaroring) → more ClA.

## 2. Input: measured wing level (not fitted)
- Source: `worker/lapsim/car-measured-data.js` (step 2a, measure-car.mjs, pre-reg claude/gate-cda-measured-prereg-2026-11-23.md),
  sha256 7155f643…; per-track CdA ± 0.04–0.16 from straight-line telemetry, 2023–25.
- Wing level r_t,s = CdA_t,s / CdA_season,s (stable across seasons, spread 0.003–0.054 in step 2a). Every fold track has ≥ 2 seasons.
- **Use in the judged run (prediction mode, primary):** r_t = mean of the track's r over the **other** seasons (leave-season-out).
  The same-weekend r is measured on the same qualifying laps' straights as the straight-end target, so using it would leak.
- **Replay mode (report-only, labelled "uses this session's measured straight-line drag"):** r_t,s of the same season.
- Drag level: CdA_t,s = θ_s · r_t, θ_s per season as C3 (prior N(1.46, 0.12²)). The absolute step 2a level (1.55–1.61) made straights
  2.6 km/h too slow in D3 and may be biased high by engine braking (central 13:25), so only the ratio is taken as input
  **[central: or absolute CdA_t, no θ]**. DRS low-drag state as today (c_DRS fitted, prior N(0.20, 0.015²)).

## 3. Model: one polar per season
ClA_t,s = a_s + b_s · θ_s · (r_t − 1). Parameters per season: a_s (ClA at average wing) ~ N(6.75, 0.40²) (reference 6.75 m² = C_L ≈ 4.5
on 1.5 m², Symonds/Autosport, as A2.1); b_s (marginal ΔClA/ΔCdA) ~ N(4.0, 1.5²) (my choice: a wing change with a marginal L/D of about
3–5; no published figure found); b_s > 0 required. Everything else as V1/A7: μ_y per season N(1.80, 0.20²) with the kernel's load law
(k ≈ 0.07–0.08, unchanged), μ_x/μ_xTrac stage-1 priors + G-BT, u_t N(0, 0.03²), pIce 540 kW, 54 m DRS delay, f_kerb 0, identical
forward processing; lateral target **as V1** (flat-out samples kept, no one-sided term; the audit showed C3's exclusion inflated the
high-speed target). No kernel change: per-track cdA/clA set in step32-forward.mjs car25(track), flag off = byte-identical, F1 only.

## 4. Pre-registered sign checks (must hold on the fitted polar; checked before the primaries)
- ClA below a_s at Monza, Las Vegas, Baku, Spa, Miami (r 0.78–0.90); above a_s at Singapore, Zandvoort, Hungaroring, Catalunya (r 1.07–1.17).
- Straight-end bias: ends ≥ 300 km/h move up (model faster), ends < 300 km/h move down, vs the A2 baseline.
- **Disclosed now:** the input does not make Silverstone lose much wing (r 0.97) nor Monaco gain much (r 1.03), so this model cannot
  remove the Silverstone (+30 km/h) or Monaco (−24 km/h) corner levels.

## 5. Primaries and success bar (held-out leave-one-track-out, unit = track, 2023–25, base REGEN FIX 2 2512d18)
Per track: RMS over its top-10 laps' corner minima at 120–240 km/h (apex, as `score()`), RMS of straight-end errors (`strEnd()`).
All must hold:
1. **Corner RMS** mean over tracks cut ≥ 30 % vs the A2 LOTO baseline (baseline ≈ 27.8 km/h → ≤ 19.4), paired sign-flip one-sided p < α.
2. **Straight-end RMS** cut ≥ 30 % (baseline ≈ 11.2 km/h → ≤ 7.8), paired sign-flip one-sided p < α.
3. **No lap harm:** paired held-out lap error harm, one-sided 95 % UB ≤ 0.10 pp.
4. No parameter at a bound: every ClA_t,s in [4.5, 9.0] and ≥ 0.1 m² from both ends; b_s > 0; a_s, b_s, θ_s fold-median |z| ≤ 2.
5. Sign checks §4; every earlier guard (braking ≤ measured + 0.3 g, DRS ≥ baseline, mesh, G-S series isolation flag off/on,
   G-T ≤ +20 %, G-M0 measured data byte-identical, P1, P3a fixed power check, P4, energy; μ_x/μ_y reported only).
Report-only: replay mode, central's bins (< 120, 120–200, > 200), DRS split of straights, Monza/Silverstone per corner, 2026.
Two primaries must both pass (intersection), so no extra split of α.

## 6. Multiplicity
Fresh 3-attempt budget; the count carries over (decoupled limits 3 tests; the load-sensitivity draft was never run): test 4,
one-sided **α = 0.05/4 = 0.0125** (attempt 2: 0.05/5, attempt 3: 0.05/6).

## 7. Power check first (the check job recomputes this on the A2 baseline rows; no fold runs if a primary is not judgeable)
MDE = (z(1 − 0.0125) + z(0.8)) · SD_paired / √n = 3.08 · SD/√n. Estimates now (local, raw laps; paired SD stand-in = C3 car vs baseline):
| primary | baseline (mean of per-track) | 30 % | paired SD | n | MDE | |
|---|---|---|---|---|---|---|
| corner RMS 120–240 | 27.8 km/h | 8.3 km/h | 7.17 | 23 | 4.6 km/h | judgeable |
| straight-end RMS | 11.2 km/h | 3.4 km/h | 1.64 | 24 | 1.0 km/h | judgeable |
| lap (guard, not a primary) | 2.55 % | — | 1.21 | 24 | 0.76 pp | — |

## 8. Prior evidence (seen before hashing; disclosed)
On the A2 baseline, the per-track straight-end bias follows the wing ratio (r = +0.57, +3.9 km/h per 0.1 of ratio), but the per-track
corner bias does not (r = −0.04, 23 tracks). So primary 2 is plausible and primary 1 (≥ 30 % corner cut) is unlikely.

## 9. Prediction vs replay (use case)
- Prediction (a future session, the site's simulator): the same-weekend drag is not known beforehand → other-season r (primary here).
- Replay / analysis of a past session: same-weekend r is allowed and labelled "uses this session's measured straight-line drag".
- A track with no earlier measured season gets r = 1 (season mean) and its label says so.

## 10. Before the run (after central approval of this hash)
Code (forward.mjs per-track CdA/ClA, flag off byte-identical incl. the 8c158b35 A2 rows and the non-F1 laps), power recomputed in the
check job, one crash-only smoke, ledger line, push to `lapsim-pipeline/step32-empirical`, verdict published to `results/` as C3.
