# Verified F1 round curve — 2026-11-11

Source fit run: https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42923060955. Source commit: 86d56f5e80994758cadcb916d11c32dc37ee0c19.

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

The historic production fit predates the causal 2026 battery kernel. Fold membership is unchanged, but stopping differs. This curve uses the current kernel and cannot recover missing historic production fold states. It does not prove track factors alone caused the historic score gap. No rule change, model adoption, production change, merge or Vercel action.

## Reproduce

Download the four f1-rounds artifacts from the source run. Verify ZIP hashes against round-artifacts.json and extract into .cache/owner-round-curve/<artifact-name>. Restore pinned archives from scripts/sim/owner-actions-plan.json; run node scripts/sim/owner-f1-actions.mjs prepare control, then node scripts/sim/report-owner-round-curve.mjs .cache/owner-round-curve. Zero optimizer rounds. Raw traces remain outside git.

[Settings and code comparison](lapsim-f1-control-diagnosis-2026-11-11.md). [Baseline residual analysis](lapsim-owner-residual-analysis-2026-11-11.md).
