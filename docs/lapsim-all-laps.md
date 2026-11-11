# All-laps dataset and hierarchical fit — declaration (2026-11-11)

Branch: `lapsim-laps/all-laps-2026-11-11` (fork only). Rules: `docs/lapsim-physics-rules.md`.
This file was written **before any fit**. Sections 2–5 are the declaration required by rule 2.5.
Nothing here changes production. Model changes go in separate draft PRs.

## 1. Dataset

One row per lap. Builders: `scripts/sim/laps/build-f1.mjs` (TracingInsights), `build-wec.mjs` (Al Kamel),
`build-t71.mjs` (Timing71). Shared marks and counts: `scripts/sim/laps/schema.mjs`. Workflow: `lapsim-laps.yml`.

Columns: source, series, season, event, track, layout, sessionType (Q/P/R), session, cls, carModel, team, entry, driver,
lap, time, s1–s3, trapKph, tyre, tyreAge, stint, stintLap, pitIn, pitOut, flag, the weather columns of section 2.1, q (list of marks), push.

Rows stay out of git (Actions artifacts `laps-*`, 30 days, with SHA-256). Committed: counts, hashes, fitted values.
Timing71: counts only, as in `docs/lapsim-t71.md`.

Known gaps in the columns: Al Kamel has no tyre or tyre age. Weather is the session mean for WEC, per lap for F1.
F1 car model = team and season. Timing71 car model = the feed's `make` field (not a verified model name).

## 2. Quality rules

Laps are marked, never deleted. A lap is **clean** when it has none of the hard marks.

| Mark | Type | Rule |
|---|---|---|
| no_time | hard | no lap time |
| pit_in, pit_out | hard | lap ends in the pit lane / starts from it (F1: pit-in/out time; WEC: finish line crossed in pit, next lap; Timing71: stint first and last lap, frame pit state) |
| not_green | hard | F1: track status not "1" during the lap. WEC: flag at the finish line not GF or FF. Timing71: flag not green or chequered (a local yellow is not clean) |
| deleted | hard | F1 lap time deleted by race control |
| wet_lap | hard | rain sample on the lap, or a wet-weather tyre |
| wet_session | hard | any wet_lap in the session; or rain in the Al Kamel weather file; or listed in `wet-sessions.json`; or the class trap is under 90 % of the same class and track in other years (rule 3.3.1) |
| sector_sum | hard | sectors do not add up to the lap (±0.002 s) |
| inaccurate | hard | F1 lap flagged not accurate by the timing source |
| slow | soft | clean, but more than 7 % off the same car's best clean lap of that session (traffic, cool-down, lift). Direct traffic detection is not possible from timing data alone |
| wet_suspect | soft | class best more than 3 % off the same class, track and session type in other years, trap normal. Kept and listed. Not removed without an outside source (rule 4.3 no. 7) |
| first_lap, no_weather, incomplete_replay, no_track | soft | standing start lap; no weather data; Timing71 replay did not reach the chequered flag; track id unknown |

**Push lap** (the only laps used in the first fit): qualifying session, clean, within 2 % of the same car's best clean lap of that session.
Practice and race laps are not used until a fuel and tyre-age term is declared (section 6).

### 2.1 Wet and dry (owner instruction, 2026-11-11: no wet levels)

Wet laps are not put into levels. Each lap keeps the weather as measured, so "how wet" can be read from the data later.
The first fit uses dry laps only (no `wet_lap`, no `wet_session`). Wet laps stay in the dataset.

| Column | Meaning | F1 | WEC (Al Kamel) | Timing71 |
|---|---|---|---|---|
| rain | rain flag at the lap | per lap | weather sample nearest to the lap (approximate time join) | from the feed's condition text |
| minsSinceRain | minutes since the last rain sample in the session | yes | yes | yes |
| rainShare | share of the session's laps with rain | yes | yes | yes |
| airC, trackC, humidityPct, pressureHpa, windMs, windFromDeg | conditions at the lap | per lap | nearest sample | nearest frame |
| tyre | slick, intermediate or wet | yes | not published | letters where the feed has them |
| trackCondition | the feed's own text (for example "Track: Wet") or the outside report | no field | report list only | yes |
| wx | every weather field of the feed, unchanged | – | – | yes |
| paceRatio | class best of the session ÷ dry reference | yes | yes | yes |
| trapRatio | class top speed of the session ÷ dry reference | yes | yes | yes |

Dry reference = median class best of the sessions with no rain mark at the same track, class and session type in other seasons
(F1: same car generation only). Traps outside 150–400 km/h are ignored. No source gives rain amount in mm or water depth: none is invented.

### 2.2 Car models (owner instruction, 2026-11-11)

Every series is split by car model, F1 included (one model per team and season, e.g. MCL39, W16, RB21, SF-25).
The key is team + season; the chassis name is a label from a sourced table, never guessed. Rows with no model name are counted (`noModel`).

## 3. Design: separate car pace from car parameters (the 2026-11-11 trap)

Problem: an all-car class base was slower than the class-best lap, because slow cars pulled grip and downforce down.
A slow lap has two possible causes, and the old fit had only one place to put them.

Model for the best push lap of entry *e* (car model *m*, team *k*) at event *t*:

`time = sim(base + Δm + Δk ; track t, weather, BoP m,t) × (1 + πm) × (1 + δe)`

