# Step 32 N5 — curvature-peak sharpness diagnostic: rule (written and hashed before any number)

Central 06:00 KST 2026-11-26. Report-only, one job, no refit, no attempt. Measured data read only; 2022 LOCKED not read.
Context: the measured-line draft (e1c0f8df…) was withdrawn before any run (measured line ≈ geometry, R ratio 0.99).

## Rows
Exactly N3's rows (rule docs/night/step32-n3-rule-2026-11-25.md, sha256 2e128de2…): every 2023–25 corner minimum of step 32's top-10
qualifying traces with measured v_min in [120, 240) km/h, aligned (|koff| < 100 m), not flat at the apex; y = A2 LOTO baseline err40
(model − measured, km/h). **Las Vegas rows are skipped** (x/y misalignment, r 0.13).

## Covariate
- Apex position = the corner's measured index i, mapped to the track grid mi = (i − shift) mod n.
- κ_raw = the geometry κ the A2 baseline model uses (`K.trackFromData(T[id]).kappa`, no corridor).
- κ_90 = κ_raw smoothed by a periodic quadratic Savitzky–Golay smoother (value term) over 90 m (window = round(90/ds) | 1 points).
- **sharpness = max |κ_raw| / max |κ_90|, both maxima within ±50 m of the apex.** z-scored over the rows.
- Expected sign: sharper → model too slow → **coefficient < 0**.

## Model
As N3: MixedLM err ~ z(sharpness), track random intercept (OLS fallback if singular, counted); LOTO by track with the fixed part;
R²_LOTO(M) = 1 − SSE(M)/SSE(null), null = intercept only. Reported: coefficient (km/h per SD) with 95 % CI, single LOTO R² gain.
Report-only extras (cannot trigger): ln(sharpness) as covariate; sharpness added to N3's covariate set (gain over N3's full model).

## Decision rule
If sharpness gives single LOTO R² gain ≥ 0.30 AND coefficient < 0 with its 95 % CI upper end < 0 → central may open a "geometry
smoothing" family (both lines smoothed at 90 m). Otherwise stop.

## Also reported (no decision)
- Implied a_y at the measured v_min with the raw geometry κ: a_y = (v_min/3.6)² × max |κ_raw| within ±50 m of the apex; flag > 6 g
  (58.84 m/s²). Per row, and the list of every 2023–25 track (Las Vegas skipped) with any measured apex above 6 g, worst first
  (all measured corner minima, not only the 120–240 rows), with the official corner number (nearest within 150 m).
