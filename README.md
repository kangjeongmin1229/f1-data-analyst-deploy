# Onboard capture data (Session D) — derived numbers only

No video or audio files. Each F1 2025–26 pole lap has:
- `q5` (yaw image shift, 5 Hz) and `v5` (pitch shift) from the onboard video, with `meta` (D offset, video corr) from `results.json`.
- `audio`: engine rpm estimated from the onboard sound (half-order comb rpm/120, harmonics 3–30), 25 Hz, with peak quality `q`.

Alignment: replay time = TI sesT − D. TI laptimes `sesT` is lap END.
2026 Las Vegas: sound only (the stream draws black to canvas). 2026 Japan: weak (corr < 0.6). 2026 Bahrain/Saudi: not on F1 TV.
Tools in `tools/` expect TI repos at /home/claude/ti2025 and /home/claude/ti2026.

## Other series (WEC, IMSA, GTWC, FE) — `other/<series>-<year>-<youtubeId>.json`
From official short onboard videos (YouTube, ~2 min each). Media was deleted after extraction.
- `video.rows`: [t s, yaw px/s, pitch px/s, match quality, scene-cut flag] at 10 Hz, 320 px width (2D SAD shift on the horizon band).
- `audio`: harmonic-sum f0 track (Hz, 40–700) with quality, 25 Hz. Engine-specific order → rpm mapping not applied yet.
- `meta`: title, series, year. Not yet aligned to timing data (Gate G: validate before use).
