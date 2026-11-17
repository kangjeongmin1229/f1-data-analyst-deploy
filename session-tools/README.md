# Session helper scripts (not for upstream, never open a PR from this branch)

Copy to the paths the scripts expect:

    mkdir -p /home/claude/work/audit
    cp session-tools/shot.py session-tools/rotate-start.mjs session-tools/shift-derived.mjs /home/claude/work/
    cp session-tools/audit/* /home/claude/work/audit/
    cp session-tools/zoom.py session-tools/zoomname.py session-tools/sc2.py session-tools/shot-en.py /tmp/

All need the local preview: `KONGBODA_FEATURES=all nohup node scripts/dev-preview.mjs --port 5173 > /tmp/dev.log 2>&1 &`
(restart it after every code change) and Playwright with /usr/bin/google-chrome. Run screenshots one at a time.

- shot.py <track> <out.png> ko  — whole map (Korean). For English use shot-en.py (the /en path does not work locally).
- shot-en.py <track> <out.png>  — whole map with an English browser.
- zoom.py <track> <car|''> <label-prefix> <out.png>  — 2x crop around a corner label.
- zoomname.py <track> <text> <out.png>  — 2x crop around any map text.
- sc2.py <tracks...>  — per track: chosen label scale, sizes in use, labels placed "far"/"min", viewBox.
- audit/map-audit.py <tracks...>  — 7 option sets (2025 DRS on/off, 2026 SM normal/alt/off with OT, OT off, WEC LMH);
  counts labelLabel, labelTrack, labelPit, labelZone, labelFlag, outside. labelFlag has known false positives.
- rotate-start.mjs / shift-derived.mjs  — finish-line helpers used on fix/finish-lines-2-2026-11-17.
