# Draft model: WEC consistent baseline at R

Owner-requested consistency and convergence correction. No measured gain against frozen production is claimed: the original production held-out states were not retained, so a like-for-like held-out comparison does not exist. The new R held-out RMS is 1.166709%, n=33, not a paired improvement. No merge or production adoption.

Source: fork run [42913368752](https://github.com/kangjeongmin1229/f1-data-analyst-deploy/actions/runs/42913368752), commit `c4a2b9f4ba107b5e2b1655de1a370e37092fb033`. Export SHA256 `b21f64d90e5470d5aac27d495b678762e3c77c70ac0504c6dea1ed877efe021b`. Geometry SHA256 `fe67d1ecf2a4c151f35f98e3da334d835881904ffb4ebda24488983952cee5eb`. Existing B transfer SHA256 `b2d3bba7113685d1382415b4717bd26a6df2aa73f4664c0c88e64068d08e3705`. R=1e-4, cap=2000; all source fits stopped by tolerance, no cap hits. F1 seasons/projections, B, geometry, bounds, weights and gates are unchanged. This updates class-level LMGT3 calibration from the completed control; the separate per-model LMGT3 experiment stays parked.

## lmh/2025

| Value or choice | Frozen | R control |
|---|---:|---:|
| cRoll | 0.015000 | 0.015000 |
| etaDrive | 0.950000 | 0.950000 |
| inertiaFactor | 1.060000 | 1.060000 |
| vSubtractCorner | 0.300000 | 0.300000 |
| dmuDfz | -0.000050 | -0.000050 |
| fz0 | 3000.000000 | 3000.000000 |
| ers | {"rule":"hypercar","axle":"front","eMax":200000,"deployFrom":52.77777777777778,"regenMax":200000,"regenShare":0.6,"etaRegen":0.9} | {"rule":"hypercar","axle":"front","eMax":200000,"deployFrom":52.77777777777778,"regenMax":200000,"regenShare":0.6,"etaRegen":0.9} |
| label | "LMH" | "LMH" |
| awdAboveKph | 190.000000 | 190.000000 |
| mass | 1120.000000 | 1120.000000 |
| wheelbase | 3.150000 | 3.150000 |
| cogHeight | 0.320000 | 0.320000 |
| rearWeight | 0.530000 | 0.530000 |
| rearAero | 0.520000 | 0.520000 |
| clA | 7.000000 | 7.000000 |
| cdA | 1.086824 | 1.085898 |
| clALow | 7.000000 | 7.000000 |
| cdALow | 1.086824 | 1.085898 |
| muX | 1.434347 | 1.432395 |
| muY | 1.568817 | 1.566682 |
| muXTrac | 1.523994 | 1.521920 |
| pIce | 500000.000000 | 500000.000000 |
| vMax | 95.833333 | 95.833333 |
| noLowDrag | true | true |
| gripSource | "f1" | "f1" |
| pooled | false | true |
| bop | false | false |
| Bound hits | clA upper | clA upper |
| Dry reproduction count | 5 | 5 |
| Largest error, s | 0 | 0 |

Unraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.

| Unraced track | Frozen s | R control s | Change s |
|---|---:|---:|---:|
| baku | 117.151 | 117.208 | 0.057 |
| catalunya | 88.512 | 88.581 | 0.069 |
| hungaroring | 92.186 | 92.248 | 0.062 |
| jeddah | 103.230 | 103.269 | 0.039 |
| kuala-lumpur | 111.547 | 111.618 | 0.071 |
| las-vegas | 107.013 | 107.054 | 0.041 |
| madring | 106.428 | 106.493 | 0.065 |
| melbourne | 90.039 | 90.075 | 0.036 |
| mexico-city | 88.978 | 89.030 | 0.052 |
| miami | 103.341 | 103.395 | 0.054 |
| monte-carlo | 83.467 | 83.521 | 0.054 |
| montreal | 84.387 | 84.426 | 0.039 |
| monza | 93.409 | 93.445 | 0.036 |
| shanghai | 110.883 | 110.947 | 0.064 |
| silverstone | 104.486 | 104.552 | 0.066 |
| singapore | 105.844 | 105.904 | 0.060 |
| spielberg | 76.987 | 77.020 | 0.033 |
| suzuka | 106.718 | 106.777 | 0.059 |
| yas-marina-circuit | 97.623 | 97.674 | 0.051 |
| zandvoort | 83.503 | 83.554 | 0.051 |

## lmh/2026

| Value or choice | Frozen | R control |
|---|---:|---:|
| cRoll | 0.015000 | 0.015000 |
| etaDrive | 0.950000 | 0.950000 |
| inertiaFactor | 1.060000 | 1.060000 |
| vSubtractCorner | 0.300000 | 0.300000 |
| dmuDfz | -0.000050 | -0.000050 |
| fz0 | 3000.000000 | 3000.000000 |
| ers | {"rule":"hypercar","axle":"front","eMax":200000,"deployFrom":52.77777777777778,"regenMax":200000,"regenShare":0.6,"etaRegen":0.9} | {"rule":"hypercar","axle":"front","eMax":200000,"deployFrom":52.77777777777778,"regenMax":200000,"regenShare":0.6,"etaRegen":0.9} |
| label | "LMH" | "LMH" |
| awdAboveKph | 190.000000 | 190.000000 |
| mass | 1120.000000 | 1120.000000 |
| wheelbase | 3.150000 | 3.150000 |
| cogHeight | 0.320000 | 0.320000 |
| rearWeight | 0.530000 | 0.530000 |
| rearAero | 0.520000 | 0.520000 |
| clA | 6.630406 | 6.551861 |
| cdA | 0.963682 | 0.964469 |
| clALow | 6.630406 | 6.551861 |
| cdALow | 0.963682 | 0.964469 |
| muX | 1.388029 | 1.391074 |
| muY | 1.518156 | 1.521487 |
| muXTrac | 1.474780 | 1.478016 |
| pIce | 500000.000000 | 500000.000000 |
| vMax | 95.833333 | 95.833333 |
| noLowDrag | true | true |
| gripSource | "transfer" | "transfer" |
| pooled | false | false |
| bop | false | false |
| Bound hits | none | none |
| Dry reproduction count | 6 | 6 |
| Largest error, s | 0 | 0 |

Unraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.

| Unraced track | Frozen s | R control s | Change s |
|---|---:|---:|---:|
| baku | 118.537 | 118.545 | 0.008 |
| hungaroring | 94.145 | 94.174 | 0.029 |
| jeddah | 104.089 | 104.118 | 0.029 |
| kuala-lumpur | 113.704 | 113.742 | 0.038 |
| las-vegas | 107.768 | 107.797 | 0.029 |
| lusail | 100.537 | 100.593 | 0.056 |
| madring | 108.426 | 108.459 | 0.033 |
| melbourne | 90.962 | 90.994 | 0.032 |
| mexico-city | 90.448 | 90.444 | -0.004 |
| miami | 104.671 | 104.683 | 0.012 |
| monte-carlo | 85.130 | 85.131 | 0.001 |
| montreal | 85.425 | 85.431 | 0.006 |
| sakhir | 108.204 | 108.214 | 0.010 |
| shanghai | 112.694 | 112.720 | 0.026 |
| silverstone | 106.434 | 106.491 | 0.057 |
| singapore | 107.547 | 107.548 | 0.001 |
| spielberg | 77.843 | 77.857 | 0.014 |
| suzuka | 108.396 | 108.442 | 0.046 |
| yas-marina-circuit | 99.047 | 99.077 | 0.030 |
| zandvoort | 85.047 | 85.081 | 0.034 |

## lmdh/2025

| Value or choice | Frozen | R control |
|---|---:|---:|
| cRoll | 0.015000 | 0.015000 |
| etaDrive | 0.950000 | 0.950000 |
| inertiaFactor | 1.060000 | 1.060000 |
| vSubtractCorner | 0.300000 | 0.300000 |
| dmuDfz | -0.000050 | -0.000050 |
| fz0 | 3000.000000 | 3000.000000 |
| ers | {"rule":"hypercar","axle":"rear","eMax":50000,"deployFrom":0,"regenMax":50000,"regenShare":0.4,"etaRegen":0.9} | {"rule":"hypercar","axle":"rear","eMax":50000,"deployFrom":0,"regenMax":50000,"regenShare":0.4,"etaRegen":0.9} |
| label | "LMDh" | "LMDh" |
| mass | 1120.000000 | 1120.000000 |
| wheelbase | 3.150000 | 3.150000 |
| cogHeight | 0.320000 | 0.320000 |
| rearWeight | 0.530000 | 0.530000 |
| rearAero | 0.520000 | 0.520000 |
| clA | 7.000000 | 7.000000 |
| cdA | 1.099404 | 1.104641 |
| clALow | 7.000000 | 7.000000 |
| cdALow | 1.099404 | 1.104641 |
| muX | 1.427360 | 1.425285 |
| muY | 1.561175 | 1.558905 |
| muXTrac | 1.516570 | 1.514365 |
| pIce | 500000.000000 | 500000.000000 |
| vMax | 95.833333 | 95.833333 |
| noLowDrag | true | true |
| gripSource | "transfer" | "transfer" |
| pooled | true | false |
| bop | false | false |
| Bound hits | clA upper | clA upper |
| Dry reproduction count | 5 | 5 |
| Largest error, s | 0 | 0 |

Unraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.

| Unraced track | Frozen s | R control s | Change s |
|---|---:|---:|---:|
| baku | 117.469 | 117.564 | 0.095 |
| catalunya | 88.808 | 88.890 | 0.082 |
| hungaroring | 92.443 | 92.523 | 0.080 |
| jeddah | 103.484 | 103.564 | 0.080 |
| kuala-lumpur | 111.923 | 112.019 | 0.096 |
| las-vegas | 107.355 | 107.444 | 0.089 |
| madring | 106.790 | 106.878 | 0.088 |
| melbourne | 90.275 | 90.347 | 0.072 |
| mexico-city | 89.229 | 89.301 | 0.072 |
| miami | 103.612 | 103.700 | 0.088 |
| monte-carlo | 83.690 | 83.758 | 0.068 |
| montreal | 84.591 | 84.655 | 0.064 |
| monza | 93.644 | 93.722 | 0.078 |
| shanghai | 111.188 | 111.284 | 0.096 |
| silverstone | 104.838 | 104.937 | 0.099 |
| singapore | 106.103 | 106.184 | 0.081 |
| spielberg | 77.158 | 77.213 | 0.055 |
| suzuka | 107.011 | 107.102 | 0.091 |
| yas-marina-circuit | 97.912 | 97.992 | 0.080 |
| zandvoort | 83.777 | 83.848 | 0.071 |

## lmdh/2026

| Value or choice | Frozen | R control |
|---|---:|---:|
| cRoll | 0.015000 | 0.015000 |
| etaDrive | 0.950000 | 0.950000 |
| inertiaFactor | 1.060000 | 1.060000 |
| vSubtractCorner | 0.300000 | 0.300000 |
| dmuDfz | -0.000050 | -0.000050 |
| fz0 | 3000.000000 | 3000.000000 |
| ers | {"rule":"hypercar","axle":"rear","eMax":50000,"deployFrom":0,"regenMax":50000,"regenShare":0.4,"etaRegen":0.9} | {"rule":"hypercar","axle":"rear","eMax":50000,"deployFrom":0,"regenMax":50000,"regenShare":0.4,"etaRegen":0.9} |
| label | "LMDh" | "LMDh" |
| mass | 1120.000000 | 1120.000000 |
| wheelbase | 3.150000 | 3.150000 |
| cogHeight | 0.320000 | 0.320000 |
| rearWeight | 0.530000 | 0.530000 |
| rearAero | 0.520000 | 0.520000 |
| clA | 6.446839 | 6.398381 |
| cdA | 0.953795 | 0.953725 |
| clALow | 6.446839 | 6.398381 |
| cdALow | 0.953795 | 0.953725 |
| muX | 1.397574 | 1.399175 |
| muY | 1.528597 | 1.530347 |
| muXTrac | 1.484923 | 1.486623 |
| pIce | 500000.000000 | 500000.000000 |
| vMax | 95.833333 | 95.833333 |
| noLowDrag | true | true |
| gripSource | "transfer" | "transfer" |
| pooled | false | false |
| bop | false | false |
| Bound hits | none | none |
| Dry reproduction count | 6 | 6 |
| Largest error, s | 0 | 0 |

Unraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.

| Unraced track | Frozen s | R control s | Change s |
|---|---:|---:|---:|
| baku | 118.449 | 118.462 | 0.013 |
| hungaroring | 94.110 | 94.138 | 0.028 |
| jeddah | 104.040 | 104.063 | 0.023 |
| kuala-lumpur | 113.688 | 113.719 | 0.031 |
| las-vegas | 107.672 | 107.684 | 0.012 |
| lusail | 100.557 | 100.601 | 0.044 |
| madring | 108.468 | 108.500 | 0.032 |
| melbourne | 90.930 | 90.955 | 0.025 |
| mexico-city | 90.340 | 90.345 | 0.005 |
| miami | 104.571 | 104.586 | 0.015 |
| monte-carlo | 85.048 | 85.058 | 0.010 |
| montreal | 85.348 | 85.358 | 0.010 |
| sakhir | 108.162 | 108.177 | 0.015 |
| shanghai | 112.630 | 112.656 | 0.026 |
| silverstone | 106.516 | 106.564 | 0.048 |
| singapore | 107.437 | 107.447 | 0.010 |
| spielberg | 77.792 | 77.806 | 0.014 |
| suzuka | 108.381 | 108.418 | 0.037 |
| yas-marina-circuit | 99.052 | 99.079 | 0.027 |
| zandvoort | 85.091 | 85.120 | 0.029 |

## lmgt3/2025

| Value or choice | Frozen | R control |
|---|---:|---:|
| cRoll | 0.015000 | 0.015000 |
| etaDrive | 0.950000 | 0.950000 |
| inertiaFactor | 1.060000 | 1.060000 |
| vSubtractCorner | 0.300000 | 0.300000 |
| dmuDfz | -0.000050 | -0.000050 |
| fz0 | 3000.000000 | 3000.000000 |
| ers | {} | {} |
| label | "LMGT3" | "LMGT3" |
| mass | 1400.000000 | 1400.000000 |
| wheelbase | 2.700000 | 2.700000 |
| cogHeight | 0.420000 | 0.420000 |
| rearWeight | 0.520000 | 0.520000 |
| rearAero | 0.500000 | 0.500000 |
| clA | 3.500000 | 3.500000 |
| cdA | 1.286196 | 1.285003 |
| clALow | 3.500000 | 3.500000 |
| cdALow | 1.286196 | 1.285003 |
| muX | 1.487822 | 1.486703 |
| muY | 1.590430 | 1.589234 |
| muXTrac | 1.539126 | 1.537968 |
| pIce | 380000.000000 | 380000.000000 |
| vMax | 83.333333 | 83.333333 |
| noLowDrag | true | true |
| gripSource | "transfer" | "transfer" |
| pooled | false | false |
| bop | false | false |
| Bound hits | clA upper | clA upper |
| Dry reproduction count | 5 | 5 |
| Largest error, s | 0 | 0 |

Unraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.

| Unraced track | Frozen s | R control s | Change s |
|---|---:|---:|---:|
| baku | 132.399 | 132.423 | 0.024 |
| catalunya | 101.662 | 101.691 | 0.029 |
| hungaroring | 104.308 | 104.339 | 0.031 |
| jeddah | 119.172 | 119.190 | 0.018 |
| kuala-lumpur | 126.644 | 126.677 | 0.033 |
| las-vegas | 122.175 | 122.196 | 0.021 |
| madring | 121.477 | 121.509 | 0.032 |
| melbourne | 104.109 | 104.126 | 0.017 |
| mexico-city | 98.443 | 98.468 | 0.025 |
| miami | 116.491 | 116.515 | 0.024 |
| monte-carlo | 92.004 | 92.033 | 0.029 |
| montreal | 95.134 | 95.152 | 0.018 |
| monza | 107.484 | 107.498 | 0.014 |
| shanghai | 125.926 | 125.956 | 0.030 |
| silverstone | 121.400 | 121.431 | 0.031 |
| singapore | 117.964 | 117.991 | 0.027 |
| spielberg | 87.862 | 87.877 | 0.015 |
| suzuka | 123.007 | 123.034 | 0.027 |
| yas-marina-circuit | 112.048 | 112.072 | 0.024 |
| zandvoort | 95.856 | 95.880 | 0.024 |

## lmgt3/2026

| Value or choice | Frozen | R control |
|---|---:|---:|
| cRoll | 0.015000 | 0.015000 |
| etaDrive | 0.950000 | 0.950000 |
| inertiaFactor | 1.060000 | 1.060000 |
| vSubtractCorner | 0.300000 | 0.300000 |
| dmuDfz | -0.000050 | -0.000050 |
| fz0 | 3000.000000 | 3000.000000 |
| ers | {} | {} |
| label | "LMGT3" | "LMGT3" |
| mass | 1400.000000 | 1400.000000 |
| wheelbase | 2.700000 | 2.700000 |
| cogHeight | 0.420000 | 0.420000 |
| rearWeight | 0.520000 | 0.520000 |
| rearAero | 0.500000 | 0.500000 |
| clA | 3.500000 | 3.500000 |
| cdA | 1.300000 | 1.300000 |
| clALow | 3.500000 | 3.500000 |
| cdALow | 1.300000 | 1.300000 |
| muX | 1.511604 | 1.505062 |
| muY | 1.615853 | 1.608860 |
| muXTrac | 1.563729 | 1.556961 |
| pIce | 380000.000000 | 380000.000000 |
| vMax | 83.333333 | 83.333333 |
| noLowDrag | true | true |
| gripSource | "transfer" | "transfer" |
| pooled | false | true |
| bop | false | false |
| Bound hits | clA upper, cdA upper | clA upper, cdA upper |
| Dry reproduction count | 6 | 6 |
| Largest error, s | 0 | 0 |

Unraced means no saved qualifying pole for this class-season on a supported geometry, not a claim that a future WEC race is scheduled there. Historical seasons are selected in memory because the public API exposes the latest WEC season only. Predictions below use the public selector and identical default historical-weather fallback in both arms; JSON records every condition. These are provisional model laps, not promised pole times.

| Unraced track | Frozen s | R control s | Change s |
|---|---:|---:|---:|
| baku | 131.849 | 132.017 | 0.168 |
| hungaroring | 103.648 | 103.834 | 0.186 |
| jeddah | 118.729 | 118.870 | 0.141 |
| kuala-lumpur | 125.901 | 126.114 | 0.213 |
| las-vegas | 121.672 | 121.832 | 0.160 |
| lusail | 114.049 | 114.232 | 0.183 |
| madring | 120.782 | 120.980 | 0.198 |
| melbourne | 103.704 | 103.832 | 0.128 |
| mexico-city | 97.890 | 98.049 | 0.159 |
| miami | 115.944 | 116.110 | 0.166 |
| monte-carlo | 91.394 | 91.564 | 0.170 |
| montreal | 94.718 | 94.843 | 0.125 |
| sakhir | 119.259 | 119.438 | 0.179 |
| shanghai | 125.250 | 125.447 | 0.197 |
| silverstone | 120.687 | 120.896 | 0.209 |
| singapore | 117.359 | 117.533 | 0.174 |
| spielberg | 87.513 | 87.619 | 0.106 |
| suzuka | 122.400 | 122.582 | 0.182 |
| yas-marina-circuit | 111.516 | 111.675 | 0.159 |
| zandvoort | 95.327 | 95.480 | 0.153 |

## Six Interlagos rows

Public raced outputs include the existing correction and reproduce the real lap. Raw main-fit laps are in-sample; the R held-out prediction is separate. Frozen held-out predictions are unavailable.

| Class-season | Real s | Public frozen s | Public new s | Raw frozen fit s | Raw R fit s | R held-out s |
|---|---:|---:|---:|---:|---:|---:|
| lmh/2025 | 82.948000 | 82.948000 | 82.948000 | 82.848000 | 82.667000 | 82.582161 |
| lmh/2026 | 83.387000 | 83.387000 | 83.387000 | 82.671000 | 82.484000 | 82.216416 |
| lmdh/2025 | 82.570000 | 82.570000 | 82.570000 | 82.343000 | 82.196000 | 82.150457 |
| lmdh/2026 | 83.041000 | 83.041000 | 83.041000 | 82.645000 | 82.483000 | 82.347921 |
| lmgt3/2025 | 93.849000 | 93.849000 | 93.849000 | 92.833000 | 92.755000 | 92.591737 |
| lmgt3/2026 | 93.350000 | 93.350000 | 93.350000 | 91.938000 | 91.985000 | 91.858310 |

Validation: dry WEC rows reproduce exactly at public output precision; F1 public results are byte-identical between the two in-memory arms. `node --test tests/lapsim-*.test.mjs`: 56 passed, 0 failed (Node 24.22.1). An initial dependency-resolution failure was resolved by using the existing installed dependencies; no source change was needed. Missing: a frozen-production held-out comparison, independent future-race validation, and proof of better physical parameters. No Vercel access or merge.
