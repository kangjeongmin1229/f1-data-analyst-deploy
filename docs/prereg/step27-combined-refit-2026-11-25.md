# Step 27 — combined refit pre-registration (2026-11-25, written before the combined run)

Gate: honest-parameter amendment (central 19:35 KST, claude/decision-central-gate-honest-2026-11-25.md). It applies because the refit puts
physics and rule values in (kernel inertia / regen / deploy accounting / C5.12 deploy ceiling; FE axle mode D and rear regen-only braking E
by rule). Not retroactive: run 45572047447 stays judged under the old gate (no ship).

## Contents (exactly these; nothing else rides along)
- Kernel fixes: 79452d2, 589b6b3, 69c7385, e5b4768, 2512d18, C5.12 deploy ceiling c649b84.
- step35-fe-D 9f51f773 with LAPSIM_FE_AXLE=v1, LAPSIM_FE_BRAKE=on (.github/lapsim-fit.env).
- Each step 32 candidate (polar, braking) only if its own verdict is PASS, with its flagged code and flag on. A FAIL adds nothing.
- WEC kerbs off (LAPSIM_WEC_KERBS not present). Measured data untouched; the 2022 LOCKED set is never read.

## One run
ONE research run of lapsim-pipeline.yml on the final commit (pinned snapshot lapsim-inputs-r45123509702), report with LAPSIM_GATE=honest.
Before the PR: one production run on the same commit must match it within ±0.01 pp; that run id goes in the PR.

## Pass rule, per series (F1, WEC, FE), against the shipped calibration
1. No fitted parameter at a bound (ClA, CdA, μ, power) in any class/season of the series (report "at bound" column; F1 pIce is a scale
   on the prior and not checked).
2. Held-out paired harm: one-sided 95 % UB of the mean ≤ 0.15 pp.
3. No single held-out track/event worse than +1.0 pp.
4. WEC also: every class passes 1–3, no track over +1.0 pp, and held-out RMS within ±0.05 pp of step 34a's kernel-only 0.992 %.
5. Mesh at every mesh, energy closure 30/30, C5.12 test unchanged, CI list (CLAUDE.md) 0 failures with the run's derived files committed
   (calibration, 29b ranges, lmdh-regen-range, hypercar maker data, FE files).
The kernel is shared: if any series fails, nothing ships.
"Better" is claimed only for a gain ≥ the MDE.
