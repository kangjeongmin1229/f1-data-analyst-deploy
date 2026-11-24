# Step 30d pre-registration — kerb and width effect on apex radius + error budget (2026-11-25, report only)

Written and hashed before any step-30d number was computed. No model change, no fit, no 2022 data, measured speeds are not used to set
any radius or width. Not a pipeline run: every number will be labelled "not reproduced".

## Inputs
- Corner table: corrected 2025–26 table from step 30b matching audit, `scripts/sim/data/step30b/corners-rematched-2025-2026.csv`
  (sha256 66cf5776…0e41, 275 rows). Apexes and kernel radius R (= 1/|κ| at the apex of the page κ the F1 lap drives) by the step-30b export
  (`step30b-export.mjs`, same apex search). The old table (3598af14…, 283 rows) is used only for the matching term of the budget.
- Code: upstream `MisterKinn/f1-data-analyst` main (worker/lapsim unchanged since 618dce3 — checked by git diff before this file).
- TUM racetrack-database @ e59595d1 (centreline + w_tr_right/w_tr_left, raceline), placed by the step-30b rigid ICP.
- Kerbs: `worker/lapsim/kerb-use-data.js` via `lineData(id).kerbLine.l/.r` (m beyond the drawn edge, left/right of travel).
- Step 30b audit per corner (R_TUMline) re-run on the corrected table (already in `step30b/posthoc/step30b-audit-corners.csv`).

## Corner set
All corners of the corrected table with a TUM match (TUM centreline ≤ 6 m from the apex, as 30b). 14 current-layout tracks are the
primary set; catalunya, melbourne, yas-marina (older TUM layouts) are reported separately and flagged. Bands by measured apex speed:
60–120, 120–180, 180–240 km/h (as 30a).

## Per corner
- Deflection θ: |∫κ ds| of the page κ over the contiguous run around the apex where |κ| ≥ 1/1000 m⁻¹ with the apex sign (30a rule).
  θ_eff = min(θ, 180°) in the formula.
- Current apex radius R = R_kernel.

## Geometric radius gain (formula, primary)
Corner = two straights with deflection θ joined by an inside-edge arc of radius R_i, corridor width w. The largest constant-radius arc
that touches the outside edge on entry and exit and the inside edge at the apex has its centre on the bisector:
  R = R_i + w / (1 − cos(θ/2)).
With Δ_in extra usable width at the apex (inside edge moves in) and Δ_out extra on the outside (entry/exit edge moves out):
  ΔR = Δ_in · c/(1 − c) + Δ_out/(1 − c),  c = cos(θ_eff/2);  symmetric Δ: ΔR = Δ · cot²(θ/4).
Independent of R_i and w; assumes the current path already uses the full corridor and the straights are long enough (upper bound).
Checks: units m; θ = 180° → ΔR = Δ_out; θ → 0 → ΔR → ∞ (straight).
R_new = R + ΔR. Speed gain at fixed lateral g: v_new/v = √(R_new/R); reported as % (½ ln ratio) and km/h = v_model·(√ratio − 1).

## Cases (Δ per side, m)
1. Kerbs: tracks with iRacing kerb data: Δ_in = max inside kerb within ±40 m of the apex; Δ_out = mean of the max outside kerb over
   [−150, −20] m and over [+20, +150] m. A zero there stays zero. Tracks without kerb data: 1.3 m both sides.
   Inside = side toward the curvature centre of the lineData midline at the matched point.
2. Official widths: Δ_in = Δ_out = max(0, (W_official − median TUM width of the track)/2), same for every corner of the track.
   W_official = middle of the circuit's stated figure: Monza 11 (10–12), Suzuka 13 (10–16), Silverstone 15, Austin 15, Spielberg 12,
   Catalunya 12, Sepang 16, Shanghai 14 (Tilke 13–15), Sakhir 14.2 (GP track 14.22 m), Interlagos 13.5 (São Paulo city 12–15).
   No figure found: Hungaroring, Mexico City, Montreal, Spa, Zandvoort, Melbourne, Yas Marina → Δ = 0 (listed).
3. Both: Δ = kerb Δ + width Δ per side.

## Solver check (3 corners, chosen by rule before results)
Tracks: current-layout TUM tracks with kerb data. Corners: θ closest to 180°, 90° and 45° (ties: alphabetical track, then season 2025).
Solver: lateral offset n(s) from the kernel path at 2 m over apex ± 200 m, corridor = TUM edges − 1.0 m car half-width (+ Δ per case),
n = n' = 0 at the window ends; minimise the peak |κ| over the window (sequential LP on exact 3-point curvature, ±4 m arms, trust
region). ΔR_solver = R_solver(Δ) − R_solver(0). Pass: |ΔR_formula − ΔR_solver| ≤ 25 % of ΔR_solver on all 3 corners (kerb case).
The same solver is also run on every TUM-matched corner as a secondary result (if it converges; failures reported).
Rule for the budget: if the check passes, the kerb/width term uses the formula; if it fails, it uses the solver ratio R_solver(Δ)/R_solver(0).

## Statistics
Means by band with track-cluster bootstrap (10 000 resamples, 95 %); per-track means listed.

## Error budget (band 120–240, km/h, primary 14 tracks; mean over corners)
Total gap (old table) = matching + geometry + kerb/width + grip remainder:
- matching = mean(meas − model) on the old table − the same on the corrected table (same tracks, band);
- geometry = mean v_model·(√(R_g/R) − 1), R_g = R_TUMline where matched, else R (the 30b candidate); tail share (ln R_TUMline/R > 0.25) shown;
- kerb/width (case "both"; kerbs-only and widths-only shown) = mean v_model·√(R_g/R)·(√((R_g + ΔR)/R_g) − 1);
- remainder = mean(meas − model) − geometry − kerb/width (corrected table).
Joint track-cluster bootstrap 95 % CIs. Remainder is what stays unexplained (grip-like or other). Step 30c: if no separate 30c report
exists, its current numbers (30b matching audit) are used and labelled.

## PNG
The 3 solver-check corners: white lines (TUM edges), kerb edge (edge + iRacing kerb), current kernel path, solver line with Δ = 0 and
with kerbs, and the formula arc (radius R + ΔR); official turn numbers.
