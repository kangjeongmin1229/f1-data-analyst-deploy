# Step 30c rules — measured g-g-v envelope vs the model (written and hashed before any envelope, 2026-11-25 ~07:35 KST)

Report only. No model change, no fit, no 2022 data (asserted in code). Code base: upstream `MisterKinn/f1-data-analyst` @ c48d878.

## Data
- **Tracks:** the 14 current-layout TUM tracks of step 30b (TUM fit RMS ≤ 5 m): austin, hungaroring, interlagos, mexico-city, montreal,
  monza, sakhir, shanghai, silverstone, spa-francorchamps, spielberg, suzuka, zandvoort, kuala-lumpur. Kuala-lumpur has no 2023–2025
  lap, so it can only enter the 2026 check. Any other loss is reported, not filled.
- **Laps:** the step 28 baseline set `scripts/sim/data/f1-envelope/traces.json` (2023–2025 qualifying fastest laps, slick and dry,
  corr ≥ 0.93). Distance = integrated speed scaled to the sim length; frame shift = the stored step 24 v2 lag (`shift`). Nothing re-aligned.
- **Path for measured a_y:** TUM min-curvature raceline (TUMFTM/racetrack-database @ e59595d1), placed on the kernel map with the step 30b
  rigid ICP (no scale), projected to the nearest kernel-grid point to get its s. κ by the step 30b estimator (1 m resample,
  Savitzky–Golay quadratic, 30 m window), sampled on the sim grid and shifted into the telemetry frame. Measured speed never touches κ.
- **Model:** shipped calibration, same stage as `f1-envelope-baseline.py` (2025 car, grip, timeScale not applied to v, production weather,
  event DRS zones). Run at c48d878.

## Signals
- a_y = v² κ; a_x = v · dv/ds, dv/ds by Savitzky–Golay (quadratic, **45 m** window, wrap). Same filter on measured and model speed.
- Combined g = √(a_x² + a_y²) / 9.81.
- Bins of 20 km/h on the speed of that trace (60–320). A bin needs ≥ 4 tracks and ≥ 200 samples, else it is not reported.
- Envelope per bin = **95th percentile** of combined g. "a_y max" per bin = 95th percentile of |a_y|. "Braking a_x" per bin = 95th
  percentile of −a_x over samples with a_x < 0.
- Three traces: (M) measured speed on the TUM line; (S) model speed on the TUM line (same path source); (K) model speed on the model's own
  path (kernel κ). Also (MK) measured speed on the kernel path, as a cross term.
- CIs: 95 %, 2 000 bootstrap draws over tracks (resample tracks, keep all their laps). Per season and pooled.

## Corners
- A corner = a local minimum of the **measured** speed with ≥ 10 km/h prominence in ±150 m (the stored `corners` of traces.json; built
  from the aligned measured trace, not lap share). Official turn = nearest page corner within 80 m, else blank.
- Agreement with the 283-row lap-share table (`f1-pedal-gap-corners-2025-2026.csv`, 2025 rows): a lap-share row agrees if a speed-min
  corner lies within 50 m of it on the same lap. The step 30b corrected corner CSV **does not exist** (searched project and fork); stated.
- Apex values: measured v_min at the corner; model v_min within ±40 m; R = 1 / peak |κ| (same sign) within ±40 m for the TUM line and
  for the kernel path.
- Corner window = previous measured straight end → next measured straight end (stored `straights`). Phases on the measured trace:
  **apex** = contiguous stretch around the minimum with v_meas ≤ 1.05 v_min; **entry (braking)** = before; **exit (traction)** = after.
  Time gap per phase Δt = ∫ (1/v_model − 1/v_meas) ds; share = phase Δt / corner Δt (reported where |corner Δt| ≥ 0.02 s).

## Decomposition and verdict (primary band 120–240 km/h measured apex speed, 2023–2025 laps, 13 tracks)
Identity per corner: y = ln(v_meas/v_model) = **G + H**, with G = ½ ln(a_y,meas[TUM line] / a_y,model[own path]) (grip-like: lateral g the
car reaches) and H = ½ ln(R_TUM / R_kernel) (geometry: radius the path gives).
Means over corners, track-cluster bootstrap 95 % CI. Sizes in km/h = median v_model × (exp(part) − 1).
- **"grip"**: G CI excludes 0 and (H CI includes 0 or |H| < 25 % of |G + H|).
- **"geometry/matching"**: H CI excludes 0 and (G CI includes 0 or |G| < 25 % of |G + H|).
- **"both"**: both CIs exclude 0 and each part ≥ 25 % of |G + H|.
- Otherwise **"inconclusive"**.
- Matching: M = mean y on the lap-share table − mean y on speed-min corners, same 2025 tracks. Reported with CI; if its CI excludes 0 and
  |M| ≥ 25 % of the lap-share-table gap, the verdict line adds "+ matching".
- Secondary (reported, does not decide): 180–240 band; envelope ratio a_y,M / a_y,K at 180–240; radius ratio needed instead,
  (v_meas/v_model)², vs observed R_TUM/R_kernel.

## 2025 vs 2026 check
Same-corner apex speeds from `worker/lapsim/f1-real-telemetry-data.js` (2025 and 2026 pole laps, cleanTel), speed-min matched within
±60 m between seasons; model from the 2025 and 2026 page cars. Reported: measured ratio, model ratio, and their difference per track.
A corner where the measured season ratio departs > 15 % from the track median is flagged as a likely matching or data error.

## Plots
PNG, matplotlib. Stacked charts share the x axis. Official turn numbers marked on per-corner charts.
