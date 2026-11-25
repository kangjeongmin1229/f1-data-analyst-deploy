# Step 32 pre-reg amendment A7: forward-model fit of physical parameters (central review 66/100, 2026-11-25 09:44 KST)

Base: v2 f96f3571…, A1 b4b89126…, A2+A3 adc8a73f…, A4 66bff3c9…, A5 a22fd470…, A6 a071fcaa…. Request 0950 answered: none of (a)/(b)/(c).
**Written before any candidate number.** Seen so far: baseline power rows, measured-data bin statistics, and the A2.5 table pre-check
(`scripts/sim/data/step32/precheck.json` f21c5e3c…: raw-table decomposition out of range). No fold ran; no attempt was spent.
Skills (Skill tool): meta-discipline-physics:experimental-method-and-error-analysis, meta-discipline-physics:model-building-and-approximation,
meta-discipline-physics:classical-mechanics, anthropic-skills:ponytail.

## A7.1 Why (measurement model)
The pre-check failures come from how the envelope is measured, not from the car: 4 Hz speed differentiated after interpolation inflates
the p95 (slow-corner μ 2.4–3.8, traction 1.5–2.4× the axle limit); fast corners are flat out, so the envelope above ~190 km/h is
censored, not a grip limit (ClA ≈ 1); trail braking lowers the braking p95 at a given speed (μx/μy 0.3–0.8). Selecting "limit samples"
would need the model itself (circular). So the tables are dropped as model inputs. The measured envelope becomes a **target** that the
simulated car must reproduce after **identical processing**.

## A7.2 Model: the kernel's own physics, refitted per season (2023, 2024, 2025)
Car = shipped 2025 car body with these fields fitted per season s (native kernel fields; no `lateralCap`/`decoupled` tables):
| Parameter | Kernel field | Prior (MAP; ±2σ = physical range unless stated) |
|---|---|---|
| μ_y,s (peak lateral μ at Fz0 = 3000 N; load sensitivity dμ/dFz = −5e-5 /N fixed, the kernel's shape) | `muY` | N(1.80, 0.20²) |
| ClA_s | `clA` | N(6.75, 1.125²) m² (Symonds C_L ≈ 4.5 × 1.5 m²; ±2σ = 4.5–9.0) |
| braking μ_x,s | `muX` | stage-1 forward fit (A7.5) |
| traction μ_xTrac,s (rear-axle limit, kernel axle load) | `muXTrac` | stage-1 forward fit (A7.5) |
| CdA level θ_s (median track; per-track trims kept, /1.2820) | `cdA` | N(1.35, 0.12²) |
| DRS drag cut c_DRS,s | `cdALow = cdA·(1 − c)` | N(0.20, 0.015²) |
| ClA_low | `clALow = clA·4.6/8` | tied (A2.1) |
pIce 540 kW fixed; DRS low-drag state 54 m after activation; corridor f_kerb 0; track terms u_t ~ N(0, 0.03²) (grip, partially pooled;
held-out u = 0); 2026 as A6 (report-only; its own fit with the same forward processing, priors from its shipped car ±10 %).
Priors are not bounds: Nelder–Mead is unbounded except μ, ClA, CdA > 0 and 0 < c < 1.

## A7.3 Identical processing (forward measurement model)
For every kept measured lap (A3.1/A6 top-10 set, A6 normalisation), the simulated lap of its session is processed exactly like the
measured lap:
1. **Same sampling:** the measured lap's raw sample positions (from its timestamps and speed integration, already used to build the grid
   trace) are stored as metadata (`xs`, grid-index units, frame of the measured lap); measured speeds are unchanged. The simulated
   speed is read at the same positions (model index = measured index − shift), then interpolated onto the 5 m grid with the same
   `np.interp`/JS-linear rule as the measured trace (same gaps).
2. **Same differentiation and smoothing:** Savitzky–Golay, 45 m window, order 2, periodic, one JS implementation applied to both
   (checked against scipy on the measured traces to 1e-9).