| Part | What it is | Physics? | Identified by |
|---|---|---|---|
| base | class car (drag, downforce, grip; power where the rules do not fix it) | yes | all models together |
| Δm, Δk | model and team differences in log drag, log downforce, log grip | yes | **shape only**: sector shares, speed trap, and how the gap changes from track to track |
| πm ≥ 0 | model pace factor: same percentage at every track | no | the level of the model's best laps. The fastest model in a class-season has π = 0 |
| δe ≥ 0 | entry pace factor (driver, crew, session execution) | no | the entry's gap to the best entry of the same model. The best entry of a model has δ = 0 |

Why this fixes the trap: a car that is slow by the same percentage everywhere is explained by π or δ, which do not touch the
physics. Parameters move only when the *shape* of the gap asks for it (slow on straights, slow in fast corners).
The base is therefore the car at the front of the class, not the average car.

Outputs: class-best lap = fastest predicted model lap, `min over m of sim(base + Δm) × (1 + πm)`.
Per-car lap = the same without the minimum (GT3 per-model output). δ is never shown as a car property.

Fit order (rule 3.4, one value at a time): δ from within-model gaps (no simulator needed) → π and base on model-best laps →
Δm on residual sectors and traps → Δk the same way inside a model. Each step is checked on a signal it was not fitted on.

## 4. Shrink strength (declared, not tuned)

Penalty = sum of (difference / prior width)². Lap residuals are scaled by 0.3 % (about the P1–P2 gap, twice).

| Difference | Prior width |
|---|---|
| Δm: log drag, log downforce, log grip | 3 % each |
| Δk: the same, team inside a model | 1.5 % each |
| effective power (non-sensor series only) | 3 % |
| πm | 1 % |
| δe | 0.5 % |

Sensitivity only, reported and never selected from held-out rows: all widths ×0.5 and ×2.
BoP (mass, power, stint energy) is a fixed input where `wec-bop.json` has a verified value. Unverified = base value, row labelled.

## 5. Validation (declared)

Setting R for WEC (`LAPSIM_WEC_NM_TOL=1e-4`, cap 2000). Baselines in the same run, same settings: frozen production values, and the R control.

| Test | Hidden | Reported |
|---|---|---|
| Track | one track, all seasons and classes of the series | class-best error and per-car error, RMS %, n |
| Car model | one model, all tracks (predicted from base, Δ = 0, π = class median) | per-car error, n |
| Team | one team (predicted from its model) | per-car error, n |

Pass check: `gate.mjs` accepted on class-best rows with no group worse, F1 not worse, no new value at a bound,
dry raced sessions still reproduce at 0.000 %. Class-best and per-car numbers are never mixed. n under 5 = no claim.

## 6. Not in the first fit

Practice and race laps (need a declared fuel and tyre-age term), GT3 across series (needs the verified series table of rule 4.2),
Timing71 tracks without geometry, sim-racing data (iRacing only, none available).

## 7. Status — 2026-11-11 (no fit has been run)

Rows: Actions run 42927630531 (artifacts `laps-f1`, `laps-wec`, `laps-t71-0…39`, 30 days). Side tables and counts: run 42933122254.
Committed: `scripts/sim/data/laps/` (`f1-counts.json`, `wec-counts.json`, `t71-counts.json`, `t71-session-marks.json`, SHA-256 lists, cache probe).

| Source | Sessions | Laps | Clean laps | Dry qualifying push laps |
|---|---:|---:|---:|---:|
| F1, TracingInsights, 2023–2026 | 450 | 248,342 | 129,891 | 7,282 |
| WEC, Al Kamel, 2021–2026 | 345 | 584,876 | 408,707 | 5,779 |
| Timing71, 11 collected series, 2018–2026 | 2,856 | 2,909,370 | 2,070,033 | 57,009 |
| Timing71, 727 other real series | 10,012 | 9,503,265 | 7,689,294 | 491,056 |
| Timing71, sim-racing feeds (marked `sim`, never fitted) | 591 | 954,966 | 0 | 0 |

Timing71: 15,808 replays listed, 14,519 picked (practice, qualifying, race), 3 failed (404), 1,040 hold no laps.
The Timing71 Actions cache is gone (0 `t71-*` caches). The old per-car summaries survive only as artifacts of run 42528831029 until 2026-11-15.
They are no longer needed: the rows were read again from the archive.

Limits found (not fixed by guessing): 56 % of Timing71 rows have no car model name; 46 % have no simulator track; WEC 2021 files have no flag column;
Nürburgring feeds are almost never "green" (Code 60 zones); IMSA, Formula E, DTM and Asian LMS feeds have no rain field, so wet sessions there
can only be found by the pace check; Timing71 holds little from 2022 (392 replays).

Commands: push to `lapsim-laps/**` = collect everything again (about 30 minutes, 40 jobs).
With `scripts/sim/laps/source-run.json` present = merge only, from the rows of the named run (about 3 minutes).
Local F1 build: `node scripts/sim/laps/build-f1.mjs <dir>`. Rows are rebuilt from the sources; hashes in `all-sha256.txt` prove an identical copy.

Next: sourced car-model tables (F1 chassis names, Timing71 entries), per-lap dryness from rolling pace, then the fit of sections 3–5.
