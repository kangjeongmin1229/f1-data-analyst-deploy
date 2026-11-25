# Wing-level polar — amendment A1 (central 17:45 KST approval with one amendment; written before any candidate number)

Base document: docs/prereg/wing-level-polar-DRAFT-2026-11-25.md, sha256 cfcd6d4a6a78b5cbb3db5ffeea83ff8ea268066ab8a3e8a58cda8629091adc49
(approved by central with this amendment). Everything there stays in force except where A1 changes it.

1. **Drag level:** the measured ratio r_t only; the season level θ_s is fitted (draft §2 default). Prediction mode (other-season r) is
   judged; replay mode (same-season r) is report-only.
2. **Primary (the only judged goal):** straight-end RMS. Per lap: RMS over its straight ends of (model max within ±40 m − measured),
   as `strEnd()`; lap → session → track mean. Paired per track (baseline − candidate). Pass: mean cut ≥ 30 % of the baseline mean AND
   one-sided sign-flip p < α = 0.05/4 = 0.0125, n ≥ 5 tracks.
3. **Secondary (reported, not judged):** corner RMS 120–240 (apex, `score()`); counted as a gain only if the mean cut ≥ 4.6 km/h (its MDE).
4. **Guards (must hold):** lap paired harm one-sided 95 % UB ≤ 0.10 pp; no parameter at a bound (every ClA_t,s in [4.5, 9.0] and ≥ 0.1 m²
   from both ends; b_s > 0; a_s, b_s, θ_s fold-median |z| ≤ 2); sign checks of draft §4; braking ≤ measured + 0.3 g; DRS ≥ baseline; mesh;
   G-S series isolation flag off/on; G-T ≤ +20 %; G-M0 measured data byte-identical; physics P1, P3a (fixed), P4, energy.
   Report-only: entry/exit harm, G-SB, G-TR, central's bins, the DRS split of straights, Monza/Silverstone per corner, μ_x/μ_y, 2026.
5. **Power first in the check job:** conservative unpaired MDE from the A2 LOTO baseline rows alone (no candidate): Z = 3.08 times the
   SD over tracks of the baseline straight-end RMS / √n. Local estimate (raw laps): mean 10.99 km/h, SD 4.88, n 24 → MDE 3.07 ≤ 30 % =
   3.30 km/h: judgeable. The check job recomputes it and stops the run if MDE > 30 % of the baseline mean.
6. **Report:** run id, per-track table, polar a_s and b_s per season with fold intervals, every ClA_t near 4.5 or 9.0.
7. **Residual list:** the Silverstone and Monaco corner errors are not wing (draft §4); they stay on the residual list, not in this family.
8. One run (attempt 1 of 3 of this family). Measured data untouched; 2022 LOCKED closed.
