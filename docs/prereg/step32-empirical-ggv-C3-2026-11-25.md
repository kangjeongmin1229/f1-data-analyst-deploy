# Step 32 pre-reg amendment C3 — third and last candidate of the "decoupled limits" family (2026-11-25, written before any C3 number)

Central decisions: claude/decision-central-32-c3-2026-11-25.md and the reply to claude/request-central-32-1245.md (12:47 KST).
Code: fork `step32-empirical` @ **89fb1c5** (step32-forward.mjs 1f772ca2…, step32-loto.mjs 9a127721…, step32_verdict.py 175bcd5a…,
step32_flatout.py d0c78d58…, step32_power.py 9cc3a0a4…). All earlier documents (v2 f96f3571…, A1–A8) stay in force except where
this amendment changes them.

## C3.0 Family, base and the REGEN FIX 2 rule
- Family "decoupled limits": step 31 V1 (rejected), step 32 V1 (rejected, run 45524888217), this = **attempt 3 of 3**, m = 3,
  one-sided α = 0.05/3 = 0.0167. A fail stops the idea; the ledger says why.
- **Base:** if "REGEN FIX 2 <commit>" is at the top of claude/status-2026-11-25-refit.md by **15:00 KST 2026-11-25**, the judged run is
  on that commit (rebase, power recomputed in the check job; a one-line amendment states its numbers before the run). Otherwise the
  judged run is on REGEN FIX **e5b4768**, started at or after 15:00 KST.
- **Verification after REGEN FIX 2 (only if the judged run was on e5b4768):** once it lands, ONE verification run of this same hashed
  pre-reg on the new base (rebase only, no other change). It is not a new attempt. If the verdict differs, both are reported and the
  more conservative verdict counts (FAIL over PASS).

## C3.1 Power first (recomputed on e5b4768; the check job recomputes it and `cmp`s it with the committed file before any fold)
- A2 baseline traces sha256 8c158b35… (byte-identical to 69c7385); only 2026 baseline rows move with e5b4768.
- `power-top10.json` sha256 79c4a084…: apex RMS 120–240 n 23, SD 2.61 km/h → MDE (z(1 − 0.0167) + z(0.8)) · SD/√n = **1.62 km/h ≤ 3**:
  judgeable. The check job fails if MDE > 3. 2026 own MDE 4.53 → report-only, not run (as A8).

## C3.2 Changes from V1 (A7 forward model otherwise unchanged)
1. **Drag prior** θ ~ N(1.46, 0.12²): the midpoint of the published 1.35 (another car/year) and the step 2a measurement 1.55–1.61
   (may be biased high by engine braking in coast windows); each source is ≈ 1σ away. **Disclosure:** chosen after seeing the step
   32 straight-end bias (+3.15 km/h) and diagnostic D3; NOT centred on D3's in-sample zero-bias value (1.48–1.50). The straight-end
   term decides; a fold-median θ more than 2σ from 1.46 is model error (A3.4 rule, unchanged).
2. **Flat-out samples** (throttle ≥ 99 % and brake off; TracingInsights throttle/brake at the pinned commits, the same samples as the
   stored speeds, asserted): `scripts/sim/data/step32/flatout-top10.json` sha256 95dc43a9… (528 laps, 2023–25), added to the measured
   manifest; measured speeds untouched; rebuilt and `cmp`d in the check job. Grid point → its next raw sample (as D4).
   (a) Out of the lateral-envelope target, measured and simulated alike (the simulated sample at the same position is dropped).
   (b) One-sided term per lap, weight 1 in the lap term: RMS over corner grid points (|κ| ≥ 1/1000 m⁻¹) where the measured lap is flat
       out of max(0, v_meas − v_model), divided by 5 km/h (the same RMS/scale form as the trace terms). The model may not be slower
       there; faster is not penalised.
3. **P2 replaced.** μ_x is an effective braking-utilisation value (tyre grip × driver/brake-system margin), not the tyre's μ. It is
   reported per season with its fold interval, with μ_x/μ_y (5/50/95 % over folds), labelled "model". Model-error flag (physics guard
   fail) only if μ_x/μ_y < 0.5 or > 1.0. The braking guard (≤ measured + 0.3 g) stays.
4. **Dropped:** the axle-level braking/traction change (D2). A7's braking/traction form is kept.
5. **P3a** = the fixed power check: kernel drive force ≤ (P_ICE·η_d + P_ERS·η_k·η_d)/v at every drive step (D1).
6. **Report-only:** per-corner residuals at Monza and Silverstone by official corner number (apex km/h, entry and exit s;
   candidate and A2 baseline; per season); the one-sided flat-out shortfall per track (candidate and baseline).

## C3.3 Kept (every earlier rule)
A7 forward model and identical processing (A7.3); stage-1 μ_x/μ_xTrac priors and G-BT; priors μ_y N(1.80, 0.20²), ClA N(6.75, 1.125²),
c_DRS N(0.20, 0.015²), u_t N(0, 0.03²); pIce 540 kW; 54 m DRS delay; f_kerb 0. Primary: held-out apex RMS 120–240, sign-flip one-sided
p < 0.0167 and mean gain ≥ 3 km/h over ≥ 5 tracks. Every guard of A2–A8: lap UB ≤ 0.10 pp; DRS ≥ baseline; braking ≤ measured + 0.3 g;
entry/exit no significant harm; traction within the measured CI; G-SB ±2 km/h; mesh; G-S series isolation flag off and on (base =
the run's base); G-T compute ≤ +20 %; G-M0 measured data byte-identical before and after. Physics P1, P2 (C3.2.3), P3a (fixed), P4,
energy. Fair A2 LOTO baseline; F1-only effect; 2022 LOCKED (A3.5 code unchanged); label "model (learned from public telemetry) /
모델(공개 텔레메트리에서 학습)"; one variant; no merge of model code. Judged run = research-mode pipeline run (push to
`lapsim-pipeline/step32-empirical`), run id cited.
