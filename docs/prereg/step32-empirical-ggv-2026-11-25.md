# Step 32 pre-reg — empirical g-g-v tables (backup to step 31), LOTO (2026-11-25, final for central)

Written before any step 32 number. No table, no candidate lap and no candidate score exists. The only numbers below are the A2
baseline power rows (step 31, committed, not reproduced). Research only: nothing ships without central approval; no model code is merged.
Base: fork branch `fix/kernel-deploy-accounting-2026-11-25` @ **589b6b3** (= c48d878 + 79452d2 deploy accounting + ca80634 report
+ 589b6b3 Suzuka 2026 puRamp mesh fix; the mesh fix has landed, so no later rebase is needed). Branch `step32-empirical`.
Scope: F1 only. 2022 LOCKED: not opened (asserted in code). Locked set (events starting after 2026-11-23 00:00 KST): not read (asserted).
Skills (Skill tool): meta-discipline-physics:experimental-method-and-error-analysis, meta-discipline-physics:model-building-and-approximation,
meta-discipline-physics:classical-mechanics, anthropic-skills:ponytail.
Context: claude/status-2026-11-25-step30c-ggv.md, claude/status-2026-11-25-step30d-kerbs.md, claude/decision-central-30c-clue-2026-11-25.md,
claude/definition-100-2026-11-24.md, step 31 pre-reg 5f564ba8… and A1 27371dfa….

## 1. Idea, type, family
- Quantity: F1 corner apex speed (and entry/exit phase time) on the 2023–25 quali traces, held out by track.
- Change: replace the car's lateral, braking and traction limits by **per-season tables over speed measured from public telemetry**
  (p95 envelope), instead of step 31's parametric forms with fitted priors. No optimiser, no objective: the only learned values are
  binned quantiles.
- Type: model change, physics correctness with a component metric (CLAUDE.md / AGENTS.md physics rules), like step 31.
- **Family (AGENTS.md "one idea, one family"):** same quantity on the same held-out rows as step 31 → same family. Candidates in the
  family: step 31 V1, step 31 V2 (conditional), step 32 V1 → **m = 3, α = 0.05/3 = 0.0167** for step 32. Step 31 keeps its hashed α (0.05/2);
  see §9 Q1. Stop rule: if all three are rejected, the idea stops (physics rule 5.4) and the ledger says why.
- **One variant only** (V1). No V2, no re-run with other bins, quantile or N.

## 2. Geometry first, consistent with the envelope (no double counting)
- **Driven line** = step 31's corridor geometry at a **fixed f_kerb = 0.5**: kernel κ × s(0.5) from `scripts/sim/data/step31/corridor.json`
  (sha256 75030e80…dfce; TUM white lines + official widths + 0.5 × iRacing kerb offsets, 30d solver), same taper (× s within ±60 m of the
  apex, linear to 1 at ±120 m, overlaps take the smaller). Code reused from step 31 (`trackFor(id, zones, grip, fk=0.5)`), not rewritten.
  13 corridor tracks: austin, hungaroring, interlagos, mexico-city, montreal, monza, sakhir, shanghai, silverstone, spa-francorchamps,
  spielberg, suzuka, zandvoort.
- **The training envelope is measured on that same line:** a_y,meas(s) = v_meas(s)² · |κ_driven(s)|, with κ_driven exactly the κ the
  model lap uses on that track. Not the TUM line, not the old path where the model runs the corridor.
- The other 11 tracks (8 without TUM edges; catalunya, melbourne, yas-marina-circuit with older TUM layouts): current kernel path for
  the model **and** for their envelope samples.
- f_kerb is not fitted (0.5 fixed by this pre-reg). So step 32 has no geometry parameter.

## 3. Model (car field `empiricalLimits`, default unset; unset = byte-identical)
Per season s ∈ {2023, 2024, 2025, 2026} and per LOTO fold, from the **training tracks' quali laps only**:
- Data: 2023–25 = `scripts/sim/data/f1-envelope/traces.json` (sha256 17638e29…56fe, 56 laps, 24 tracks; the step 31 rows).
  2026 = the 2026 pole laps in `worker/lapsim/f1-real-telemetry-data.js` (21 tracks with a 2026 lap; laps with alignment corr < 0.93
  dropped by the 30c rule, expected: monza, suzuka), own LOTO over 2026 tracks only.
- Derivative: Savitzky–Golay, 45 m window, periodic (the 30c / step 31 estimator, code reused). Samples at the trace step (≈5 m).
- **Lateral** a_y,max(v): p95 of a_y,meas per 20 km/h bin, all samples (30c estimator).
- **Braking** (tyre part): p95 of −a_x,meas per bin, minus the model's drag and rolling resistance at the measured v (shipped CdA,
  as step 31's braking prior); converted with the kernel's own inertia factor as step 31's hook reads it (no new constant).
