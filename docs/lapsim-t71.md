# Timing71 ingestion and validation

This is evidence acquisition, not a completed calibration. No vehicle parameters
or public simulator output are changed by the collector.

Run `python3 scripts/sim/t71_collect.py --catalogue PATH`. The catalogue is a JSON
array from the archive API. Raw analysis files, selected metadata, per-session
audit records and a summary are written under ignored `.cache/lapsim/t71`.
Run `python3 tests/t71_quality_test.py` for the quality-rule regression checks.

Run `python3 scripts/sim/t71_prepare.py` to normalize available raw files offline.
It uses `t71_legacy.py` for the verified legacy wire layout and writes ignored
`normalized.jsonl` plus `normalized-summary.json`. Record identities include the
source session, car, stint and lap array index; repeated qualifying lap numbers
are not deduplicated. Explicit class labels nominate LMP2/Hypercar/LMGT3/GT3;
ambiguous PRO/AM/GTP and GT3 Cup labels remain unresolved. Nothing is fit-ready.
Test with `python3 tests/t71_legacy_test.py` and `python3 tests/t71_prepare_test.py`.
Legacy format definitions: timing71/livetiming-core commit
`ae85b4e386e4ce331a24a02a5faff9263f674128`, analysis/data.py,
analysis/__init__.py and racing.py. Missing per-lap timestamps/numbers/tyres are
not reconstructed from averages or sequential counters.

Use `--limit 150` for a bounded resumable batch. The limit applies to pending
records, not the start of the catalogue. Each completed session writes an audit
record and an atomic summary checkpoint. Successful current-version audits are
skipped on resume; failed downloads and older audits are retried. Incomplete log
lines after interruption are ignored. The execution environment can terminate a
process, so running a command is not evidence of continuous unattended operation.

The collector uses four download workers, caches successfully parsed JSON, limits
individual payload size and records SHA-256 provenance. A repeat run reuses raw
files. Failures are recorded separately; they are never counted as successful fits.
Transient HTTP 429/500/502/503/504 responses retry at most three attempts with
backoff and bounded Retry-After handling. Access-policy denial is not retried.

## Coverage

Series labels nominate candidates, not approved classes. Include Hypercar, LMP2 and GT3
entries across WEC, IMSA, GTWC/IGTC, DTM, GT Open, ADAC GT Masters, British GT,
24H Series, NLS/VLN/N24, Macau, Super Taikyu, regional mixed GT competitions,
ELMS, Asian LMS and Le Mans Cup. F1 and FE remain separate model families.
LMP2 was added to the work scope on 2026-11-08. Retain LMP2 entries from every
available race and its practice/qualifying sessions, including mixed WEC/Le Mans,
ELMS, Asian LMS and IMSA grids. Separate regulation era, chassis, engine, tyre and
series-specific restrictions. Do not equate LMP3, LMPC, DPi or Hypercar with LMP2.
The `lmgt3_candidate` acquisition label is a legacy series bucket, not a car-class
filter: LMP2 cars inside those raw files must be retained and extracted as well.
Remaining LMP2 tasks: archive coverage ledger, car/class mapping, official timing
cross-checks, bounded vehicle parameters, lap/sector/speed/stint validation and
independent event holdouts. LMP2 is requested but not yet implemented/calibrated.
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
