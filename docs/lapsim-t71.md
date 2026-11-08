# Timing71 ingestion and validation

This is evidence acquisition, not a completed calibration. No vehicle parameters
or public simulator output are changed by the collector.

Run `python3 scripts/sim/t71_collect.py --catalogue PATH`. The catalogue is a JSON
array from the archive API. Raw analysis files, selected metadata, per-session
audit records and a summary are written under ignored `.cache/lapsim/t71`.
Run `python3 tests/t71_quality_test.py` for the quality-rule regression checks.

The collector uses four download workers, caches successfully parsed JSON, limits
individual payload size and records SHA-256 provenance. A repeat run reuses raw
files. Failures are recorded separately; they are never counted as successful fits.

## Coverage

Series labels nominate candidates, not approved classes. Include Hypercar and GT3
entries across WEC, IMSA, GTWC/IGTC, DTM, GT Open, ADAC GT Masters, British GT,
24H Series, NLS/VLN/N24, Macau, Super Taikyu, regional mixed GT competitions,
ELMS, Asian LMS and Le Mans Cup. F1 and FE remain separate model families.
Older WEC/DTM/IMSA cars must not be treated as current Hypercar/GT3 solely because
the championship name matches. Porsche GT3 Cup is not automatically FIA GT3.
The broad candidate filter intentionally includes ambiguous mixed grids for
car-level review. Coverage of every eligible archive entry is not yet established.

Keep practice, qualifying and race distinct. Retain unknown session labels for
review. Do not reject a short recording based on the event's advertised duration.

## Quality decisions

- Retain immutable source bytes. Correct epoch seconds only when the recording
  interval uniquely identifies the seconds interpretation; log original and result.
- Reject non-finite/non-positive lap-time values from numeric use; keep their raw
  evidence. Hold unresolved timestamps rather than inventing timestamps.
- Preserve repeated lap numbers across qualifying phases and stints.
- Do not remove a lap because it is slow or the current model predicts it badly.
- Legacy analysis schemas are held for a version-specific adapter, not called
  corrupt. Current-schema structural validity does not prove physical validity.
- Flag, pit, weather, car class, generation, official result and train/validation
  split checks remain required before any fitting.

## Remaining implementation

Replay ZIP reconstruction is required for sectors, tyre fields and VFT. The current
collector downloads analysis JSON only. Implement legacy schema decoding against
Timing71 source definitions; cross-check candidate laps with official results;
establish class/year and track-layout mappings; then calibrate and independently
validate supported models. Keep raw-physics errors separate from empirical sector
corrections. Never claim zero error from replaying the calibration references.

Source: Timing71 archive (`https://archive.timing71.org`). Raw records are private
working evidence and must not be committed or republished with this code.
