# Verified F1 round curve — 2026-11-11

Source fit run: https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42923060955. Source commit: [86d56f5e80994758cadcb916d11c32dc37ee0c19](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/commit/86d56f5e80994758cadcb916d11c32dc37ee0c19). Verification: [run 42930922456](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42930922456), source [31df660c1fe22f3a6d3485b81c54a6e0d94f628d](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/commit/31df660c1fe22f3a6d3485b81c54a6e0d94f628d).

All four artifact ZIPs match GitHub SHA256 digests. All final held-out predictions replay from saved folds within 1e-8 seconds. Fold membership, input hashes, saved round counts and RMS arithmetic are checked. No optimizer is called. Fixed-round completion is not convergence.

| Main rounds | Fold rounds | Season | Held-out n | Held-out RMS % | In-sample n | In-sample RMS % |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 2 | 2025 | 20 | 1.129647 | 22 | 0.429580 |
| 3 | 2 | 2026 | 14 | 1.305853 | 16 | 0.628305 |
| 4 | 3 | 2025 | 20 | 0.915832 | 22 | 0.397837 |
| 4 | 3 | 2026 | 14 | 1.197254 | 16 | 0.586060 |
| 5 | 4 | 2025 | 20 | 0.865413 | 22 | 0.412092 |
| 5 | 4 | 2026 | 14 | 1.194867 | 16 | 0.564223 |
| 6 | 5 | 2025 | 20 | 0.835646 | 22 | 0.405227 |
| 6 | 5 | 2026 | 14 | 1.180112 | 16 | 0.555291 |

In-sample RMS here is the unweighted main-fit RMS for saved rows with observed position = 1, using their observed-team adjustment. Held-out RMS uses the eligible hidden pole rows and the best-team pole selector. The counts and selectors differ; neither column is the full weighted training objective. Other seasons remain in training, so this is not a past-only temporal backtest.

The production fold rule couples the main count to the fold count. Hidden rows use fold factors; main factors would leak target data. Every round state is retained. Main scores and exclusions are in round-curve.json.

## Saved fold trajectory, zero-optimizer replay

The longest job contains fold states at rounds 1–5. Complete-state replay changes cars, factors and team states together. Factor-only replay holds final cars/team adjustments at round 5 and changes only saved factors. This is sensitivity analysis, not a fitted candidate.

| Fold round | Season | n | Complete state RMS % | Factor-only RMS %, final car/team fixed |
|---:|---:|---:|---:|---:|
| 1 | 2025 | 20 | 1.688404 | 1.645329 |
| 2 | 2025 | 20 | 1.129647 | 1.131630 |
| 3 | 2025 | 20 | 0.915832 | 0.928963 |
| 4 | 2025 | 20 | 0.865413 | 0.857010 |
| 5 | 2025 | 20 | 0.835646 | 0.835646 |
| 1 | 2026 | 14 | 1.115926 | 1.287500 |
| 2 | 2026 | 14 | 1.305853 | 1.261433 |
| 3 | 2026 | 14 | 1.197254 | 1.192038 |
| 4 | 2026 | 14 | 1.194867 | 1.190154 |
| 5 | 2026 | 14 | 1.180112 | 1.180112 |

## Stop audit

