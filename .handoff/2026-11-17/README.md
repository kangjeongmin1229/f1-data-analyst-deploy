# Session tools (2026-11-17) — not for merge

Helpers used to check the lap simulator circuit map locally. Paths inside assume the repo at
/home/claude/f1-data-analyst-deploy and these files in /home/claude/work (map-audit.py reads /home/claude/work/audit/measure.js).

Start the preview first: `KONGBODA_FEATURES=all nohup node scripts/dev-preview.mjs --port 5173 &` (restart after code changes).
Run screenshots one at a time (parallel runs overload the preview). Chrome: /usr/bin/google-chrome, Playwright for Python.

- shot.py `<track> <out.png> [ko|en] [extra-query]` — map SVG screenshot (Korean via Accept-Language; the /en path does not work locally, use shot-en.py)
- shot-en.py `<track> <out.png>` — English map screenshot
- zoom-label.py `<track> <car or ''> <label prefix> <out.png>` — 2x crop around one corner label
- label-sizes.py `<tracks...>` — per track: chosen label scale, font sizes, labels placed "far"/"min"
- map-audit.py `<tracks...>` + measure.js — every zone option (2025 DRS on/off, 2026 SM normal/alt/off with OT on, OT off, WEC LMH): counts label overlaps with labels, track band, pit lane, zone bands/labels, finish flag, picture edge. Known false positive: labelFlag (flag box in local coordinates).
- rotate-start.mjs / shift-derived.mjs — move per-point and lap-distance data when a track's start line moves (finish-line work); rotate-start needs a copy of tracks-data.js from before the change.
