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

## WEC historical-input correction

`stint-fit.mjs` now resolves the requested year/class/track calibration rather
than using the latest car and latest available weather. Its energy cache includes
the year. Stored event grip is used with the car and weather that were fitted
together. Missing historical inputs are held with a reason, not substituted from
a later season. `LAPSIM_STINT_OUT` supports a private diagnostic output without
rewriting production data.

The offline rerun retained 29 BoP rows across 4 events and 26 estimated rows,
with zero rows held for missing context in this dataset. The fitted race factor
changed from about 0.857 to 0.851; event-holdout RMS changed from 3.74% to 3.81%.
This is a provenance correction, not an accuracy gain. No production parameter
file was regenerated. Same-year qualifying weather is still a race-weather
proxy, and inferred full-stint energy is not measured energy telemetry.

Validation: 24 isolated kernel/refinement/context tests passed. Full Node 22
regression and independent source validation remain pending.

## Broader 2025 telemetry validation

`ti-fit-inputs.mjs` builds private inputs from an existing TracingInsights season
checkout. It selects one driver's fastest eligible dry, green, accurately timed
SOFT qualifying lap per event. Deleted/generated laps, pit laps, unknown flags,
missing weather, and inconsistent sectors are held with reasons. Weather comes
from the selected lap, not a later timing snapshot. It does not filter on model
error. It requires same-year calibration and records geometry year separately.

```bash
node scripts/sim/ti-fit-inputs.mjs /path/to/2025 2025 PIA suzuka,sakhir,jeddah /path/to/new-input-directory
node scripts/sim/refine-t71.mjs /path/to/new-input-directory/inputs.json /path/to/new-results
```

The output directory must not already exist, protecting earlier splits. The
adapter references telemetry files but does not download or certify their bytes.
The private telemetry comparison additionally checks finite columns, strict
time/distance order, lap-duration coverage, source hashes and runtime/model hashes.

The expanded audit reviewed 458 lap records from 24 events and selected 22
observations with same-year track calibration. The original three tracks were
training inputs; 19 others were held out of this new selection. Six separate
parameter-family sweeps (+/-2%, one family at a time) covered 5,412 simulated laps.
The training-selected +2% lateral-grip candidate worsened holdout lap RMS from
0.9384225422% to 1.2608472135% and speed-shape RMS from 16.3454 to 16.4292 km/h.
It remains rejected for production. Five-fold diagnostic reuse also failed to
improve both lap and speed errors. Earlier calibration may already contain these
tracks; neither test is an independent full-pipeline validation.

Observed DRS states were checked against the provider's binary conversion in
its source code. Replacing inferred zones with observed DRS improves some laps
and worsens others. This is an input diagnostic, not a deployable prediction.
No observed speed, lap time or sector residual was inserted into model output.

Node 22.23.4: 65 existing lap-simulator tests and three new adapter tests passed.
The wider suite was blocked by automatic approval review after an unexpected
collector.test request. It is not reported as passing. Raw telemetry and private
checkpoints are excluded from this branch; main and Vercel are unchanged.

For a privately re-extracted WEC aggregate, set `LAPSIM_STINT_INPUT` together
with `LAPSIM_STINT_OUT` to compare it without replacing checked-in data.

The follow-up recovered 15 official race Analysis CSVs (125,805 rows across
all classes). Re-extraction retained 1,648 Hypercar pit-to-pit segments instead
of the previous 1,681; 730 complete segments were held for non-green/unknown
finish-line flags. This does not prove green conditions throughout each lap or
full refuelling. Four event-year groups (Le Mans and Fuji in both years) lack
geometry and are now explicitly held rather than silently skipped.

The private refit still has 29 BoP-linked rows over four events and 3.81% rounded
holdout RMS; estimated rows changed from 26 to 25. It now preserves unrounded
fit/validation values and each held-out error alongside existing rounded fields.
No new production calibration is admitted. All 69 focused Node 22 tests pass,
including private-input/output isolation and reconstruction of the raw RMS.