- **Traction** (tyre part): p95 of +a_x,meas on exit-phase samples (30c phases) plus drag and rolling resistance at measured v, same
  conversion. The kernel keeps F = min(power force, m·a_tr(v)·e(r)); data range ends at the bin of the p95 maximum (above it the
  measured value is power-limited, not tyre-limited).
- **Quantile p95. Bins 20 km/h** ([60,80), [80,100), …). A bin is in the data range only with **N ≥ 200 samples from ≥ 3 tracks**
  (the step 31 braking-guard count). Data range = the contiguous run of such bins.
- **Shape:** weighted isotonic regression (non-decreasing in v; weights = sample counts) on the bin p95s, then **monotone PCHIP**
  (Fritsch–Carlson) through the bin centres. No steps.
- **Outside the data range:** a + b·v² on each side; b by least squares on the 3 edge bins (b ≥ 0), a set by continuity at the edge
  centre; low side floored at 0.5 × the edge value. Evaluated on a 5 km/h grid 0–380 km/h and stored as table points.
- **Kernel use:** lateral via the existing `lateralCap {kind: 'table'}` (PCHIP through (kph, a_y); the grid covers every reachable speed,
  so its "flat outside" never acts); braking and traction via step 31's `car.decoupled` hook (commit 698a75c, kernel part cherry-picked)
  extended with a table form evaluated the same way. Same friction-ellipse shape: e(r) = √(1 − r²), r = a_y / a_y,max(v).
- **No per-track factors:** candidate grip = 1 on every track (held-out and training); the table is the pooled envelope. ClA, CdA, DRS
  zones and timing, weather, mass, pIce (540 kW as step 31) and the ERS path unchanged. Air-density scaling of the cap: as the existing
  hook does for `table` (no new choice).
- 2023–25 laps use the shipped 2025 car (as steps 28/31); 2026 laps use the shipped 2026 car on the corrected kernel (f1-2026 ERS path,
  C5.12 ramp; this is why the Suzuka mesh fix matters for step 32 and not for step 31).
- **Flag-off:** unset `empiricalLimits` = today. Check in the run: the 56 A2 baseline laps regenerated with the changed kernel are
  byte-identical to `a2-baseline-traces.json` (sha256 7427e195…c30c85), and the 2026 baseline laps equal the same laps on 589b6b3.

## 4. Conditions (quali tables, race use)
The tables are **qualifying conditions** (low fuel, new tyres, quali engine modes), because only quali laps train them.
Race use keeps the existing fuel-mass and tyre-wear factors unchanged, applied on top of the table limits. No race lap is used to
fit or judge. The page label says this (§8).

## 5. Validation (leave-one-track-out; the tables are rebuilt without the held-out track in every fold)
2023–25 group: 24 folds, same folds and rows as step 31. Per-track value = mean of its events' per-lap RMS (step 31 rule).
Baseline = step 31's **A2** (shipped 2025 car, production path, held-out grip = geometric mean of the other 23 tracks' shipped grip),
scored by the same code in the same run.
- **Primary:** held-out apex speed RMS **120–240 km/h** (apex = model v_min within ±40 m of each measured speed minimum). Gain = baseline −
  candidate per track. **Pass: one-sided sign-flip p < 0.0167 and mean gain ≥ 3 km/h, n ≥ 5.** Report mean, 90/95 % bootstrap CI.
