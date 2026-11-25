# Step 32 pre-reg amendment A4: other series must not change (central addendum to A3, 2026-11-25 08:46 KST)

Base: v2 f96f3571…7947a1, A1 b4b89126…90e0322, A2+A3 adc8a73f…3f250409. Written before any candidate number (top-10 baseline rows
fetched for A3.1; no candidate lap simulated).

1. **Series isolation guard (G-S):** with the step 32 flag off **and** on, every non-F1 page lap (WEC, IMSA, ELMS, ALMS, GTWC, DTM,
   IGTC, NLS/Nürburgring, Macau, GT3, FE) is byte-identical to the same lap on base 589b6b3. Enumeration: every track in
   `lapsimAllTracks` × every `carsFor(id)` entry whose series is not F1, run through `tool.js simulate` (the page/tool path); compared on
   sha256 of `JSON.stringify({result, uncertainty})`. That is 12,240 laps today (100 tracks); central's figure is 8,640, so this set is at
   least as large. Script `scripts/sim/learn/step32-series-isolation.mjs` writes the manifest on 589b6b3 (git worktree) and compares the
   branch with flag off and flag on; the run's `check` job runs it. Any difference fails the verdict.
2. **Series-generic hooks:** the kernel hooks are car-level fields only (`car.lateralCap` table + `lowLoad`, `car.decoupled` brake/trac
   tables + `lowLoad`); no F1-only code path in the kernel. Steps 34–35 can set the same fields on other cars.
3. **F1 tables apply to F1 cars only:** production wiring (for the ship package) = `worker/lapsim/step32-limits-data.js` (default
   `null` = flag off) read by `carsFor` for the F1 season entries 2025/2026 only; the flag-on test sets it through an exported setter.
4. All earlier rules unchanged.
