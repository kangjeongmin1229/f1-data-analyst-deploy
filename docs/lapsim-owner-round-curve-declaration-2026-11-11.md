# Owner-declared F1 round curve

Declared before fitting. Only the fork runs fits. Four parallel arms: main rounds 3, 4, 5 and 6; 200 inner iterations; original production fold rule `max(2, main rounds - 1)`, four deterministic sorted-modulo folds per season. Main and folds start from the same priors, unit track factors and empty team offsets. Weight time20/sector2/prior8, teams and track drag on, unchanged bounds. No convergence early-stop in this fixed-round diagnostic. Existing owner stopping rule is unchanged elsewhere.

Use current repository geometry and the pinned control traces (Interlagos distance alignment applied, no measured channels changed). Geometry SHA256 fe67d1ecf2a4c151f35f98e3da334d835881904ffb4ebda24488983952cee5eb; traces 36a1f55ac59e73f05abf4144ea08d1c2cdb7d8b78854d7de19e99a83f4f64413. Archive 268039a6acd2fd589336fede690e3321d723f6f50665718a55f6021cde1ac186. Runner verifies the original full pinned manifest before starting.

Saved control checkpoints retain the last xs/factors/adj only; earlier scores are not earlier states. B-transfer round files are a different drag-off experiment and cannot supply this curve. Thus the owner-authorized fallback is necessary. Save every round of every fit, exact training inventory, held-out rows, exclusions, main scores and per-season in-sample RMS.

Baseline is the 5-main/4-fold-round arm in this same run. Compare held-out n/RMS and in-sample error for each season. Report whether fewer rounds improve hidden-season error while training error falls. No acceptance or model selection from this diagnostic. If an arm fails or is cut off, report it as incomplete and do not substitute partial metrics. Maximum GitHub job duration is 360 minutes; this is a resource cap, not convergence.

Confound already identified: frozen F1 calibration originates at 9fb675e2cb60de4ee5e2d395af5acabf45740e73. Commit ffbfcafd583c26243ef46342f13ebe286019e307 later enabled causal 2026 state-of-charge by default. Its stored 0.90% held-out number was not recomputed with that kernel. This round sweep holds the current kernel fixed; it does not isolate the historic kernel effect or turn off battery physics.

No WEC fit, no main/production/Vercel changes, no merge. LMGT3 remains parked.
