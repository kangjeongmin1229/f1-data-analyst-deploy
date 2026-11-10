# WEC sector experiment, 2026-11-10

Research outputs only. Neither calibration nor geometry is installed in the runtime model.

Decision: reject b2 (pooled WEC 1.321% to 1.329%). b1/b4 are sensitivity only. baseline140 is a diagnostic only, not adopted.

See [handoff section 16](../../../../docs/lapsim-handoff-physics.md#16-approved-sector-experiment-and-geometry-investigation--2026-11-10) and [manifest](../../wec-timing-experiment.json) for settings, eligibility and source hashes. `results.json` contains full-precision group values. `checksums.json` covers the saved artifacts.

Reproduce using `node scripts/sim/run-wec-timing.mjs` with its prepare, baseline, sectors and diagnostic stages, followed by `node scripts/sim/report-wec-timing.mjs`; see the manifest and production recipe for input preparation. All variants must use the same frozen eligibility table.

Offline tests: `KONGBODA_FEATURES=all node --import ./.cache/no-external-network.mjs --test tests/*.test.mjs`. The saved guard is `offline-test-guard.mjs`; use its path if running from these artifacts.
