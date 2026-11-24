# Step 32 pre-reg amendment A6: which car, track as unit, aero states, compute time (central expert review, 2026-11-25 08:57 KST)

Base: v2 f96f3571…, A1 b4b89126…, A2+A3 adc8a73f…, A4 66bff3c9…, A5 a22fd470…. A3 was already hashed, so this is a separate amendment
with the same force. Written before any candidate number and before reading the all-track table pre-check that was started at 08:56 on
the pre-A6 sample set (its output is discarded unread and recomputed on the A6 data).

1. **Which car the tables represent: the pole-setting car of each season.** Choice: **normalised envelope** (pole team's two cars +
   the top-10 laps normalised to the pole lap), with a pre-set fallback to **pole team only** per session. Why: the pole team alone gives
   2 laps per session (≈ 40 per season), too few for N ≥ 200 per bin in the upper and lower bins; normalisation keeps the pole car's
   level while using ~5× the samples for the envelope's shape.
   - Per session: pole lap P (rank 1); pole team = P's team (TracingInsights `team`); its second car's best clean lap is added even
     when outside the top 10 (same drop rules).
   - Per team (not per lap) a scale factor k_team = median over aligned points of v_P / v_lap (frame: model index k − shift), using that
     team's best kept lap; each lap of that team is used as v·k_team, so a_y = v²κ scales by k², a_x = v dv/ds by k². Pole team: k = 1.
   - **Pre-set check (per lap):** k_team ∈ [0.97, 1.03] and RMS(k·v_lap − v_P) over aligned points ≤ 5 km/h. A session uses the
     normalised set if ≥ 80 % of its kept non-pole-team laps pass (failing laps dropped and listed); otherwise that session uses the pole
     team only. The choice per session is listed.
   - Measured files are not changed: scaling is applied to in-memory copies of the samples (A2.0).
   - Held-out scoring stays as A3.1 (per-lap scores of every kept lap, unnormalised, averaged per session and track) — the measured laps
     are the truth; the normalisation only shapes the training envelope.
2. **Unit = track** for every CI, MDE and test (laps and sessions of one track are not independent): primary and guards per track
   (as before); bootstraps are track-cluster; DRS pass-rate CI track-cluster; straight-end bias per track; σ_meas reported with a
   track-cluster bootstrap CI.
3. **Aero states are never mixed in one table.** Every sample is tagged with the model's low-drag state at its model index
   (`aeroLow` of the production zones: 2023–25 DRS zones + 54 m; 2026 Straight Mode zones of `withZones`).
   - Corner-mode tables (lateral, braking, traction) use only samples with state 0.
   - Straight-mode traction table from samples with state > 0 when it has ≥ 2 valid bins (N rule); otherwise the corner-mode traction ×
     the computed load ratio (A2.1). Lateral in the low state = corner-mode table × load ratio (computed); braking is corner mode
     (kernel: Straight Mode / DRS closed under braking). Kernel: series-generic car field `decoupled.tracLow` (unset = byte-identical).
   - Drag per aero state: 2023–25 as A3.2 (θ_s for CdA, c_DRS,s for the low state). **2026** (report-only group): CdA and CdA_low
     fitted per state on straight-end speed with priors N(shipped, (0.10·shipped)²) each (no published 2026 prior; labelled model);
     search ±3σ; the v2 "2026 keeps its shipped pair" is replaced by this.
4. **Page compute time guard (G-T):** on 20 F1 tracks (the first 20 of `lapsimAllTracks` in sorted order), `tool.js simulate` for the
   2025 and 2026 cars with the flag on must take ≤ 1.20 × the time with the flag off (median of 5 repeats per lap, same machine, same
   run). Reported.
5. All earlier rules unchanged.