3. **Same curvature and line:** a_y = v²·|κ_driven| with the κ the model lap uses (A2/§2), for both.
4. **Same bins and quantile:** p95 per 20 km/h bin for lateral (all state-0 samples), braking (a_x < 0, state 0), traction (exit phase,
   a_x > 0, per aero state); bins with N ≥ 200 from ≥ 3 tracks **in both** sets.
5. **Same censoring:** no sample selection by "limit"; flat-out fast corners are censored the same way in both sets because both are
   processed alike. Measured laps are normalised to the pole car (A6, ×k, ×k²); simulated laps are the pole car and are not scaled.
6. Self-check: processing the measured trace through the simulated path (a "simulated" lap equal to the measured speed) returns the
   measured envelope exactly.

## A7.4 Objective per season (weights fixed here)
J_s = Σ_{kind, bin} ((p95_sim − p95_meas) / σ_bin)² + Σ_sessions mean_laps( RMS_apex/5 km/h + RMS_entry/0.10 s + RMS_exit/0.10 s
      + RMS_straight-end/5 km/h + |lap err|/0.5 % ) + Σ priors z² + Σ_t (u_t/0.03)².
σ_bin = track-cluster bootstrap SD (200 resamples, seed 32) of the measured p95, floor 0.05 g. Sums over the training tracks' laps
(session means, so a track's lap count does not weight it). Optimiser: per season Nelder–Mead on (μ_y, ClA, θ, c, μ_x, μ_xTrac) from the
prior means, 300 iterations, relTol 1e-4, two starts (prior mean; prior mean + 1σ), best kept; then u_t by golden search on
[−0.15, 0.15]; 2 rounds. Reported: χ²/dof of the envelope term per season and fold.

## A7.5 Braking and traction never balance another error (31 lesson)
Stage 1 (per fold, per season): μ_x and μ_xTrac fitted to the processed braking and traction envelope terms only (other parameters at
their prior means); their track-cluster bootstrap SD (50 resamples) gives the stage-2 prior N(stage-1 value, max(SD, 0.03)²).
**Guard G-BT:** a stage-2 μ_x or μ_xTrac more than 2 prior σ from its stage-1 value fails the verdict. G-SB (straight-end bias
±2 km/h CI) and G-TR (now: simulated traction p95 inside the measured p95 CI in every traction bin, held-out pooled) stay.

## A7.6 Physics checks on the fitted parameters (every fold; guards)
- P1: μ_y(Fz) = μ_y + dμ(Fz − Fz0) at the per-tyre loads of 60–330 km/h (ρ 1.2) in [1.4, 2.2]; ClA in [4.5, 9.0] m².
- P2: μ_x/μ_y in [0.8, 1.2].
- P3: traction ≤ rear-axle limit (kernel, by construction; checked) and ≤ power limit on every simulated lap (A2.1 (a)).
- P4: DRS load ratio < 1 where active (kernel `clALow` < `clA`). E: energy closes within 0.1 % on every lap.
The raw-table checks of A2.1/A2.5 are replaced by these. The A2.5 feasibility pre-check is dropped (it would need a fit).

## A7.7 Kept
Pole-car definition and A6 normalisation, unit = track, 2026 aero states and own MDE (report-only at 4.28 km/h), measured data
byte-identical (A2.0; the `xs` metadata are added to the top-10 traces file before the manifest is renewed, measured speeds unchanged and
checked equal), F1-only effect with every other series byte-identical (A4), compute ≤ +20 % (A6.4), mesh guards, fair A2 LOTO baseline,
power first, m = 2 (31 + 32), primary and all other guards as before, 2022 locked (A3.5), label "model (learned from public telemetry)".

## A7.8 Before the judged run
Wait for "INERTIA FIX <commit>" in claude/status-2026-11-25-refit.md; rebase on it; recompute the baseline rows and the power check;
write a one-line amendment with the commit; then ledger line and run.
