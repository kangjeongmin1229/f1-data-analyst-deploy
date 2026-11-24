# Step 32 pre-reg amendment A2 + A3 (2026-11-25, one document)

Base: pre-reg v2 sha256 f96f35711ce12db3cee22c90fc6cab74bbb226b3254102dc96f109a0957947a1; A1 sha256 b4b8912637fd763cfe09d40880353d4a19b1f90c5112edf113bbce92590e0322.
Sources: claude/decision-central-32-physics-2026-11-25.md (A2, owner + central) and central's A3 instruction (definition of 100,
claude/definition-100-2026-11-24.md). A2 was not hashed separately, so it is merged here, as central allowed.
**State when written: no candidate number exists.** Seen so far: A2-baseline power rows (step 31), the 2026 baseline rows of A1
(`scripts/sim/data/step32/baseline-2026-rows.json`: n 14, own MDE 8.9 km/h → 2026 report-only), and measured training-data bin counts
and p95s (no model involved). One crash-only smoke run (fold baku) stopped in table building before any lap was simulated.
Skills (Skill tool, this session): meta-discipline-physics:experimental-method-and-error-analysis,
meta-discipline-physics:model-building-and-approximation, meta-discipline-physics:classical-mechanics, anthropic-skills:ponytail.

## Part A2 — physics and measured data

### A2.0 Measured data is never changed
- Measured laps, telemetry and timing are read-only inputs: `worker/lapsim/f1-real-telemetry-data.js`, `f1-wet-quali-data.js`,
  `scripts/sim/data/f1-envelope/traces.json`, the TracingInsights files fetched by A3.1 (stored as committed, hashed JSON), the DRS case
  and zone CSVs. The Savitzky–Golay derivative works on a copy in memory; nothing is edited, smoothed in place, re-scaled or replaced.
- Only pre-registered drop rules select rows. Every dropped row is listed in the run report. Already dropped (step 28 rules): 2023 Austrian
  (telemetry gap), Belgian, British, Canadian, Dutch (mixed session), Saudi Arabian (telemetry gap); 2024 Belgian, São Paulo (compound
  INTERMEDIATE), British (mixed), United States (telemetry gap); 2025 Bahrain, Emilia Romagna, Mexico City (telemetry gap), Las Vegas
  (INTERMEDIATE). 2026 (A1): montreal, zandvoort, interlagos (wet quali), melbourne, monza, suzuka (alignment corr < 0.93); las-vegas
  kept for tables, no 120–240 apex.
- Model output is never blended into or shown as measured data. On raced tracks the page keeps the measured trace; model traces carry
  "model (learned from public telemetry) / 모델(공개 텔레메트리에서 학습)". (No page change in this research run.)
- Test `tests/step32-measured-readonly.test.mjs`: sha256 of every measured input file listed in `scripts/sim/data/step32/measured-manifest.json`
  equals the manifest; the run checks it before the folds and again after the verdict (CI steps).

### A2.1 Physical decomposition of every season table (reported per season and per fold) and its checks
Definitions use the kernel's own constants (shipped 2025 car: m 806 kg, inertia 1.06, cRoll 0.012, rear weight 0.55, rear aero 0.55,
load sensitivity dμ/dFz −5e-5 per N at Fz0 3000 N per tyre); ρ per track from production weather.
- **Lateral:** fit a_y(v) = μ_y(Fz)·(m g + ½ρ ClA v²)/m with μ_y(Fz) = μ0 + dμ·(Fz − Fz0), Fz = (m g + ½ρ ClA v²)/4, dμ fixed; μ0 and ClA by
  weighted least squares on the table's bin centres in its data range (weights = sample counts). **Checks:** implied μ_y at every bin in
  [1.4, 2.2]; ClA in [4.5, 9.0] m². The ClA range is ±1/3 around the one published figure found (Pat Symonds, Autosport: C_L ≈ 4.5 on a
  1.5 m² frontal reference → ClA ≈ 6.75 m²; no published spread found, so the width is my choice, stated here).
- **Braking:** the table is the tyre part; total = tyre + ½ρ CdA v²/m + rolling. **Checks:** tyre part ≥ 0 at every grid point;
  μ_x/μ_y = brake table / lateral table at the same speed in [0.8, 1.2] at every bin centre inside both data ranges.
- **Traction:** **checks:** (a) on every simulated candidate lap, drive acceleration ≤ (P_ICE·η_drive + P_ERS,max·η_ERS)/(m v) − (drag + roll)/m
  at every point (never above the power limit, upper bound with full deploy); (b) traction table ≤ μ_x(v)·N_rear(v)/m at every bin centre
  in its range, μ_x(v) = brake table / ((m g + ½ρ ClA v²)/m) and N_rear = 0.55 m g + 0.55·½ρ ClA v² (ClA from the lateral fit).