| Job main count | Fit | Rounds | Stop | Last decrease % | Decrease in [0,1) % |
|---:|---:|---:|---|---:|---|
| 3 | 1 | 3 | declared fixed-round count | 6.800568 | false |
| 3 | 2 | 2 | declared fixed-round count | 20.958001 | false |
| 3 | 3 | 2 | declared fixed-round count | 19.303673 | false |
| 3 | 4 | 2 | declared fixed-round count | 24.580397 | false |
| 3 | 5 | 2 | declared fixed-round count | 22.874680 | false |
| 3 | 6 | 2 | declared fixed-round count | 25.012129 | false |
| 3 | 7 | 2 | declared fixed-round count | 24.779275 | false |
| 3 | 8 | 2 | declared fixed-round count | 24.902478 | false |
| 3 | 9 | 2 | declared fixed-round count | 26.984904 | false |
| 4 | 1 | 4 | declared fixed-round count | 2.796309 | false |
| 4 | 2 | 3 | declared fixed-round count | 6.558927 | false |
| 4 | 3 | 3 | declared fixed-round count | 5.675497 | false |
| 4 | 4 | 3 | declared fixed-round count | 6.439642 | false |
| 4 | 5 | 3 | declared fixed-round count | 6.400700 | false |
| 4 | 6 | 3 | declared fixed-round count | 6.545632 | false |
| 4 | 7 | 3 | declared fixed-round count | 7.089188 | false |
| 4 | 8 | 3 | declared fixed-round count | 7.045565 | false |
| 4 | 9 | 3 | declared fixed-round count | 7.164628 | false |
| 5 | 1 | 5 | declared fixed-round count | 1.016527 | false |
| 5 | 2 | 4 | declared fixed-round count | 3.719060 | false |
| 5 | 3 | 4 | declared fixed-round count | 2.695966 | false |
| 5 | 4 | 4 | declared fixed-round count | 2.544649 | false |
| 5 | 5 | 4 | declared fixed-round count | 1.621342 | false |
| 5 | 6 | 4 | declared fixed-round count | 2.537802 | false |
| 5 | 7 | 4 | declared fixed-round count | 2.651194 | false |
| 5 | 8 | 4 | declared fixed-round count | 2.551470 | false |
| 5 | 9 | 4 | declared fixed-round count | 2.563228 | false |
| 6 | 1 | 6 | declared fixed-round count | 0.773481 | true |
| 6 | 2 | 5 | declared fixed-round count | 1.062010 | false |
| 6 | 3 | 5 | declared fixed-round count | 0.846233 | true |
| 6 | 4 | 5 | declared fixed-round count | 1.137713 | false |
| 6 | 5 | 5 | declared fixed-round count | 1.249206 | false |
| 6 | 6 | 5 | declared fixed-round count | 0.953028 | true |
| 6 | 7 | 5 | declared fixed-round count | 0.908889 | true |
| 6 | 8 | 5 | declared fixed-round count | 1.280161 | false |
| 6 | 9 | 5 | declared fixed-round count | 1.000833 | false |

With no exclusions, fit 1 is main; fits 2–5 are the 2025 folds and 6–9 the 2026 folds. If the unchanged outlier policy adds a main fit, the JSON inventory records the shift. A small decrease at a fixed count does not mean model acceptance.

## Interpretation and limits

**Answer: (c) a confirmed forward-model/code difference; (b) a stopping difference, but no change to fold membership. The requested curve does not support (a), the claim that the five-round main limit was a useful brake.** This does not assign the full historic gap to the battery code: original fold states and the complete original raw-trace manifest are missing.

Within the requested main-round range 3–6 (fold rounds 2–5), held-out RMS improves in both seasons. In the factor-only sensitivity check, later saved fold factors also improve the pooled seasonal RMS. That check fixes final cars/team adjustments and is not a separately fitted candidate. It cannot prove the cause of the entire historical gap. The first-to-second fold-round complete-state change in 2026 is worse; therefore no claim of improvement at every possible round is made.

| Comparison, 2026 | Held-out n | RMS % | Meaning |
|---|---:|---:|---|
| Historic frozen export | 14 | about 0.900 | Rounded stored score from the earlier forward model |
| Current kernel, original main/fold counts 5/4 | 14 | 1.194867 | Original count rule does not recover the old score |
| Block 2 control, main 6 and mixed folds 5/6 | 14 | 1.194146 | Only -0.000721 pp against current-kernel 5/4 |
| Current kernel, main/fold counts 6/5 | 14 | 1.180112 | Mixed 5/6 folds are +0.014033 pp worse than all-5 folds |

The small mixed-fold effect is real in these saved predictions, but it cannot explain the roughly 0.294 pp historical gap. Later fold rounds update cars, factors and team adjustments together; the effect is not attributed only to track factors. No stopping rule is changed.

### Saved baseline against all-five-round folds

