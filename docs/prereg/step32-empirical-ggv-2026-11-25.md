# Step 32 pre-reg — empirical g-g-v tables + straight-line consistency, LOTO (2026-11-25, v2, final for central)

**v2 supersedes v1** (sha256 2b096c12…edeaec, 08:30 KST), which central amended before approval
(claude/decision-central-31-v1-2026-11-25.md, decision 3). Neither version has seen any step 32 number: no table, no candidate lap,
no candidate score exists. The only numbers below are A2 baseline power rows (step 31, committed, not reproduced) and step 31's V1
result (run 45505621905), which is the reason for the amendments. Research only: nothing ships without central approval; no model code
is merged. Scope: F1 only. 2022 LOCKED: not opened (asserted in code). Locked set (events starting after 2026-11-23 00:00 KST): not read.
Base: fork `fix/kernel-deploy-accounting-2026-11-25` @ **589b6b3** (ERS deploy accounting + Suzuka 2026 puRamp mesh fix) + the kernel
part of step 31's `car.decoupled` hook (commit 698a75c on `step31-k2`, cherry-picked). Branch `step32-empirical`.
Skills (Skill tool, this session): meta-discipline-physics:experimental-method-and-error-analysis,
meta-discipline-physics:model-building-and-approximation, meta-discipline-physics:classical-mechanics, anthropic-skills:ponytail.
Context: step 30c (g-g-v), 30d (kerbs), 31 V1 status and central decision, definition-100.

## 1. Idea, type, family
- Quantity: F1 corner apex speed (and entry/exit phase time) on the 2023–25 quali traces, held out by track.
- Change: the car's lateral, braking and traction limits become **per-season tables over speed measured from public telemetry** (p95),
  and the straight-line power/drag pair is made consistent (§4). Step 31 showed that decoupled limits fix held-out corner speed
  (+4.41 km/h, p 0.0003) but its lap time got worse (pIce 540 kW with the shipped CdA; braking b0 + b2·v² too curved). Step 32 keeps
  the decoupling, replaces the curved forms by measured tables, and fixes the power/drag pair.
- Type: model change, physics correctness with a component metric, like step 31.
- **Family:** same quantity and held-out rows as step 31 → the second candidate on the same folds (central decision 4). Candidates tried in
  the family: step 31 V1 (rejected; V2 not run) + step 32 V1 → **m = 2, α = 0.05/2 = 0.025** (AGENTS.md: m = all candidates tried so far).
  One variant only. Stop rule: a third rejection stops the idea.

## 2. Geometry (no kerbs) and the line the envelope is measured on
- **f_kerb = 0** (step 31's data put it at its bound, 0.0006 in all 24 folds). Official widths stay.
- Driven line = step 31's corridor at f = 0: kernel κ × s(0) from `scripts/sim/data/step31/corridor.json` (sha256 75030e80…dfce;
  TUM white lines − 1 m + official width Δ, 30d solver); taper as step 31 (× s within ±60 m of the apex, linear to 1 at ±120 m,
  overlaps take the smaller). Code reused (`trackFor(id, zones, grip, 0)`). 13 corridor tracks: austin, hungaroring, interlagos,
  mexico-city, montreal, monza, sakhir, shanghai, silverstone, spa-francorchamps, spielberg, suzuka, zandvoort.
- **The training envelope is measured on that same line:** a_y,meas(s) = v_meas(s)² · |κ_driven(s)|, with κ_driven exactly the κ the model
  lap uses on that track. The other 11 tracks (8 without TUM edges; catalunya, melbourne, yas-marina-circuit with older TUM layouts)
  keep the current path for the model **and** for their envelope samples. No geometry parameter is fitted.

## 3. Car limits (car field `empiricalLimits`, default unset; unset = byte-identical)
Per season s and per LOTO fold, from the **training tracks' quali laps only**:
- Data: 2023–25 = `scripts/sim/data/f1-envelope/traces.json` (sha256 17638e29…56fe; 56 laps, 24 tracks; step 31 rows).
  2026 = the 2026 pole laps in `worker/lapsim/f1-real-telemetry-data.js` (21 tracks; laps with alignment corr < 0.93 dropped by the 30c
  rule, expected monza and suzuka); own LOTO over the 2026 tracks.
- Derivative: Savitzky–Golay, 45 m window, periodic (30c / step 31 estimator, code reused).
- **Lateral** a_y,max(v): p95 of a_y,meas per bin, all samples (30c estimator).
- **Braking** (tyre part): p95 of −a_x,meas per bin, × the car's inertia factor (1.06, the kernel's own value), minus the model's drag
  and rolling resistance per unit mass at the measured v, using that season's CdA from §4.
- **Traction** (tyre part): p95 of +a_x,meas on exit-phase samples (30c phases), × inertia factor, plus drag and rolling resistance at
  the measured v (season CdA from §4). Data range ends at the bin of the p95 maximum (above it the car is power-limited). The kernel keeps
  F = min(power force, m·a_tr(v)·e(r)).
- **p95; 20 km/h bins** ([60,80), [80,100), …); a bin is in the data range only with **N ≥ 200 samples from ≥ 3 tracks**; data range =
  the contiguous run of such bins.