- **DRS / low-drag state:** open state changes CdA and ClA together (A3.2). Its effect on grip is computed, not assumed: where the low-drag
  state is active, the lateral and traction table values are multiplied by the load ratio μ(Fz_low)·Fz_low / (μ(Fz)·Fz) with ClA_low =
  ClA_fit · (shipped clALow/clA = 4.6/8). Braking runs in corner mode (kernel: straight mode closed under braking), so it is unchanged.
  Kernel: one guarded branch in the `lateralCap` table path and the `decoupled` traction table (`lowLoad: {clA, clALow, mu0, dmu, fz0}`);
  unset = byte-identical. **Check:** the ratio is < 1 wherever the state is active, reported per track.

### A2.2 Energy
On every simulated candidate and baseline lap: |Σ flow.dep − deployJ| ≤ 0.1 % of deployJ, |Σ flow.brk + Σ flow.thr − regenJ| ≤ 0.1 % of
regenJ, deployJ ≤ budgetJ · 1.001. Unit test: the `lapsim-mesh` energy-ledger test gets the two step 32 cars (2025 car + all-track
2025 tables + fitted θ and c_DRS; 2026 car + 2026 tables) at the 0.1 % tolerance.

### A2.3 Driver-used envelope
The p95 envelope is the driver-used envelope (margin for stability, lock-ups, wheelspin), not the tyre limit; reports and labels say so.
Combined use follows the kernel's friction ellipse (k = 2) at every point: trail braking on entry and throttle on exit are limited by
e(r) = √(1 − r²) of the lateral use r. Known consequence, stated before the run: at low speed the measured p95 of −a_x comes partly from
the trail-braking phase, so μ_x/μ_y (A2.1) may fall below 0.8 there; that is a check failure, not something to tune.

### A2.4 Conditions
Air density from production weather per track; mass = the shipped quali-mass car (806 kg; tables are per unit mass at quali fuel);
tables = qualifying conditions; race use keeps the existing fuel and tyre factors.

### A2.5 Physics guards (added to the verdict; all must pass in every fold)
G-P1 lateral decomposition in range; G-P2 braking tyre part ≥ 0 and μ_x/μ_y in range; G-P3 traction ≤ power and ≤ rear-axle limit;
G-P4 DRS load ratio < 1 where active; G-E energy closes within 0.1 % on every lap; G-M0 measured files byte-identical; plus the pre-reg's
continuity (mesh guard 5b, 5c) and `lapsim-mesh` (5a).
**Feasibility pre-check (no attempt spent):** G-P1, G-P2 and G-P3b are properties of the tables alone. They are computed on the all-track
tables before any fold runs. If one fails there, the LOTO is not started, no attempt is spent, and the result goes to central.

### A2.6 Mechanical corrections (found while building; before any candidate number)
- Braking table: the kernel's braking acceleration is (F_tyre + drag + roll)/m **without** the inertia factor (kernel.js brakeAcc), so the
  braking table = −a_x,meas − (drag + roll)/m (no ×1.06). Traction keeps a_x,meas·1.06 + (drag + roll)/m (kernel: /(m·inertia)).
  Drag and roll are subtracted per sample, then the p95 is taken.
- Traction data range: ends at the bin of the raw p95 maximum but contains **at least 2 bins** (if the maximum is the first valid bin, the
  next valid bin is included). The smoke run crashed on a 1-bin range.
- Tables are built in JS from per-sample exports made by `step32_samples.py` (the step 31 derivative), not in a separate Python
  table script (pre-reg §9 code plan; rules unchanged).

## Part A3 — definition of 100

### A3.1 More data (criterion 2)
- Tables are learned from the **top-10 drivers' fastest clean quali laps per session**: per session, each driver's best lap; drivers ranked by
  that lap; the first 10 kept. TracingInsights at the pinned commits (2023 737c84d3…, 2024 d1543a71…, 2025 dfb3ea3f…, 2026 f2c7692c…).
- Same drop rules, applied per session (mixed or wet session, `lapsimF1WetQuali` for 2026) and per lap (non-slick compound, telemetry gap
  as step 28, alignment corr < 0.93 against the A2 baseline model trace, ±200 m). Sessions whose fastest lap had only a per-lap problem
  (telemetry gap) now enter through the other laps. Locked: no event starting after 2026-11-23 00:00 KST (asserted).