Same 34 row identities, real laps and fold membership. All 12 rows whose baseline fold already stopped at round 5 match the new five-round predictions exactly (largest difference 0 seconds). Other rows compare saved round-6 states with round-5 states. This is analysis from saved outputs, with no new fit.

| Season | Fold | n | Baseline rounds | All-five RMS % | Baseline RMS % |
|---:|---:|---:|---:|---:|---:|
| 2025 | 0 | 5 | 6 | 0.500005 | 0.518402 |
| 2025 | 1 | 6 | 5 | 0.697880 | 0.697880 |
| 2025 | 2 | 5 | 6 | 1.178669 | 1.189988 |
| 2025 | 3 | 4 | 6 | 0.843732 | 0.839983 |
| 2026 | 0 | 3 | 5 | 0.894241 | 0.894241 |
| 2026 | 1 | 3 | 5 | 2.066009 | 2.066009 |
| 2026 | 2 | 4 | 6 | 0.443147 | 0.513658 |
| 2026 | 3 | 4 | 6 | 0.936432 | 0.962317 |

No model adoption, production change, merge or Vercel action. These diagnostic rows have been inspected and must not later be called untouched validation.

## Verification and provenance

The report job downloaded and hashed all four ZIPs, restored the pinned inputs and replayed all 136 final predictions within 1e-8 seconds. All 36 main/fold fits have their declared state counts and finite scores, with no added outlier exclusions. A second comparison found identical overlapping objective histories across the four arms (maximum difference 0), and all 136 per-arm residuals equal the corresponding saved trajectory values (maximum difference 0 percentage points). The fitting and replay commits contain identical uninstrumented joint-bcd.mjs source; instrumentation only saved round snapshots. Fixed counts are completed, not reported as numerical convergence.

| Artifact | Downloaded ZIP SHA256 |
|---|---|
| f1-rounds-3 | 69d1209ad0dbea29cd5277b1b0eb1943301e8831557aec9c8acf63d78235aa20 |
| f1-rounds-4 | fd69bd8d582a15df8e1b4b65f4095bd5df44408af28ee0fbcafacb18d0320429 |
| f1-rounds-5 | 5d7273271565cb6bc2f73bbec406c3628b9ecac8921fabddda47ab8f9b0166f6 |
| f1-rounds-6 | 2abcf12587f4a505b35621c8a0b6f0001bda3bda99a52bfe0ac60b1348695aac |

[Full round data, input hashes and per-file checkpoint hashes](../scripts/sim/results/owner-diagnostics-2026-11-11/round-curve.json). [ZIP provenance](../scripts/sim/results/owner-diagnostics-2026-11-11/round-artifacts.json). [Run/job evidence](../scripts/sim/results/owner-diagnostics-2026-11-11/round-run.json). ZIPs are also saved beside these files, so replay does not depend only on Actions artifact retention. The aligned trace hash is `36a1f55ac59e73f05abf4144ea08d1c2cdb7d8b78854d7de19e99a83f4f64413`; geometry is `fe67d1ecf2a4c151f35f98e3da334d835881904ffb4ebda24488983952cee5eb`.

## Reproduce

Check out this evidence branch, which contains the pinned reporting source and saved ZIPs, or check out reporting source 31df660c1fe22f3a6d3485b81c54a6e0d94f628d and download the four f1-rounds artifacts from the source run. Verify ZIP hashes against round-artifacts.json and extract into .cache/owner-round-curve/<artifact-name>. Restore pinned archives from scripts/sim/owner-actions-plan.json; run node scripts/sim/owner-f1-actions.mjs prepare control, then node scripts/sim/report-owner-round-curve.mjs .cache/owner-round-curve. Zero optimizer rounds. Raw traces remain outside git.

[Settings and code comparison](lapsim-f1-control-diagnosis-2026-11-11.md). [Latest baseline residual analysis, with observed brake-channel audit](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/blob/e486ff4aec4b890e438cdf1386ca5eaf348a3b4f/docs/lapsim-owner-residual-analysis-2026-11-11.md).
