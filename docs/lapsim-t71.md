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
Legacy files missing static car metadata retain their lap arrays with unknown
class/make and explicit issues. Snapshot-only files are counted separately and
never expanded into invented lap history. Normalization commits rows only after
the entire session has parsed, and surfaces decoder issues in its summary.
Stint intervals outside the recording window remain held: an archive can carry
earlier sessions, so the filename's session type is not a verified lap assignment.

Run `python3 scripts/sim/t71_coverage.py --catalogue PATH` for an offline ledger of
every catalogue entry. `coverage.jsonl` distinguishes candidates, cached files,
and unmatched metadata requiring review. A series-name mismatch is not proof
that no eligible car competed. This ledger does not claim complete eligible coverage.

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
collector downloads analysis JSON only. Extend and validate the existing legacy
adapter as new schemas appear; cross-check candidate laps with official results;
establish class/year and track-layout mappings; then calibrate and independently
validate supported models. Keep raw-physics errors separate from empirical sector
corrections. Never claim zero error from replaying the calibration references.

Source: Timing71 archive (`https://archive.timing71.org`). Raw records are private
working evidence and must not be committed or republished with this code.

## Checkpoint: 2026-11-08

The offline inventory accounts for 15,798 catalogue records: 5,154 candidates,
310 cached candidate files, 4,844 uncached candidates, and 10,644 unmatched
metadata records still requiring scope review. Normalization reads all 310 cached
files, yielding 473,822 held lap records and no parse errors; 24 files yield no
lap history. Class-label candidates include 47,736 LMP2, 6,719 Hypercar, 9,055
LMGT3 and 7,638 GT3 laps. These are not validated fit counts. Unknown class labels
and missing conditions still require review. Sixteen Python ingestion tests pass.

The running full-download batch was terminated by an explicit environment policy
denial for `s3.us-east-005.backblazeb2.com:443`. No environment network-setting
change tool is exposed in this session. Resume network collection only after the
destination is permitted through the supported environment configuration; do not
route the same denied downloads through another proxy or remote executor.
Offline normalization and coverage work remain available. No model fit or claim
of continuous background collection is established by this checkpoint.

## LMP2 extraction checkpoint: 2026-11-08

Run `python3 scripts/sim/t71_lmp2.py` after normalization. The offline extractor
preserves full normalized LMP2 rows in ignored `lmp2-laps.jsonl` and records each
session/car in `lmp2-inventory.json`. It does not filter by series bucket or lap
residual. Source hashes and record identities remain intact. Recording year is
not regulation year: generation, chassis, engine, tyre and series restrictions
stay unknown pending official evidence. Session/event splits remain unassigned
until session identity and overlapping recordings are reconciled; split laps
from a single event must never leak into both calibration and independent tests.

Actual run: 47,736 LMP2-labelled lap records, 494 session/car pairs, 44 source
sessions. All remain held. Nineteen ingestion regression tests pass. Raw physics
and post-correction errors are null (not measured), and fitted records remain zero.
The two latest audit failures are cached schema failures, not demonstrated
network download failures; one missing analysis URL and one unrecognized source
URL also remain unresolved. No new downloads were performed in this run because
the recorded destination policy denial has no verified permission change.

Next: verify replay reconstruction against upstream source; recover lap context
from the five existing replay ZIPs; resolve official session/car mappings and
regulation eras, then implement and validate the LMP2 vehicle model. Full archive
coverage, official-result cross-checking and physical calibration remain open.

## Resumed acquisition and replay reconstruction: 2026-11-08, after 22:05 KST

Fresh ordinary HTTPS requests to both the archive API and the documented Backblaze
host returned HTTP 200. This supersedes the earlier connection-blocked checkpoint
for this run only. No proxy, execution-host workaround or Vercel change was used.
The refreshed catalogue contains 15,800 entries, including 5,154 current scope
candidates. The first resumed 150-item batch added 145 successful analysis audits;
the remaining five entries had schema/URL problems. Acquisition then resumed the
remaining candidate queue, with an exclusive filesystem lock and four requests
in flight. An HTTP 401/403 stops submission of new requests after outstanding
requests finish. Raw downloads are not model fits.

Three previously held relative analysis filenames were resolved against the
documented archive storage prefix, downloaded with HTTP 200 and audited. Original
and resolved source URLs are retained. Unknown hosts and relative traversal paths
remain rejected. Existing active processes retain their loaded code version;
the next run picks up this resolver and reuses already cached evidence.

`t71_replay_collect.py` downloads replay ZIPs in bounded resumable batches. It
checks CRC and manifest version, uses atomic files, retains SHA-256, and stops
on 401/403/429 or a disk limit. Default batch size is ten; payloads exceeding
512 MiB and expanded archives exceeding 2 GB are held, not called complete.
Use a separate `replay-collection.lock` so duplicate replay jobs cannot overlap.

`t71_replay.py` reconstructs keyframes and incremental patches using the v1 wire
semantics checked against timing71/common commit
`2fabd83a551a56fc719d271e7695d22016a6bb00`, `src/replay.js` and `src/diffs.js`.
Array removal preserves holes; it must not shift car identity. Each changed car
observation preserves raw timing/tyre/energy fields, session flag, weather,
timestamp, source frame and source hash. Sector fields are not automatically
assigned to the completed lap. Display colours are not tyre physics.

Actual results: five saved F1/WEC ZIPs plus five newly downloaded FE/IMSA/ELMS/GT
candidate ZIPs reconstructed successfully: 66,578 frames and 632,096 changed-car
observations. These are observation counts, not independent lap counts. New
samples include FE London race and Tokyo qualifying duel; a GT Cup candidate is
not promoted to FIA GT3. A differential check of 1,000 real cars/session patches
matched the pinned upstream JavaScript reader. All 26 ingestion/replay tests pass.

Reproduction commands, from the repository root:

```sh
flock -n .cache/lapsim/t71/collection.lock python3 scripts/sim/t71_collect.py --catalogue .cache/lapsim/t71/catalogue-refreshed.json --limit 150
flock -n .cache/lapsim/t71/replay-collection.lock python3 scripts/sim/t71_replay_collect.py --limit 10
python3 scripts/sim/t71_prepare.py
python3 scripts/sim/t71_lmp2.py
python3 scripts/sim/t71_replay.py .cache/lapsim/t71/replays/*.zip
python3 -m unittest discover -s tests -p 't71_*test.py'
```

Consult current checkpoint summaries for download/normalization counts; collection
may advance after this document is committed. `normalized-summary.json` covers
only its latest processing run, not later arrivals. Calibration and independent
validation remain incomplete. Next: reconcile replay observation time with lap
identity, verify official results and car/layout/rule-year mappings, then fit
identifiable parameters and report held-out raw-physics errors. No vehicle
parameter or production behavior was changed in this acquisition revision.