- **Held-out rows:** per event, the mean of the per-lap scores over its kept laps (each lap scored as step 31); per track, the mean over
  events. The fastest-lap-only primary (step 31's rows) is reported beside it.
- Baseline rows and the power check are recomputed on this data **before any candidate number** (A2 baseline, same rules; 2026 per A1).
  If the 2023–25 MDE exceeds 3 km/h, the run is not judgeable and does not start.

### A3.2 DRS (criterion 2; step 28 lessons)
Per season the straight-line fit has two parameters: θ_s (CdA level, prior N(1.35, 0.12²)) and **c_DRS,s, prior N(0.20, 0.015²)**:
cdALow = cdA_track(θ)·(1 − c_DRS), ClA_low = ClA·(shipped clALow/clA) (A2.1). Low-drag state starts **54 m** after each zone's
activation point (measured, step 28 `DELAY_M`). Fit order per pass: θ by golden search (20 steps, [0.99, 1.71]) at the current c, then c by
golden search (20 steps, [0.155, 0.245]); two passes (tables rebuilt with θ between passes, as v2 §4). Priors are not bounds: the search
ranges are ±3σ, and a value within 0.5 % of a range end is a bound hit (model error). DRS pooled pass rate and bias: secondary result
with a track-cluster bootstrap 95 % CI; the guard is unchanged.

### A3.3 Noise floor (criterion 1)
Per session and corner (corners of the session's fastest lap, 120–240 etc. by its apex), each kept driver lap's apex speed = its minimum
within ±40 m after alignment. σ_between = pooled within-(session, corner) SD over corners with ≥ 5 laps, per band (60–120, 120–180,
180–240, 120–240). Sampling bound: σ_samp = 1.5 km/h (30c: 4 Hz worst-case v_min bias). σ_meas = √(σ_between² + σ_samp²). Reported:
held-out apex RMS (candidate and baseline) / σ_meas per band; ratio ≤ 1.2 = that band is at its data limit. Limit: σ_between includes
real driver differences, so σ_meas is an upper bound on noise and the ratio is a lower bound.

### A3.4 Honest parameters (criterion 3)
Every fitted parameter (θ_s, c_DRS,s) and every decomposition value (μ0, ClA, implied μ_y range, μ_x/μ_y) gets a 90 % interval:
fold spread (5–95 % over the 24 folds) and, for θ and c, the profile interval on a 9-point grid over the search range (ΔJ ≤ 2.71);
for the decomposition, a track-cluster bootstrap (200 resamples, seed 32) of the all-track tables. A value at a prior edge (> 2σ), at a
search-range end, or outside its physical range = model error, reported as such.

### A3.5 Locked final test (criterion 5), fixed now
- Runs only if step 32 passes (step 31 failed, so the choice rule picks step 32) **and** central approves the opening in a Project
  decision doc. The 2022 LOCKED set is opened **once**.
- Rows: 2022 quali laps built by the A3.1 rules from TracingInsights 2022 at a commit pinned in the approval; tables and θ/c of season
  2023 (closest rules) from all 24 tracks; baseline = A2 stage with the 2025 car and the geometric-mean shipped grip of the 24 tracks.
- **Pass** = (1) per-track mean apex RMS 120–240 on 2022 ≤ the 2023–25 held-out candidate value + its MDE (2.41 km/h, or the A3.1
  recomputed MDE); (2) lap error paired one-sided 95 % UB ≤ 0.10 pp; (3) DRS pass rate on the 2022 LOCKED Δ set ≥ the baseline's.
- Code `scripts/sim/learn/step32-locked2022.mjs` (written in this commit set, never run before approval): refuses to run if
  `scripts/sim/data/step32/locked2022-opened.json` exists, if `docs/gate-ledger.md` already has a "step 32 locked 2022" result line, or if
  the approval doc path/hash is not given; it writes the opened marker before reading any 2022 file. A test checks the refusal.

### A3.6 Ship package (only if the locked test passes)
One PR: kernel fixes (589b6b3 ERS accounting + Suzuka mesh), the step 32 model behind its flag set on, a production pipeline refit,
rebuilt 29b ranges, the measured-data byte-identity test. Owner decides the merge; nothing merges from this research run.

### A3.7 Kept
Everything in A2 and all earlier rules: same-line envelope, f_kerb 0, priors not bounds, fair A2 LOTO baseline, power first, 2026 own
spread (A1, recomputed on A3.1 data), run ids (research-mode lapsim pipeline), m = 2, one variant, 2022 LOCKED closed until A3.5,
no merge of model code.
