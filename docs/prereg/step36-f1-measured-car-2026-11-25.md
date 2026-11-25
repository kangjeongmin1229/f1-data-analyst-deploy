# Step 36 pre-registration — F1 measured car (2026-11-25) — DRAFT, not hashed for a run

Status: **draft for central (19:45 spec).** No candidate code has run, no number of this candidate exists. The final hash is made only
after step 32's polar and braking verdicts; §5 and §6 already hold both branches, so the verdicts only select one, nothing else
changes. Family "F1 measured car", new, **attempt 1 of 3**, one attempt now. Gate: claude/decision-central-gate-honest-2026-11-25.md.
Measured data are read only. 2022 LOCKED stays closed. Skills: experimental-method-and-error-analysis, model-building-and-approximation,
ponytail.

## 1. Scope and flag
- Flag `LAPSIM_F1_MEASURED_CAR=on` (calibrate.mjs). Unset = byte-identical calibration (proved in the PR by a run-off diff).
- Base code: `refit/combined-2026-11-25` head at hash time (today 48a28d0). Judged: F1 2023–25.
- 2026 F1, WEC, FE: **byte-identical**. Under the flag the 2026 car and the 2026 per-track rows are copied from the base calibration.
  Consequence, stated: per-track grip is shared over 2023–26 in today's fit; under the flag 2023–25 get their own shared grip set and
  2026 keeps the base one. 2026 rows are report-only.

## 2. Power (input, prior from measurement)
- Source: step 2a, `worker/lapsim/car-measured-data.js` (TracingInsights quali, Newton on measured speed). Season P_wheel 627.9 /
  629.4 / 627.9 kW (± 20.6–20.8). Per-track P_wheel `pOwnKW` exists for 18 / 21 / 23 tracks (2023 / 24 / 25).
- Per track t: x0_t = P_wheel,t / 0.96 − 114 kW (114 = 120 kW ERS × 0.95). Tracks without a per-track value: x0 = season P_wheel /
  0.96 − 114 (628 → 540 kW). Fitted: one season scale k_s, pIce_t = k_s × x0_t, prior k_s ~ N(1, 0.04²).
- Altitude: the per-track value already holds that session's air, so at tracks with `pOwnKW` the kernel's ICE air-density factor is
  set to 1 (no double count). Mexico City has a per-track value in all three seasons (624.6 / 658.2 / 659.0 kW) and uses it; the
  season value is never used there. Tracks without a per-track value keep the kernel density factor.

## 3. Drag
- CdA_t = measured per-track CdA (`perTrack[t].cdA`) × θ_s; tracks without one use the season measured CdA × θ_s.
- θ_s fitted, prior N(1, sd_s²), sd_s = season measured CdA total / value = 4.45 / 4.31 / 4.38 % (2023 / 24 / 25).
- The per-track drag factor is removed (not fitted, = 1).
- Covariance: step 2a stores **no** P–CdA covariance (checked: no cov/corr field). So independent priors as above, and the P/CdA
  ratio vs measured (390 / 400 / 404 kW/m²) is reported per season as a check (report-only).

## 4. DRS
- Low-drag CdA_t = 0.778 × CdA_t. Source: step 2a drsRatio 0.7795 / 0.7729 / 0.7837 (± 0.009–0.011), mean 0.779; 0.778 as specified
  (difference 0.1 %, inside the stat error). Cut 22 %.
- Flap delay 50 m (car `drsDelayM`, kernel `delayLow` from step 32b). Source: step 32b physics check, run 45578321428, median over 152
  zones of the telemetry first-open position after the mapped line = 50 m [45.2, 55.8] (`zone-mapping-table.csv`, sha 078fd588…).

## 5. Downforce (branch chosen by step 32's polar verdict)
- Polar PASS: ClA_t from the polar, a_s and b_s fitted with the polar pre-reg's form and bounds.
- Polar FAIL: one ClA per season, fitted, bounds [2.5, 8] (unchanged).
- Report-only: L/D = ClA / CdA per season (median track), window 2.5–4.5.

## 6. Braking (one input only; branch chosen by step 32's braking verdict)
- Braking PASS: the measured braking cap from that pre-reg; μx/μy keeps today's link.
- Braking FAIL: μx/μy = 0.70 (measured midpoint of 0.66–0.73), labelled "measured utilisation"; no cap.
- Never both.

## 7. Fit
- Fitted per season 2023–25: μ_y (μ_x, μ_xTrac linked as today, or by §6), ClA (or a_s, b_s), θ_s, k_s; per-track grip (existing
  log prior, weight 8); team offsets and development (existing closed form).
- Car priors (k_s, θ_s) enter as laps × ((ln x − ln x0) / sd)², the same convention as the existing grip prior (laps × wPrior × (ln g)²).
- Objective: lap + sectors, today's F1 weights wTime 20, wSector 2. **Q1 for central:** today's F1 score also has the speed-trace RMS
  and trap terms (calibrate-lib.mjs lapError). Per the spec ("traps and straight ends are checks") this draft **drops both** from
  the objective under the flag. Confirm, or name "A1 weights" if a different weight set is meant.
- Hold-out: `LAPSIM_HOLDOUT_YEARS=2023,2024,2025` in base and candidate (same setting), so the lap guard covers all judged seasons.
- Base run: same head, flag off, same holdout setting, one pipeline run before the candidate. All MDEs (§9) come from it first.

## 8. Pass (19:35 gate) — all three
1. **No fitted parameter at a bound** in 2023–25. At bound = within 0.5 % of the bound value. Full list (before any result):
   - per season: μ_y [1.5, 2.4]; ClA [2.5, 8] (or polar a_s, b_s at the polar pre-reg's bounds); θ_s [0.7, 1.3]; k_s [0.85, 1.15]
     (pIce 459–621 kW at x0 540); development rate [−0.05, 0.05];
   - per track: grip [0.7, 1.3] (every 2023–25 track);
   - no bound, listed for completeness: team offsets (shrinkage, unbounded). Not fitted: CdA, low-drag CdA, per-track drag, pIce_t
     shape, μ_x link, DRS delay.
2. Lap held-out harm vs base (paired per row, 2023–25 held-out rows): one-sided 95 % UB ≤ **0.15 pp**.
3. No single track/event worse than **+1.0 pp**.

## 9. "Better" per row (m = 3, α = 0.05/3 one-sided each, power 0.8; gain ≥ MDE)
- Rows: (a) DRS bias on held-out tracks (32b rule: 125 pooled cases, no own-track factor, event bootstrap 2000, seed 7);
  (b) straight-end speed RMS over tracks (step 32's committed top-10 traces and normalisation, fork `step32-empirical`, same
  straight-end extraction as the scoreboard row); (c) braking p95 deceleration by speed vs measured (step 32 D2 bins).
- MDE = (z_{1−0.05/3} + z_{0.8}) × SE_base = 2.97 × SE of the row statistic from the base run (event/track bootstrap, seed 7),
  computed and recorded before the candidate is opened. A row whose MDE > 30 % of its base value is report-only.
- Corner speed 120–240 is secondary, report-only.

## 10. Guards (any failure = FAIL)
Energy closure ≤ 0.1 %; mesh test pass; C5.12 test pass; braking ≤ measured + 0.3 g; compute time ≤ +20 % vs base.

## 11. Run and report
One research pipeline run on the fork (workflow_dispatch). Report: run id, input sha256s, every parameter vs its bound, P/CdA and L/D
checks, the three rows with MDE, guards. No second attempt without a new pre-reg.