- Reported, not judged: apex RMS 120–180 km/h with CI; per-track results; corridor vs old-path tracks.
- **Guards** (all must pass):
  1. Lap: one-sided 95 % t upper bound of the mean paired |lap err| harm ≤ **0.10 pp**.
  2. DRS: pooled pass rate (|err| ≤ max(25 %, 0.05 s), right sign) on the 125 kept cases **≥ the A2 baseline's** (zones unchanged).
  3. Braking: candidate p95 −a_x ≤ measured p95 **+ 0.3 g** in every 20 km/h bin 80–280 km/h with ≥ 200 samples in each trace set
     (pooled held-out laps, 30c estimator). Note: the tables come from measured p95, so on training laps this is close to true by
     construction; it is judged on held-out laps only.
  4. Entry and exit phase-time RMS: fail if the candidate is worse with one-sided sign-flip p < 0.05 (no effect-size threshold).
  5. Mesh: (a) `tests/lapsim-mesh.test.mjs` passes with two added cases (2025 car + 2025 all-track table; 2026 car + 2026 all-track
     table): lap change < 0.03 % at ds/2 and ds/4 on every mesh track; (b) speed-trace steps: on all 24 tracks, the candidate's
     max |v(ds) − v(ds/2)| at shared points ≤ max(the baseline car's value on that track, 0.5 km/h); (c) each table: |Δa| between
     adjacent 1 km/h points ≤ 0.05 g (no step in the cap itself).
- **2026 group** (own LOTO, own tables; baseline = shipped 2026 car, held-out grip = geometric mean of the other 2026 tracks'):
  same primary rule and guards 1, 3, 4, 5. Guard 2 is not applicable (no DRS in 2026). Judged only if n_2026 (tracks with a 120–240
  apex after the alignment rule) gives MDE ≤ 3 km/h (§6), i.e. **n_2026 ≥ 17**; otherwise "not judgeable at this n", no attempt spent
  for 2026, and 2026 keeps the current car.
- Verdict = PASS (per group) only if its primary and every guard pass.

## 6. Power (from A2 baseline rows; local, not reproduced; the run's `check` job recomputes it)
Source: `scripts/sim/data/step31/step31-power-band120-240.json` (sha256 c3f27388…eb2c, branch step31-k2), method of
`step31_power.py` (gain SD proxied by the within-track between-season SD / √2). Z = z(1 − 0.05/3) + z(0.8) = **2.97**.

| Metric | n | SD | MDE (Z 2.97) | Useful | Judgeable |
|---|---|---|---|---|---|
| **Apex RMS 120–240, 2023–25** | 23 | 4.12 km/h | **2.55 km/h** | 3 km/h | **yes** |
| (same at m = 2, step 31's Z 2.80) | 23 | 4.12 | 2.41 | 3 | yes |
| Entry / exit Δt RMS (guards) | 24 | 0.040 / 0.048 s | – | – | guard only |
| Lap guard (planning UB half-width) | 24 | 0.85 pp | 0.29 pp | 0.10 | needs a real lap gain (as step 31) |
| Apex RMS 120–240, **2026** (planning, SD borrowed from 2023–25) | 16 / 17 / 19 | 4.12 | 3.06 / 2.97 / 2.81 | 3 | only if n ≥ 17 |

The 2026 SD is borrowed (one season, no within-track pair); labelled as such. The check job reports n_2026 and the decision for §5.

## 7. Choice rule with step 31 (fixed now, before either result)
- If both pass (step 31 = whichever of its V1/V2 passed): **ship step 31** (parametric, fewer parameters), unless step 32's held-out
  apex RMS 120–240 is better than step 31's by more than **2.55 km/h** (step 32's MDE): mean over tracks of (RMS_31 − RMS_32), same
  23 tracks, same folds.
- If only one passes: that one. If neither: neither; family count as §1.
- Both are ledger candidates on the same folds (m = 3).

## 8. Label and display
"model (learned from public telemetry) / 모델(공개 텔레메트리에서 학습)", with "qualifying conditions; race laps use the existing fuel and
tyre factors". Never shown as measured. Measured telemetry stays shown and unedited.

## 9. Run, code, rules
- Code plan (ponytail): reuse step 31's scoring (`score`, `drsPred`, A2 baseline, phases), the 30c derivative and the existing
  `lateralCap 'table'`; cherry-pick the step 31 kernel hook and add a table form; new `step32_tables.py` (quantiles → isotonic → PCHIP →
  edge fallback) and `step32-loto.mjs` (per fold: build tables without the held-out track, simulate, score). Each new script carries an
  assert-based self-check (monotone, continuous, N rule, no 2022, no locked event).
- Run: `.github/workflows/lapsim-pipeline.yml` dispatched on the fork in **research mode** (a `step32` job, like steps 22/28); every
  number cites that run id and its `pipeline-report-<run id>`. Inputs as step 31: committed, hashed files (traces, corridor, A2 traces,
  DRS cases) listed with sha256 in the report.
- No verdict until all folds exist; an infrastructure failure is rerun on the same commit (not a new attempt).
- Ledger line in `docs/gate-ledger.md` before the run (pending), result after. No merge of model code.

### Questions for central (defaults apply if no answer)
- Q1: m = 3 for step 32 (family with step 31 V1/V2)? Default yes; step 31's hashed α stays 0.05/2.
- Q2: 2026 judged only if n_2026 ≥ 17 with the borrowed SD? Default yes; else not judgeable and 2026 keeps the current car.
- Q3: run inside lapsim-pipeline research mode with committed inputs (as step 31's workflow did)? Default yes.

## 10. Limits
- p95 envelopes are statistics, not limits; driver margin and traffic on quali laps lower them. Pooled across tracks (no per-track grip),
  so a high-grip surface lifts the table for all.
- iRacing kerb offsets are GT/LMP behaviour; f = 0.5 is a fixed middle value, not fitted.
- Traction data range ends where power limits the car; above it the a + b·v² extension only keeps the cap above the power limit.
- 2023–24 laps run the 2025 car; 2026 rows are few and one lap per track.
- Measurement ledger (planning inputs): apex RMS 120–240 median 24.7 km/h, SD 4.12 (stat, within-track); systematics not bounded here
  (alignment ICP 1.7–4.3 m, sampling ≤ 1.5 km/h on v_min from 30c). No theory–data comparison is made before the run.
