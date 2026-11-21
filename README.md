# Onboard capture data (Session D) — derived numbers only

No video or audio files. Each F1 2025–26 pole lap has:
- `q5` (yaw image shift, 5 Hz) and `v5` (pitch shift) from the onboard video, with `meta` (D offset, video corr) from `results.json`.
- `audio`: engine rpm estimated from the onboard sound (half-order comb rpm/120, harmonics 3–30), 25 Hz, with peak quality `q`.

Alignment: replay time = TI sesT − D. TI laptimes `sesT` is lap END.
2026 Las Vegas: sound only (the stream draws black to canvas). 2026 Japan: weak (corr < 0.6). 2026 Bahrain/Saudi: not on F1 TV.
Tools in `tools/` expect TI repos at /home/claude/ti2025 and /home/claude/ti2026.
