# Braking limit from measurement — amendment A1 (central 18:00 KST; written before any candidate number)

Base: docs/prereg/brake-limit-measured-DRAFT-2026-11-25.md, sha256 b78409898cf88e7147c5ba3de95895f0bdc954066fef1adadccd5f2f5ffa9036
(approved with this amendment). Everything there stays except where A1 changes it. One run. Independent of the polar run.

1. **Pair (central item 1).** Candidate = the standard pipeline refit (`lapsim-pipeline.yml`, workflow_dispatch, mode research, fit yes;
   μ, ClA, CdA, power fitted as the pipeline fits them) with `LAPSIM_BRAKE_CAP_MEASURED=on` in `.github/lapsim-fit.env`. Baseline = the
   same commit without that line. Code base: fork `refit/combined-2026-11-25` 48a28d0 (kernel = REGEN FIX 2 2512d18) + this step's
   code; same pinned snapshot (`.github/lapsim-snapshot.json`) and same kernel for both. Flag unset = byte-identical.
2. **The cap.** `scripts/sim/data/brake-cap-measured.json` from `scripts/sim/brake_cap_measured.py` on the step 32 top-10 traces
   (sha256 in the file). Per season 2023–26: limit = min(a0 + a2·v², max bin p95) — `brakeEnv` plus the kernel's constant cap
   `brakeDecelMax` — because the measured p95 rises and then flattens at 220–280 km/h (≈ 4.5 g), which a0 + a2·v² alone overshoots
   (5.3 g at 280). Both values are measurements (no model output). Bins ≥ 280 km/h stay excluded (central item 3). 2026 gets its own
   measured cap (109 laps); its braking row is report-only.
3. **Where the cap is held out.** In the refit (joint fit and its held-out lap folds) every season uses the all-track cap (a two-value
   curve from ≥ 18 tracks; the held-out lap folds therefore see it, disclosed). The **braking main test** uses the leave-one-track-out
   cap: the candidate refit car on each step 32 track gets the cap fitted without that track (`loto`), the baseline refit car none.
4. **Braking main test (unchanged rule, defined on the pair):** both refits' cars (`carsFor(track)[season]` from each run's
   calibration-data.js, each run's own track grip) are simulated on the step 32 top-10 sessions (step 32 track setup: zones, corridor,
   weather), 2023–25 judged. Per track braking RMS (40 km/h bins 100–340, ≥ 50 samples, ≥ 2 bins) of model p95 − measured p95, processed
   as the verdict. Pass: mean cut ≥ 50 % of the baseline mean, one-sided sign-flip p < 0.01, n ≥ 5, and the candidate's pooled row ≤
   measured + 0.3 g in every bin 100–260 km/h.
5. **Lap guard:** `pairedHarm` of `scripts/sim/pipeline-report.mjs` on (baseline calibration, candidate calibration), F1 rows:
   ub95Pp ≤ 0.10 pp. Its row limit (+1.0 pp) and WEC/FE rows are reported (WEC/FE must be identical: F1-only flag).
6. **Report (central item 2):** ClA per season with and without the cap, and whether each moves off the 8.0 bound; μ, CdA, pIce per
   season both runs; the pooled braking rows; per-track table; run ids. Other guards as the draft (mesh and energy closure: the
   pipeline's ship checks on each run).
7. Test 5 overall, α = 0.01, one attempt. Measured data untouched; 2022 LOCKED closed.
