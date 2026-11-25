# Step 32 report-only diagnostics — rules (2026-11-25, central review 80/100; hashed before any diagnostic number)

No fit, no selection, no attempt. Inputs: run 45524888217 (verdict summary: fold-median parameters per season), branch `step32-empirical`
@ 1509195 (base INERTIA FIX 69c7385), the committed top-10 traces (measured, read-only). Local runs, "not reproduced" until a pipeline job
repeats them. Skills (Skill tool): experimental-method-and-error-analysis, model-building-and-approximation, classical-mechanics, ponytail.
"Candidate car" below = the shipped 2025 body with the season's fold-median A7 parameters from run 45524888217
(2023 μ_y 1.9227, ClA 6.4656, θ 1.4359, c 0.2063, μ_x 1.4067, μ_xTrac 1.6624; 2024 2.0067, 6.5367, 1.4585, 0.2120, 1.3938, 1.6775;
2025 2.0960, 6.1800, 1.4016, 0.2172, 1.4103, 1.6111), pIce 540 kW, corridor f_kerb 0, DRS +54 m, grip 1.

## D1 Montreal power check: the check or the car?
On every Montreal held-out lap (2023–25 top-10 set): (a) the A2.1 check as run (midpoint speed, ERS without η_drive, ground-speed drag);
(b) a kernel-consistent check using the kernel's own forces (`opts.probe`, test hook of 69c7385): on every drive step, the kernel's
drive force F_drive(v_i) ≤ (P_ICE(v_i)·η_d + P_ERS,max·η_k·η_d)/v_i + 1 N. Verdict: **check bug** if (a) fails and (b) passes on every
step; **car** if (b) fails; per failing step: position, v, the two sides. If it is the check, the check is fixed to (b) in the code
(report only; the run's verdict is not recomputed).

## D2 Axle-level braking and traction
Fixed inputs (no fit): wheelbase L = 3.6 m (2022–25 maximum, kernel), CoG height h = 0.30 m (kernel; no published figure found →
sensitivity 0.25 and 0.35 m), static rear weight 0.55 and rear aero share 0.55 (kernel), brake balance β = 0.575 front (published F1
practice 55–60 % front → sensitivity 0.55, 0.60), tyre μ per axle = μ_y(F_z per tyre) with the kernel's load sensitivity (μ_x = μ_y).
1. Pure straight-line braking limit a_ax(v): largest a with β·F ≤ 2·μ(F_zf/2)·F_zf/2 … per axle, F = m·k·a − drag − roll,
   F_zf = (1−0.55)·m g + (1−0.55)·L_aero + m a h / L, F_zr = rest (bisection, ρ 1.2, each season's candidate μ_y and ClA).
2. Forward test: the candidate car with μ_x = μ_y and the deceleration cap `brakeEnv` = least-squares a0 + a2·v² fit of a_ax(v) over
   80–300 km/h (an existing car field), versus the A7 candidate (μ_x fitted); both simulated on every 2025 top-10 session, processed exactly
   as A7.3, braking and traction p95 per 20 km/h bin compared with the measured processed p95 and its track-cluster CI (A5 G-TR rule).
   Traction: the kernel's rear-axle traction with load transfer (h/L) and μ_xTrac = μ_y.
3. Answer: does the axle-level model with μ_x ≈ μ_y put the processed braking p95 inside the measured CI in more bins than the A7 car?
   Reported per bin with both sensitivities; no pass/fail, no tuning.

## D3 Drag with fixed values
Candidate car per season with θ fixed at (i) 1.35 (published prior) and (ii) the step 2a telemetry measurement (season means 2023 1.612,
2024 1.572, 2025 1.554), everything else as the fold medians. Straight-end bias (model − measured, A7 definition) per lap → session →
track, mean and track-cluster bootstrap 95 % CI (10 000, seed 32), all 24 tracks; plus the A2 baseline. Disclosure: (ii) is chosen
after seeing the step 32 straight bias, but it is an independent measurement (step 2a, 2026-11-23).

## D4 High-speed censoring
Throttle and brake channels of the same top-10 laps are read from TracingInsights at the pinned commits (read-only; not stored as
model input). Flat out = throttle ≥ 99 % and brake off. Per track and season: number of measured samples at 180–260 km/h, the flat-out
share, and in the A7 lateral bins 180–260 the share of samples at or above the bin's p95 that are flat out. Reported for every track,
worst three named. How A7 treated them: included in the envelope without selection (identical processing, A7.3.5).

## D5 Then: DRAFT pre-reg for candidate 3 (not hashed, not run), sent to central.
