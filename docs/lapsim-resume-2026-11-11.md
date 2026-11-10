# Lap-time validation resume — 2026-11-11 KST

The owner asked to resume the lap-time simulation from the other session.
The previous session ended all runs. This continuation reuses its two converged
main fits and two converged held-out folds per arm. It does not repeat rejected
WEC fits or change any model setting.

## Declaration before execution

- Baseline and candidate: the original Block 2 control and dry Las Vegas candidate.
- Source: `exp/lapsim-physics-night-2026-11-10`, commit
  `5a4978dcd10fdbd065752cb6f7279fd628b355f9` and its verified local snapshots.
- Same source session 9640, geometry, projected trace distances, rows, weather,
  priors, bounds, weights, teams and track drag as the original paired experiment.
- Each main/fold: minimum five and maximum ten BCD rounds, 200 inner iterations;
  final score decrease must be nonnegative and strictly below 1%.
- A new 60-minute continuation budget starts when the paired processes launch.
  At its end, retain complete round checkpoints and report incomplete validation.
- Main fits and complete folds are replayed from saved states. An interrupted
  round is discarded; continuation starts from the last complete round, using
  the existing warm-start API for all three fitted blocks.
- No settings are selected from held-out errors. The candidate already has a
  worse dry 2024 Vegas raw replay; finishing validation cannot erase that failed
  check. This continuation completes evidence, not an adoption attempt.
- Pass checks remain: both held-out seasons no worse, both dry Vegas rows no worse,
  every fit converged, no cap hits, exact dry raced reproduction, and unchanged
  production/runtime/gate and pinned input hashes. Acceptance also requires the
  standing physical checks and paired gate; this work authorizes no adoption.

The experiment-only wrapper is copied into isolated snapshots. Existing
`calibrate.mjs`, `joint-bcd.mjs`, runtime files and gate remain byte-identical in
the repository. A numerical test interrupts a real small BCD fit, resumes it,
and checks exact equality with the uninterrupted fit, including team adjustment
and track drag. Changed inputs and unverified legacy checkpoints must fail.

Before launch, 45 runtime/gate files and 12 pinned inputs matched their recorded
hashes. Production reproduced 39 dry F1 rows and 33 dry WEC rows with largest
absolute error 0 seconds. Austin 2025 remains separately excluded as wet.

Pre-launch checks: Node 22 full offline suite 436/436 passed; build and artifact
validation passed. The original production fitter has no repository diff.

## Run and evidence

Use Node 22 and the original local snapshot path:

```sh
node scripts/sim/resume-dry-vegas.mjs /path/to/original/.cache/night-session/vegas-fit
```

Derived checkpoints, progress, logs, source hashes and final report are saved in
`scripts/sim/results/vegas-resume-2026-11-11/` on this experiment branch.
The supervisor archives locally every five minutes and writes the final
complete/parked report. It has no upload or push operation. An integrity failure
stops this continuation; incomplete results are never labelled accepted.

The first launch was interrupted before any new fitting round was recorded:
shell Git had no write credential, and automatic approval review blocked
the bundled upload operation. The safer local-only runner retains the same
inputs and settings. Prior authorization to push after each block was separately
confirmed from the owner's original instruction; repository publication is
handled separately from the compute process.

No merge, production model update or Vercel action is part of this work.
