# Offline refinement of the existing calibrated model

The initial Timing71 pilot used PRIOR[2025]. Its errors do not describe the
currently calibrated car. `refine-t71.mjs` instead starts with `carsFor(track)`
and freezes existing per-track grip and drag. It changes only a shared lateral
grip multiplier, within +/-2% in 0.1 percentage-point steps. It calls the raw
physics kernel without the scenario's sector residual correction.

Run with local input data and a private output directory:

```bash
node scripts/sim/refine-t71.mjs /path/to/inputs.json /path/to/results
```

Inputs are an array of `{track, target, split, year, weather}`. Target is seconds,
split is `train` or `holdout`, year defaults to 2025, and weather uses
`conditionsFromWeather` fields. Use the same vehicle generation per experiment.
This tool does not certify the source data: missing weather uses the existing
kernel defaults and unknown fuel/setup remains an admission limitation.

Every grid point is saved atomically. A rerun reuses matching results and rejects
changed inputs, model files, runner or Node version. A lock rejects another
writer in the same output directory. After an interrupted process, confirm that
the original process is gone before removing a stale lock. This is not a
cross-computer lock or a guarantee of uninterrupted runtime.

## 2026-11-08 exploratory run

Three saved Piastri 2025 qualifying targets; Suzuka and Sakhir train, Jeddah held
out of this parameter selection. There were 41 grid points / 123 lap simulations.

| Track | Existing-model error | Candidate error |
|---|---:|---:|
| Suzuka | +0.983615% | +0.210689% |
| Sakhir | +0.269501% | -0.273018% |
| Jeddah | +0.969726% | +0.465286% |

The selected factor is 1.020, at the search boundary. The training RMS error is
0.243853%. Sakhir's absolute error slightly worsens. The candidate is **not
approved for production**, and the search range was not expanded. These inputs
remain held pending lap identity, setup/fuel and geometry provenance checks.
Suzuka uses 2026 geometry for a 2025 target. Existing geometry and calibration
may already contain information from these sessions, so Jeddah is not an
end-to-end independent validation. No 0.000% accuracy claim is justified.

The calibration pipeline now retains cases with errors above 4%, reports them
for investigation, and does not drop/refit them based on residual size alone.
Existing kernel equations and production calibration data are unchanged.

The run used Node 24.22.1; project-supported Node 22 and full regression checks
remain required before release. The previous wider local test attempt could not
load SOC/brake suites because `unpdf` was absent. The isolated kernel suite and
resume/locking/holdout-selection tests can run without that dependency.

Next: validate lap identity and geometry, add verified same-generation sessions,
then evaluate small parameter changes against a newly reserved validation set.
Large model changes require the user's decision; main deployment requires their
approval. Raw Timing71 inputs and private checkpoints must not be committed.
