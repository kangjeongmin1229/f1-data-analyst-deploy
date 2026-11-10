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
