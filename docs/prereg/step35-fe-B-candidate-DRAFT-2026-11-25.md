# Step 35 B — FE sector-balance candidate: DRAFT pre-registration (2026-11-25; not final, not run)

Status: **draft**. It becomes final (hashed, ledger line) only after (1) the kernel inertia-in-braking fix lands
(fix/kernel-deploy-accounting-2026-11-25, step 27 session) and (2) step 31/32's series-generic hooks are on main or rebased onto that fix.
No judged run before both. Baseline = production FE output on that kernel (rebuilt with this step's start-line data fix).

## Why (A2 diagnosis, fork run 45520478642, report only)
Held-out sector share error vs features of the simulated lap (108 rows, 11 layouts, layout-clustered bootstrap):
- corner share alone: β +12.9 % per unit [2.0, 22.0] (R² 0.18): the model is relatively **too slow in corner-heavy sectors**;
- straight share alone: β −13.6 [−22.3, −5.8] (R² 0.17): relatively **too fast in straight-heavy sectors**;
- heavy braking zones: β −0.57 [−1.60, 0.25] — not carrying the error; together the three are collinear and none passes the A2 rule
  (partial R² 0.04 / 0.02 / 0.06);
- slow-corner (v < 0.5 v_max) part: β +4.1 [−1.0, 8.4] → **width not indicated** (central item 4 stays closed);
- traps: the Al Kamel FE Analysis files carry TOP_SPEED but it is **empty** in all 2,011 S11–S12 car-session rows (fetch run 45519678545)
  → corner vs power/drag cannot be split by speed; the trap guard is "not applicable" for FE (written reason, C2).
Reading: the grip/power balance is off in the corner-vs-straight direction (as in F1 steps 30–31). A single lap-time factor G hides it.

## Candidate (m ≤ 2)
- **V1 — decoupled lateral limit with rule priors:** car.lateralCap 'quad' a_y = μ_mech·g + k_aero·v² per rule set (Gen3, Gen3 Evo),
  μ_mech prior from the Hankook all-weather tyre (Gen3 Evo +5–10 % over Gen3, FIA/FE launch figures) with sd 0.1 g; k_aero = ρ·SCz/(2m) with SCz in the
  Gen3 tender range 1.5–2.0 (prior mean 1.75, sd 0.15). Power, regen and drive by rule and fixed: 350 kW duels / 300 kW groups,
  AWD duels only, regen 600 kW (250 front + 350 rear). SCx fixed at the tender middle 0.62 (no trap → not identifiable).
  Fitted on training sectors (sum of squared log sector errors) with the priors; G per rule set and T per layout as today.
- **V2 — V1 + decoupled braking/traction (step 31 hook):** own braking b0 + b2·v² and traction cap a_tr with priors from the rules (rear braking
  ≤ 350 kW regen, front friction + 250 kW regen; AWD traction in duels). Run only if V1's power check passes.

## Decision
- Unit: layout (seasons averaged), leave-one-event-out; layouts with a failed sector-line check excluded (as A2). n = 11 today.
- **Primary:** held-out sector RMS (all three sectors) vs baseline; pass when sign-flip p < 0.16/m and the mean gain > 0 with its
  90 % bootstrap interval reported; reported against σ_meas,sector (1.11 / 0.70 / 0.69 %).
- **Power check first:** MDE = 1.84 × SD(per-layout gains) / √n. Planning value from A2: SD of per-layout baseline sector RMS 1.77 %,
  so MDE ≈ 0.5–1.0 pp for gain SD = 0.5–1 × that (n 11). The run uses the training-fold SD; if MDE > the useful effect (0.25 pp sector RMS, about a third of σ_meas,sector) → not judgeable, no attempt.
- **Guards:** lap paired RMS-loss UB ≤ 0.10 pp; energy closes (|residual| ≤ 0.1 % of drive energy, on the fixed kernel); other series
  byte-identical (flag off); mesh test passes (ds 5 → 2.5 m, lap change ≤ 0.1 %); compute ≤ +20 %; no parameter at a bound (else flagged);
  trap bias: not applicable (no FE trap data).
- Stop: m ≤ 2, attempts counted per AGENTS Gate G v3.
