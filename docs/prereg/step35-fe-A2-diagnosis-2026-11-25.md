# Step 35 amendment A2 — sector-imbalance diagnosis rule (2026-11-25, hashed before any regression number; report only)

Base: step35-fe (A1 sha256 4af26d38…). Central review 2026-11-25 09:35 KST item 2. No model change, no gate, no attempt.
Already seen before this file: the sector share errors per layout (status round 2) — not the features or any slope.

## Unit and response
- Unit: one Gen3 Evo dry qualifying group lap (fastest car of group A or B, 2025–26), one row per sector k = 1..3 (as in fe-step35.mjs).
- Response e (%): model share of the lap in sector k ÷ measured share − 1, × 100. Model = the rebuilt track with the lap start at the FINISH
  label foot (data fix of this step), Gen3 Evo 300 kW rear drive (group rule), session weather; I1/I2 from the printed map distances.
  Nothing in the model is fitted to sectors, so e is held-out by construction.
- Layouts whose sector-line label check fails (|label − printed| > 150 m: Mexico ×2, Miami 2026, Valencia, Jarama 2025) are excluded.

## Features per (layout, sector), from the same simulated lap
- corner share c: share of the sector's time with v < 0.8 × the lap's v_max;
- straight share s: share of the sector's distance with v ≥ 0.9 × the lap's v_max;
- heavy braking zones b: number of braking zones that start in the sector with a peak deceleration ≥ 1.5 g (zone = consecutive points with
  decreasing speed, ≥ 20 m long);
- measured speed at a line (only if the Al Kamel Analysis files carry per-line speed columns such as I1_KPH / I2_KPH / FL_KPH or TOP_SPEED):
  model − measured speed at that line on the fastest car's best lap, km/h, reported as trap bias per layout; not a regressor.

## Analysis
- OLS: e = β0 + β1·c + β2·s + β3·b (all rows). Clustered bootstrap by layout (2000 draws, seed 35), 90 % percentile CIs; also each
  feature alone. Report R², partial R² per feature, n rows, n layouts.
- Reading (fixed now): a feature "carries the error" if its 90 % CI excludes 0 **and** its partial R² ≥ 0.10. Sign: β > 0 means the
  model spends relatively too much time where that feature is high, i.e. it is too slow there:
  c → lateral grip / corner model; s → power, drag or deploy (too slow on straights = too little power or too much drag);
  b → braking (too slow = braking too weak; too fast = braking too strong, e.g. the kernel inertia omission).
- Width is pointed to only if β1 (corners) carries the error **and** the slow-corner part (v < 0.5 × v_max) carries it more than the fast part
  (reported split; a narrower corridor slows tight corners most).
- Start-line check: the re-scored S1 and S3 means before and after the start fix are reported (a start error moves time between S3 and S1).
