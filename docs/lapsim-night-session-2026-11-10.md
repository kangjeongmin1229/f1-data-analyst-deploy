# Physics follow-up session — 2026-11-10

No production adoption, merge or Vercel action. Experiments run in isolated copies. Current production is the baseline for every later block unless a declared model passes and is recorded in a separate draft model PR. No held-out result is used to choose a new setting.

## Block 0 — done: consistent candidate failed

All three arms had completed before the follow-up instruction arrived; their saved completion marker, input hashes, result hashes and production integrity checks were verified. No run was stopped, changed or restarted. The converged-B candidate failed the pooled WEC check, despite exact dry reproduction, unchanged F1 seasons/projections and no cap hits. The round-five secondary is diagnostic only: its B main fit fails the convergence rule. Current production remains the baseline for later blocks; no consistent-baseline model PR is opened. Production F1 also fails the convergence rule in its existing log; it was not rerun for this report.

| Check | Control | Candidate | Secondary |
|---|---:|---:|---:|
| Pooled WEC RMS %, n=33 | 1.166709 | 1.179080 | 1.094332 |
| B main rounds | — | 7 | 5 |
| Last B score decrease % | — | 0.344391 | 1.344223 |
| Dry WEC rows / maximum error s | 33 / 0 | 33 / 0 | 33 / 0 |
| Cap hits | 0 | 0 | 0 |
| Production F1 last two scores | 23.9813 → 23.6060 | unchanged | unchanged |
| Production F1 decrease % | 1.56497 — fails | — | — |

Detailed evidence: `scripts/sim/results/wec-consistent-rounds-2026-11-10/`, verified on PR #154 at `ca18431050c3bc9df0e48ff4fee7a76546b87d48`.

## Declared remaining blocks

| Block | Budget minutes | Baseline and pass rule |
|---|---:|---|
| 1: rules | 20 | Documentation only; preserve numerical rules and record the new authorization |
| 2: dry Las Vegas | 90 | Same-run production F1 fit on current versus dry-source geometry; converge main and folds; no worse F1 seasons or Las Vegas rows; exact reproduction |
| 3: WEC fixed inputs, BoP, sectors | 100 | Production configuration at R; each candidate tested separately against same-run control; pooled accepted and no class-season worse |
| 4: per-model Hypercar | 120 | Class base versus shrunk model offsets; same-run R; hide track and model; pooled accepted, no class-season worse, F1 unchanged |
| 5: measured gears | 60 | Measurement only; hidden-team gear validation; no kernel change |
| 6: review split and handoff | 30 | Core review branch has no runners/results or result files above 100 KB; handoff status at most 150 lines |

When a dependent fact cannot be verified, two pass checks fail, or a time box ends, park that block and continue. End the session for a production raced-session reproduction failure, a changed production runtime/gate hash, or an input hash mismatch. Every model change stays in a draft PR.

## Block 1 — done: working rules updated

Updated sections 3.3, 5.1 and 5.3, added the pre-approved actions, and replaced section 9 with current dated status. A missing dependent fact parks the affected block; the three session hard stops still end all work. Numerical convergence rules and the gate are unchanged. Model candidates remain isolated and require owner review before production adoption.

## Block 2 — declared before fitting

Control: repository geometry and its pinned matching trace distances. Candidate: only Las Vegas rebuilt from zero-rain qualifying session 9640; all Las Vegas laps projected onto that line with the existing builder. Measured speed, throttle, brake, lap times and sectors must match the pinned data. Other tracks and traces stay identical. Source downloader uses the existing ranking, best-lap selection, telemetry cleaning and weather rules.

| Setting | Value |
|---|---:|
| Geometry drivers / trace drivers | 14 / 10 |
| Position K / curvature K | 0.4 / 0.8 |
| Sigma / curvature smoothing / minimum sigma / distance step, m | 7 / 6 / 3 / 5 |
| F1 BCD iterations per round | 200 |
| Main and fold minimum / maximum rounds | 5 / 10 |
| Required last-round score decrease | non-negative and below 1% |
| Time / sector / prior weights | 20 / 2 / 8 |
| Per-track drag / teams | on / on |
| Held-out seasons | 2025, 2026 |

Both arms start from the same priors, bounds, rows and production settings. Each main fit and fold uses the same convergence rule; no settings are chosen from held-out errors. Pass requires both season errors and dry Las Vegas row errors not worse, exact raced reproduction and no cap hits. Wet Las Vegas rows are reported separately. Source or time-box failure parks this block without adoption.
