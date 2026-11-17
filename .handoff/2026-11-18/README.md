# Session tools 2026-11-18 (NOT for merge)
- states.py <outdir>[:ko,en] <tracks...> — map screenshots in every option state (2025 DRS, 2026 SM normal/alt/off + OT, WEC), dark+light. Dark = emulate_media color_scheme. English needs timezone Europe/London (the site picks Korean from an Asia/Seoul tz cookie).
- map-audit.py + measure.js — label overlap audit (copy both to one folder). measure.js now reads rotate(a x y).
- zcheck.mjs <ids> — zones per track by turn (worker/lapsim/f1-zones-data.js). zstats.mjs — zone stats for the Wolfram outlier check.
- lz_match.py — map-matching a traced layout onto the OSM raceway graph (used for Lausitz #280).
