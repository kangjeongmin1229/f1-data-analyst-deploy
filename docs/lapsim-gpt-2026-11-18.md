# ChatGPT compute results, 2026-11-18

ChatGPT ran eight compute-only workstreams (W1–W8) and follow-ups (W2-F, W3-F, W6-F, W7-F, W8-F, W8-F2) on upstream commit `9e37dee`. Claude reviewed them. This page lists what each one measured, what the site now uses, and what was rejected. No more ChatGPT work is planned.

Rule for every change: **Gate G**. A model goes live only if its held-out error beats the current model on the same rows by more than one paired standard error (SE). Measured lookup tables need no gate, but they must replay the source at 0.000%.

## Applied

| Item | What changed | Evidence | PR |
|---|---|---|---|
| A1 · Melbourne 2026 energy | `energy-docs-data.js`: race 8 MJ per lap (Overtake off), 8.5 MJ (on). Test checks all 20 events of 2026 against the W7 table. | FIA "2026 Australian Grand Prix – Power Unit Information" | #312 |
| A2 · pit-lane speed limits | `pit-speed-data.js`: 60 km/h where the Race Director's event notes amend the 80 km/h rule, per track and season, with the PDF per season. | RD event notes 2022–26 (see table below) | PR_A2 |
| A3 · pit loss per race | `scripts/sim/data/pit-loss-lookups.json`: 112 W3-F lookups (dry-green, two-sided local median) replace the race-wide median, including 27 empty race-years and 9 outliers (reason per row). Sepang 2026 is now `kuala-lumpur/2026`, fixed in `ti-races.mjs`. | W3-F (161,066 driver-laps, 2022–26) | #315 |
| A4 · out-lap, in-lap, SC/VSC | New `lap-phases-data.js` (30 tracks) and a race-panel row. Measured medians × the car's lap, labelled "measured median (TracingInsights 2022–26)". | W3, W3-F | #318 |
| Task 8 · finish lines | Official finish lines for Jerez, Magny-Cours and Valencia; data shifted with the start. | circuit briefing maps | #314 |

Pending: A0 (calibration reproduction, below), Z (FIA zones, after the A6 data run).

### A2 · pit-lane limits found in the event notes

| Track | 60 km/h seasons | 80 km/h seasons |
|---|---|---|
| Monaco | 2022, 2024, 2025 | — |
| Singapore | 2022, 2024 | 2025 |
| Zandvoort | 2024 | 2025 |

All other 2022–26 events: 80 km/h by Sporting Regulations B1.6.3 a) (34.7 before 2026); their notes set no other limit.

Lane check (W3-F pooled lane model, measured minus predicted loss, s):

| Track | Before (80 km/h) | After | Note |
|---|---:|---:|---|
| Singapore 2024 | −5.9 | −0.4 | 60 km/h in the notes |
| Zandvoort 2024 | −3.7 | −0.4 | 60 km/h in the notes |
| Baku | −2.3 | −2.3 | notes say 80; lane entry flagged for the track session |
| Mugello, Nürburgring, Portimão | −2.5, −3.1, −5.4 | same | only 2020–21 races, outside 2022–26; lane geometry flagged |

## A0 · calibration reproduction

W8-F2 re-ran `calibrate.mjs` at `9e37dee` and did not reproduce the published `calibration-data.js` (2026-11-09): pole RMS on the same 34 hold-outs was 1.370% against the published 0.865%. The A6 data run (18 Nov) confirmed it: F1 hold-out 2025 1.13%, 2026 1.55%. Cause and fix: see `claude/status-2026-11-18-evening.md` in the project and the A0 PR.

## Rejected (keep the current model)

| Workstream | Test | Candidate | Current | Decision |
|---|---|---:|---:|---|
| W1 · tyre wear, quadratic + fuel | leave one race out, 89 races | 2.53% | 2.27% | keep race-pace model; fuel and track evolution cannot be separated (corr −1) |
| W2 · wet weather terms | weekend held out | 6.86 pp | 6.82 pp | no weather terms; constant wet/inter gap (W2-F, side session) |
| W3 · warm-up model | event held out | 0.616 s | 0.620 s | gain below SE; pooled median per compound only |
| W3-F · pit-lane physics | track held out | 4.26 s | 2.19 s | measured medians; physics only to find bad lanes and limits |
| W5 · pooled power curve | track held out | 0.153 s | 0.059 s | per-track lookup only |
| W6 · BoP inversion | matched 2025 | — | carry-forward | carry forward the last published BoP |
| W8 · curvature from telemetry | 78 events | 4.43% | 3.33% | keep the current shape |
| W8-F/F2 · length stretch L1/L2 | published poles, 34 | 1.311 / 1.252% (refit) | 1.293% (refit) | gain below SE; keep lengths, place zones by lap fraction |

## Sources

TracingInsights timing (2018–26), FIA event documents and circuit maps, Al Kamel WEC files, Open-Meteo/ERA5 (CC BY 4.0, contains modified Copernicus Climate Change Service information), OpenStreetMap (ODbL), TUMFTM racetrack database (LGPL-3.0).
