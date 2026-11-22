# Gate ledger

One line per Gate G run (AGENTS.md "Gate G v3 additions"). Add the line before the run with result "pending"; fill in the result after.
No line, no ship.

- **Type:** acc (accuracy claim), corr (rule or physics correctness, non-inferiority), data (data fix, no gate).
- **Idea:** one quantity on one set of held-out rows. **Attempt:** the n-th try at that idea; m counts every candidate of every attempt.
- **n:** held-out units (tracks or events; seasons sharing tracks are pooled). **k:** `kForVariants(m, n)` in `scripts/sim/gate.mjs`.
- **Day count:** accuracy gates on the same rows that day (from the 6th, add 5 to m).

| Date (KST) | Session | Pre-registration | Type | Idea | Attempt | m | n | k | Metric | Result | Shipped |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-11-22 | C | claude/status-2026-11-21-C.md (Step 2) | acc | F1 clipping: X superclip, Y lookahead | 1 | 2 | 67 rows | 1.45 | lap RMS % | ✗ (f1 1.061 → 1.136 / 1.155) | no |
| 2026-11-22 | C | claude/gate-driver-timing-prereg-2026-11-22.md | acc | iRacing pedal timing, GT3 + GTP (rise, pick-up, brake off) | 1 | 1 | 8–16 tracks | 1.0 | median abs vs page | ✗ every class and quantity | no |
| 2026-11-22 | C | claude/gate-f1-driver-timing-prereg-2026-11-22.md | acc | F1 brake off before apex, pole laps 2025 + 2026 | 1 | 1 | 26 pooled tracks | 1.01 | median abs vs page (s) | v2 ✓ each season; v3 pooled: +0.172 ± 0.040 s, test ✓ but below the 0.26 s floor → ✗ | #399 (stays, shipped before v3) |
| 2026-11-22 | C | claude/gate-f1-shifts-prereg-2026-11-22.md | acc | F1 shift points, pole laps 2025 + 2026 | 1 | 1 | 26 pooled tracks | 1.01 | median abs vs page (share of 15,000 rpm) | v3 pooled: up +0.0365 ± 0.0019, down +0.0354 ± 0.0075, both above the floor 0.0265 (2 × median rpm step before an upshift) → ✓ | #401 |
| 2026-11-22 | C | claude/gate-f1-driver-timing-prereg-2026-11-22.md | acc | F1 throttle (rise into τ; pick-up lead), pole laps 2025 + 2026 | 1 | 1 | ~13 per season | 1.0 | median abs vs page | ✗ | no |
| 2026-11-22 | C | claude/gate-f1-throttle-prereg-2026-11-22.md | acc | same idea as the line above (τ grid, lead grid) | 2 | 3 | 26 pooled tracks | 1.67 | median abs vs page (s) | v3 pooled: τ +0.131 ± 0.031 s, lead +0.213 ± 0.016 s; tests ✓ but both below the 0.26 s floor → ✗ (2 rejected attempts) | #402 merged before the re-judge; reverted by this PR |
| 2026-11-22 | C | claude/gate-iracing-shifts-prereg-2026-11-22.md | acc | iRacing shift points, GTP and GT3 | 1 | 1 | GTP 8, GT3 16 tracks | 1.07 / 1.03 | median abs vs page (share of limit) | GTP up +0.0092 ± 0.0012 ✓, down +0.0111 ± 0.0071 ✓; GT3 up −0.0043 ± 0.0011 ✗ (down ✓). Real-data check: none for Hypercar (Session D: non-F1 sound shifts not validated) | #403: Hypercar ✓; GT3 shifts shipped by owner decision (10:05), fail v3 → owner to confirm |
| 2026-11-22 | C | scripts/sim/learn/iracing/pedal_calib_page.mjs (owner decision 10:05, no pre-registration) | acc | iRacing pedal timing GT3 + GTP, grid matched to the page output | 2 | 6 (attempt 1 + 5-value grid) | GT3 16, GTP 8 tracks | 2.10 / 2.32 | median abs vs page (s) | GT3 pick-up −0.5 s +0.058 ± 0.017 ✓ (floor 0.035 s cleared); GTP brake off −0.3 s +0.141 ± 0.014 ✓; GTP τ 0.35 s +0.079 ± 0.061 ✗; GTP pick-up −0.3 s +0.026 ± 0.015 ✗ (below floor) | #403: all shipped by owner decision; GTP τ / pick-up fail v3 → owner to confirm |
| 2026-11-22 | C | claude/gate-corner-speed-prereg-2026-11-22.md | corr (physics) | corner minimum speed bias (co-primary) with lap time non-inferior, F1 pole laps | 1 | – | – | – | corner min speed + lap RMS % | pending: not run until the owner says yes | – |

## Re-judging under v3 (before merging the open ones)
- Done 2026-11-22 (Session C, numbers in the table): #401 ✓; #399 below the floor (stays shipped); #402 ✗ (below the floor) and
  reverted; Hypercar shifts ✓ (#403). GT3 shifts and GTP τ / pick-up from #403 fail v3 but were the owner's 10:05 decision: owner to
  confirm keep or remove. Measurement floor for shift ratios: 2 × the median rpm step between measured samples before an upshift.
- Daily count on the F1 pole-lap rows today: brake off, shifts, throttle ×2 = 4 accuracy gates (clipping used lap rows).