- **Shape:** weighted isotonic regression (non-decreasing in v; weights = sample counts) on the bin p95s, then monotone PCHIP
  (Fritsch–Carlson) through the bin centres. No steps.
- **Outside the data range:** a + b·v² on each side (b by least squares on the 3 edge bins, b ≥ 0; a by continuity at the edge centre;
  low side floored at 0.5 × the edge value). Evaluated on a 5 km/h grid 0–380 km/h and stored as table points.
- **Kernel use:** lateral via the existing `lateralCap {kind: 'table'}` (PCHIP; the grid covers every reachable speed, so its "flat
  outside" never acts); braking and traction via step 31's `car.decoupled` hook with an added table form evaluated the same way.
  Same ellipse: e(r) = √(1 − r²), r = a_y / a_y,max(v).
- **No per-track factors:** candidate grip = 1 on every track. ClA, DRS zones and timing, weather, mass and the ERS path unchanged.
- 2023–25 laps use the shipped 2025 car body (as steps 28/31); 2026 laps the shipped 2026 car on the corrected kernel (f1-2026 ERS
  path, C5.12 ramp).
- **Flag-off check in the run:** the 56 A2 baseline laps regenerated with the changed kernel are byte-identical to
  `a2-baseline-traces.json` (sha256 7427e195…c30c85); the 2026 baseline laps equal the same laps on 589b6b3.

## 4. Straight-line consistency — choice: **(a) fit CdA per season, pIce fixed 540 kW**
**Why (a), not (b) "keep the shipped pair":**
- The shipped pair (pIce 476 kW, CdA median 1.28 over tracks) was fitted on lap time **together with** the old coupled grip, the error structure 30c
  showed to be compensating. 476 kW is well below the published power, so with the pair kept the car would be power-short between
  about 150 and 280 km/h, where the measured traction table no longer limits it. That would hand lap time a new compensating error.
- (a) puts each number on the data that measures it: power at its published value, drag on the speed the car actually reaches at the end
  of straights (power/drag balance), grip on the corner envelope. Straight-end speed is not the primary metric, so the fit does not leak
  into the judged quantity.
- Cost: one parameter per season, with the published prior N(1.35, 0.12²). Step 31's lap failure points at this pair, so leaving it
  unchanged would test the tables against a known error.
- 2026 keeps its shipped pair: the prior is for the 2023–25 cars, and the 2026 PU split and active aero make 540 kW and 1.35 wrong
  for it.

**Fit (per fold, per season 2023–25, training tracks only):**
- Parameter θ_s = season CdA level, prior N(1.35, 0.12²), bounded [0.99, 1.71] (±3σ). Per track the shipped per-track trims keep their
  pattern: cdA_track = shipped cdA_track × θ_s / 1.2820 (median shipped 2025 cdA over the 24 tracks; range 1.069 Las Vegas –
  1.354), and cdALow (DRS open) scales by the same ratio. So θ_s is the median-track CdA, the quantity the prior describes.
- Residual: straight-end speed = model max v within ±40 m of each measured straight end (traces `straights`), minus the measured v there.
- J(θ_s) = Σ_laps Σ_straights (r / 5 km/h)² + ((θ_s − 1.35) / 0.12)². Golden search on the bounds, 20 steps.
- Order (fixed, 2 passes): tables with the prior-mean CdA → fit θ_s → rebuild the braking/traction tables with θ_s → refit θ_s once.
  The final θ_s and tables are used.
- A θ_s at a bound or > 2σ from its prior is reported as a model-error flag (definition-100 item 3), not as a physical value.
- **Reported, not judged:** straight-end speed residuals (model − measured; mean, signed, RMS, per track, per season) for the baseline
  and the candidate on held-out tracks; θ_s per fold (median, range, z, LOTO jackknife SE).

## 5. Conditions (quali tables, race use)
The tables (and θ_s) are **qualifying conditions** (low fuel, new tyres, quali modes); only quali laps train them. Race use keeps the
existing fuel-mass and tyre-wear factors unchanged, on top of the tables. No race lap is used to fit or judge.

## 6. Validation (LOTO; tables and θ_s rebuilt without the held-out track in every fold)
2023–25 group: 24 folds, same folds and rows as step 31. Per-track value = mean of its events' per-lap RMS. Baseline = **step 28 A2**
(shipped 2025 car, production path, held-out grip = geometric mean of the other 23 tracks' shipped grip), scored by the same code in the
same run.
- **Primary:** held-out apex speed RMS **120–240 km/h** (apex = model v_min within ±40 m of each measured speed minimum). Gain = baseline −
  candidate per track. **Pass: one-sided sign-flip p < 0.025 and mean gain ≥ 3 km/h, n ≥ 5.** Report mean, 90/95 % bootstrap CI.
- Reported, not judged: apex RMS 120–180 with CI; per-track results; corridor vs old-path tracks; signed lap errors per track.
- **Guards** (all must pass):
  1. Lap: one-sided 95 % t upper bound of the mean paired |lap err| harm ≤ **0.10 pp**.
  2. DRS: pooled pass rate (|err| ≤ max(25 %, 0.05 s), right sign) on the 125 kept cases ≥ the A2 baseline's.
  3. Braking: candidate p95 −a_x ≤ measured p95 + **0.3 g in every** 20 km/h bin 80–280 km/h with ≥ 200 samples in each trace set (pooled
     held-out laps, 30c estimator).
  4. Entry and exit phase-time RMS: fail if the candidate is worse with one-sided sign-flip p < 0.05.
  5. Mesh: (a) `tests/lapsim-mesh.test.mjs` passes with two added cases (2025 car + all-track 2025 table + median θ; 2026 car + all-track
     2026 table): lap change < 0.03 % at ds/2 and ds/4; (b) on all 24 tracks the candidate's max |v(ds) − v(ds/2)| at shared points ≤
     max(the baseline's value on that track, 0.5 km/h); (c) each table: |Δa| between adjacent 1 km/h points ≤ 0.05 g.
- **2026 group** (own LOTO, own tables, shipped 2026 pIce/CdA; baseline = shipped 2026 car, held-out grip = geometric mean of the other
  2026 tracks'): same primary rule, guards 1, 3, 4, 5 (no DRS in 2026). Judged only if n_2026 (tracks with a 120–240 apex after the
  alignment rule) ≥ **16** (MDE ≤ 3 km/h, §7); otherwise "not judgeable at this n", no attempt spent, 2026 keeps the current car.
- Verdict per group = PASS only if its primary and every guard pass.

## 7. Power (A2 baseline rows; local, not reproduced; the run's `check` job recomputes it)
Source `scripts/sim/data/step31/step31-power-band120-240.json` (sha256 c3f27388…eb2c, `step31-k2`), method of `step31_power.py` (gain SD
proxied by the within-track between-season SD). Z = z(1 − 0.05/2) + z(0.8) = **2.80**.

| Metric | n | SD | MDE (Z 2.80) | Useful | Judgeable |
|---|---|---|---|---|---|
| **Apex RMS 120–240, 2023–25** | 23 | 4.12 km/h | **2.41 km/h** | 3 km/h | **yes** |
| Entry / exit Δt RMS (guards) | 24 | 0.040 / 0.048 s | – | – | guard only |
| Lap guard (planning UB half-width) | 24 | 0.85 pp | 0.29 pp | 0.10 | needs a real lap gain |
| Apex RMS 120–240, **2026** (planning, SD borrowed) | 15 / 16 / 19 | 4.12 | 2.98* / 2.89 / 2.65 | 3 | only if n ≥ 16 |
\* n 15 gives 2.98 at Z 2.80 but the rule is fixed at n ≥ 16 to keep a margin for the borrowed SD.
The 2026 SD is borrowed from 2023–25 (one season, no within-track pair); the check job reports n_2026 and the §6 decision.

## 8. Label and display
"model (learned from public telemetry) / 모델(공개 텔레메트리에서 학습)", with "qualifying conditions; race laps use the existing fuel and
tyre factors". Never shown as measured. Measured telemetry stays shown and unedited.

## 9. Run, code, rules
- Code (ponytail): reuse step 31's scoring (`score`, `drsPred`, A2 baseline, phases), the 30c derivative, the existing
  `lateralCap 'table'`, the step 31 hook (+ table form); new `step32_tables.py` (quantiles → isotonic → PCHIP → edge fallback) and
  `step32-loto.mjs` (per fold: tables, θ_s fit, simulate, score). Each new script has an assert-based self-check (monotone, continuous,
  N rule, no 2022, no locked event).
- Run: `.github/workflows/lapsim-pipeline.yml` dispatched on the fork in **research mode** (a `step32` job, like steps 22/28); every
  number cites that run id and its `pipeline-report-<run id>`. Inputs as step 31: committed, hashed files (traces, corridor, A2 traces,
  DRS cases) listed with sha256 in the report.
- No verdict until all folds exist; an infrastructure failure is rerun on the same commit (not a new attempt).
- Ledger line in `docs/gate-ledger.md` before the run (pending), result after. No merge of model code.

### Questions for central (defaults apply if no answer)
- Q1: 2026 judged only if n_2026 ≥ 16 with the borrowed SD? Default yes.
- Q2: run as a research-mode job in lapsim-pipeline.yml with committed, hashed inputs (as step 31's workflow)? Default yes.

## 10. Limits
- p95 envelopes are statistics, not limits; pooled over tracks, so a high-grip surface lifts the table for all.
- CdA level and pIce trade against each other on top speed; with pIce fixed, θ_s also absorbs ERS deploy and engine-mode errors on
  straights. A θ_s far from 1.35 says that, not that the drag is that value.
- Traction data range ends where power limits the car; above it the a + b·v² extension only keeps the cap above the power limit.
- 2023–24 laps run the 2025 car body; 2026 rows are one lap per track.
- Measurement ledger (planning inputs): apex RMS 120–240 median 24.7 km/h, SD 4.12 (stat, within-track); systematics not bounded here
  (alignment ICP 1.7–4.3 m; sampling ≤ 1.5 km/h on v_min, 30c). No theory–data comparison before the run.
