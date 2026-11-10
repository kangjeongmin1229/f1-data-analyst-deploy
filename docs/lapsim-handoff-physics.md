# Handoff — lap-simulator physics to "0.000 %" (2026-11-09, from Claude)

This document hands over all physics-model work of the Kongboda Motorsports lap simulator: the goal, the
owner's rules, how the model and the calibration work, everything measured so far, today's engineering
experiments and their results, the work left (including Formula E and every GT3 series), and the working
habits and tacit knowledge that made the work go well. Read it once top to bottom; then use the index.

Owner: Jeongmin (GitHub `kangjeongmin1229`, site <https://kongboda-motorsports.vercel.app>).
Production repo: `MisterKinn/f1-data-analyst` (merge to `main` = automatic Vercel deploy).
**State at handoff:** PR #148 (`feat/physics-steps`) open for the owner to merge — WEC transfer track factors,
kernel options (off), experiment tools, this document. Experiments B and F–I (axle model) were still running
in Actions run 42558077604; their results are committed to `probe/lapsim-exp` (`probe-out/`) by the collect job.
First task for the receiver: read them with `exp-compare.mjs` (§8) and fill §5.3.

Earlier handoffs (still valid for features outside physics): Project docs `claude/handoff-chatgpt.md`
(all simulator features to 2026-11-08), `claude/work-plan.md` (Timing71 work), `claude/physics-review.md`
(the review that produced steps S1–S6 below). Repo docs: `docs/lapsim-*.md`.

---

## 0. Index

1. Goal and the owner's rules (read first)
2. How to work: repo, branches, PRs, CI, probes, reporting
3. The physics model today (kernel, cars, tracks, calibration, reproduction layer)
4. Where the error is today (numbers, noise floor, error budget)
5. Today's engineering steps S1–S6: code, experiments, results, decisions
6. Work left to reach the goal, in order, with pass checks (incl. Formula E and all GT3)
7. Data sources and access paths
8. Experiments infrastructure (how to run a variant in 2 hours without refetching)
9. Tacit knowledge: habits, traps, gotchas
10. Tools, skills, plugins
11. File and workflow map
12. Cleanup and open questions

---

## 1. Goal and the owner's rules

### 1.1 Goal
- Build the best motorsport lap simulator: F1, WEC (Hypercar LMH/LMDh, LMGT3), IMSA (GTP, GTD Pro, GTD),
  Formula E, and GT3 everywhere (SRO GTWC, IGTC, FIA GT World Cup Macau, DTM, Nürburgring SP9, ELMS/ALMS LMGT3).
- Predict car–track pairs that never ran (examples from the owner: **F1 2026 at Jeddah**, **LMH/LMDh at
  Montréal**) with an error as close to zero as physics allows.
- The owner's words: "오차 0.000%의 정확한 물리모델", "모든 오차를 0.00000%로 줄이는걸 목표로 끝까지".

### 1.2 What "0.000 %" means here (agreed with the owner; keep this distinction)
| Case | Rule | Status |
|---|---|---|
| A session that really ran (raced/qualified, dry) | must reproduce **exactly 0.000 %** | done for F1 39/39, WEC 18/18, other series 9/9 where geometry exists (`docs/lapsim-reproduce.md`) |
| A pair that never ran (prediction) | drive the error down with better physics; **always show the honest held-out error** | F1 ~0.9–1.2 %, WEC ~1–2 % (§4) |

- Reproduction = correction "real − simulated in the same weather", **recomputed from the current model every
  run** (only real data is stored, never the residual). So any model change keeps 0.000 % on raced sessions
  automatically; the size of the correction is the model's own error and is the thing to shrink.
- A prediction below the noise floor (pole vs P2 in the same session 0.16 % median) is not believable; if a
  held-out number goes below that, suspect leakage (tuning on test rows).

### 1.3 Hard rules (the owner is strict)
1. **Never make the model worse** ("나빠지게 하면 안돼"). Every change goes through the **held-out gate**
   (`scripts/sim/gate.mjs`): keep a change only if the held-out error on the SAME rows is lower by more than
   one standard error of the paired squared-error gain, with ≥ 5 rows. Apply it **per group** (series, class,
   season) — a change can be used only where it helps (e.g. WEC only, F1 unchanged).
2. **Never tune on test rows.** Held-out = leave-one-track/event-out or an unseen season. Declare variants
   before you test them; if you add variants after seeing results, say so and treat them as a new round.
3. Anything not measured is labelled **estimate/assumption** on the page (Korean + English).
4. Never hide a failed check: show ✗ with the amount. Rejected candidates are written in the docs with numbers.
5. Raw third-party data (Timing71, Al Kamel files, TracingInsights telemetry) is **never committed**; it lives in
   `.cache/` or the Actions cache. Commit only small derived tables, counts and fit results.
6. Report to the owner after **each step** ("작업 단계별로 끝날때마다 보고해"), in **English B1–B2, short,
   tables**, with ETAs in KST. If asked "when", give a per-step table. Do not wait to be asked.
7. The owner merges PRs (Claude's merge click is blocked by a safety check). Prepare PRs fully, then ask.

---

## 2. How to work

### 2.1 Repo and branches
- Work on the fork `kangjeongmin1229/f1-data-analyst-deploy`, always from upstream main:
  ```
  git remote add upstream https://github.com/MisterKinn/f1-data-analyst
  git fetch upstream main && git checkout -b <branch> upstream/main
  ```
- Open PRs into `MisterKinn/f1-data-analyst:main` with the browser compare page (GitHub API returns 403 on
  upstream): `https://github.com/MisterKinn/f1-data-analyst/compare/main...kangjeongmin1229:f1-data-analyst-deploy:<branch>?expand=1`.
  In the built-in browser, set title/body with the native value setter + `input` event, then click the
  visible submit button (or `form.requestSubmit()`); a ref click can miss when the button is off-screen.
- Before every PR: `npm ci && node --test tests/*.test.mjs && npm run build && npm run validate`.
  - Locally **26 tests fail on a clean main** (environment: Python collector deps, network). Compare with a
    clean worktree: `git worktree add <dir> upstream/main`, symlink `node_modules`, run the same tests.
  - In CI **5 tests fail on main since PR #117** (account cards, guide, previews, source-routing,
    introduction). A PR is fine when it adds no new failure.
- After merge: check the live page/JSON (Firecrawl is the owner's rule; the built-in browser works too).
- The environment's stop hook demands: every local branch pushed with an upstream, no untracked files.
  For branches you must not push under a triggering name, push to a non-triggering name and set the upstream
  by hand (`git config branch.<b>.remote origin`, `branch.<b>.merge refs/heads/<name>`, and add a fetch refspec).

### 2.2 GitHub Actions on the fork — what triggers
- `probe/**` pushes trigger workflows whose file is on that branch (the trick used for everything that needs
  network the shell does not have: Al Kamel, Timing71/Backblaze, OpenF1 bulk, Open-Meteo).
- A **new** workflow file sometimes does not register on the first push of a branch whose commit already
  exists on another ref. Fix: push a commit that touches the workflow file (adding `workflow_dispatch:` did it).
- `lapsim/**` pushes DO trigger `lapsim-data.yml` (full data refresh, ~3.5 h). Do not use `lapsim/**` as a
  parking name (it happened once today; cancelled).
- Artifacts: download needs `productionresultssa6.blob.core.windows.net` in the allowed domains (the owner
  added it 2026-11-09). Without it, have the workflow commit results back to the probe branch.

### 2.3 The shell's network
- Reachable: github.com (git), raw.githubusercontent.com, api.github.com (public), npm/pip registries,
  the artifact blob host above.
- Not reachable: Al Kamel, archive.timing71.org/Backblaze, OpenF1, Open-Meteo, Wikipedia. Use probes or the
  Kongboda MCP (`wec_*`, `fia_*`) for single files.

### 2.4 Reporting pattern that worked
- Start of a step: one line saying what runs and the ETA.
- End of a step: table (what, result, gate verdict), problems + fixes, next step + ETA.
- When an ETA slips, say so at once with the new time and the reason.

---

## 3. The physics model today

### 3.1 Kernel (`worker/lapsim/kernel.js`)
- Quasi-steady-state (QSS) point mass on a uniform grid (ds ≈ 2–5 m), TUM laptime-simulation method:
  apex speeds from lateral capacity, backward braking pass, forward traction pass, friction ellipse.
- Tyre: `capacity(mu0, dmu, fz0, N)` = 4 × (mu0 + dmu·(N/4 − fz0))·N/4 → **equal load on all four tyres,
  linear load sensitivity**. Separate muX (brake) / muXTrac (traction).
- Aero: one ClA, CdA (+ low-drag mode for 2026 active aero, `aeroLow`), wind (`vAir`), air density from weather.
- Powertrain: ICE + ERS with rule-specific limits (2026 350 kW MGU-K, energy per lap, super-clipping,
  causal battery since #136), Hypercar total-power cap, AWD-above-speed for LMH.
- Track: curvature `kappa`, `grade` (from z), per-point `vScale` and per-track `mu` (grip factor).
- **New today (off by default, results byte-identical when off):**
  - `car.axle` — axle model: per-axle loads from static weight + aero balance (`rearAero`) + vertical-curvature
    share; lateral load transfer m·ay·h/tw split by `rollFront`; tyre law Fy = mu0·fz0·(Fz/fz0)^q (`loadExp`, q<1
    degressive); lateral limit = weaker axle (front needs m·ay·(1−rearStatic), rear m·ay·rearStatic).
    Longitudinal uses the same tyre law on 4 tyres (no longitudinal transfer yet).
  - `track.kv` — vertical curvature (1/m): normal load + m·v²·kv (crest unloads, compression loads).
  - `track.bank` — banking (rad): gravity component helps, centripetal adds load.

### 3.2 Cars
- F1: `worker/lapsim/cars.js` (TUM 2019 base, PRIOR per season, rule changes 2026–2028).
- WEC: `worker/lapsim/series.js` (`SERIES.wec.classes.lmh|lmdh|lmgt3`, prior mass/power, fitted muY/ClA/CdA).
- Provisional series cars (tool only): `SERIES_CARS` in `worker/lapsim/scenario.js` — IMSA GTP = WEC LMDh;
  IMSA GTD/GTD Pro, ELMS/ALMS LMGT3, GTWC, DTM, IGTC, NÜR, Macau GT3 = WEC LMGT3 car.
- Formula E and other GT3 are `status: 'coming-soon'` in `series.js`.

### 3.3 Tracks
- `worker/lapsim/tracks-data.js` (26 tracks) built by `scripts/sim/build-geometry.mjs` from OpenF1 car
  positions (snapped to one reference path per track), smoothed; `tune-geometry.mjs` adjusts.
- `corners` with official numbers and `s` for most tracks (none for Jeddah, Sakhir and a few others).
- Widths and an optimal line from TUMFTM `racetrack-database` (LGPL-3.0) for the racing-line panel.

### 3.4 Calibration (`scripts/sim/calibrate.mjs`, lib `calibrate-lib.mjs`, BCD `joint-bcd.mjs`)
- Production settings (`lapsim-data.yml`):
  `LAPSIM_FITTER=bcd LAPSIM_ROUNDS=5 LAPSIM_BCD_ITERS=200 LAPSIM_WTIME=20 LAPSIM_WSECTOR=2 LAPSIM_TRACK_DRAG=on LAPSIM_TEAMS=on LAPSIM_WPRIOR=8`.
- F1: joint block-coordinate fit over 2023–2026, top-3 qualifying laps per session (OpenF1 speed traces),
  car parameters per season inside physical BOUNDS, **one grip factor per track shared across seasons**
  (bounds [0.7, 1.3]) and, with `TRACK_DRAG=on`, one drag factor per track ([0.85, 1.15]); team multipliers;
  objective = speed-trace extremes + lap time (weight 20) + sectors (2) + prior (8).
- F1 held-out: per season, track left out, factor from the other season (this is the 2025↔2026 test).
- WEC: per class and season, fit muY, ClA, CdA on the top-3 Al Kamel laps, **using the F1 track grip factors**
  (`f1Grip`); held-out = leave one track out → this is the "predict WEC from F1" test. Timing71 extra rows
  are a gated candidate inside the fit.
- Env knobs added today: `LAPSIM_GRIP_LO/HI`, `LAPSIM_KV`, `LAPSIM_BANK`, `LAPSIM_AXLE`, `LAPSIM_LOADEXP`,
  `LAPSIM_ROLLFRONT`; per-event WEC BoP is a gated candidate inside every run (Hypercar 2025 only — 2026 BoP is
  not published).

### 3.5 Reproduction and uncertainty (page and MCP tool)
- `worker/lapsim/scenario.js` `fix()` picks the real sectors (F1 poles from `f1-poles-data.js`, WEC from
  `wec-poles-data.js`, other series from `series-poles-data.js`, Timing71 complete replays only) and
  `worker/lapsim/tool.js` `corrOf` spreads the correction per sector (or per lap share for lap-only data).
- `uncertainty()` reports in-sample error for fitted tracks and the held-out RMS for unseen ones.

### 3.6 How the physics model was built — history, and the connectors and skills used at each stage

| When | Stage | What was done and why | Connectors / skills / tools used |
|---|---|---|---|
| 2026-11-07 | Choice of base | Owner chose the three TUMFTM tools (laptime-simulation, global_racetrajectory_optimization + racetrack-database, race-simulation). Plan in Project doc `claude/simulation-plan.md`. | WebSearch/WebFetch (TUM repos, Formula Student calibration practice: Chalmers 2024, TU Delft 2018, OpenLAP, FSAE TTC), Projects (plan doc) |
| 11-07 | Kernel port | TUM laptime-simulation (Python) ported to JavaScript `worker/lapsim/kernel.js`, same QSS method; validated against TUM's own example results within 0.3–1.2 %. | git clone of TUMFTM repos, Bash/Node, test files |
| 11-07 | Tracks | Racing path = real F1 qualifying positions from OpenF1 snapped path (`build-geometry.mjs`), curvature/grade/heading on a uniform grid, `tune-geometry.mjs`; 26 tracks. TUM racetrack-database only for widths/lines. | OpenF1 API (Actions only), TUMFTM racetrack-database (git) |
| 11-07 | First F1 fit | 2025/2026 cars fitted to real pole speed traces: only CdA, ClA, μ (+ power ±15 %) inside physical bounds; one grip factor per track; weather → air density; holdout by track. Common calibration rules written (§9 of the plan). | Node scripts, GitHub Actions `lapsim-data.yml` |
| 11-07 | Rules and projections | FIA documents read for 2026–2028 parameters (`rule-params.mjs`, `energy-docs.mjs`, rule monitor); 2027/2028 projected cars; FIA circuit changes as scenarios. | Kongboda MCP `fia_list_documents`, `fia_read_document`, `rules_lookup`; WebFetch |
| 11-07 | Fitter upgrades | Nelder–Mead → joint fit over 2023–2026 → block-coordinate descent (`joint-bcd.mjs`) with team multipliers, sector weights, per-track drag, prior weight; experiment workflow `lapsim-experiment.yml` for settings. Winning settings became production env. | GitHub Actions matrix experiments |
| 11-07 | Reproduction layer | Sector correction on raced tracks (real pole sectors − simulated, same weather) on the page and in the MCP tool. | — |
| 11-07–08 | WEC classes | LMH (front-axle hybrid above a speed), LMDh, LMGT3 in `series.js`; fitted on top-3 Al Kamel laps with F1 track factors; leave-one-track-out. | Kongboda MCP `wec_list_archive`, `wec_read_document`; Actions (`fetch-wec.mjs`) because the shell cannot reach Al Kamel |
| 11-08 | Around the lap model | Track evolution, race pace (143 races reproduced), compounds (C-numbers, measured gaps), racing lines per car, brakes (Brembo), battery (causal 2026 energy in the kernel), Q-split, forecast (Météo-France via Open-Meteo), track temperature, stint energy. Details in `claude/handoff-chatgpt.md`. | TracingInsights (git sparse clone), WebSearch/WebFetch + background research agents (Pirelli, Michelin, Goodyear, Brembo, BoP), Playwright, built-in browser |
| 11-08 | LAPSIM_CARRY test | Carrying a track's remaining error into an unseen season — tested as an option. | experiment workflow |
| 11-08 | Handoff to ChatGPT | Failed (owner judged the result poor); work came back to Claude on 11-09. Lesson: the receiver needs the method and the gate, not only the task list — this document. | Projects (`claude/handoff-chatgpt.md`) |
| 11-09 | Timing71 | Reader, collector (1,845 sessions), track mapping, three-way check (0 conflicts), the **held-out gate** (`gate.mjs`) in every fit; most candidates rejected honestly. | karpathy-guidelines skill (goal + pass check, order of steps), GitHub Actions `probe/**`, Timing71 archive API |
| 11-09 | Reproduction everywhere | F1 pole table from TracingInsights (39/39, Suzuka fixed), WEC (18/18), other series (9/9 where geometry exists), provisional series cars in the tool. | TracingInsights, Timing71, tests |
| 11-09 | Physics review | Error budget, verification matrix, trade studies → findings F1–F7 and steps S1–S6 (Project doc `claude/physics-review.md`). | **mission-architect** skill (error budget, TAID verification, trade study, sensitivity), **thermal** skill (two-node tyre plan) |
| 11-09 | S1 data check | Wet COTA 2025 WEC qualifying found and excluded (#147). | WebSearch (team/press reports for the session) |
| 11-09 | S1–S5 experiments | Axle model, vertical curvature, banking, grip bounds, no-drag, per-event BoP, coverage test, validation table; 10 variants in parallel; transfer factors for WEC accepted (§5). | Actions export + matrix probes, `exp-compare.mjs`, `validate.mjs`, `intervals.mjs` |

How changes were made, every time: goal + pass check (karpathy) → code behind a flag → tests (`tests/lapsim.test.mjs`
incl. exact reproduction) → Actions run on real data → gate → docs with numbers → PR via the browser compare page →
owner merges → live check (Firecrawl or browser).

Connectors and accounts in this environment and what each was for:
| Connector / tool | Used for | Notes |
|---|---|---|
| Kongboda Motorsports MCP (the site's own) | FIA/WEC documents, rules lookup, `lapsim_simulate` checks | slow for bulk; single files only |
| GitHub MCP + `gh` CLI | fork branches, run status, logs, artifacts | upstream API returns 403 → PRs via browser |
| Built-in browser (Claude desktop) / Claude in Chrome | creating PRs on upstream, live page checks | the safety layer blocks the Merge click |
| Firecrawl MCP | owner's rule for live checks after merge | credits can run out; browser as fallback |
| WebSearch / WebFetch | rules, tyre allocations, BoP, Brembo, wet-session reports | Wikipedia not reachable |
| Projects (claude.ai) | plans and handoffs (`claude/*.md`) | read before acting; update after |
| Memory | owner preferences and decisions across chats | the background pass files them |
| Background agents | parallel data research (compounds, BoP, Brembo) | brief them like a peer; verify their numbers |
| Skills | karpathy-guidelines, mission-architect, thermal; Ponytail plugin; Graphify | see §10 |

---

## 4. Where the error is today

### 4.1 Noise floor (measured)
| Quantity | Value |
|---|---|
| Pole vs P2 in the same session (median, F1 82 + Hypercar 36 sessions) | 0.16 % |
| P1–P3 spread | 0.32–0.42 % |
| Same track, consecutive F1 years, stable rules (n = 30) | 0.77 % |

### 4.2 Held-out errors of the current model (variant A, run 2026-11-09 with today's inputs)
| Test | Error (RMS) |
|---|---|
| F1 2025, track left out | 0.86 % |
| F1 2026, track left out | 1.16 % |
| WEC from F1, track left out: LMH / LMDh / LMGT3 2025 | 1.42 / 1.41 / 1.99 % |
| WEC from F1, track left out: LMH / LMDh / LMGT3 2026 | 1.62 / 1.44 / 1.60 % |

**After PR `feat/physics-steps` (2026-11-09):** F1 unchanged (0.84 / 0.90 % held-out in the production model);
WEC held-out with per-class-season transfer factors: LMH 1.54 / 1.14 %, LMDh 1.37 / 1.18 %, LMGT3 1.81 / 1.37 %
(2025 / 2026); pooled WEC 1.58 → 1.41 % (gate: accepted), no group worse.

### 4.3 Validation details (variant A, in-sample F1 pole laps; `scripts/sim/validate.mjs`)
| Season | Lap | Sectors | Corner min speed RMS / bias | Trap RMS / bias | Braking point RMS / bias |
|---|---|---|---|---|---|
| 2025 | 0.42 % | 2.6 % | 22.8 / −12.4 km/h | 10.2 / −7.7 km/h | 64 / +37 m |
| 2026 | 0.75 % | 3.5 % | 24.9 / −16.4 km/h | 15.9 / −5.9 km/h | 69 / +38 m |

Read this table carefully: the lap is right to 0.4–0.8 % but **sectors are off by 2.6–3.5 % and corners are
~12–16 km/h slow on average**. The lap is right because errors cancel (slow corners, compensating elsewhere).
Part of the corner bias is a measurement artefact (4 Hz OpenF1 samples miss the true minimum, so the real
minimum looks higher), but not all. This is the strongest signal of missing physics (§6.1).

### 4.4 Signals of missing physics (keep checking these)
- WEC Hypercar ClA sits on its upper bound (7.0) and muY sits low (~1.55) in almost every fit; LMGT3 ClA on
  its bound 3.5. The fitter is trading low-speed grip for high-speed grip → load sensitivity / load transfer /
  aero balance are wrong or missing.
- Per-track grip factors 0.88–1.22 and drag factors 0.96–1.15 absorb geometry and model errors; they are
  fitted on F1 and may not transfer to other cars.
- The same sign of error at the same track for every WEC class → track side, not car side.

---

## 5. Today's engineering steps (2026-11-09)

The plan (owner-approved table) and the outcome of each step. All code is on branch `feat/physics-steps`
(rebased on main after #146/#147); experiments ran on `probe/lapsim-exp`.

### 5.1 Step 1 pre-check — Austin 2025 WEC (done, merged in #147)
- Hypercar Austin 2025 was −6.3 s in-sample for both Hypercar classes. Cause: the qualifying was wet but not
  marked wet in the timing. Fixed with `scripts/sim/data/wet-sessions.json` (sources listed) read by
  `fetch-wec.mjs`. WEC 2025 holdout: LMH 3.80 → 1.54 %, LMDh 3.87 → 1.61 %. Lesson: **check the data before
  blaming the physics**; a speed-trap warning now prints when a trap is < 0.9 × the class median at that track.

### 5.2 Experiments (10 variants declared before testing; same inputs; production fit settings)
| Variant | Change vs A | Purpose |
|---|---|---|
| A | none (drag on, grip 0.7–1.3) | baseline |
| B | per-track drag off | S1 |
| C | drag off, grip 0.9–1.1 | S1 |
| D | drag off, grip 0.95–1.05 | S1 |
| E | B + vertical curvature | S2 |
| F | B + axle model (q 0.85) | S3 |
| G | B + axle + vertical curvature | S2+S3 |
| H | A + axle + vertical curvature | S2+S3 with drag |
| I | G with q 0.75 | S3 sensitivity |
| J | B + banking (Zandvoort T3 19°, T14 18°) | S2 |

Every variant also tests per-event WEC BoP (Hypercar 2025) with the gate.

### 5.3 Results — paired gate vs A on held-out rows (`node scripts/sim/exp-compare.mjs cal-A.js cal-X.js`)
Held-out RMS error (%), track left out. ✓ = accepted by the gate vs A, ≈ = better but within noise, ✗ = worse.

| Variant | F1 2025 | F1 2026 | LMH 25 | LMDh 25 | LMGT3 25 | LMH 26 | LMDh 26 | LMGT3 26 | Pooled F1 | Pooled WEC |
|---|---|---|---|---|---|---|---|---|---|---|
| A baseline | 0.86 | 1.16 | 1.42 | 1.41 | 1.99 | 1.62 | 1.44 | 1.60 | 0.99 | 1.59 |
| C grip 0.9–1.1, no drag | 1.18 ✗ | 1.20 ✗ | 1.67 ✗ | 1.45 ✗ | 2.25 ✗ | 1.05 ✓ | 1.00 ✓ | 1.65 ✗ | 1.19 ✗ | 1.54 ≈ |
| D grip 0.95–1.05, no drag | 1.78 ✗ | 1.31 ✗ | 2.42 ✗ | 2.08 ✗ | 2.92 ✗ | 1.06 ✓ | 0.94 ✓ | 1.61 ✗ | 1.60 ✗ | 1.92 ✗ |
| E no drag + vertical curvature | 0.89 ✗ | 1.27 ✗ | 1.52 ✗ | 1.73 ✗ | 2.02 ✗ | 1.02 ✓ | 1.14 ✓ | 1.55 ≈ | 1.06 ✗ | 1.51 ≈ |
| **J no drag + banking** | 0.90 ✗ | 1.37 ✗ | 1.38 ≈ | 1.30 ≈ | 1.81 ≈ | 1.10 ✓ | 1.13 ✓ | 1.39 ✓ | 1.12 ✗ | **1.36 ✓** |
| **B no drag** | 0.90 ✗ | 1.28 ✗ | 1.57 ✗ | 1.24 ≈ | 1.73 ≈ | 1.04 ✓ | 1.07 ✓ | 1.37 ≈ | 1.07 ✗ | **1.35 ✓** |
| F, G, H, I axle model | original jobs timed out at 340 min; no result artifact was produced | | | | | | | | | |

Per-event WEC BoP (Hypercar 2025): rejected in every variant (e.g. A: LMH 1.42 → 1.94 %, LMDh 1.41 → 1.44 %).

Other measurements:
- Zandvoort with banking (J): fitted track grip 1.09 → 1.00 (the banking explains the "extra grip" the factor
  had absorbed); corner-minimum bias at Zandvoort −13.7 → −11.8 km/h (2025); lap unchanged within noise.
- Validation (validate.mjs, in-sample F1): no variant changes the corner bias by more than ~2 km/h; the bias
  is not explained by track factors (§6.1).

Raw results: branch `probe/lapsim-exp` (`probe-out/` after the collect job) or Actions run 42558077604
artifacts `exp-<X>`.

Follow-up: `.github/workflows/lapsim-experiment.yml` in the current repository can rerun B/F/G/H/I from
the checksum-pinned export. It uses the same production weights and team model with a 3-round/100-iteration
screen, then creates an automatic B-vs-axle comparison artifact. A screening winner still needs a full-settings
confirmation before any production-model change.

### 5.4 Decisions
1. **F1: keep A** (per-track drag on, grip 0.7–1.3). Every variant made F1 held-out worse. ("나빠지게 하면 안돼.")
2. **WEC: use track factors from an F1 fit without per-track drag** ("transfer factors"). Pattern: every
   no-drag variant improves WEC 2026 strongly; B passes the pooled WEC gate (1.59 → 1.35 %) and is marginally
   better than J (1.36 %). Why it makes sense: per-track drag absorbs F1-specific straight-line effects; without it the
   grip factor carries the track's own character, which transfers to other cars.
   - Code: `worker/lapsim/transfer-grip-data.js` (generated by `scripts/sim/transfer-grip.mjs <cal.js>` from
     the B run), read by `calibrate.mjs` for the WEC fit only; `LAPSIM_WEC_GRIP=f1` switches it off.
   - Check on the production settings (WEC-only refit, local, 2026-11-09; all F1 calibration sections unchanged):
     | Group | Current main (J-based) | B-based gated refit |
     |---|---|---|
     | LMH 2025 / 2026 | 1.54 / 1.14 % | 1.43 / 1.04 % |
     | LMDh 2025 / 2026 | 1.37 / 1.18 % | 1.24 / 1.07 % |
     | LMGT3 2025 / 2026 | 1.81 / 1.37 % | 1.73 / 1.37 % |
     | Pooled WEC (33 rows) | 1.41 % | **1.32 % — accepted by the gate** |
   - The pipeline still chooses **per class-season**: transfer factors only where held-out error is not higher
     (`gripSource` in calibration-data, line in the report). This re-tests automatically on every `lapsim-data` run.
   - **Decision after B completed:** use B rather than J. It is slightly better on pooled WEC and does not make
     the production transfer factors depend on the separate banking experiment.
3. Banking: keep the code and the Zandvoort data (physically right, explains a track factor); do not switch it
   on for F1 production until it passes the F1 gate in a run together with the car-model work (§6.1).
4. Vertical curvature from the smoothed grade: rejected for F1; revisit with better z (§6.2).
5. Grip bounds: rejected; do not bound until physics explains the factors.
6. Per-event BoP: rejected; investigate how mass/power enter the kernel for Hypercars before retrying.
7. Axle model (F–I): results pending at handoff; decide with the gate. Expect it to matter most for the
   ClA-at-bound signal (§4.4).

### 5.5 Step 4 — prediction ranges (coverage test) (`scripts/sim/intervals.mjs`)
- Rule: the range for a group (F1, WEC class) in a season is learned from the **other** season only and tested
  on this season's held-out laps. Two rules declared before testing: current (±k·RMS, centred on the model)
  and candidate (centre shifted by the other season's mean error, width ±k·SD·√(1+1/n)). Score = Gaussian
  negative log-likelihood per row, paired gate.
- Result on variant A (67 held-out rows): current rule covers **60 % at ±1σ and 99 % at ±2σ** (target 68 / 95 %);
  candidate 76 % / 99 % but worse mean NLL → **rejected; keep the current ranges** (they are close to honest).
  Per group, WEC LMGT3 2025 covers only 20 % at 1σ (small n = 5).
- Run on any calibration: `node scripts/sim/intervals.mjs <cal.js>`.

### 5.6 Step 5 — validation table (`scripts/sim/validate.mjs`)
- Per F1 pole lap: lap, sectors, corner minimum speeds (real minima with ≥ 15 km/h prominence vs the simulated
  minimum within ±50 m), trap (lap max), braking point (last point within 3 km/h of the preceding max), plus
  the held-out tests (2025↔2026, F1→WEC). Run: `LAPSIM_CAL_FILE=<cal.js> node scripts/sim/validate.mjs <name>`
  (needs `.cache/lapsim/traces.json` and the matching `tracks-data.js`).
- Acceptance tests for every future physics change: F1 2025↔2026 held-out and F1→WEC held-out must not get
  worse; corner bias and sector error should move toward zero.

### 5.7 Step 6 — tyre thermal model (plan only; not built)
- Two lumped nodes per axle: surface T_s and carcass T_c.
  - C_s·dT_s/dt = q_slip − h_air(v)·A·(T_s − T_air) − h_road·A_c·(T_s − T_track) − G_sc·(T_s − T_c)
  - C_c·dT_c/dt = q_hyst + G_sc·(T_s − T_c) − h_rim·(T_c − T_rim)
  - q_slip ≈ |F_y·v_slip| + |F_x·κ·v| from the kernel's force use; q_hyst ∝ load amplitude × speed.
  - grip μ(T_s) = μ_peak·exp(−((T_s − T_opt)/w)²) replacing today's fixed `gripFromTrackTemp` curve.
- No public tyre temperature data → do not fit absolute temperatures. Fit only through lap-time effects and
  test only on out-lap / first flying lap deltas (TracingInsights laps with `pout`, Timing71 laps after pit).
- Pass: held-out first-lap delta error lower than "no thermal model" through the gate.

---

## 6. Work left, in order, with pass checks

Rule for every item: goal + pass check first (Karpathy), smallest diff, gate per group, F1/WEC raced
reproduction stays 0.000 % (tests `tests/lapsim.test.mjs`), docs updated with numbers incl. rejections.

### 6.1 Car model (highest value)
1. **Fix the corner-speed bias before anything else.** Corner minima are ~12–16 km/h slow while laps are right.
   Steps: (a) quantify the 4 Hz sampling artefact (compare OpenF1 minima with TracingInsights `_tel.json` at
   higher rate for the same laps); (b) look at bias vs corner speed (low/medium/high) — a speed-dependent bias
   means aero/load-sensitivity form is wrong; (c) then add physics.
2. **Axle model** (code exists, `car.axle`): finish longitudinal load transfer (m·ax·h/wb) for braking and
   traction; give per-class physical priors (track width, CoG height, weight distribution from rules:
   F1 2026 min. weight distribution, Hypercar/LMGT3 homologation); fit q (load exponent) as one global
   parameter with a prior, not per season. Pass: ClA no longer at its bound; F1 and WEC held-out not worse.
3. **Aero balance vs speed** (rearAero changes with ride height/DRS/active aero); 2026 active aero modes.
4. **Gearbox and power curve** (shift time, torque curve) — matters for traps and exits.
5. **Brake build-up** is in the post-process (#137, 0.73 s); move it into the kernel if braking-point bias stays.

### 6.2 Track description
1. Curvature: compare the OpenF1 path curvature with the TUM centre line and a min-curvature line inside TUM
   widths; candidate = calibrate on the min-curvature line (the per-car line check showed laps 3.5–5 % fast on
   smoother lines because grip was calibrated on the noisy path — so grip must be refit on the new line).
2. Vertical curvature: today from the smoothed grade; better z from TracingInsights telemetry (z in dm).
3. Banking: only Zandvoort placed (sourced). Jeddah T13 (~12°) needs corner positions (not in tracks-data);
   do not guess. Add others only with a published angle.
4. Per-track grip factor: aim for a physical range by explaining it (surface age, temperature) instead of
   bounding it — bounding alone made F1 worse (C, D).

### 6.3 Calibration and uncertainty
- Hierarchical fit (track factor shared across series with a prior near 1; car per class/season).
- Put the accepted prediction-range rule into `scenario.js uncertainty()` and show coverage on the page.
- Keep `LAPSIM_WPRIOR` and bounds physical; record every fitted parameter that hits a bound in the report.

### 6.4 Track geometry for the other series (unlocks IMSA, GT3, FE)
- Missing tracks are listed in `docs/lapsim-reproduce.md` (IMSA 13, ELMS 2, ALMS 2, GTWC 8, DTM 6, IGTC 3,
  NÜR 1, Macau 1, FE 22). Real sessions for them are already stored (`scripts/sim/data/series-poles.json`) and
  reproduce as soon as geometry exists.
- Sources: TUMFTM racetrack-database (has Hockenheim, Norisring, Nürburgring GP, Oschersleben, Brands Hatch,
  IMS road course, Sepang, …); otherwise official track maps + widths; car positions where a public telemetry
  source exists (none for IMSA/GT3/FE that we know of).
- Build pipeline: reuse `build-geometry.mjs` output format (`tracks-data.js`: kappa, grade, heading, x/y,
  corners with s). Add a geometry-quality check: simulated vs real lap with a reference car must be within
  the class's held-out error before the track is used for fitting.

### 6.5 IMSA
- Cars: GTP = LMDh rules (same as WEC LMDh; IMSA BoP differs: Maximum Stint Energy + power % at ≤230/≥240 km/h).
  GTD Pro/GTD = GT3 with IMSA BoP.
- Data: Timing71 IMSA sessions (per-lap times, sectors S1–S3, VFT energy %), IMSA results PDFs, IMSA technical
  bulletins (BoP; 2026 Road America example in `claude/handoff-chatgpt.md` §7 G). VFT energy per lap table:
  `scripts/sim/data/t71-imsa-vft.json`.
- Pass: GTP held-out (track left out) ≤ WEC LMDh held-out; stint energy from VFT vs model with LOO.

### 6.6 Formula E (Gen3/Gen3 Evo fit, Gen4 projection)
- Generations: Gen2 (to 2021-22), Gen3 (2022-23 to 2023-24), Gen3 Evo (2024-25 to 2025-26), **Gen4 from
  Season 13 (Jeddah, Dec 2026)**: 450 kW race, 600 kW qualifying/Attack Mode, up to 700 kW regen, permanent
  AWD, Bridgestone tyres; check mass and energy in the FIA Technical Regulations (sources disagree).
- Physics to add to the kernel: no ICE; battery energy budget per race (energy-limited lap, lift-and-coast);
  regen on both axles (Gen3 front regen, Gen4 AWD); Attack Mode power window; all-weather treaded tyres (low μ,
  low load sensitivity); street circuits (bumps, kerbs → lower effective μ; walls → no run-off).
- Data: FIA Formula E results (Al Kamel format: `23_Analysis` with Attack Mode laps "A", `26_Weather`), Timing71
  FE sessions (~615 replays), official track maps.
- Geometry: FE layouts differ even at shared venues (Jeddah, Miami, Madrid) → never reuse F1 geometry.
- Steps: (1) geometry for 3–4 FE tracks with the most sessions; (2) FE car class with Gen3 Evo priors; (3) fit on
  qualifying (Duels) bests, leave one track out; (4) race energy model vs FIA energy limit; (5) Gen4 =
  Gen3 Evo fitted car + rule deltas, labelled estimate.
- Pass: Gen3 Evo held-out qualifying error stated; raced FE sessions reproduce 0.000 %; Gen4 numbers labelled.

### 6.7 GT3 everywhere
- Design (owner-approved): integrated in the simulator page, cascade series → rules/class → car; per-car
  **profile** (straight vs corner speed, sector split, long-run drop-off, a one-line "why", best lap).
- One physical GT3 base car (mass ~1,300 kg class, ABS + TC, Pirelli/Michelin/Goodyear/Hankook by series) with
  per-series BoP (mass, power/restrictor, ride height) applied as inputs, not fitted.
- Data per series: WEC LMGT3 (Al Kamel, done), IMSA GTD (Timing71/IMSA results), GTWC (SRO results + Timing71),
  IGTC (Timing71), DTM (Timing71; DTM BoP), Nürburgring SP9 (Timing71; 9 sectors; no chequered state),
  Macau FIA GT World Cup (Timing71), ELMS/ALMS (Timing71).
- Known issue: `t71-gt3.mjs` found only 4 usable sessions on our tracks → geometry first (§6.4). DTM Spielberg
  2024 vs 2026 laps differ by 8 s (95.8 vs 87.6 s) → check conditions/session before fitting.
- Pass: per-series pace factor (or BoP-driven car) with leave-one-track-out error; raced sessions reproduce.

### 6.8 Data and conditions
- Weather: Météo-France via Open-Meteo is used for forecasts; historical radar/rain for wet detection is open.
- Track temperature: fitted (±3.97 °C held out); unseen-series test 4.96 °C.
- Track evolution: F1 fitted; WEC rejected by the gate (keep off).

---

## 7. Data sources and access (short; full table in `claude/handoff-chatgpt.md` §6)
| Source | What | Access |
|---|---|---|
| OpenF1 | F1 qualifying speed traces and positions (calibration input) | Actions only (`fetch-openf1.mjs`, ~2.2 h for 2023–26) |
| TracingInsights GitHub | F1 laps, telemetry (x,y,z), pole sectors (`f1-poles.mjs`) | git blob-less sparse clone; raw.githubusercontent |
| Al Kamel | WEC laps, sectors, traps, weather | Actions (`fetch-wec.mjs`), Kongboda MCP for single files |
| Timing71 archive | all series, laps/sectors/tyre letters/VFT/flags/weather | Actions only; calibration use only; complete replays only (`endFlag === 'chequered'`) |
| FIA / IMSA / SRO documents | rules, BoP, energy limits | Kongboda MCP `fia_*`, WebFetch |
| TUMFTM racetrack-database | track widths, centre lines | git clone (LGPL-3.0) |
| Brembo, Pirelli, Michelin, Goodyear | braking, compounds, allocations | WebSearch/WebFetch |

---

## 8. Experiments infrastructure (use this; it saves hours)
1. **Export inputs once** (`probe/lapsim-export`, workflow `probe-lapsim-export.yml`): fetches OpenF1
   2023–2026, tunes geometry, fetches WEC, and commits `probe-out/lapsim-inputs.tgz.part-*` (traces.json,
   wec.json, races.json, tracks-data.js; ~2.5 h). Re-export only when inputs change (new event).
2. **Run variants** (`probe/lapsim-exp`, workflow `probe-lapsim-exp.yml`): edit `probe-exp.json`
   (`[{"name":"X","env":{...}}]`), push. Each variant runs `calibrate.mjs` with production settings plus its env,
   then `exp-summary.mjs`, `validate.mjs`, `intervals.mjs`; artifacts `exp-<name>` (cal-X.js, exp-X.json,
   validate-X.json, intervals-X.json, log-X.txt); a collect job commits all to the branch. ~1.5–3.5 h per
   variant, all in parallel; the job limit is 340 min (axle variants are the slowest).
   The workflow applies `wet-sessions.json` to the exported wec.json (export predates that file).
3. **Compare**: `node scripts/sim/exp-compare.mjs cal-A.js cal-B.js …` (paired gate per group: all, f1, wec,
   f1/<year>, wec-<class>/<year>).
4. **Local work**: the shell has 2 CPUs / 7 GB; a full BCD fit is too slow locally. Validation and comparison
   run locally in seconds: extract the export tgz into a worktree (`.cache/lapsim/*`, `worker/lapsim/tracks-data.js`)
   and use `LAPSIM_CAL_FILE`.
5. Never merge probe workflows. Probe branches are for the owner to delete afterwards.

---

## 9. Tacit knowledge — habits, traps, gotchas

### 9.1 Working habits that worked
- **Data check first**: the biggest single gain today (Austin 2025 wet) came from data, not physics. Before a
  physics change, look at the worst residuals and ask "is this session what we think it is?" (wet, red flag,
  partial replay, wrong segment, layout change).
- **Declare variants before running**, run them all in parallel, then gate. Never add a variant that only
  exists because you saw the test rows.
- **Default off, byte-identical**: new physics goes behind a flag; prove that the default output is identical
  (compare lap times old vs new kernel to 6 decimals) before running experiments.
- **Per-group gate**: report per series/class/season, not only the total — the total can hide a loss in F1.
- **Read the signals**: parameters on their bounds, same-sign errors at a track across classes, sector errors
  much larger than lap errors → missing physics.
- **Measure the noise floor first** to know what "good" is (0.16 % pole–P2).
- Long jobs: start them in the background, poll with until-loops (single sleeps are blocked), set a long
  timeout; a container restart kills watchers — re-create them; report slips at once.

### 9.2 Data traps
- F1 pole = fastest valid lap of the **last** qualifying segment (Hungary 2025: the fastest lap was a Q2 lap).
- Suzuka 2026: the stored pole was P2's lap → fixed (#146). Always check driver number vs classification.
- OpenF1 4 Hz speed samples miss true minima/maxima (bias in corner/trap checks).
- Public F1 positions are snapped to one reference path (no driven line exists in the data).
- Timing71: many qualifying replays are incomplete → only `endFlag === 'chequered'`; tyre **letters** are right,
  the colour label is not; some feeds store missing weather as 0 or 255 → plausibility filter; local yellows are
  racing laps (only FCY/SC/VSC/Code 60/red neutralise); duplicate replays share a minute → dedupe by archive
  filename; "hyper" matches "hyperpole" → test `/hypercar/`; Nürburgring feeds: 9 sectors, no chequered state,
  "track data" = slow zones.
- Al Kamel: no tyre column; wet sessions are not always marked wet (→ `wet-sessions.json`).
- WEC 2026 BoP is not published (stopped from Imola 2026) → per-event BoP only for 2025.
- Formula E shares venue names with F1 but not layouts.

### 9.3 Model traps
- Grip is calibrated on the timing path; a smoother line makes laps 3.5–5 % fast unless grip is refit.
- Bounding the per-track grip (0.9–1.1, 0.95–1.05) made F1 held-out worse (0.86 → 1.18/1.78 %) — the wide
  range absorbs real track differences until the physics explains them.
- Banking math with high μ is very sensitive: ay = g(μcosθ + sinθ)/(cosθ − μ sinθ); a 19° full-width bank
  at μ = 1.8 more than triples the lateral limit, which is not what cars see (the line uses only part of the
  banked width, the angle varies). Treat published maximum angles as upper bounds.
- Equal-load tyre model + linear load sensitivity makes the fitter push ClA to its bound.
- `withGrip()` spreads the track object → new track arrays (kv, bank) pass through automatically.

### 9.4 Repo/process traps
- `worker/simulation.js` is the merge-conflict hot spot (template lists, `computeView` return, client update).
- A duplicate key in text tables silently overrides (e.g. `soon` vs `soonShort`).
- Page client script is external (`/assets/lapsim.js`) → file:// previews do not run it; test through a local
  http server around `worker.fetch` + Playwright.
- Proxy cars (`kind: 'proxy'`) are filtered out of the page (`carsFor`); they exist only in the MCP tool.

### 9.5 Recipe for one physics item (the loop I used every time)
1. **Write the goal and the pass check first** (one line each). Example: "Goal: corner minima within 5 km/h
   bias. Pass: F1 2025/2026 held-out not worse (gate), WEC held-out not worse per class, validate.mjs corner
   bias closer to 0, raced reproduction tests green."
2. **Look at the data that the change is meant to fix** (worst residuals, the sign pattern per track/class).
   Ask the data-check question first (§9.1). Write down what you expect the change to do *before* running it
   (e.g. "ClA should drop from 7.0 to ~4–5").
3. **Implement behind a flag**, default off. Keep the diff small (Ponytail). Prove byte-identical default output:
   a small script that runs 4 tracks × 2 cars with the old and the new kernel and prints lap times to 6 decimals
   (I copied the old `kernel.js` from `git stash` into a scratch folder and imported both).
4. **Quick local sanity**: one or two laps with the flag on; look at the speed trace at a known corner;
   magnitudes must be physical (banking taught this: 104 → 180 km/h at Zandvoort T3 = too much).
5. **Declare the variants** in `probe-exp.json` (include the baseline A and 1–2 sensitivities) and push.
6. While it runs: write the doc section and the test; prepare the comparison.
7. **Gate** with `exp-compare.mjs` per group. Accept only groups that pass. A mixed result (better WEC, worse F1)
   means: use it only where it passes, or find the physics reason before using it at all.
8. **Apply** accepted settings to production (`lapsim-data.yml` env or code default), run the full pipeline
   (or wait for the next scheduled run), check raced reproduction (tests) and held-out numbers again.
9. **Document** accepted and rejected with numbers (`docs/lapsim-*.md`), then PR, then report.

### 9.6 Reading gate results correctly
- `gate()` compares squared errors per row: d_i = e_cur,i² − e_new,i²; accept if mean(d) > 1·SE(d) and n ≥ 5.
- "gain within noise" is NOT a reason to keep a change. Keep the current model.
- Small groups (WEC: 5–6 tracks per class-season) pass or fail easily on one track. Prefer pooled decisions
  (all WEC, all F1) and use per-group results to see where it helps; do not cherry-pick a single season.
- Watch for the "it helps 2026 but hurts 2025" pattern (seen for drag-off variants in WEC): this usually means
  the change trades one track's error for another's. Look at the per-track rows before deciding.
- The same gate works for distributions: pass √(NLL − min) as "errors" and it compares mean NLL (used in
  `intervals.mjs`).

### 9.7 Commands cookbook
```
# branch from upstream
git fetch upstream main && git checkout -b feat/<x> upstream/main
# tests (26 local failures are environment; compare with clean main if unsure)
node --test tests/*.test.mjs 2>&1 | grep -E "^# (pass|fail)"
node --test tests/lapsim.test.mjs            # reproduction tests: F1 39, series 9, WEC
# experiment status / download
gh run list -R kangjeongmin1229/f1-data-analyst-deploy -b probe/lapsim-exp -L 3
gh run view <id> -R kangjeongmin1229/f1-data-analyst-deploy --json jobs -q '.jobs[]|"\(.name) \(.status) \(.conclusion)"'
gh run download <id> -R kangjeongmin1229/f1-data-analyst-deploy -n exp-<X> -D <dir>
gh api repos/kangjeongmin1229/f1-data-analyst-deploy/actions/jobs/<job id>/logs   # full job log
# compare and validate locally
node scripts/sim/exp-compare.mjs <dir>/A/cal-A.js <dir>/B/cal-B.js
LAPSIM_CAL_FILE=<dir>/B/cal-B.js node scripts/sim/validate.mjs B     # needs exported .cache + tracks-data.js
node scripts/sim/intervals.mjs <dir>/B/cal-B.js
# WEC-only refit (keeps F1): LAPSIM_ONLY=wec node scripts/sim/calibrate.mjs
```
Waiting for long jobs: the environment blocks plain `sleep N` chains; use an until-loop
(`until <check>; do sleep 60; done`) in the background with a long timeout. Container restarts kill watchers —
check and re-create them after a restart notice.

### 9.8 Communication with the owner (what works)
- He writes in Korean; answer in **English B1–B2**, short, tables, KST times. Korean only for quoting him or
  when he writes long Korean instructions and the answer is mainly for him to act on (he accepted Korean
  answers for click lists).
- He wants: a per-step report the moment a step ends; ETAs per step when asked "언제"; honesty about slips.
- He is strict on accuracy words: never say "0 %" for a prediction; say "reproduces 0.000 % on raced
  sessions" and "held-out X %".
- He prefers you act without asking for routine things (enter the repo, push, PR). He merges himself.
- Things the safety layer refuses (don't promise them): clicking Merge on upstream, changing network/security
  settings in his account (he added the artifact domain himself), deleting branches on GitHub (403).
- When he asks "내가 클릭해줘야 하는거 있나", give one list with links, grouped: required / optional.

### 9.9 Decision log — what was tried across the project (keep, do not repeat blindly)
| Topic | Tried | Result | Lesson |
|---|---|---|---|
| Race pace | tuned on its own test set (0.62 %) | re-test on unseen seasons: 2024 1.00 %, 2025 1.10 % | never tune on test rows |
| Racing line for lap time | per-car optimised line | laps 3.5–5 % fast | grip is calibrated on the timing path; refit needed |
| Brakes | compare simulated peak g with Brembo | 1.5× too high | compare the mean g of the hard part; add 0.73 s build-up |
| WEC tyre compound effect | Timing71 stints, within car | rejected (1.44 vs 1.41 %) | stint noise ~1.4 % ≫ compound step |
| WEC + Timing71 2023–24 bests | in the real pipeline | all 6 class-seasons rejected | a simplified local test accepted it; always gate in the real pipeline |
| Track temperature + other series | 189 sessions | rejected; unseen-series 4.96 °C | missing weather stored as 0/255 → filter |
| WEC track evolution | 60 Timing71 tables | rejected | keep off |
| Stint energy + 2024 rows | gate | rejected (noise); unseen-season 3.04 % shown | report honest unseen tests even when rejected |
| Austin 2025 WEC | data check | wet session → excluded; holdout 3.8 → 1.5 % | data first |
| Per-track grip bound 0.9–1.1 / 0.95–1.05 | S1 C, D | F1 worse | explain track factors with physics instead |
| Vertical curvature from grade | S2 E | F1 worse, WEC 2026 better | grade is over-smoothed; better z needed |
| Per-event WEC BoP 2025 | every variant | rejected (held-out worse) | BoP inputs alone do not explain lap differences between cars in our model; check mass/power use in the kernel |
| Prediction range with bias shift | S4 | rejected; current range covers 60 % / 99 % at 1σ / 2σ | current ranges are close to honest |

### 9.10 PR descriptions that the owner liked
- Title = what changed + the key number (e.g. "WEC 2025 calibration without the wet COTA session: holdout LMH
  3.80→1.54%…").
- Body: Goal, What changed (bullets), Numbers table (before/after, held-out), Gate verdicts incl. rejections,
  Tests (pass/fail counts and "same failures as main"), Data/licence notes, Follow-ups. End with the
  attribution line required by the environment.

### 9.11 Time estimates (measured today; use for ETAs)
| Job | Time |
|---|---|
| OpenF1 fetch 2023–2026 (Actions) | 2 h 12 min |
| Full export probe | 2 h 29 min |
| One calibration variant, production settings, point-mass | 1 h 33 min – 3 h+ |
| Axle-model variant | slower; may hit the 340 min job limit |
| Full `lapsim-data.yml` | ~3.5 h |
| Timing71 collection (8 shards) | ~1–2 h |
| Local validate/compare on downloaded results | seconds |

---

## 10. Tools, skills, plugins
| Tool | Use |
|---|---|
| karpathy-guidelines skill | goal + pass check first, minimal diff, surface assumptions |
| mission-architect skill | error budget, verification matrix (TAID), trade studies, sensitivity |
| thermal skill | lumped multi-node energy balance (tyre model plan §5.7) |
| Ponytail plugin | small diffs; `/ponytail-review` before a PR |
| Graphify | `graphify query/explain/path` before reading many files |
| gh CLI | fork pushes, run status, artifact download (needs the blob domain) |
| Built-in browser | PR creation on upstream (compare page) |
| Kongboda MCP | FIA documents, Al Kamel single files, rules lookup, `lapsim_simulate` |
| Playwright | page checks |

---

## 11. File and workflow map (physics)
| Path | Role |
|---|---|
| `worker/lapsim/kernel.js` | lap kernel (QSS) + axle/kv/bank options |
| `worker/lapsim/cars.js`, `series.js` | car priors and classes |
| `worker/lapsim/calibration-data.js` | fitted output (generated) |
| `worker/lapsim/scenario.js`, `tool.js` | reproduction layer, uncertainty, MCP tool |
| `worker/lapsim/f1-poles-data.js`, `wec-poles-data.js`, `series-poles-data.js` | real reference laps (generated) |
| `scripts/sim/calibrate.mjs`, `calibrate-lib.mjs`, `joint-bcd.mjs` | calibration |
| `scripts/sim/gate.mjs` | held-out gate |
| `scripts/sim/exp-summary.mjs`, `exp-compare.mjs`, `validate.mjs`, `intervals.mjs` | experiment tools (new) |
| `scripts/sim/data/banking.json`, `wet-sessions.json` | sourced inputs (new) |
| `.github/workflows/lapsim-data.yml` | full data + calibration (production) |
| `.github/workflows/lapsim-t71.yml` | Timing71 collection and fits |
| `probe/lapsim-export`, `probe/lapsim-exp` branches | experiment infrastructure (§8) |
| `docs/lapsim-reproduce.md`, `lapsim-t71.md`, `lapsim-report.md` | coverage, Timing71, calibration report |

---

## 12. Cleanup and open questions
- Branches for the owner to delete when done: `probe/t71`, `probe/t71-read`, `probe/t71-collect`,
  `probe/t71-debug`, `probe/t71-calib`, `probe/t71-temp`, `probe/t71-evo`, `probe/step1-wec`, `lapsim/t71-pool`,
  `feat/t71`, `lapsim/exp-staging`; keep `probe/lapsim-export` and `probe/lapsim-exp` while experimenting.
- Open: how much of the corner-speed bias is sampling (§6.1-1); whether one GT3 base car + BoP is enough across
  tyre suppliers; FE Gen4 mass/energy values.


---

## 13. Task 9.5.0: physical diagnostics in experiment comparison (2026-11-10)

Decision: reporting change only. No calibration experiment or production model change.
Baseline: source commit `887cb5489610926c1c739b537b65c2e47e667b68`.
Model values, fitting bounds, weights and `gate.mjs`: zero changes.

The existing command and output are unchanged. Opt in with calibration/validation pairs,
baseline first (use files from the same variant and run):

```sh
node scripts/sim/exp-compare.mjs --physics \
  cal-A.js validate-A.json \
  cal-H.js validate-H.json > compare-physics.json
```

`--physics` is a reporting switch, not a model flag. It does not run calibration.
The JSON includes SHA-256 hashes of both supplied files, per-variant diagnostics by
season/class, and paired physical comparisons alongside the existing held-out gate.
A third or later pair is always compared with the first pair.

| Output | Meaning |
|---|---|
| Corner bias / RMS (km/h) | From F1 validation rows, equal weight per track as in `validate.mjs`; positive bias means simulated speed is too high. Track and corner counts are separate. |
| Trap bias / RMS (km/h) | F1: simulated lap maximum minus sampled trace maximum. WEC: simulated lap maximum minus measured trap from calibration tracks, checked against the validation summary. **WEC is not yet a trap-position comparison.** |
| Bound hits | Parameter, fitted value, lower/upper side, limit, and whether it is outside the limit. All five fitted F1 car parameters and three WEC car parameters are checked. F1 ICE power limits use the season prior. |
| Bound reference | Current source limits, with reporting tolerance `1e-6 * max(1, abs(limit))`. A test guards the F1 copy against `calibrate.mjs`; WEC uses `SERIES` directly. This changes no fitting bound. |
| Paired changes | Corner absolute-bias change and trap RMS change on common valid tracks, with track IDs and n. Positive means worse. New bound hits are compared by parameter and side. |
| Missing information | Null metrics and zero sample counts, never an invented zero error. WEC corners are unavailable. Original run-specific track grip/drag limits are not stored, so those bound checks are explicitly unavailable. |
| Evidence | These physical residuals are **in-sample** comparisons of layer 3 fitted values with layer 2 measurements. Held-out lap error and n are separate. No physical metric is presented as held-out accuracy. |

Malformed input, duplicate/unknown F1 tracks, inconsistent validation counts or summaries,
missing files and incomplete CLI pairs fail before printing a partial JSON report.
Input hashes identify the supplied files; older validation artifacts do not contain a
calibration hash, so hashes alone cannot prove that the caller supplied the correct pair.

Predeclared pass checks: 3 diagnostic types per variant; numeric fixture error at most
0.000001; 0 byte changes with the switch off; 0 model/bound/weight/gate changes;
0 test failures; raced-session reproduction remains 0.000%; one PR.

| Verification | Result |
|---|---|
| New diagnostic tests, Node 22.23.4 | 12/12 passed |
| `node --test tests/lapsim-*.test.mjs tests/lapsim.test.mjs` | 78/78 passed, including all raced-session reproduction tests |
| `KONGBODA_FEATURES=all node --test tests/*.test.mjs` | 398/398 passed |
| `npm run build` / `npm run validate` | Both passed |
| Original vs new default CLI on the unchanged production calibration | 1,173 bytes each; byte-identical |
| Source audit | All pre-existing source files except `exp-compare.mjs` and this handoff remain unchanged |

Initial environment check: Node 26 ran the reproduction tests successfully but nine other
test files could not load `unpdf` because the isolated snapshot had no dependency link.
After linking the existing installed dependencies and using Node 22, the complete checks
above passed. No test failure was hidden or fixed by changing production code.

Not checked: a new fit, convergence, a new production-baseline experiment, held-out
corner/trap accuracy, WEC trap position, or run-specific track-factor bound hits.
No improved model or gate acceptance is claimed. The workflow is unchanged; invoking
this report automatically from that workflow is outside this physics-only task.


## 14. WEC timing experiment — task 9.5.2 (2026-11-10)

Owner-approved scope: trap position (a), sector objective (b); aerodynamic ratio (c) is on hold.
Code flags remain off by default. This is an experimental implementation, not approval to enable it in production.

### 14.1 Predeclared experiment

Base commit: 309fdfd8e214c5089072bcc5c06e51892bf63790 (PR #153).
Manifest: scripts/sim/wec-timing-experiment.json. Primary variants: baseline, a, b2, ab2.
Sensitivity-only variants: b1, b4, ab1, ab4. The acceptance decision uses weight 2 only. No best-weight selection from held-out results.

All runs: LAPSIM_ONLY=wec, LAPSIM_ITERS=70, LAPSIM_HOLDOUT_ITERS=25, unchanged production F1 seasons, projections and transfer factors.
The production workflow's F1 settings (BCD 5 rounds/200 iterations, lap 20, sector 2, prior 8, track drag and teams on) are retained in the environment but are not used to refit F1.
The WEC fitter actually uses lap weight 2 and trap weight 0.5; its approved new term is 2 times the sum of three squared sector errors in seconds.
Weights 1 and 4 are sensitivity checks only. Every original row weight, parameter bound, pooling/BoP decision and gate remains unchanged.

Pass: pooled WEC gate accepted, no class-season worse, F1 seasons/projections unchanged, zero new bound hits, no worse measured trap or corner errors.
Baseline must match production within 0.05 percentage points per group. Screen budget: under 60 minutes.
The production WEC fitter uses Nelder-Mead iterations, not F1 BCD rounds; F1 round settings are not evidence of WEC convergence.
WEC corner measurements are unavailable, so the physical corner check cannot be claimed as passed.

| Class | Year | Al Kamel laps | Eligible sectors | Positioned traps | Held-out tracks |
|---|---:|---:|---:|---:|---:|
| lmh | 2025 | 15 | 0 | 0 | 5 |
| lmh | 2026 | 18 | 0 | 0 | 6 |
| lmdh | 2025 | 15 | 0 | 0 | 5 |
| lmdh | 2026 | 18 | 0 | 0 | 6 |
| lmgt3 | 2025 | 15 | 0 | 0 | 5 |
| lmgt3 | 2026 | 18 | 0 | 0 | 6 |

Timing71 extra candidate rows have no verified year-specific timing positions and retain their original lap/trap observations.
The existing fit decides whether to use these extra rows; final fitted n is reported separately.

### 14.2 Source verification and eligibility

Official event manifests: https://files.alkamelcloud.com/wec/manifests/results_14_2025.json and https://files.alkamelcloud.com/wec/manifests/results_15_2026.json.
The derived table scripts/sim/data/wec-timing-positions.json records each source URL, page and SHA-256. Raw PDFs are not committed.
Distances below are metres from the finish timing line, not the separate grid start line; the maps label distances approximate.
No trap distance was inferred from a diagram's pixels or borrowed from F1. Le Mans has a numeric trap distance but no simulator geometry in this fit.

| Track | Year | Official length | S1 end | S2 end | Trap | Source |
|---|---:|---:|---:|---:|---:|---|
| lusail | 2025 | 5418 | 2072 | 3664 | unverified | [map](https://files.alkamelcloud.com/wec/results/14_2025/01_LOSAIL/00_Event%20Info/1_CircuitMap.pdf) |
| imola | 2025 | 4909 | 1214 | 2728 | unverified | [map](https://files.alkamelcloud.com/wec/results/14_2025/02_IMOLA/00_Event%20Info/Circuit%20Map.pdf) |
| spa-francorchamps | 2025 | 7003.9 | 2243.5 | 5112.7 | unverified | [map](https://files.alkamelcloud.com/wec/results/14_2025/03_SPA%20FRANCORCHAMPS/00_Circuit%20Info/Circuit%20Map.pdf) |
| interlagos | 2025 | 4309 | 1234 | 3155 | unverified | [map](https://files.alkamelcloud.com/wec/results/14_2025/05_SAO%20PAULO/00_Circuit%20Info/Circuit%20Map%20v2.pdf) |
| austin | 2025 | 5513 | 1311 | 3568 | unverified | [map](https://files.alkamelcloud.com/wec/results/14_2025/06_CIRCUIT%20OF%20THE%20AMERICAS/00_Event%20Info/Circuit%20Map%20v2.pdf) |
| sakhir | 2025 | 5412 | 1804 | 3562 | unverified | [map](https://files.alkamelcloud.com/wec/results/14_2025/08_BAHRAIN%20INTERNATIONAL%20CIRCUIT/00_Event%20Info/Circuit%20Map.pdf) |
| imola | 2026 | 4909 | 1214 | 2728 | unverified | [map](https://files.alkamelcloud.com/wec/results/15_2026/01_IMOLA/00_Event%20Info/1_Circuit%20Map.pdf) |
| spa-francorchamps | 2026 | 7003.9 | 2243.5 | 5112.7 | unverified | [map](https://files.alkamelcloud.com/wec/results/15_2026/02_SPA%20FRANCORCHAMPS/00_Event%20Info/Circuit%20Map.pdf) |
| interlagos | 2026 | 4309 | 1234 | 3155 | unverified | [map](https://files.alkamelcloud.com/wec/results/15_2026/04_SAO%20PAULO/00_Event%20Info/Circuit%20Map.pdf) |
| austin | 2026 | 5513 | 1311 | 3568 | unverified | [map](https://files.alkamelcloud.com/wec/results/15_2026/05_CIRCUIT%20OF%20THE%20AMERICAS/00_Event%20Info/Circuit%20Map%20v3.pdf) |
| catalunya | 2026 | 4657 | 1627 | 3395 | unverified | [map](https://files.alkamelcloud.com/wec/results/15_2026/07_BARCELONA-CATALUNYA/00_Event%20Info/Circuit%20Map%20v1.pdf) |
| monza | 2026 | 5793 | 2055 | 3727 | unverified | [map](https://files.alkamelcloud.com/wec/results/15_2026/08_AUTODROMO%20NAZIONALE%20DI%20MONZA/00_Event%20Info/Circuit%20Map%20v2.pdf) |
| le-mans | 2026 | 13625.7 | 1900.7 | 7672.13 | 3754.13 | [map](https://files.alkamelcloud.com/wec/results/15_2026/03_LE%20MANS/00_Event%20Info/Circuit%20Map%20v3.pdf) |

All 12 fitted track/year layouts differ in length by more than 0.5%, so every sector term is excluded.
A map can be verified while its mapping to the current geometry is ineligible. These two states are reported separately.
At most 0.5% length difference is allowed, measured relative to official length. Accepted distances are scaled to the simulation's distance scale.
Measured sectors must be positive and sum to the same real lap within 0.002 s, the maximum combined rounding error of three sectors and a lap published to 0.001 s.
Invalid rows retain lap and trap only and report the reason. WEC sector overrides copy the track object and never alter its F1 sector points.
Trap positions also require compatible geometry and a numeric source. A valid positioned trap bypasses the 92% filter; unknown positions keep the existing lap-maximum comparison and filter.

### 14.3 Aerodynamic ratio: held, no assumed numeric limit

- **2026 LMH Technical Regulations**, WMSC 16 October 2025, published 17 October 2025, clean issue, article 3.7.3: aerodynamic coefficients must meet criteria in the technical appendices. This clause gives no numeric downforce/drag ratio. Article 3.7.1 describes official wind-tunnel checks across ride heights. [Official document](https://www.fia.com/system/files/documents/2026_lmh_technical_regs_2025.10.16_published_2025.10.17_clean_version_0.pdf).
- **LMDh Technical Regulations**, revision 16 October 2025 (2026 rules), article 3.9.3, page 25: homologation requires aerodynamic performance inside the Target Window defined in the appendices. This clause gives no numeric downforce/drag ratio. Article 3.9.1 describes wind-tunnel maps over ride height and car attitude. [Official document](https://www.fia.com/system/files/documents/lmdh-technical-regulations-2025.10.16-blackline.pdf).

The applicable numeric appendix criteria have not been verified. Neither 4:1 nor another ratio has been implemented, and no aero bounds are changed. The owner decides the next step for (c).

### 14.4 Results and decision

Decision: **STOP under rule 5.3**. The flags-off baseline differs from production by more than 0.05 percentage points in four groups. No candidate or sensitivity run was started, no gate acceptance is claimed, and no model or code PR has been published. Owner direction is required before further experiments. The cause is not yet established; changing the iteration count or replacing geometry to make this pass would not be a valid silent correction.

| Class | Season | Production held-out RMS % | Run RMS % | Delta pp | Held-out n | Fitted laps | Grip muY | Downforce ClA | Drag CdA | Bound hits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| lmh | 2025 | 1.43 | 1.54 | +0.11 | 5 | 15 | 1.568052 | 7.000000 | 1.087457 | clA upper 7 |
| lmh | 2026 | 1.04 | 1.10 | +0.06 | 6 | 18 | 1.521326 | 6.554535 | 0.964483 | none |
| lmdh | 2025 | 1.24 | 1.61 | +0.37 | 5 | 15 | 1.559939 | 7.000000 | 1.102774 | clA upper 7 |
| lmdh | 2026 | 1.07 | 1.05 | -0.02 | 6 | 18 | 1.530437 | 6.396914 | 0.953797 | none |
| lmgt3 | 2025 | 1.73 | 1.82 | +0.09 | 5 | 15 | 1.589101 | 3.500000 | 1.300000 | clA upper 3.5; cdA upper 1.3 |
| lmgt3 | 2026 | 1.37 | 1.36 | -0.01 | 6 | 18 | 1.613810 | 3.500000 | 1.291986 | clA upper 3.5 |

Downforce did **not** move off a bound in any group. LMH/LMDh 2026 were already below their upper bounds in production. LMDh 2025 also changed from 18 fitted rows to 15: the existing Timing71 pooling decision did not retain the extra rows in this baseline. This is diagnostic evidence, not evidence of a new timing feature's effect.

F1 seasons and projections are JSON-identical to production. The production calibration file has been restored byte-for-byte; the failed fit is retained only as a local experiment artifact.

| Check | Result |
|---|---|
| New timing tests plus existing report tests | 24/24 passed |
| Physics suite | 90/90 passed, including raced-session reproduction |
| Full suite, KONGBODA_FEATURES=all | 410/410 passed |
| npm run build / npm run validate | Both passed |
| Flags-off unit output compatibility | Passed |
| Full original-source vs modified-source byte comparison | Incomplete: control run cancelled when the stop condition was found |
| Production baseline tolerance | Failed: LMH 2025/2026, LMDh 2025, LMGT3 2025 |
| Primary candidates a, b2, ab2 | Not run: blocked by baseline failure |
| Sensitivity b1, b4, ab1, ab4 | Not run: blocked by baseline failure |
| Convergence and pooled WEC acceptance | Not established |

Reproduction inputs: archive SHA-256 268039a6acd2fd589336fede690e3321d723f6f50665718a55f6021cde1ac186, production geometry SHA-256 fe67d1ecf2a4c151f35f98e3da334d835881904ffb4ebda24488983952cee5eb. The archive includes older Interlagos geometry; only its raw timing cache was extracted, and the repository wet-session exclusions were applied. The production geometry was used unchanged.

Local evidence: .cache/wec-experiment/baseline.log, baseline.js, baseline-comparison.json, production.js, physics-tests.log and full-tests.log. These are preserved for baseline diagnosis; they are not published experiment artifacts or a completed PR.



## 15. Read-only baseline investigation (2026-11-10)

Owner limit: 45 minutes. No candidate sector/trap fit, model PR, merge, bound/weight/gate change or working geometry change. The revised eligibility rule is evaluated as an audit here; fitting code remains unchanged during this read-only investigation.

### 15.1 Input mismatch and selection decisions

Production calibration is byte-identical to PR #149, commit c08a72f66a8984013d5ede3b9b923bdb476eb734. PR #148 head is 82a8cadebc88ae1a4da6d2be02dfb1ccd4174810. Both PRs describe local WEC-only refits; neither records the original shell environment or raw local wec.json checksum. The reconstruction below is verified by execution, rather than represented as a recovered shell log.

The checked-in geometry is identical at PR #149 and the current base, but the geometry used to generate the PR #149 calibration differs at Interlagos. Archive Interlagos is session 11408 / source year 2026, 4227.802814 m; checked-in Interlagos is session 9865 / source year 2025, 4230.354610 m. Calling the archive geometry 'older' was inaccurate; these are different source snapshots. Curvature, grade, heading, sectors, corners and map differ, not only the length. Other 25 tracks are identical.

A saved-car replay with current geometry misses every PR #149 Interlagos stored lap by 0.091–0.223 s. The archive geometry reproduces all six at the stored 0.001 s precision. For PR #148 the reverse holds: current geometry reproduces all six stored Interlagos laps, and archive geometry does not.

| Class | Season | Grip: production → rerun | F1 / transfer RMS %: production → rerun | Pool RMS %: production → rerun | Pool used: production → rerun | BoP RMS %: production → rerun | BoP used |
|---|---:|---|---|---|---|---|---|
| lmh | 2025 | f1 → f1 | 1.43 / 1.74 → 1.54 / 1.61 | 1.43 → 1.49; 1.54 → 1.74 | false → false | 1.43 → 1.59; 1.54 → 1.80 | false → false |
| lmh | 2026 | transfer → transfer | 1.36 / 1.04 → 1.28 / 1.10 | 1.04 → 1.06; 1.10 → 1.14 | false → false | none; none | n/a → n/a |
| lmdh | 2025 | transfer → f1 | 1.74 / 1.34 → 1.61 / 1.66 | 1.34 → 1.24; 1.61 → 1.56 | true → false | 1.24 → 1.74; 1.61 → 1.64 | false → false |
| lmdh | 2026 | transfer → transfer | 1.42 / 1.07 → 1.40 / 1.05 | 1.07 → 1.03; 1.05 → 1.08 | false → false | none; none | n/a → n/a |
| lmgt3 | 2025 | transfer → transfer | 2.14 / 1.73 → 2.14 / 1.82 | 1.73 → 1.83; 1.82 → 1.79 | false → false | none; none | n/a → n/a |
| lmgt3 | 2026 | transfer → transfer | 1.49 / 1.37 → 1.48 / 1.36 | 1.37 → 1.35; 1.36 → 1.32 | false → false | none; none | n/a → n/a |

All BoP candidates are rejected in both files. The 2025 BoP references are identical: LMH 15 rows / 1048.7 kg / 500.9 kW; LMDh 15 rows / 1045.1 kg / 505.6 kW. Other BoP fields are null. Extra pool candidate counts are unchanged: 3 per Hypercar group and 5 per LMGT3 group. Every exact pooled, bop and gripSource field, including reason strings, is preserved in the investigation JSON.

| Group | Grip gate: production / failed rerun | Pool gate: production / failed rerun | BoP gate: production / failed rerun |
|---|---|---|---|
| lmh/2025 | rejected: worse on held-out rows / rejected: worse on held-out rows | rejected: worse on held-out rows / rejected: worse on held-out rows | rejected: worse on held-out rows / rejected: worse on held-out rows |
| lmh/2026 | accepted: held-out error lower beyond noise / rejected: gain within noise | rejected: worse on held-out rows / rejected: worse on held-out rows | null / null |
| lmdh/2025 | accepted: held-out error lower beyond noise / rejected: worse on held-out rows | accepted: held-out error lower beyond noise / rejected: gain within noise | rejected: worse on held-out rows / rejected: worse on held-out rows |
| lmdh/2026 | rejected: gain within noise / accepted: held-out error lower beyond noise | rejected: gain within noise / rejected: worse on held-out rows | null / null |
| lmgt3/2025 | rejected: gain within noise / rejected: gain within noise | rejected: worse on held-out rows / rejected: gain within noise | null / null |
| lmgt3/2026 | rejected: gain within noise / rejected: gain within noise | rejected: gain within noise / rejected: gain within noise | null / null |

LMDh 2025: production first selects transfer grip (1.74 → 1.34%); pooling then passes (1.34 → 1.24%), giving 15 Al Kamel plus 3 Timing71 rows. The mismatched rerun selects F1 grip (1.61 vs transfer 1.66%); pooling improves 1.61 → 1.56% but is within noise, so only 15 rows remain. No row was silently removed by the new timing flags.

Per-track input diff: **zero differing rows out of 33 paired class-season-track rows**. Track membership and the fields realLap, trapKph, car, event and weather are exactly equal. The saved calibration stores only the first lap per track, so the lower two laps are checked through the full historical reproduction rather than claimed to be present in that saved output.

### 15.2 Raw input and source provenance

| Class | Season | Archive sessions / selected laps | Dry sessions / laps | Wet exclusion | Timing71 candidates |
|---|---:|---:|---:|---|---:|
| lmh | 2025 | 6 / 18 | 5 / 15 | austin | 3 |
| lmh | 2026 | 6 / 18 | 6 / 18 | none | 3 |
| lmdh | 2025 | 6 / 18 | 5 / 15 | austin | 3 |
| lmdh | 2026 | 6 / 18 | 6 / 18 | none | 3 |
| lmgt3 | 2025 | 6 / 18 | 5 / 15 | austin | 5 |
| lmgt3 | 2026 | 6 / 18 | 6 / 18 | none | 5 |

The archive contains 36 class-session rows / 108 selected laps. Its only effective preprocessing change is rain=false → true for the three Austin 2025 class rows, following scripts/sim/data/wet-sessions.json; 9 laps are excluded and 99 remain. The pinned raw file is therefore not the final fit input until these exclusions are applied. No lap, trap, car, event, sector or numeric weather value is changed. Timing71 is the unchanged 11-row derived file: LMH 3, LMDh 3, LMGT3 5, all from 2024.

| Input | SHA-256 |
|---|---|
| archive | 268039a6acd2fd589336fede690e3321d723f6f50665718a55f6021cde1ac186 |
| archiveWec | aa40cae3646ea33a3d1692c0f523196a4716bd707b84b38476bcf96da9d54626 |
| excludedWec | ce25a479ab6b256d2ac597fa34c5941f7f3166db3bd4112e92cd355502a11960 |
| archiveGeometry | 4fc1b3ecb014434b70d54be520803da3af7bf9ff19b63508c9518f29dd3b67f1 |
| checkedInGeometry | fe67d1ecf2a4c151f35f98e3da334d835881904ffb4ebda24488983952cee5eb |
| transferB | b2d3bba7113685d1382415b4717bd26a6df2aa73f4664c0c88e64068d08e3705 |
| transferJ | c927fb77ef2681aafe9b47f327d7d001d83ffc7789a32430c0ebe0df43ca76e4 |
| timing71 | 4852d273a360192fe0007c756c3a1e0f70d5aefeeb2cd46198c49878a7c12a76 |
| seed149 | 47e7c24a6df9bc67fd59dcd4fa0de6ffee290cfc02810d1e6742bca901f39586 |
| seed148 | bc81688bc1f760ebbc6e2975e631d90eb0251cc0546efe7b7f134e84cc5efff3 |

PR #148 uses transfer-grip git blob 2fc61d5bf9ad83eabf68b0244ae2a5ef52fa21c4 (J); PR #149 uses 38b864d7f971d2ea8dd8eb98427378db6d1c1539 (B). All 26 values match their experiment artifacts exactly: probe-out/cal-J.js blob 9812395026352dc4098afa8f38169bd017c9c197 and cal-B.js blob 6c2215d44808b315532c884f76a7a2a4b2637f9e on the fork.

The documented WEC command is LAPSIM_ONLY=wec node scripts/sim/calibrate.mjs. Source defaults are LAPSIM_ITERS=70 and LAPSIM_HOLDOUT_ITERS=25. The production workflow's BCD 5 rounds / 200 iterations apply to F1, not the WEC Nelder–Mead fit. WEC lap/trap weights stay 2 / 0.5. Transfer generation is node scripts/sim/transfer-grip.mjs <cal-B.js or cal-J.js> <source label>; this investigation reads the already generated table without regenerating it.

Sources: [PR #149](https://github.com/MisterKinn/f1-data-analyst/pull/149), [commit c08a72f](https://github.com/MisterKinn/f1-data-analyst/commit/c08a72f66a8984013d5ede3b9b923bdb476eb734), [PR #148](https://github.com/MisterKinn/f1-data-analyst/pull/148), [pinned archive](https://raw.githubusercontent.com/kangjeongmin1229/f1-data-analyst-deploy/probe/lapsim-export/probe-out/lapsim-inputs.tgz.part-aa).

### 15.3 Revised sector eligibility, audited before any sector fit

Use ratio = simulated ds times point count / official centre-line length. Scale official S1/S2 distances by this ratio; accept abs(ratio - 1) <= 0.02. Positive sectors and absolute sum-minus-lap <= 0.002 s remain required. No F1 sector point is altered.

Sanity check declared before calculation: for each dry track-year, simulate the best real lap of each class with its saved production car, track grip and session weather. Exclude the whole track-year if any of its classes exceeds 3 percentage points in any sector share. No mapping is selected by the candidate's held-out result.

| Track | Season | Current length m | Official length m | Ratio % | Largest share difference pp | Status |
|---|---:|---:|---:|---:|---:|---|
| lusail | 2025 | 5387.457 | 5418 | 99.436261 | 0.327 | eligible |
| imola | 2025 | 4866.758 | 4909 | 99.139493 | 0.412 | eligible |
| spa-francorchamps | 2025 | 6947.286 | 7003.9 | 99.191678 | 1.256 | eligible |
| interlagos | 2025 | 4230.355 | 4309 | 98.174858 | 0.864 | eligible |
| austin | 2025 | 5422.794 | 5513 | 98.363760 | not tested | wet: excluded before sector check |
| sakhir | 2025 | 5337.455 | 5412 | 98.622592 | 0.471 | eligible |
| imola | 2026 | 4866.758 | 4909 | 99.139493 | 0.427 | eligible |
| spa-francorchamps | 2026 | 6947.286 | 7003.9 | 99.191678 | 1.208 | eligible |
| interlagos | 2026 | 4230.355 | 4309 | 98.174858 | 1.174 | eligible |
| austin | 2026 | 5422.794 | 5513 | 98.363760 | 0.227 | eligible |
| catalunya | 2026 | 4610.808 | 4657 | 99.008121 | 0.256 | eligible |
| monza | 2026 | 5759.499 | 5793 | 99.421692 | 1.946 | eligible |

All 12 track-years pass the length rule. Austin 2025 remains wet and is not admitted. All 33 dry class-season-track sanity checks pass; the largest absolute share difference is 1.946333 pp (LMGT3 Monza 2026). All 99 dry selected laps have positive sectors and pass the sum check.

| Class | Season | Dry Al Kamel laps | Sector terms | Held-out tracks with sectors | Positioned traps |
|---|---:|---:|---:|---:|---:|
| lmh | 2025 | 15 | 15 | 5 | 0 |
| lmh | 2026 | 18 | 18 | 6 | 0 |
| lmdh | 2025 | 15 | 15 | 5 | 0 |
| lmdh | 2026 | 18 | 18 | 6 | 0 |
| lmgt3 | 2025 | 15 | 15 | 5 | 0 |
| lmgt3 | 2026 | 18 | 18 | 6 | 0 |

Every group has at least 4 held-out tracks with sector observations (actually 5 or 6); no group is blocked by the requested minimum. Gate acceptance is not implied by sample count. Timing71 extra rows have no verified year-specific sector mapping and remain lap + trap only.

Historical archive Interlagos ratio is 98.115637%, also within 2%. Its sector-share check passes for all six groups (largest difference 1.046766 pp). Thus using the historical snapshot changes no eligibility count; its numeric shares are recorded separately.

| Class | Season | Track | Real S1/S2/S3 % | Sim S1/S2/S3 % | Largest difference pp | Result |
|---|---:|---|---|---|---:|---|
| lmh | 2025 | lusail | 36.301 / 33.634 / 30.065 | 36.475 / 33.737 / 29.788 | 0.277 | pass |
| lmdh | 2025 | lusail | 36.283 / 33.577 / 30.140 | 36.466 / 33.721 / 29.813 | 0.327 | pass |
| lmgt3 | 2025 | lusail | 36.268 / 33.089 / 30.644 | 36.475 / 32.812 / 30.713 | 0.277 | pass |
| lmh | 2025 | imola | 20.595 / 32.574 / 46.831 | 21.007 / 32.266 / 46.727 | 0.412 | pass |
| lmdh | 2025 | imola | 20.730 / 32.582 / 46.689 | 20.976 / 32.291 / 46.733 | 0.291 | pass |
| lmgt3 | 2025 | imola | 20.684 / 32.599 / 46.717 | 21.070 / 32.477 / 46.453 | 0.386 | pass |
| lmh | 2025 | spa-francorchamps | 28.332 / 46.251 / 25.417 | 29.588 / 45.136 / 25.277 | 1.256 | pass |
| lmdh | 2025 | spa-francorchamps | 28.420 / 45.920 / 25.660 | 29.647 / 45.031 / 25.321 | 1.227 | pass |
| lmgt3 | 2025 | spa-francorchamps | 28.512 / 45.816 / 25.672 | 29.663 / 44.939 / 25.398 | 1.151 | pass |
| lmh | 2025 | interlagos | 25.594 / 51.066 / 23.340 | 25.659 / 51.452 / 22.888 | 0.452 | pass |
| lmdh | 2025 | interlagos | 25.674 / 50.845 / 23.481 | 25.702 / 51.341 / 22.958 | 0.523 | pass |
| lmgt3 | 2025 | interlagos | 25.810 / 50.133 / 24.058 | 25.664 / 50.997 / 23.339 | 0.864 | pass |
| lmh | 2025 | sakhir | 31.812 / 36.855 / 31.333 | 31.958 / 36.438 / 31.605 | 0.418 | pass |
| lmdh | 2025 | sakhir | 31.747 / 36.863 / 31.389 | 31.892 / 36.493 / 31.615 | 0.370 | pass |
| lmgt3 | 2025 | sakhir | 31.693 / 36.572 / 31.735 | 31.751 / 36.102 / 32.148 | 0.471 | pass |
| lmh | 2026 | imola | 20.492 / 32.856 / 46.652 | 20.832 / 32.460 / 46.709 | 0.396 | pass |
| lmdh | 2026 | imola | 20.551 / 32.907 / 46.542 | 20.832 / 32.479 / 46.689 | 0.427 | pass |
| lmgt3 | 2026 | imola | 20.841 / 32.783 / 46.376 | 21.061 / 32.492 / 46.446 | 0.290 | pass |
| lmh | 2026 | spa-francorchamps | 28.168 / 46.604 / 25.228 | 29.376 / 45.549 / 25.074 | 1.208 | pass |
| lmdh | 2026 | spa-francorchamps | 28.151 / 46.412 / 25.437 | 29.342 / 45.595 / 25.064 | 1.191 | pass |
| lmgt3 | 2026 | spa-francorchamps | 28.721 / 45.498 / 25.781 | 29.741 / 44.844 / 25.414 | 1.021 | pass |
| lmh | 2026 | interlagos | 26.057 / 50.558 / 23.385 | 25.759 / 51.732 / 22.510 | 1.174 | pass |
| lmdh | 2026 | interlagos | 25.855 / 50.768 / 23.378 | 25.730 / 51.784 / 22.486 | 1.016 | pass |
| lmgt3 | 2026 | interlagos | 26.051 / 49.844 / 24.105 | 25.899 / 50.890 / 23.211 | 1.046 | pass |
| lmh | 2026 | austin | 21.335 / 37.895 / 40.770 | 21.364 / 37.985 / 40.651 | 0.118 | pass |
| lmdh | 2026 | austin | 21.335 / 37.912 / 40.753 | 21.373 / 37.970 / 40.657 | 0.095 | pass |
| lmgt3 | 2026 | austin | 21.625 / 38.258 / 40.117 | 21.797 / 38.313 / 39.890 | 0.227 | pass |
| lmh | 2026 | catalunya | 29.095 / 40.564 / 30.341 | 29.247 / 40.659 / 30.093 | 0.248 | pass |
| lmdh | 2026 | catalunya | 29.039 / 40.735 / 30.226 | 29.256 / 40.650 / 30.095 | 0.217 | pass |
| lmgt3 | 2026 | catalunya | 29.839 / 40.493 / 29.668 | 30.032 / 40.237 / 29.731 | 0.256 | pass |
| lmh | 2026 | monza | 32.210 / 34.017 / 33.772 | 33.690 / 32.374 / 33.935 | 1.643 | pass |
| lmdh | 2026 | monza | 32.278 / 33.960 / 33.762 | 33.655 / 32.377 / 33.968 | 1.583 | pass |
| lmgt3 | 2026 | monza | 32.073 / 33.853 / 34.074 | 33.576 / 31.907 / 34.517 | 1.946 | pass |

### 15.4 Trap hold and next experiment declaration

(a) is held: zero fitted tracks have a verified numeric trap distance. The existing implementation stays behind its off-by-default flag; no positioned-trap experiment is run. Potential official documents to request/check are the event timing Circuit Map in Al Kamel Event Info/Circuit Info, an FIA WEC Race Director Event Notes map appendix, or the timing provider's official loop-position/chainage schedule. They must give a numeric position from the timing line for the correct layout/year. A graphical TS marker alone is insufficient. The verified Le Mans 2026 Circuit Map v3 explicitly gives 3754.13 m, but Le Mans has no fitted geometry and contributes zero observations. No new trap source was fetched or assumed in this investigation.

Next declared primary variants: baseline and b2 only. Sensitivity: b1 and b4 only; no weight selection from held-out results. LAPSIM_ONLY=wec; lap weight 2; trap weight 0.5; sector weight 2 primary, 1/4 sensitivity. Both feature flags are off in the baseline; trap flag remains off in every variant. Pass: pooled WEC gate accepted, no class-season worse, F1 unchanged. Bounds and gate remain unchanged. Eligibility above is a diagnostic calculation, not a completed change to the fitting code: wire the approved 2% and share checks before any future sector run. (c) remains held.


### 15.5 Completed historical reproduction and byte identity

**Result A:** all model fields from PR #149 reproduce exactly with the pinned archive geometry, existing wet exclusions, B transfer table, LAPSIM_ONLY=wec, LAPSIM_ITERS=70 and LAPSIM_HOLDOUT_ITERS=25. Every car parameter, score, track row, held-out result, pooled/bop/gripSource object, F1 season and projection matches at full precision. The only file difference is generatedAt (2026-11-09 versus 2026-11-10); normalizing that metadata date makes every other byte identical. Section 5.2 records the exact historical recipe and checksums.

| Class | Season | Production RMS % | Failed current-geometry RMS % | Historical replay RMS % | Held-out n | Fitted laps | Grip muY | Downforce ClA | Drag CdA | Bound hits |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| lmh | 2025 | 1.43 | 1.54 | 1.43 | 5 | 15 | 1.568817 | 7.000000 | 1.086824 | clA upper 7 |
| lmh | 2026 | 1.04 | 1.10 | 1.04 | 6 | 18 | 1.518156 | 6.630406 | 0.963682 | none |
| lmdh | 2025 | 1.24 | 1.61 | 1.24 | 5 | 18 | 1.561175 | 7.000000 | 1.099404 | clA upper 7 |
| lmdh | 2026 | 1.07 | 1.05 | 1.07 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none |
| lmgt3 | 2025 | 1.73 | 1.82 | 1.73 | 5 | 15 | 1.590430 | 3.500000 | 1.286196 | clA upper 3.5 |
| lmgt3 | 2026 | 1.37 | 1.36 | 1.37 | 6 | 18 | 1.615853 | 3.500000 | 1.300000 | clA upper 3.5; cdA upper 1.3 |

Downforce did not move off a bound. This reproduces the existing model; it does not introduce a new model. The failed current-geometry baseline is not promoted. The checked-in geometry/calibration inconsistency remains for the owner's decision.

PR #148 cross-check also passed: all model fields and all bytes except generatedAt match exactly, using the current checked-in geometry, J transfer table, the same preprocessed cache, and the same 70/25 WEC command. PR #148 and PR #149 both preserve identical F1 seasons. The original local shell logs were not recovered; these commands are experimentally verified reconstructions.

| Compatibility check | Result | Bytes |
|---|---|---:|
| Full calibration: modified flags-off source vs original source | byte-identical | 55407 |
| Calibration stdout | byte-identical | 5629 |
| Validation JSON | byte-identical | 24756 |
| Validation stdout | byte-identical | 2038 |

The first investigation was interrupted by a computer power loss after all three refit processes had exited. On reconnection, the saved PR #148 result was compared and the stored PR #149 and byte-identity evidence rechecked. No fit was restarted. All 44 working worker/lapsim JavaScript files, the production calibration, geometry and gate remain unchanged. Only documentation was updated in this read-only investigation; the approved 2% and sector-share rules were audited but still need implementation before any future sector fit. No candidate experiment, PR, merge or deployment was performed.

Evidence is saved locally in .cache/wec-investigation/: baseline-input-audit.json, sector-share-audit.json, archive-interlagos-sector-audit.json, provenance-hashes.json, pr149-exact-reproduction.json, pr148-exact-reproduction.json and flags-off-identity.json. These are local investigation artifacts, not a published experiment.

**Decision: report and wait.** Primary future variants are baseline/b2; b1/b4 are sensitivity only. Trap (a) and aero ratio (c) remain held.

## 16. Approved sector experiment and geometry investigation — 2026-11-10

**Decision: reject b2; keep both flags off. No model or geometry change.** The primary sector weight was fixed at 2 before the run. Pooled WEC held-out RMS rises from 1.321% to 1.329% (n=33); LMDh 2025 and LMGT3 2025 worsen. Sensitivity weights 1 and 4 do not replace the primary decision. This section supersedes the waiting state at the end of section 15.

**Small-sample caution, next to the result:** with n=5 or 6, a gain below about 0.1 percentage points is not established, even if the gate accepts it. Changing only the Interlagos input geometry moved LMDh 2025 by 0.37 pp. The accepted sensitivity cells below are all under 0.1 pp. They are not evidence for selecting a different weight.

### 16.1 Backup, declaration and fixed eligibility

The existing work was backed up first to `kangjeongmin1229/f1-data-analyst-deploy`, branch `feat/lapsim-wec-timing`, commit `f769d678f3cae1cdf03641da1411432ebc3ecad7`, with flags off. The experiment then used the exact section 5.2 PR #149 recipe: archive geometry, production F1 seed, B transfer table, existing wet exclusions and unchanged Timing71 input. Every pinned hash matched. Runs used isolated directories; the 44 production model files and the gate were not changed.

Predeclared settings: `LAPSIM_ONLY=wec`, `LAPSIM_ITERS=70`, `LAPSIM_HOLDOUT_ITERS=25`; lap weight 2, trap weight 0.5. Primary baseline/b2; b1/b4 sensitivity only. Trap off in every variant; aero ratio not implemented. All other LAPSIM overrides cleared. Pass: pooled WEC accepted, no class-season worse, F1 unchanged. Eligibility and coverage were reported before any fit. Baseline fit: 435.5 s; original-source control: 417.9 s. Candidate fits ran independently in parallel: b2 520.6 s, b1 504.4 s, b4 502.7 s. The baseline-plus-candidate screen completed within 19 minutes of baseline start, below the 60-minute limit.

The new rule scales official distances by model/official length, with an inclusive 2% limit. Positive sectors must sum to the observed lap within 0.002 s. The share check ran once, using each production class car, its saved track grip and observed weather on the best dry lap. Every sector must be within 3 pp of the real share. A failed class excludes the entire track-year; a bad lower-ranked sector sum excludes that row only. The frozen table is reused by every sector variant and input hashes are checked before fitting. F1 sector points are copied, never mutated.

| Track | Year | Official m | Model m | Ratio % | Disposition |
|---|---|---|---|---|---|
| lusail | 2025 | 5418.0 | 5387.457 | 99.436 | pass |
| imola | 2025 | 4909.0 | 4866.758 | 99.139 | pass |
| spa-francorchamps | 2025 | 7003.9 | 6947.286 | 99.192 | pass |
| interlagos | 2025 | 4309.0 | 4227.803 | 98.116 | pass |
| austin | 2025 | 5513.0 | 5422.794 | 98.364 | length passes; wet, excluded |
| sakhir | 2025 | 5412.0 | 5337.455 | 98.623 | pass |
| imola | 2026 | 4909.0 | 4866.758 | 99.139 | pass |
| spa-francorchamps | 2026 | 7003.9 | 6947.286 | 99.192 | pass |
| interlagos | 2026 | 4309.0 | 4227.803 | 98.116 | pass |
| austin | 2026 | 5513.0 | 5422.794 | 98.364 | pass |
| catalunya | 2026 | 4657.0 | 4610.808 | 99.008 | pass |
| monza | 2026 | 5793.0 | 5759.499 | 99.422 | pass |

No track is outside 2%. Le Mans has an official map but no model geometry and contributes no lap. All 33 class-track-year share checks pass; the maximum is 1.946333 pp (LMGT3, Monza 2026). All 99 dry selected laps have valid sector sums. Austin 2025 contributes 9 wet laps and remains excluded under the existing external exclusion list. The frozen JSON includes every signed sector-share difference and every row decision.

| Class | Season | Eligible sector laps | Held-out tracks with sectors | Positioned traps |
|---|---|---|---|---|
| lmh | 2025 | 15 | 5 | 0 |
| lmdh | 2025 | 15 | 5 | 0 |
| lmgt3 | 2025 | 15 | 5 | 0 |
| lmh | 2026 | 18 | 6 | 0 |
| lmdh | 2026 | 18 | 6 | 0 |
| lmgt3 | 2026 | 18 | 6 | 0 |

These counts apply to b1/b2/b4; baseline has no sector term because the flag is off. Every group has at least 4 eligible held-out tracks (the gate itself retains its existing settings). Timing71 rows have no verified mapping and keep lap + trap only, including the 3 extra rows used by baseline LMDh 2025. Fixed eligibility SHA-256: `72e2e2e866bbf2c964a7d774692f6db02bfd88d1e946252cd8b960ea05c0ad13`.

### 16.2 Primary result — baseline versus b2

| Group | n | Baseline RMS % | b2 RMS % | Delta pp | Gate |
|---|---|---|---|---|---|
| wec | 33 | 1.321 | 1.329 | +0.008 | rejected: worse on held-out rows |
| wec-lmh/2025 | 5 | 1.432 | 1.303 | -0.129 | rejected: gain within noise |
| wec-lmh/2026 | 6 | 1.041 | 0.978 | -0.063 | rejected: gain within noise |
| wec-lmdh/2025 | 5 | 1.238 | 1.418 | +0.180 | rejected: worse on held-out rows |
| wec-lmdh/2026 | 6 | 1.071 | 1.070 | -0.001 | rejected: gain within noise |
| wec-lmgt3/2025 | 5 | 1.733 | 1.799 | +0.066 | rejected: worse on held-out rows |
| wec-lmgt3/2026 | 6 | 1.370 | 1.353 | -0.017 | rejected: gain within noise |

| Variant | Class / season | Held-out RMS % | n | Fitted laps | muY | ClA | CdA | Bound hits | pooled.used | bop.used | gripSource.used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline | lmh/2025 | 1.432 | 5 | 15 | 1.568817 | 7.000000 | 1.086824 | clA upper | no | no | f1 |
| baseline | lmh/2026 | 1.041 | 6 | 18 | 1.518156 | 6.630406 | 0.963682 | none | no | n/a | transfer |
| baseline | lmdh/2025 | 1.238 | 5 | 18 | 1.561175 | 7.000000 | 1.099404 | clA upper | yes | no | transfer |
| baseline | lmdh/2026 | 1.071 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none | no | n/a | transfer |
| baseline | lmgt3/2025 | 1.733 | 5 | 15 | 1.590430 | 3.500000 | 1.286196 | clA upper | no | n/a | transfer |
| baseline | lmgt3/2026 | 1.370 | 6 | 18 | 1.615853 | 3.500000 | 1.300000 | clA upper; cdA upper | no | n/a | transfer |
| b2 | lmh/2025 | 1.303 | 5 | 15 | 1.563367 | 7.000000 | 1.074092 | clA upper | no | no | f1 |
| b2 | lmh/2026 | 0.978 | 6 | 18 | 1.583538 | 5.487790 | 0.962826 | none | no | n/a | transfer |
| b2 | lmdh/2025 | 1.418 | 5 | 15 | 1.552789 | 7.000000 | 1.087961 | clA upper | no | no | transfer |
| b2 | lmdh/2026 | 1.070 | 6 | 18 | 1.574303 | 5.652061 | 0.952068 | none | no | n/a | transfer |
| b2 | lmgt3/2025 | 1.799 | 5 | 15 | 1.584653 | 3.500000 | 1.266720 | clA upper | no | n/a | transfer |
| b2 | lmgt3/2026 | 1.353 | 6 | 18 | 1.611594 | 3.500000 | 1.288184 | clA upper | no | n/a | transfer |

RMS above is reconstructed from the stored held-out errors and observed laps, as used by exp-compare; calibration summary RMS is rounded to two decimals. `n/a` means no BoP/pooling candidate was evaluated, not a failed candidate. Full `pooled`, `bop` and `gripSource` objects, including candidate errors and gate reasons, are retained in results.json and each calibration artifact.

**Downforce did not move off its bound in any previously bound group.** LMH 2025 and LMDh 2025 remain at ClA=7; LMGT3 2025/2026 remain at ClA=3.5. The two 2026 Hypercar values fall but were already inside the bounds. LMGT3 2026 drag moves off CdA=1.3 to 1.288184. There are no new bound hits.

**One primary selection flips:** LMDh 2025 `pooled.used` changes true → false, and fitted laps change 18 → 15. No baseline/b2 `gripSource.used` or `bop.used` choice flips. The fixed sector eligibility does not change when these existing fit choices change.

F1 seasons and projections are structurally identical in every run; the JSON serialization of each is also identical. F1 held-out RMS stays 0.840% (2025, n=20) and 0.900% (2026, n=14). The gate reports equal values as “rejected: worse on held-out rows” because it requires a strict improvement; this is not an F1 regression. No gate logic was changed.

### 16.3 Sensitivity only — no weight selection

| Variant | Pooled WEC n | Pooled RMS % | Gate | Decision role |
|---|---|---|---|---|
| b1 | 33 | 1.319 | rejected: gain within noise | sensitivity only |
| b2 | 33 | 1.329 | rejected: worse on held-out rows | primary; rejected |
| b4 | 33 | 1.350 | rejected: worse on held-out rows | sensitivity only |

| Variant | Class / season | Held-out RMS % | n | Fitted laps | muY | ClA | CdA | Bound hits | pooled.used | bop.used | gripSource.used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| b1 | lmh/2025 | 1.304 | 5 | 15 | 1.564587 | 7.000000 | 1.083144 | clA upper | no | no | transfer |
| b1 | lmh/2026 | 0.954 | 6 | 18 | 1.554553 | 5.976520 | 0.964708 | none | no | n/a | transfer |
| b1 | lmdh/2025 | 1.450 | 5 | 15 | 1.556814 | 7.000000 | 1.098774 | clA upper | no | no | transfer |
| b1 | lmdh/2026 | 1.026 | 6 | 18 | 1.552049 | 6.033355 | 0.954753 | none | no | n/a | transfer |
| b1 | lmgt3/2025 | 1.793 | 5 | 15 | 1.586212 | 3.500000 | 1.272742 | clA upper | no | n/a | transfer |
| b1 | lmgt3/2026 | 1.329 | 6 | 18 | 1.615247 | 3.500000 | 1.292051 | clA upper | no | n/a | transfer |
| b4 | lmh/2025 | 1.471 | 5 | 15 | 1.557790 | 7.000000 | 1.065135 | clA upper | no | no | transfer |
| b4 | lmh/2026 | 1.013 | 6 | 18 | 1.585826 | 5.418620 | 0.952821 | none | no | n/a | transfer |
| b4 | lmdh/2025 | 1.501 | 5 | 15 | 1.550610 | 7.000000 | 1.082463 | clA upper | no | no | transfer |
| b4 | lmdh/2026 | 0.982 | 6 | 18 | 1.591197 | 5.364846 | 0.945055 | none | no | n/a | transfer |
| b4 | lmgt3/2025 | 1.783 | 5 | 15 | 1.579853 | 3.500000 | 1.242390 | clA upper | no | n/a | transfer |
| b4 | lmgt3/2026 | 1.306 | 6 | 18 | 1.604024 | 3.500000 | 1.228629 | clA upper | no | n/a | transfer |

b1 has accepted group gates for LMH 2026 (gain 0.087 pp), LMDh 2026 (0.045 pp), and LMGT3 2026 (0.041 pp). b4 has an accepted LMDh 2026 cell (0.089 pp). **All are under 0.1 pp and are not established at n=6.** Both sensitivity variants also worsen LMDh 2025 and LMGT3 2025. No sensitivity weight is promoted. LMH 2025 uses transfer grip in b1/b4, unlike baseline/b2; this sensitivity of the existing selection is reported, not tuned away.

### 16.4 Physical diagnostics

| Group | Matched traps n | Baseline trap RMS km/h | b2 trap RMS km/h | Delta km/h | WEC corner observations | New bound hits |
|---|---|---|---|---|---|---|
| wec-lmh/2025 | 5 | 10.020 | 9.999 | -0.022 | 0 / unavailable | 0 |
| wec-lmh/2026 | 5 | 3.366 | 3.633 | +0.267 | 0 / unavailable | 0 |
| wec-lmdh/2025 | 5 | 11.958 | 11.989 | +0.032 | 0 / unavailable | 0 |
| wec-lmdh/2026 | 5 | 3.411 | 3.538 | +0.127 | 0 / unavailable | 0 |
| wec-lmgt3/2025 | 5 | 5.804 | 5.577 | -0.227 | 0 / unavailable | 0 |
| wec-lmgt3/2026 | 6 | 8.291 | 8.368 | +0.077 | 0 / unavailable | 0 |

Trap (a) remains off: these residuals compare the simulated lap maximum with the measured trap, not speed at a known trap position. Their definitions are identical between variants, but they cannot validate physical drag accuracy. Four groups worsen on this metric. WEC corner minima have no measured observations; missing evidence is not a pass. F1 corner bias and trap RMS are exactly unchanged between variants on the fixed archive geometry. Section 15.4 lists the official documents that could supply numeric trap chainage; no pixel inference or new trap distance was introduced.

### 16.5 Doubled-iteration baseline diagnostic — not adopted

One further baseline used `LAPSIM_ITERS=140`, `LAPSIM_HOLDOUT_ITERS=50`, all timing flags off, the same production seed and pinned inputs. This is a diagnostic only. It does not replace the exact 70/25 production baseline and it is not used to accept b2.

| Variant | Class / season | Held-out RMS % | n | Fitted laps | muY | ClA | CdA | Bound hits | pooled.used | bop.used | gripSource.used |
|---|---|---|---|---|---|---|---|---|---|---|---|
| baseline140 | lmh/2025 | 1.076 | 5 | 15 | 1.568868 | 7.000000 | 1.086312 | clA upper | no | no | f1 |
| baseline140 | lmh/2026 | 1.046 | 6 | 18 | 1.517850 | 6.635010 | 0.963651 | none | no | n/a | transfer |
| baseline140 | lmdh/2025 | 1.259 | 5 | 15 | 1.560082 | 7.000000 | 1.104799 | clA upper | no | no | transfer |
| baseline140 | lmdh/2026 | 0.977 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none | no | n/a | transfer |
| baseline140 | lmgt3/2025 | 1.334 | 5 | 15 | 1.590303 | 3.500000 | 1.286063 | clA upper | no | n/a | transfer |
| baseline140 | lmgt3/2026 | 1.270 | 6 | 18 | 1.619744 | 3.500000 | 1.284389 | clA upper | no | n/a | f1 |

| Group | Delta held-out pp | Delta muY | Delta ClA | Delta CdA | 70/25 score | 140/50 score | Score change % |
|---|---|---|---|---|---|---|---|
| wec-lmh/2025 | -0.356 | +0.000051 | +0.000000 | -0.000512 | 4.912 | 4.912 | +0.000 |
| wec-lmh/2026 | +0.005 | -0.000306 | +0.004605 | -0.000031 | 0.956 | 0.956 | +0.000 |
| wec-lmdh/2025 | +0.021 | -0.001093 | +0.000000 | +0.005395 | 3.924 | 4.511 | +14.959 |
| wec-lmdh/2026 | -0.094 | +0.000000 | +0.000000 | +0.000000 | 1.057 | 1.057 | +0.000 |
| wec-lmgt3/2025 | -0.399 | -0.000127 | +0.000000 | -0.000133 | 2.584 | 2.584 | +0.000 |
| wec-lmgt3/2026 | -0.100 | +0.003891 | +0.000000 | -0.015611 | 2.880 | 3.529 | +22.535 |

The 140/50 diagnostic took 1108.3 s plus 0.9 s for validation. Pooled WEC RMS is 1.162% versus 1.321% at 70/25. The largest group change is LMGT3 2025, -0.399 pp; LMH 2025 changes -0.356 pp. LMDh 2025 changes pooled.used from true to false (18 to 15 fitted laps), and LMGT3 2026 changes gripSource from transfer to f1. Thus the displayed score deltas for those groups compare different selected fits, not the same fixed objective. Scores are saved rounded to three decimals; zero displayed change does not prove convergence. These movements show material held-out iteration sensitivity. No diagnostic values are adopted and the b2 rejection remains based only on the declared 70/25 comparison.

Iteration sensitivity is not the rule 5.1 proof that every main/held-out objective falls by less than 1% in its last two rounds. The WEC Nelder–Mead path does not record that per-fold history. No such convergence proof is claimed. This diagnostic is reported as requested and is not adopted.

### 16.6 Interlagos provenance and fixed-value replay

| Production piece | Interlagos geometry / evidence |
|---|---|
| F1 seasons 2023–2026 | Repository geometry: source year 2025, session 9865. Every F1 season equals the calibration in commit 9fb675e2. That commit also contains the exact current geometry blob 973641c280b0bc425758149667c892a5dd3d3d67. |
| Shared F1 Interlagos grip 0.9602 (drag 0.9914) | Same repository geometry and joint F1 fit. Only the 2025 season has a dry fitted Interlagos row; 2023/2024/2026 observations are marked rain and excluded. |
| B transfer Interlagos grip 0.9823 | Archive geometry: source year 2026, session 11408. Run 42558077604, B job 128968219459, unpacks the exported archive before calibration. Re-extracting all rounded track grip values from cal-B.js matches the production transfer table exactly. |
| PR #149 WEC cars | Archive geometry, as demonstrated by exact full reproduction in section 15.5 and again here. |

The repository geometry/calibration came from the Lap simulator data pipeline and is recorded in [commit 9fb675e2](https://github.com/MisterKinn/f1-data-analyst/commit/9fb675e2cb60de4ee5e2d395af5acabf45740e73), authored by kongboda-lapsim[bot] on 7 November at 21:17:13 UTC, committed at 22:16:49 UTC. [Its workflow](https://github.com/MisterKinn/f1-data-analyst/blob/9fb675e2cb60de4ee5e2d395af5acabf45740e73/.github/workflows/lapsim-data.yml) fetches data, tunes/builds geometry, fits cars, and commits derived files together. The exact original Actions run ID was not recovered; the commit and exact blob identity are the evidence.

The archive was generated separately by [export run 42544457411](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42544457411), started 9 November 01:13:59 UTC, using [workflow commit cdeca686](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/blob/cdeca686a164a9f4d45e605d81c7b04b07b7f1db/.github/workflows/probe-lapsim-export.yml). It fetched OpenF1 again and ran tune-geometry, then saved the archive in [commit a8f19241](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/commit/a8f19241e7bb9d91acddd42dc9204df82e1a241a) at 03:43:20 UTC. Both versions of build-geometry select the maximum available source year for each track, without filtering wet sessions for geometry. The export contains session 11408/2026; the earlier repository geometry records 9865/2025. This is a later input snapshot, not a different length-setting rule. The original raw index/fetch log was not recovered, so exactly why 11408 was unavailable to the earlier build is not established.

[B run 42558077604](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42558077604) used [workflow 3d21b2c9](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/blob/3d21b2c94c61a224065c2e79427dc832a7165c4e/.github/workflows/probe-lapsim-exp.yml): BCD 5 rounds / 200 iterations, lap 20, sector 2, teams on, prior 8, per-track drag off. The overall run was cancelled after other jobs timed out; **B itself succeeded** and uploaded its artifact. B source SHA-256 is `5c96aea699f06ae59fbf1c466e7305c2cbc9e83e45e373b5e6742b4799657072`.

The two lengths are 4230.354610 m (repository) and 4227.802814 m (archive). Curvature, grade, heading, F1 sector points, corners and map also differ. The other 25 track geometries are identical. The following replay holds cars, grip, weather and (for F1) drag/team/development values fixed. Positive error means slower than the real lap. F1 uses the saved rounded adjustment values, so sub-millisecond differences from saved fit times are expected.

| Group | Real lap s | Repository sim s | Error s | Archive sim s | Error s | Archive minus repo s |
|---|---|---|---|---|---|---|
| f1/2025 | 69.511 | 69.610 | +0.099 | 69.971 | +0.460 | +0.361 |
| wec-lmh/2025 | 82.948 | 82.625 | -0.323 | 82.848 | -0.100 | +0.222 |
| wec-lmh/2026 | 83.387 | 82.467 | -0.920 | 82.671 | -0.716 | +0.204 |
| wec-lmdh/2025 | 82.570 | 82.130 | -0.440 | 82.343 | -0.227 | +0.213 |
| wec-lmdh/2026 | 83.041 | 82.464 | -0.577 | 82.645 | -0.396 | +0.181 |
| wec-lmgt3/2025 | 93.849 | 92.735 | -1.114 | 92.833 | -1.016 | +0.099 |
| wec-lmgt3/2026 | 93.350 | 91.847 | -1.503 | 91.938 | -1.412 | +0.091 |

For completeness, excluded wet F1 observations are shown below. These are dry-model replays with the shared 2025 track factors, **not validation scores**; the model has no calibrated wet grip here.

| F1 year | Wet observed lap s | Repository dry-model error s | Archive dry-model error s |
|---|---|---|---|
| f1/2023 | 70.162 | +0.854 | +1.224 |
| f1/2024 | 83.405 | -13.154 | -12.818 |
| f1/2026 | 87.470 | -15.605 | -15.297 |

No F1 held-out row is Interlagos. A geometry swap cannot be assessed by reusing the saved held-out errors. Fresh F1 fitting/validation would be required in a separately approved model experiment.

| Option — owner decides | F1 effect | WEC effect | What remains unknown / required |
|---|---|---|---|
| Keep repository geometry; refit WEC | F1 values and geometry stay unchanged; 2025 replay error +0.099 s. | Existing isolated 70/25 refit: pooled 1.321% → 1.416%; LMDh 2025 1.238% → 1.611%. Gate rejects. | This result is not adopted. B factors were learned on archive geometry; consistent transfer-factor rebuilding may also be needed. Separate model PR/approval. |
| Adopt archive geometry globally | Fixed F1 2025 sim +0.361 s; error +0.099 → +0.460 s (about +0.519 pp). Other tracks unchanged at fixed values. | PR #149 values replay correctly; Interlagos sims become 0.091–0.222 s slower than repository geometry. | F1 refit and new held-out gate unknown; old saved held-out values cannot prove safety. Separate model PR/approval. |
| Explicit per-series geometry: repository for F1, archive for WEC | Fixed F1 replay unchanged: 0.000 s delta. | Restores the geometry used for PR #149; same 0.091–0.222 s correction and no refit needed to reproduce its stored numbers. | An engineering compatibility option, not proof that either line is physically better. Requires explicit per-series data/validation and separate approval; not implemented. |

### 16.7 Verification, artifacts and disposition

| Flags-off comparison against original source | Bytes | SHA-256 (same on both sides) |
|---|---|---|
| calibration | 55429 | `5d612afc8b13dc8018dba1718b9610d3b3e760821f3a4cb41eb6aaf17f10b5b0` |
| stdout | 5640 | `f02d6bfd89f152ebd7ab8d9a345416a9e9df1b1107e3c28c263d4f8bd268b433` |
| validation | 24754 | `202cedcac00754065e5e1ffbdb4066d35cdd836652d13c54241d49e0362d25c1` |
| validationStdout | 2038 | `464c43ba25eb4503924f2a46cfed8c6e026b042192998c1ab6e7df1359a06d66` |

Checks: original-source/full-production baseline identity passed (only generatedAt differs from the historical file); 416/416 tests passed with external fetch/socket access blocked, including raced-session reproduction; build and artifact validation passed. An initial unguarded full-suite attempt was blocked by automatic approval review for an unmocked collector.test logout fixture. The safe rerun used the saved offline guard and passed; application/collector code was not changed. Both timing flags default off. Trap remains held; aero ratio remains unimplemented. No new bounds, gate rules or production weights were installed.

Artifacts are in [scripts/sim/results/wec-sectors-2026-11-10](../scripts/sim/results/wec-sectors-2026-11-10/): all variant calibrations and logs, validation JSON, gate/physical comparisons, frozen eligibility, input/source hashes, exact baseline/byte checks, geometry replay, and test log. These are research outputs, not runtime model data. Full metadata and unrounded numbers are in results.json. The experiment manifest and the prepare/run/report/replay commands are committed with the code.

The code PR remains unmerged with flags off. No model PR, production geometry/calibration change, Vercel action, or deployment was performed. The next decision belongs to the owner: choose a geometry strategy before any production-model change.

## 17. WEC convergence ladder, geometry guard and consistent-baseline plan — 2026-11-10

### 17.1 A — fix the measurement settings first

**Result: none of the tested rungs meets the declared convergence check. No fitted value is adopted. b2 remains rejected and has not been judged again.**

This is deterministic iteration sensitivity, not variation between random runs. The owner approved the four-rung baseline ladder, including one exception to the 60-minute budget if needed. The stop is 280/200 even if it does not converge. The specific diagnostic criterion is: every class-season changes by less than 0.02 percentage points from the preceding rung and no pooled.used, bop.used or gripSource.used choice flips. The production gate itself is unchanged.

Inputs are the exact section 5.2 PR #149 recipe: archive geometry, original production seed, B transfer factors, existing wet exclusions and Timing71 rows. Input hashes are in the saved manifest. All runs are WEC only; all timing and physics flags are off; lap/trap weights stay at 2/0.5. There are 99 dry Al Kamel laps before optional Timing71 selection; n is 5 per class in 2025 and 6 in 2026. The two higher rungs ran in parallel. Their main-iteration limit is identical at 280; their held-out limits are 100 and 200.

The completed 70/25 and 140/50 runs were reused as authorized. An additional logging-off 70/25 run took 474.955 s plus 0.916 s validation and exactly reproduced production. Calibration, calibration stdout, validation JSON and validation stdout were byte-identical to the original-source control. F1 seasons and projections are unchanged in every rung.

| Rung (main/folds) | Pooled WEC RMS % | n | Fit wall time s |
|---|---|---|---|
| 70/25 | 1.321050 | 33 | 435.500 |
| 140/50 | 1.162445 | 33 | 1108.300 |
| 280/100 | 1.156973 | 33 | 1380.641 |
| 280/200 | 1.128121 | 33 | 1430.624 |

Run times are total wall time per rung, including parallel CPU contention. Separate per-group wall times were not instrumented. The older two runs have no per-iteration log; no history is invented for them.

| Rung | Class / season | Held-out RMS % | n | Fitted laps | muY | ClA | CdA | Bound hits | pooled | bop | gripSource |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 70/25 | lmh/2025 | 1.432493 | 5 | 15 | 1.568817 | 7.000000 | 1.086824 | clA upper | no | no | f1 |
| 70/25 | lmh/2026 | 1.040859 | 6 | 18 | 1.518156 | 6.630406 | 0.963682 | none | no | n/a | transfer |
| 70/25 | lmdh/2025 | 1.238337 | 5 | 18 | 1.561175 | 7.000000 | 1.099404 | clA upper | yes | no | transfer |
| 70/25 | lmdh/2026 | 1.070598 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none | no | n/a | transfer |
| 70/25 | lmgt3/2025 | 1.733498 | 5 | 15 | 1.590430 | 3.500000 | 1.286196 | clA upper | no | n/a | transfer |
| 70/25 | lmgt3/2026 | 1.369955 | 6 | 18 | 1.615853 | 3.500000 | 1.300000 | clA upper; cdA upper | no | n/a | transfer |
| 140/50 | lmh/2025 | 1.076235 | 5 | 15 | 1.568868 | 7.000000 | 1.086312 | clA upper | no | no | f1 |
| 140/50 | lmh/2026 | 1.045749 | 6 | 18 | 1.517850 | 6.635010 | 0.963651 | none | no | n/a | transfer |
| 140/50 | lmdh/2025 | 1.259421 | 5 | 15 | 1.560082 | 7.000000 | 1.104799 | clA upper | no | no | transfer |
| 140/50 | lmdh/2026 | 0.976933 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none | no | n/a | transfer |
| 140/50 | lmgt3/2025 | 1.334272 | 5 | 15 | 1.590303 | 3.500000 | 1.286063 | clA upper | no | n/a | transfer |
| 140/50 | lmgt3/2026 | 1.270218 | 6 | 18 | 1.619744 | 3.500000 | 1.284389 | clA upper | no | n/a | f1 |
| 280/100 | lmh/2025 | 1.076810 | 5 | 15 | 1.569573 | 7.000000 | 1.093458 | clA upper | no | no | transfer |
| 280/100 | lmh/2026 | 1.061336 | 6 | 18 | 1.517850 | 6.635010 | 0.963651 | none | no | n/a | transfer |
| 280/100 | lmdh/2025 | 1.270150 | 5 | 15 | 1.560082 | 7.000000 | 1.104799 | clA upper | no | no | transfer |
| 280/100 | lmdh/2026 | 0.983982 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none | no | n/a | transfer |
| 280/100 | lmgt3/2025 | 1.353481 | 5 | 15 | 1.590303 | 3.500000 | 1.286063 | clA upper | no | n/a | transfer |
| 280/100 | lmgt3/2026 | 1.195955 | 6 | 18 | 1.619744 | 3.500000 | 1.284389 | clA upper | no | n/a | f1 |
| 280/200 | lmh/2025 | 1.076304 | 5 | 15 | 1.569573 | 7.000000 | 1.093458 | clA upper | no | no | transfer |
| 280/200 | lmh/2026 | 1.061336 | 6 | 18 | 1.517850 | 6.635010 | 0.963651 | none | no | n/a | transfer |
| 280/200 | lmdh/2025 | 1.269795 | 5 | 15 | 1.560082 | 7.000000 | 1.104799 | clA upper | no | no | transfer |
| 280/200 | lmdh/2026 | 0.983982 | 6 | 18 | 1.528597 | 6.446839 | 0.953795 | none | no | n/a | transfer |
| 280/200 | lmgt3/2025 | 1.353157 | 5 | 15 | 1.590303 | 3.500000 | 1.286063 | clA upper | no | n/a | transfer |
| 280/200 | lmgt3/2026 | 1.034453 | 6 | 23 | 1.608017 | 3.500000 | 1.295287 | clA upper | yes | n/a | transfer |

Errors above are reconstructed from stored held-out errors rounded to 0.001 s, rather than the saved RMS rounded to two decimals. Full car values are in results.json. The comparison is level B (class-unseen) and does not measure a wholly unseen track.

| Transition | Group | Delta error pp | Choice flips | Pass (<0.02 pp and no flip) |
|---|---|---|---|---|
| 70/25 to 140/50 | lmh/2025 | -0.356258 | none | no |
| 70/25 to 140/50 | lmh/2026 | +0.004890 | none | yes |
| 70/25 to 140/50 | lmdh/2025 | +0.021084 | {"pooled":true,"bop":false,"gripSource":"transfer"} to {"pooled":false,"bop":false,"gripSource":"transfer"} | no |
| 70/25 to 140/50 | lmdh/2026 | -0.093665 | none | no |
| 70/25 to 140/50 | lmgt3/2025 | -0.399226 | none | no |
| 70/25 to 140/50 | lmgt3/2026 | -0.099737 | {"pooled":false,"bop":null,"gripSource":"transfer"} to {"pooled":false,"bop":null,"gripSource":"f1"} | no |
| 140/50 to 280/100 | lmh/2025 | +0.000576 | {"pooled":false,"bop":false,"gripSource":"f1"} to {"pooled":false,"bop":false,"gripSource":"transfer"} | no |
| 140/50 to 280/100 | lmh/2026 | +0.015587 | none | yes |
| 140/50 to 280/100 | lmdh/2025 | +0.010729 | none | yes |
| 140/50 to 280/100 | lmdh/2026 | +0.007049 | none | yes |
| 140/50 to 280/100 | lmgt3/2025 | +0.019209 | none | yes |
| 140/50 to 280/100 | lmgt3/2026 | -0.074262 | none | no |
| 280/100 to 280/200 | lmh/2025 | -0.000506 | none | yes |
| 280/100 to 280/200 | lmh/2026 | +0.000000 | none | yes |
| 280/100 to 280/200 | lmdh/2025 | -0.000355 | none | yes |
| 280/100 to 280/200 | lmdh/2026 | +0.000000 | none | yes |
| 280/100 to 280/200 | lmgt3/2025 | -0.000324 | none | yes |
| 280/100 to 280/200 | lmgt3/2026 | -0.161503 | {"pooled":false,"bop":null,"gripSource":"f1"} to {"pooled":true,"bop":null,"gripSource":"transfer"} | no |

For 280/100 versus 280/200, unchanged choices are also checked to give exactly identical main-fit car values. A changed selection can change the main-fit training rows or track factors despite the same iteration limit. This is reported rather than hidden.

Optional logging uses LAPSIM_OBJECTIVE_LOG=<new JSONL path>. It records the objective before each Nelder–Mead iteration and at exit, by class-season, candidate (F1 grip, transfer grip, pooled Timing71, BoP or main), fold and start. There is one initial start and no restart loop in the current optimizer; every record therefore has restart: 0. No restart was added. The observer adds no objective evaluations and writes no stdout; tests compare the exact objective-call sequence and prediction bytes with logging on and off. Existing log paths are refused to protect evidence.

All objective histories for the new rungs are saved in compact lossless form with metadata, columns, final vectors and raw JSONL hashes. A small change in the final optimizer step alone is not used as proof of convergence. The predeclared adjacent-rung rule above is the decision rule.

Validation: 419/419 offline tests passed, including raced-session reproduction. Build and artifact validation passed. Runtime model files, bounds and gate are unchanged. Artifacts: [wec-ladder-2026-11-10](../scripts/sim/results/wec-ladder-2026-11-10/). Commands: node scripts/sim/run-wec-ladder.mjs, then node scripts/sim/report-wec-ladder.mjs and node scripts/sim/archive-wec-ladder.mjs. The runner refuses to overwrite a prior run directory.

The limiting group is LMGT3 2026: RMS changes from 1.195955% at 280/100 to 1.034453% at 280/200 (-0.161503 pp). gripSource changes from f1 to transfer; pooled.used changes from false to true; fitted laps rise from 18 to 23. The other five groups change by at most 0.000506 pp without a choice flip. There is no converged rung for all six groups. No run beyond 280/200 is authorized or performed. In unchanged F1-grip candidate folds, the objective still falls by 6.799% for LMGT3 2025/Spa and 6.686% for LMGT3 2026/Monza between 100 and 200 iterations. The full fold histories therefore also show why a flat-looking pooled number is insufficient.

### 17.2 B — weather confirmed; guard blocked by a requirement conflict

Direct OpenF1 requests on 10 November 2026 returned HTTP 200. Session metadata confirms both are Interlagos Qualifying sessions. The existing pipeline marks a session as rain when any session weather observation has rainfall > 0; these counts use that exact criterion, not an inference from slow laps.

| Geometry source | Session | OpenF1 weather rows | Rows with rainfall > 0 | Classification |
|---|---|---|---|---|
| Interlagos archive, 2026 | [11408](https://api.openf1.org/v1/sessions?session_key=11408) | 160 | 106 | wet |
| Interlagos repository, 2025 | [9865](https://api.openf1.org/v1/sessions?session_key=9865) | 82 | 0 | dry by the pipeline criterion |

Weather sources: [11408](https://api.openf1.org/v1/weather?session_key=11408), [9865](https://api.openf1.org/v1/weather?session_key=9865). Response hashes, observation windows and counts are saved in geometry-weather-evidence.json. All 10 cached derived traces for 11408 have rain=true; all 10 for 9865 have rain=false. The archive is not a dry-session source.

**Owner decision now applies: retain the repository Interlagos geometry (9865/2025), one geometry for every series. The per-series geometry option in section 16 is rejected. No geometry data has been changed.**

At canonical main 309fdfd8, [build-geometry.mjs](https://github.com/MisterKinn/f1-data-analyst/blob/309fdfd8e214c5089072bcc5c06e51892bf63790/scripts/sim/build-geometry.mjs) chooses the maximum year per circuit before inspecting session weather. With the currently available sessions, it selects 11408/2026. The [Lap simulator data workflow](https://github.com/MisterKinn/f1-data-analyst/blob/309fdfd8e214c5089072bcc5c06e51892bf63790/.github/workflows/lapsim-data.yml) fetches 2023–2026 and invokes tune-geometry, which invokes this builder. Thus the next successful rebuild with these inputs would generate the unwanted Interlagos replacement.

**Publication detail:** the scheduled/manual workflow pushes a lapsim/refresh-YYYYMMDD branch, not main; a push-triggered run writes its lapsim/** branch. The current workflow does not itself publish this geometry to production. This is an unreviewed geometry change waiting in generated refresh output if it is later merged without review, not an automatic direct-main change. The schedule is Tuesday 12:17 Korea time. The workflow was inspected, not edited or triggered.

A repository-wide audit then found that three existing production track geometries already point to rain-marked sessions. Direct OpenF1 rainfall requests confirmed the cached labels:

| Existing track | Current source | Rain observations / all | Latest dry source in the pinned trace inventory |
|---|---|---|---|
| Las Vegas | 9854 / 2025 | 34 / 85 | 9640 / 2024 |
| Montreal | 11287 / 2026 | 1 / 76 | 9959 / 2025 |
| Zandvoort | 11349 / 2026 | 5 / 77 | 9916 / 2025 |

Sources: [9854 weather](https://api.openf1.org/v1/weather?session_key=9854), [11287 weather](https://api.openf1.org/v1/weather?session_key=11287), [11349 weather](https://api.openf1.org/v1/weather?session_key=11349). A rain-marked session does not establish that every selected lap was wet; the requested guard is based on the session flag, and must still exclude these sessions. The dry alternatives above are inventory classifications, not newly rebuilt geometries.

**Stop under section 5.3:** a successful dry-only rebuild for every track cannot also reproduce today's entire repository geometry byte for byte. These three source identities must change or the tracks must disappear; even identical coordinates would still change year/session metadata. Keeping the old wet-source geometry silently would be an undocumented exception to the requested all-track exclusion. Installing replacement geometry would be an unapproved model change. Neither was done.

There is also a reproducibility limitation: the pinned archive contains derived tracks/traces, not index.json and the raw session position files. Fresh fetches choose 14 geometry drivers only for the latest year, but 10 trace drivers for older years in this workflow. Interlagos 9865's current geometry used 14 laps. Filtering only in build-geometry after a fresh fetch could therefore leave fewer fallback laps and no year-specific MultiViewer corners. A successful byte-identical dry rebuild cannot be claimed from the available derived archive alone.

**Concrete guard proposal for owner review (not implemented):** preflight every indexed session against its rain marker, raw rainfall samples and the series-appropriate wet-sessions.json entries. Skip wet candidates. If that exclusion would invalidate an existing track's source and require replacing its geometry, abort before writing either tracks or traces, list the affected tracks, and leave both files byte-identical. Do not grandfather wet sessions or install older dry geometry silently. A separate model review would approve replacements and their complete raw inputs.

Proposed tests for the separate small guard PR: rain-marked exclusion; wet-list exclusion even with rain=false; latest eligible dry selection across several circuits; all-wet input; rejected rebuild leaves both output hashes unchanged; dry-only fixture produces byte-identical output. **No guard implementation or separate guard PR was opened after discovering this conflict. Owner confirmation of fail-closed behavior is required before continuing B.**

### 17.3 C — conditional plan only; no consistent re-baseline run

This records the requested plan and its blockers. It is not a run authorization. There is no converged all-group rung from A, so M/H below is deliberately unset. It must not default to 280/200. The geometry guard conflict above also remains open.

Inputs for the future paired experiment:

- Pin canonical production commit 309fdfd8 and the original production calibration (SHA-256 47e7c24a6df9bc67fd59dcd4fa0de6ffee290cfc02810d1e6742bca901f39586).
- Use the single repository tracks-data.js for every arm and series: SHA-256 fe67d1ecf2a4c151f35f98e3da334d835881904ffb4ebda24488983952cee5eb. Do not adopt the archive geometry or a per-series override.
- Keep the recorded PR #149 WEC, wet exclusions, Timing71 and BoP inputs unchanged. Existing B table SHA-256 b2d3bba7113685d1382415b4717bd26a6df2aa73f4664c0c88e64068d08e3705 is the control table. The rebuilt B table gets a new recorded hash, not a guessed one.
- Rebuild F1 speed traces on the same repository geometry from the complete original raw inputs before rebuilding B. The archive traces were projected onto archive geometry; simply copying them would leave another geometry mismatch. Recover/pin the required raw positions and corner files first; do not substitute a reduced driver sample. If exact trace/geometry reproduction is unavailable, stop before fitting.
- Keep production F1 car values, shared track factors, model bounds and all objective weights unchanged in the deployed reference. B's experimental F1 fit supplies transfer factors only and is never installed as the production F1 model.

| Arm | Geometry | Transfer factors | WEC fit and held-out settings | Role |
|---|---|---|---|---|
| Frozen production reference | repository | current B | saved production cars; fixed-value replay | actual production errors and physical diagnostics, not a new held-out fit |
| Control re-evaluation | repository | current B | same owner-approved converged M/H | current production inputs re-evaluated at a common numerical setting |
| Consistent candidate | repository | B rebuilt on repository geometry and matching traces | identical M/H | candidate for comparison; never installed by the experiment |

This separates frozen-production replay from refitted held-out evaluation. Both fit arms use identical geometry, source rows, selection procedure, M/H and weights except the transfer table under test. Their held-out folds are refitted at the same converged setting; the old stored 70/25 RMS is not used as the numerical gate baseline. Changes from the frozen production car values are reported separately. This interpretation of the paired baseline must be approved before execution; no claim of exact historical production reproduction is made for a refit on different geometry/settings.

Proposed commands in isolated snapshots, after input reconstruction and after M/H has been approved (POSIX notation; clear every other LAPSIM_* override):

```sh
# Rebuild B from matching repository geometry/traces. This is not a production F1 replacement.
LAPSIM_SKIP_WEC=1 LAPSIM_FITTER=bcd LAPSIM_ROUNDS=5 LAPSIM_BCD_ITERS=200 \
LAPSIM_WTIME=20 LAPSIM_WSECTOR=2 LAPSIM_TRACK_DRAG=off LAPSIM_TEAMS=on LAPSIM_WPRIOR=8 \
node scripts/sim/calibrate.mjs
# Save the resulting B calibration as an artifact, then in the candidate snapshot:
node scripts/sim/transfer-grip.mjs B-repository-geometry.js 'B rebuilt on pinned repository geometry'
# Restore the unchanged production F1 seed in both WEC snapshots before the next command.
# M and H remain unset: A did not establish a converged rung.
: "${M:?No approved converged main-iteration setting}"
: "${H:?No approved converged fold-iteration setting}"
LAPSIM_ONLY=wec LAPSIM_ITERS="$M" LAPSIM_HOLDOUT_ITERS="$H" \
LAPSIM_WEC_TRAP_POSITION=off LAPSIM_WEC_SECTORS=off LAPSIM_OBJECTIVE_LOG=objectives.jsonl \
node scripts/sim/calibrate.mjs
node scripts/sim/validate.mjs control-or-candidate
node scripts/sim/exp-compare.mjs control.js candidate.js
```

Before these shell commands, enforce non-empty validated M/H and all pinned hashes; the calibration script otherwise defaults empty variables to 70/25. Run the two WEC arms in parallel only after B is built and their inputs are frozen. Do not choose another iteration count or transfer setting from candidate held-out results. Report pooled and per-class-season held-out results, n, all car values and bounds, selection flips, corner/trap diagnostics, unchanged F1 replay, and current-production versus candidate Interlagos errors. Acceptance needs the unchanged gate on pooled WEC, no class-season worse, F1 unchanged, and the physical checks; a sub-0.1 pp gain at n=5/6 remains unestablished. A model PR requires a separate owner review of that result.

Runtime estimate, not a promise: the historical B job took about 3 h 36 min on GitHub Actions; allow roughly 3–4 h for its reconstruction/fit, plus data recovery. The new WEC 280/100 and 280/200 runs took 23.0 and 23.8 min wall time in parallel on this PC. A future converged M/H is unknown, so the WEC phase has no firm estimate; 25–40 min at comparable cost is only a planning range. Overall allow approximately 3.5–5 h plus input recovery, subject to the final settings. This would require its own budget approval; the one-time exception granted for A is not reused. No part of this re-baseline experiment was run.

### 17.4 Open questions — not tasks or additional run authorizations

- Hypercar 2025 trap RMS is about 10–12 km/h versus about 3.4 km/h in 2026, and 2025 downforce is at its upper bound. Per-event BoP was rejected at 70/25. Once the measurement settings are stable, would a separately controlled BoP re-test explain the difference? The current lap-maximum/trap mismatch still limits the physical interpretation. No separate BoP re-test was started.
- All WEC classes are too fast at Interlagos on both geometries, up to about 1.5 s for LMGT3. The shared Interlagos factor is supported by one dry F1 season only. Does that factor transfer across classes, or does it absorb another missing effect? This is an open question, not authorization to change the factor.

Disposition: A stopped at the approved ceiling; B stopped at the explicit requirement conflict; C is a blocked conditional plan. Diagnostic code and results are backed up in PR #154. No production geometry/calibration change, model PR, merge, workflow trigger or Vercel action was performed.


## 18. Owner decisions: geometry guard, tolerance yardstick, consistent candidate (2026-11-10)

This section supersedes the blocked disposition in section 17. The owner authorized these steps in order, with no adoption, model PR, merge or Vercel action. b2 remains rejected; trap and aero-ratio experiments remain on hold.

### 18.1 Geometry guard

Separate draft PR: https://github.com/MisterKinn/f1-data-analyst/pull/155 . It chooses the latest session with zero rain observations for each track, retaining existing geometry with a named warning if no eligible source exists. Missing weather is not zero-rain evidence. The owner explicitly deferred Las Vegas, Montreal and Zandvoort. Existing source identities retain their existing geometry bytes. Fetching also obtains full geometry-driver positions and matching-year corners for older sources. Trace projection uses the retained source, driver count and original projection settings.

All 26 repository geometry records are byte-identical in the builder retention integration fixture; Interlagos remains session 9865. Six guard tests pass, including all three requested cases. The latest guard commit, 34451d4bd01b14df57e8fa0ef2fd0d2b37a5cefd, passed the GitHub test check. This is not a claim that the complete raw telemetry pipeline was rerun. Detailed evidence and source links are in the separate PR's docs/lapsim-geometry-guard.md.

| Track | Source / year | Rain observations | Latest verified zero-rain alternative | Source fastest classified lap vs nearby dry pole | Decision |
|---|---|---|---|---|---|
| Las Vegas | 9854 / 2025 | 34/85 = 40% | 9640 / 2024: 0/98 | 107.934 vs 92.312 s (2024), 92.726 s (2023); +16.92% vs 2024 | Not dry-pole pace; retain under owner hold |
| Montreal | 11287 / 2026 | 1/76 = 1.32% | 9959 / 2025: 0/85 | 72.578 vs 70.899 s (2025); +2.37% | Dry-like pace plausible, not proven across 2026 car rules; retain |
| Zandvoort | 11349 / 2026 | 5/77 = 6.49% | 9916 / 2025: 0/78 | 71.163 vs 68.662 s (2025), 69.673 s (2024); +3.64% vs 2025 | Dry-like pace plausible, not proof of a dry session; retain |

Sources are OpenF1 weather?session_key=ID and session_result?session_key=ID under https://api.openf1.org/v1/ (queried 2026-11-10). The comparison uses minimum classified qualifying segment time and the pole winner's Q3 time, not unfiltered/deleted laps. Interlagos 11408 has 106/160 rain observations (66.25%); 9865 has 0/82. Without the guard, the next existing workflow would build from 11408 and push a refresh branch for review. It does not automatically replace main. No workflow was manually triggered.

### 18.2 Tolerance diagnostic — declaration before fitting

Two baseline variants, 1e-4 and 1e-6, factor 100 apart, use a cap of 2000 for both main fits and all folds. Stop only when the best-objective change over 10 iterations / max(1, absolute current best) and the largest log-parameter coordinate distance from the best simplex vertex are both below the tolerance. One deterministic initial simplex; no new restarts. The old rule remains unchanged when LAPSIM_WEC_NM_TOL is unset. LAPSIM_WEC_NM_CAP defaults to 2000.

Inputs are the exact PR #149 archive geometry, production seed and B transfer table, with the section 5.2 hashes checked before each isolated run. WEC only; timing flags off; lap weight 2 and trap weight 0.5. The looser tolerance is predeclared as R, never selected by held-out error. Stability requires all group RMS differences below 0.02 pp and no pooled/bop/gripSource flip. If only LMGT3 2026 fails, retain the owner's unstable label for that group and continue for the other five; if more than one fails, stop before the candidate. The step budget is 90 minutes. The runner uses 85 minutes after implementation/testing time and runs both tolerances plus an unset-flag 70/25 byte-identity control in parallel.

Command: node scripts/sim/run-wec-tolerance.mjs ; then node scripts/sim/report-wec-tolerance.mjs . The manifest and full-precision objective logs are under .cache/wec-tolerance during execution. No production file is overwritten. The full offline test suite passed 425/425, including raced-session reproduction. **Completed: all six groups pass. R = 1e-4, cap 2000.** Pooled RMS is 1.128290926% at R and 1.128032900% at 1e-6 (n=33). Runtime is 2189.383 s and 3260.580 s, respectively, in parallel with the identity control. The maximum group change is 0.001060723 pp; there are no choice flips, main cap hits or fold cap hits. This is within the 90-minute step budget.

| Group | Tolerance | RMS % | n / fitted laps | muY / ClA / CdA | Bound hits | pooled / bop / gripSource | Main iterations | Fold iterations min–max / total | Cap-hit folds / attempts | Seconds |
|---|---|---:|---|---|---|---|---:|---|---|---:|
| wec-lmh/2025 | 1e-4 (R) | 1.076057 | 5 / 15 | 1.569600 / 7.000000 / 1.093433 | clA upper | false / false / transfer | 86 | 71–139 / 1978 | 0 / 21 | 542.7 |
| wec-lmh/2026 | 1e-4 (R) | 1.061361 | 6 / 18 | 1.517814 / 6.635400 / 0.963661 | none | false / not available / transfer | 94 | 57–116 / 1515 | 0 / 19 | 504.7 |
| wec-lmdh/2025 | 1e-4 (R) | 1.270997 | 5 / 15 | 1.560082 / 7.000000 / 1.104771 | clA upper | false / false / transfer | 83 | 70–108 / 1812 | 0 / 21 | 405.2 |
| wec-lmdh/2026 | 1e-4 (R) | 0.983821 | 6 / 18 | 1.528665 / 6.445898 / 0.953756 | none | false / not available / transfer | 80 | 65–112 / 1539 | 0 / 19 | 513.2 |
| wec-lmgt3/2025 | 1e-4 (R) | 1.353040 | 5 / 15 | 1.590291 / 3.500000 / 1.286130 | clA upper | false / not available / transfer | 84 | 83–164 / 1646 | 0 / 16 | 88.1 |
| wec-lmgt3/2026 | 1e-4 (R) | 1.034709 | 6 / 23 | 1.607948 / 3.500000 / 1.295448 | clA upper | true / not available / transfer | 124 | 83–156 / 2236 | 0 / 20 | 134.3 |
| wec-lmh/2025 | 1e-6 | 1.075763 | 5 / 15 | 1.569541 / 7.000000 / 1.093527 | clA upper | false / false / transfer | 158 | 107–211 / 2994 | 0 / 21 | 826.0 |
| wec-lmh/2026 | 1e-6 | 1.061814 | 6 / 18 | 1.517698 / 6.637300 / 0.963595 | none | false / not available / transfer | 170 | 91–196 / 2712 | 0 / 19 | 815.1 |
| wec-lmdh/2025 | 1e-6 | 1.269937 | 5 / 15 | 1.560087 / 7.000000 / 1.104788 | clA upper | false / false / transfer | 137 | 110–183 / 2795 | 0 / 21 | 678.2 |
| wec-lmdh/2026 | 1e-6 | 0.983578 | 6 / 18 | 1.528661 / 6.445959 / 0.953750 | none | false / not available / transfer | 106 | 92–217 / 2359 | 0 / 19 | 629.3 |
| wec-lmgt3/2025 | 1e-6 | 1.353058 | 5 / 15 | 1.590309 / 3.500000 / 1.286084 | clA upper | false / not available / transfer | 124 | 122–220 / 2364 | 0 / 16 | 80.5 |
| wec-lmgt3/2026 | 1e-6 | 1.034249 | 6 / 23 | 1.608032 / 3.500000 / 1.295257 | clA upper | true / not available / transfer | 174 | 122–247 / 3555 | 0 / 20 | 230.1 |

| Group | Tight minus loose (pp) | Choice flip | Stable |
|---|---:|---|---|
| wec-lmh/2025 | -0.000294415 | false | true |
| wec-lmh/2026 | 0.000452628 | false | true |
| wec-lmdh/2025 | -0.001060723 | false | true |
| wec-lmdh/2026 | -0.000242746 | false | true |
| wec-lmgt3/2025 | 0.000017565 | false | true |
| wec-lmgt3/2026 | -0.000459710 | false | true |

Iterations and cap counts include every F1/transfer/pooled/BoP candidate fold, not only selected folds. Full precision and all candidate errors are preserved in scripts/sim/results/wec-tolerance-2026-11-10/results.json. LMGT3 2026 is stable under the two tested tolerances; both choose pooled + transfer. Its new CdA is inside its bound, while ClA remains at 3.5. Thus the conditional unstable exception is not needed. This does not prove a unique physical solution.

Unset-flag control reproduced production exactly except generatedAt and matched the original-source calibration, validation JSON and stdout byte-for-byte. Runtime bootstrap stderr has a process ID and is excluded from byte comparisons. The gate and all 44 production runtime files remain unchanged. Identity hashes, tests, validation, full objective logs (lossless gzip) and source hashes are archived alongside the results. The latest code checkpoint also passed GitHub tests.

LMGT3 2026's **production** car is at ClA=3.5 and CdA=1.3. Earlier higher-iteration fits had CdA slightly inside its bound. Later tables must show actual bound hits rather than assume every fitted candidate remains at both bounds.

### 18.3 Consistent candidate

Step 2 established R for all six groups. The following comparison was declared before candidate fitting. Repository geometry everywhere; rebuild B with production F1 settings and per-track drag off; restore unchanged production F1 seasons before WEC fitting. Current control and candidate are both measured at R. The candidate is not adopted. Pass requires raced-session reproduction, unchanged F1 seasons and pooled WEC no worse. The geometry/projection inputs must match; archive Interlagos traces cannot silently be reused on repository geometry.

A prior geometry-only difference moved LMDh 2025 by 0.37 pp. With n=5 or 6, an apparent gain below about 0.1 pp remains unestablished even if the gate accepts it. This caution will be repeated next to the result. The two open questions in section 17.4 remain questions, not additional experiments.


Step 3 execution declaration: current-configuration control = repository geometry + current B, refit/measured at R; candidate = repository geometry + rebuilt B, refit/measured at R. Frozen production cars are replayed separately and are not confused with the refitted control. B uses LAPSIM_SKIP_WEC=1 LAPSIM_FITTER=bcd LAPSIM_ROUNDS=5 LAPSIM_BCD_ITERS=200 LAPSIM_WTIME=20 LAPSIM_WSECTOR=2 LAPSIM_TRACK_DRAG=off LAPSIM_TEAMS=on LAPSIM_WPRIOR=8; all other LAPSIM variables cleared. Run calibrate.mjs then transfer-grip.mjs on its isolated artifact. B rebuild estimated 3–4 hours from the historical job, followed by WEC fits at R. Timing flags off; WEC lap/trap weights remain 2/0.5. F1 production seasons/projections are restored unchanged before either WEC fit. Any telemetry projection replacement must match the same original measured laps and reproduce the retained geometry; no new fitting rows are silently added.

Input preparation passed: rebuilding source 9865 from 14 original laps / 3707 positions reproduces repository ds, length, sectors, kappa and grade exactly. The repository heading/map/corners are retained verbatim; only projection distance arrays are recovered. All 40 Interlagos trace identities and non-distance fields match the pinned archive exactly; all 845 other trace rows are unchanged. The three wet Interlagos seasons remain excluded. The new trace hash is 36a1f55ac59e73f05abf4144ea08d1c2cdb7d8b78854d7de19e99a83f4f64413. Derived distance overrides and the audit are saved under scripts/sim/results/wec-consistent-2026-11-10; raw API responses remain outside git. The run started 2026-11-10T11:19:02Z and was interrupted before either arm completed. See the stop below.


### 18.4 Step 3 stopped: historical audit scope, not an established model regression

At approximately 11:23 UTC, an expanded historical reproduction assertion failed on frozen production. The public WEC API selects only the latest calibrated season, so the audit selected older seasons in memory and restored the calibration afterward. It used all rows in wec-poles-data.js, which still contains Austin 2025 with rain=false. This was an audit-scope error: scripts/sim/data/wet-sessions.json already excludes 2025 Austin as wet, and it is absent from the fitted 2025 calibration tracks. The fitting input itself respected that exclusion.

| Group | Historical rows checked | Austin 2025 error (s) | Verified dry n | Maximum verified dry reproduction error (s) |
|---|---:|---:|---:|---:|
| LMH 2025 | 6 | +0.028 | 5 | 0.000 |
| LMH 2026 | 6 | not applicable | 6 | 0.000 |
| LMDh 2025 | 6 | +0.068 | 5 | 0.000 |
| LMDh 2026 | 6 | not applicable | 6 | 0.000 |
| LMGT3 2025 | 6 | +0.168 | 5 | 0.000 |
| LMGT3 2026 | 6 | not applicable | 6 | 0.000 |

The historical assertion used the existing reproduction tolerance of 0.0015 s. All 33 verified dry rows reproduce exactly at the public result precision; all three public latest-season groups pass. The three failed cases are outside the dry-session scope and outside the public historical selector (which does not exist). They do not establish a new production regression. No model value, test threshold, wet exclusion or gate was changed to resolve the failure.

Section 5.3 says to stop after a raced-session reproduction test fails. The B rebuild and control were stopped; B completed one round (score 37.3313), but produced no completed transfer table. The control produced no completed class-season report. The candidate arm had not started. There are therefore **no candidate held-out errors, car values, choices or candidate Interlagos replay errors to report**, and no candidate pass/fail decision. Partial logs are explicitly named partial and preserved; no values were adopted. The existing frozen-production Interlagos replay in section 16 remains historical evidence, not a new candidate comparison.

Resume decision requested: apply the existing wet-sessions.json exclusions to the historical audit, then rerun the same declared candidate at R in fresh isolated directories. Do not alter the production pole table or model in this code PR. All six tolerance groups remain stable; b2 remains rejected; no model PR, merge or Vercel action.


## 19. Approved restart and execution-environment interruption (2026-11-10)

The owner approved applying the existing manual wet exclusions and rain-marked-row exclusions to the historical audit. Add a shared exclusion path and a regression test that prevents the fit and audit from diverging. Dry raced rows must reproduce exactly; report n and maximum error. Austin 2025 must be listed separately as excluded wet data. This approval supersedes the decision request in section 18.4; no new approval to resume is required.

R = 1e-4 with cap 2000 is accepted as the standard for all future WEC experiments. Section 5.1 of lapsim-physics-rules.md now records the factor-100 tolerance comparison, <0.02 pp in every group, and no pooled/bop/gripSource choice flips.

The candidate and pass check are unchanged: repository geometry everywhere; rebuild B using production F1 settings with per-track drag off; refit WEC at R. Compare the current-configuration control and candidate at R, with frozen production replay separately identified. Report held-out RMS, n, fitted cars, bound hits, choices, dry raced-session reproduction and Interlagos replay per class-season. Pass requires exact dry reproduction, unchanged F1 seasons and pooled WEC no worse. No adoption, model PR, merge or Vercel action.

**Execution interruption:** the connected PC environment became unavailable while applying the shared-exclusion edit. The edit tool returned "Transport closed"; the subsequent shell check returned "No usable execution environment is available." Local edit persistence is unverified. No new test run or candidate restart is claimed. GitHub remains available, so this documentation update is saved to PR #154. On reconnection, inspect local files before applying edits again, add and run the exclusion regression test, verify frozen dry reproduction, and restart in fresh isolated directories while preserving the prior stopped artifacts. The earlier completed tolerance results remain valid; there is no new candidate result yet.


## 20. GitHub-only restart: shared dry scope and consistent candidate (2026-11-10)

Fresh checkout of PR #154 at df3d65819db9be74f5941ddda83d1b0a94a00841. Read canonical main AGENTS.md and physics rules first, then handoff sections 14–19 and PR #155 at 34451d4bd01b14df57e8fa0ef2fd0d2b37a5cefd. The latest handoff, the WEC tolerance stop implementation and section 5.1 convergence rule are present. No prior-PC files were used. The pinned archive downloaded from its recorded GitHub URL and matched SHA-256; all input checks are recorded in verified-inputs.json. The committed distance override and original measurements reproduce the prepared trace checksum before fitting. Node 22.23.4 is used.

Calibration and the historical audit now call the same splitWecSessions function, which reads wet-sessions.json and also excludes rain-marked rows. The integration test runs both real entry points on a small fixture, then changes the manual list and confirms both scopes change together. Raw observations and production pole tables are unchanged. Historical reproduction requires exact equality at the public result precision; the existing production test thresholds are unchanged.

| Frozen production group | Dry rows | Largest absolute reproduction error s | Wet rows excluded |
|---|---:|---:|---:|
| LMH 2025 | 5 | 0.000 | 1 (Austin) |
| LMH 2026 | 6 | 0.000 | 0 |
| LMDh 2025 | 5 | 0.000 | 1 (Austin) |
| LMDh 2026 | 6 | 0.000 | 0 |
| LMGT3 2025 | 5 | 0.000 | 1 (Austin) |
| LMGT3 2026 | 6 | 0.000 | 0 |
| Total | 33 | 0.000 | 3 |

Preflight: 427/427 offline tests pass; build and artifact validation pass. The first full-suite attempt could not import missing dependencies; after npm ci from the unchanged lockfile, all tests passed. This was an environment setup failure, not a reproduction failure. Section 5.1 already contains the requested factor-100, <0.02 pp and no-choice-flip rule, so no duplicate rule was added.

Execution declaration remains section 18.3: repository geometry for both arms; current B for control; production-settings F1 B rebuild without per-track drag for candidate; unchanged production F1 seasons/projections restored for WEC; R=1e-4, cap 2000 in both arms. Frozen production replay is separate. Timing flags stay off. The saved estimate remains 3–4 hours for B plus WEC; no shorter fit is substituted. Fresh output is .cache/wec-consistent-resume; prior partial artifacts are preserved. Run prepare-wec-consistent.mjs with the pinned archive, then run-wec-consistent.mjs. No adoption, model PR, merge or Vercel action.

At this checkpoint the candidate has not started. Results will be added here after completion or a stop condition.
