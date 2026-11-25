# Step 35 C — Formula E race energy model (pre-registration, 2026-11-25)

Central 78/100 item 7. Written before any model run. Kernel base: inertia fix 69c7385 (braking and grade use m·k; energy
closure test in `tests/lapsim-energy-closure.test.mjs`). Measured data unchanged (byte-identity check as step 35).

## 1. Question
Does a race model limited by the usable race energy, with lift-and-coast by rule, predict the FE race-pace ratio
(race median green lap ÷ pole, `fe-race-w12.json`, 44,219 Al Kamel lap rows) better than today's empirical baseline?

## 2. Physics (fixed before any number)
- Energy per lap E_lap = (usable race energy by the Technical Regulations of that generation + regen) ÷ race laps; Attack Mode
  power and duration by the Sporting Regulations of that season; race power by rule (Gen3 / Gen3 Evo 300 kW race, 350 kW Attack).
- Lift-and-coast by rule: the driver lifts before each braking zone; the lift point per zone is chosen so the lap meets E_lap
  with the least time loss (equal marginal time per joule across zones). Regen is capped by the rule per axle.
- Closure: on every simulated lap, drive work = Δ kinetic + drag + rolling + brake/regen within 0.5 % (kernel test, 69c7385).
- Display: lift-and-coast and regen are labelled "model".

## 3. Units, baseline, primary
- Units: dry race events with a race ratio. Gen3 Evo only for the primary (24 events, 13 circuits); Gen3 reported.
- Baseline: leave-one-event-out mean ratio of the same circuit and generation (else the generation mean).
- Primary: paired gain in |held-out ratio error| (pp), circuit-clustered; useful effect 0.25 pp (the step 35 convention);
  guard: one-sided 95 % UB of harm ≤ 0.10 pp. ≤ 2 variants (kForVariants).

## 4. Power check first (rule: judgeable only if MDE at SD factor 1.0 ≤ useful effect)
`python3 -I scripts/sim/learn/fe-race-power.py` (same session as this pre-reg; disclosed):

| Set | n events | circuits | LOEO RMS | ICC | MDE (SD × 0.5–1) | n needed for 0.25 pp |
|---|---|---|---|---|---|---|
| Gen3 Evo dry | 24 | 13 | 2.89 pp | 0.78 | 0.77–1.55 pp | 229–918 |
| Gen3 + Evo dry | 52 | 22 | 3.44 pp | 0.91 | 0.80–1.59 pp | 527–2108 |

**Result: not judgeable.** No judged run, no attempt spent. The model may be built behind a flag (off) for the closure test and
a report-only table with its ± (29b "data limit"). Gen4 races (from Jeddah, 2026-12-18) are a different car and are not pooled;
re-run this check after each Gen4 race and reopen when n suffices.
