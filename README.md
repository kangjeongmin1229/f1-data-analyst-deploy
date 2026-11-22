# Onboard capture data (Session D) — derived numbers only

No video or audio files. Each F1 2025–26 pole lap has:
- `q5` (yaw image shift, 5 Hz) and `v5` (pitch shift) from the onboard video, with `meta` (D offset, video corr) from `results.json`.
- `audio`: engine rpm estimated from the onboard sound (half-order comb rpm/120, harmonics 3–30), 25 Hz, with peak quality `q`.

Alignment: replay time = TI sesT − D. TI laptimes `sesT` is lap END.
2026 Las Vegas: sound only (the stream draws black to canvas). 2026 Japan: weak (corr < 0.6). 2026 Bahrain/Saudi: not on F1 TV.
Tools in `tools/` expect TI repos at /home/claude/ti2025 and /home/claude/ti2026.

## v2 — all videos, `other/v2/<row>.json.gz` (2026-11-22)
The old v1 files (`other/<series>-<year>-<id>.json`) were removed. That extractor failed the check against F1 telemetry.

- **Rows:**
  - `f_<id>`: F1 YouTube pole laps.
  - `v<n>`: the owner's 220-video index (`other/v2/index_rows.json`).
  - `y_<id>`: YouTube re-downloads.
  - `g_<id>`: GTWC long onboard streams.
  - v159, v160, v163, v170 and v215 are FIAWEC+ (signed in by the owner).
- **`video.rows`:**
  - Columns: `t, yawA_px_s, qA, yawB_px_s, qB, yawC_px_s, qC, pitch_px_s, cut`.
  - 25 Hz for clips under 20 min, otherwise 10 Hz. 320 px width.
  - yaw_rad_s = px_s / 217 (left > 0).
  - `video.decoder: "ffmpeg"` = ffmpeg fallback (AV1, or OpenCV stopped early). It is not the same path as OpenCV (corr 0.84 on the same file).
- **`audio`:** engine rpm from a half-order comb (rpm/120 × harmonics 3–30, 4000–13600 rpm), 25 Hz, with quality `q`. Tuned for F1. For other engines it is unchecked. Formula E has no gearbox.
- **`meta`:** row, url, series, session, kind (from the index).
- **Events** (`tools/v2/learn.py` → `other/v2/learn_summary.json`):
  - Upshifts, braking onsets, corners, and lap period (rpm autocorrelation).
  - Label: model / learned from video.
  - Gate G v3 status: not judged yet (see `docs/gate-ledger.md` and Project `claude/gate-video-sound-prereg-2026-11-22.md`).
- **Checks:** `validate_learn.json` (tuning laps), `validate_holdout.json` (old practice hold-out; not track-independent) and `line_test.json` (racing line ✗).
- **Tools:** `tools/v2/` (`yt_extract.py`, `run_idx.py`, `merge_pc.py`, `learn.py`, `validate_learn.py`, `validate_holdout.py`, `line_test.py`, `align_audio.py`, `ti_window.py`).
