# Step 32 pre-reg amendment A5: straight-line bias and traction honesty guards (central addendum, 2026-11-25 08:48 KST)

Base: v2 f96f3571…7947a1, A1 b4b89126…90e0322, A2+A3 adc8a73f…3f250409, A4 66bff3c9…6bed79e9. Central asked for this inside A3, but A3
was already hashed, so it is a separate amendment with the same force. Written before any candidate number: the top-10 laps are fetched,
the baseline rows and power are not computed yet, and no candidate lap has been simulated.
Reason (central, from step 31's close check): with pIce 540 kW and the shipped CdA the straights were +8.1 km/h too fast, and the fit
lowered traction to 1.15 g (measured 1.34 g) to compensate.

1. **Guard G-SB (straight-end bias):** held-out straight-end speed residual (model − measured, at each measured straight end, as v2 §4),
   averaged per lap → session → track; the mean over held-out tracks and its 95 % track-cluster bootstrap CI (10,000 resamples, seed 32)
   must lie **entirely inside [−2, +2] km/h**.
2. **Guard G-TR (traction within the measured envelope):** in every 20 km/h bin of each traction table's data range, in every fold and
   season, the table value at the bin centre lies inside the 95 % track-cluster bootstrap CI (200 resamples, seed 32) of that bin's p95 of
   the same measured quantity (a_x,meas·1.06 + (drag + roll)/m at the fold's θ_s). Tables are never tuned to balance another error:
   they come only from the measured quantiles (v2 §3, A2.6); nothing in the fit moves them except the drag correction through θ_s.
3. **Reported for baseline and candidate:** straight-end bias (mean, CI, per track); exit-phase time (mean Δt and RMS, per track); traction
   per bin: measured p95 with CI, the table, and the p95 of the model's exit-phase a_x on held-out laps (baseline and candidate).
4. All earlier rules unchanged; G-SB and G-TR join the verdict guards (PASS needs every guard).
