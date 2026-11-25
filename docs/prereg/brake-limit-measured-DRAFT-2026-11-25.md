# DRAFT pre-reg — braking limit from measurement ("achieved braking"), one attempt (2026-11-25 ~18:10 KST)

**Status: DRAFT for central. Not run; queued after the wing-level polar run (45579972896).** Central 17:51.
Measured data untouched (read-only), 2022 LOCKED closed. Skills (Skill tool): experimental-method-and-error-analysis,
model-building-and-approximation, ponytail.

## 1. Why
The shipped F1 car brakes too hard: μ_x/μ_y = 1.583/1.775 = 0.892 (fixed by prior), while step 32 measured 0.66–0.73 (C3, run
45557649126). Braking row (scoreboard): shipped pair +0.9…+1.4 g. Pooled p95 deceleration, A2 LOTO baseline vs measured, 2023–25
(local, forward processing as the step 32 verdict: 45 m Savitzky–Golay on the measured grid):
| km/h | 100 | 140 | 180 | 220 | 260 | 300 |
|---|---|---|---|---|---|---|
| measured p95 (g) | 1.83 | 2.84 | 3.77 | 4.38 | 4.46 | 3.31 |
| baseline p95 (g) | 2.36 | 3.41 | 4.38 | 5.30 | 5.70 | 5.07 |
| baseline − measured | +0.53 | +0.57 | +0.61 | +0.92 | +1.23 | +1.75 |
D2 showed this is not axle physics (load transfer moves it < 0.15 g).

## 2. Change (one, F1 only)
The shipped car keeps every fitted value; the kernel's existing total-deceleration cap `brakeEnv` (a ≤ a0 + a2·v², both kernel steps,
series-generic, unset = byte-identical) is set per season from the **measured** p95 deceleration:
- Per season, on the training tracks only (leave-one-track-out): measured p95 deceleration per 20 km/h bin, 80–280 km/h (bins with
  ≥ 200 samples), forward-processed exactly as the verdict; least squares a0 + a2·v² (v bin centre, m/s; weights = sample counts).
  No candidate simulation enters this fit (it is a measurement, not tuned to the model's own output).
- Bins ≥ 280 km/h are excluded from the cap fit (decided now): the measured p95 falls there (3.3 g at 300) because those samples
  include the brake-pressure build-up after the lift; that is a ramp, not the limit.
- Label on every page that uses it: **"achieved braking (includes driver margin)"** / 「실제 달성 제동(드라이버 여유 포함)」.
- μ_x, μ_y, ClA, CdA, pIce: unchanged (shipped). The 0.892 prior is not touched; the cap binds instead.

## 3. Main test (held-out by track, unit = track, 2023–25, top-10 laps, base = the commit the run uses)
- Per track: braking RMS = RMS over 40 km/h bins 100–340 km/h (≥ 50 samples each side, ≥ 2 bins) of (model p95 − measured p95),
  processed identically. Paired: baseline − candidate per track.
- **Pass (all):** mean cut ≥ 50 % of the baseline mean (baseline ≈ 1.02 g → cut ≥ 0.51 g), one-sided sign-flip p < α, n ≥ 5; and the
  pooled braking row ≤ measured + 0.3 g in every bin 100–260 km/h.
- **Lap guard:** F1 held-out lap error paired harm, one-sided 95 % UB ≤ 0.10 pp (as every step).
- Other guards: mesh; series isolation flag off/on (every non-F1 lap byte-identical); measured data byte-identical; compute ≤ +20 %;
  energy closure (regen falls with weaker braking; reported).
- Report-only: the ≥ 300 km/h bin, entry phase time, corner minima (later braking points shift speeds), DRS, straights.

## 4. Multiplicity and attempts
One attempt only (central). Test count carries over: decoupled limits 3, wing-level polar 1 → this is test 5, one-sided
**α = 0.05/5 = 0.01**. Fail → braking row stays open, labelled "achieved braking not modelled".

## 5. Power (check job recomputes before any fold; no run if not judgeable)
MDE = (z(1 − 0.01) + z(0.8))·SD/√n = 3.17·SD/√n. Conservative unpaired stand-in (A2 baseline alone, no candidate): per-track braking
RMS mean 1.02 g, SD 0.28 g, n 24 → **MDE 0.18 g ≤ 0.51 g needed: judgeable.**
Lap guard: UB = mean harm + 1.71·SD_paired/√24. No paired SD exists before a candidate; the only stand-in (C3, many parameters
changed) is 1.21 pp, which would need a mean lap gain of ≥ 0.32 pp to pass. A one-change cap should move laps far less; the check job
reports the guard's width from the run itself (not a pre-run gate).

## 6. Use case
Prediction and replay alike: the cap comes from other tracks' measured laps (held-out), so no same-session measurement enters.
