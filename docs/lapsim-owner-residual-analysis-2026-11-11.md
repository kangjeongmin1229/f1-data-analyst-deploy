# Saved-baseline residual analysis — 2026-11-11

No fit. Every lap prediction was reconstructed from its original held-out state, with zero optimizer rounds; all 67 match the saved residual within 1e-8 s. Positive residual means the prediction is too slow. These are current experiment baselines: final Block 2 F1 control and WEC R control, not a recomputed frozen-production baseline.

F1 is a hidden-season test on known tracks, not unseen-track validation. WEC hides a class-season lap while carrying F1/B track factors. Each feature association below is exploratory; these same rows cannot later be advertised as untouched validation after choosing a model from this analysis.

| Baseline | n | RMS % | Mean signed error s |
|---|---:|---:|---:|
| f1/2025 | 20 | 0.841682 | -0.103723 |
| f1/2026 | 14 | 1.194146 | -0.108263 |
| wec-lmh/2025 | 5 | 1.112168 | 0.156790 |
| wec-lmh/2026 | 6 | 1.110032 | 0.195647 |
| wec-lmdh/2025 | 5 | 1.281673 | 0.077432 |
| wec-lmdh/2026 | 6 | 1.055043 | 0.166326 |
| wec-lmgt3/2025 | 5 | 1.377708 | -0.007389 |
| wec-lmgt3/2026 | 6 | 1.077016 | 0.269350 |

## F1: signed held-out rows, sorted by error

Squared-error share uses percentage residual squared so it reconciles with held-out RMS. Seconds-squared share is also saved in JSON; long laps otherwise receive more weight.

| Group | Track | Real s | Predicted s | Signed s | Signed % | Share of squared % error |
|---|---|---:|---:|---:|---:|---:|
| f1/2026 | monte-carlo | 72.051000 | 69.716845 | -2.334155 | -3.239587 | 30.748 |
| f1/2026 | singapore | 91.373000 | 90.122542 | -1.250458 | -1.368520 | 5.487 |
| f1/2025 | hungaroring | 75.372000 | 74.318304 | -1.053696 | -1.397994 | 5.726 |
| f1/2025 | sakhir | 89.841000 | 88.931953 | -0.909047 | -1.011840 | 3.000 |
| f1/2026 | spielberg | 66.113000 | 65.236880 | -0.876120 | -1.325185 | 5.145 |
| f1/2025 | catalunya | 71.546000 | 70.726243 | -0.819757 | -1.145776 | 3.846 |
| f1/2025 | silverstone | 84.892000 | 84.128804 | -0.763196 | -0.899020 | 2.368 |
| f1/2025 | austin | 92.510000 | 91.785563 | -0.724437 | -0.783090 | 1.797 |
| f1/2026 | baku | 102.526000 | 101.847929 | -0.678071 | -0.661365 | 1.281 |
| f1/2026 | melbourne | 78.518000 | 77.856092 | -0.661908 | -0.843002 | 2.082 |
| f1/2025 | yas-marina-circuit | 82.207000 | 81.673589 | -0.533411 | -0.648864 | 1.234 |
| f1/2025 | suzuka | 86.983000 | 86.519811 | -0.463189 | -0.532505 | 0.831 |
| f1/2025 | spielberg | 63.971000 | 63.599651 | -0.371349 | -0.580496 | 0.987 |
| f1/2025 | imola | 74.670000 | 74.318390 | -0.351610 | -0.470886 | 0.650 |
| f1/2025 | monza | 78.792000 | 78.454831 | -0.337169 | -0.427923 | 0.536 |
| f1/2025 | miami | 86.204000 | 85.982040 | -0.221960 | -0.257482 | 0.194 |
| f1/2025 | mexico-city | 75.586000 | 75.375248 | -0.210752 | -0.278824 | 0.228 |
| f1/2025 | singapore | 89.158000 | 88.961473 | -0.196527 | -0.220425 | 0.142 |
| f1/2026 | catalunya | 74.679000 | 74.631009 | -0.047991 | -0.064263 | 0.012 |
| f1/2026 | miami | 87.798000 | 87.807614 | 0.009614 | 0.010950 | 0.000 |
| f1/2026 | spa-francorchamps | 104.361000 | 104.376476 | 0.015476 | 0.014830 | 0.001 |
| f1/2025 | jeddah | 87.294000 | 87.572550 | 0.278550 | 0.319094 | 0.298 |
| f1/2025 | spa-francorchamps | 100.562000 | 100.900660 | 0.338660 | 0.336767 | 0.332 |
| f1/2025 | zandvoort | 68.662000 | 69.040619 | 0.378619 | 0.551425 | 0.891 |
| f1/2026 | mexico-city | 76.514000 | 76.960874 | 0.446874 | 0.584042 | 0.999 |
| f1/2026 | monza | 81.786000 | 82.263154 | 0.477154 | 0.583417 | 0.997 |
| f1/2025 | monte-carlo | 69.954000 | 70.472254 | 0.518254 | 0.740849 | 1.608 |
| f1/2026 | shanghai | 92.064000 | 92.767142 | 0.703142 | 0.763753 | 1.709 |
| f1/2026 | austin | 94.035000 | 94.740937 | 0.705937 | 0.750717 | 1.651 |
| f1/2026 | hungaroring | 77.207000 | 77.988157 | 0.781157 | 1.011770 | 2.999 |
| f1/2025 | lusail | 79.387000 | 80.239806 | 0.852806 | 1.074239 | 3.381 |
| f1/2025 | melbourne | 75.096000 | 76.018414 | 0.922414 | 1.228313 | 4.420 |
| f1/2026 | silverstone | 88.111000 | 89.304670 | 1.193670 | 1.354735 | 5.377 |
| f1/2025 | shanghai | 90.641000 | 92.233329 | 1.592329 | 1.756743 | 9.042 |

| Track | n | Mean signed % | Squared % error share | Squared seconds error share |
|---|---:|---:|---:|---:|
| monte-carlo | 2 | -1.249369 | 32.356 | 26.497 |
| shanghai | 2 | 1.260248 | 10.751 | 14.043 |
| hungaroring | 2 | -0.193112 | 8.725 | 7.974 |
| silverstone | 2 | 0.227858 | 7.745 | 9.304 |
| melbourne | 2 | 0.192655 | 6.502 | 5.974 |
| spielberg | 2 | -0.952841 | 6.132 | 4.197 |
| singapore | 2 | -0.794473 | 5.629 | 7.426 |
| catalunya | 2 | -0.605020 | 3.858 | 3.125 |
| austin | 2 | -0.016187 | 3.448 | 4.742 |
| lusail | 1 | 1.074239 | 3.381 | 3.371 |
| sakhir | 1 | -1.011840 | 3.000 | 3.830 |
| monza | 2 | 0.077747 | 1.534 | 1.582 |
| baku | 1 | -0.661365 | 1.281 | 2.131 |
| yas-marina-circuit | 1 | -0.648864 | 1.234 | 1.319 |
| mexico-city | 2 | 0.152609 | 1.227 | 1.131 |
| zandvoort | 1 | 0.551425 | 0.891 | 0.664 |
| suzuka | 1 | -0.532505 | 0.831 | 0.994 |
| imola | 1 | -0.470886 | 0.650 | 0.573 |
| spa-francorchamps | 2 | 0.175798 | 0.333 | 0.533 |
| jeddah | 1 | 0.319094 | 0.298 | 0.360 |
| miami | 2 | -0.123266 | 0.195 | 0.229 |

## F1: lap parts

Sector residuals use held-out cars and factors; F1 time-only team/development multiplier is included. WEC sector positions come from the verified WEC mapping, not the F1 timing lines. All valid mapped observations are reported, including measurements excluded from the fitting objective by its frozen sector-share eligibility check.

| Group | Part | n | Mean signed error | RMS error | Unit |
|---|---|---:|---:|---:|---|
| f1/2025 | sector 1 | 20 | 0.329595 | 0.589174 | seconds |
| f1/2025 | sector 2 | 20 | -0.160755 | 0.751620 | seconds |
| f1/2025 | sector 3 | 20 | -0.272563 | 0.662159 | seconds |
| f1/2025 | slow corner minimum | 100 | -7.379592 | 14.750378 | km/h |
| f1/2025 | medium corner minimum | 75 | -16.599404 | 30.682404 | km/h |
| f1/2025 | fast corner minimum | 7 | -7.317330 | 16.670392 | km/h |
| f1/2025 | straights | 195 | 2.193337 | 15.620071 | km/h |
| f1/2025 | brakes | 153 | 18.809984 | 44.355637 | m |
| f1/2026 | sector 1 | 14 | -0.400702 | 0.976658 | seconds |
| f1/2026 | sector 2 | 14 | -0.156129 | 1.088432 | seconds |
| f1/2026 | sector 3 | 14 | 0.448569 | 0.858478 | seconds |
| f1/2026 | slow corner minimum | 89 | -9.878660 | 15.962397 | km/h |
| f1/2026 | medium corner minimum | 36 | -31.506428 | 36.619035 | km/h |
| f1/2026 | fast corner minimum | 4 | -21.290798 | 41.051409 | km/h |
| f1/2026 | straights | 142 | 10.530227 | 21.257482 | km/h |
| f1/2026 | brakes | 109 | 9.750692 | 35.465071 | m |

Lap-part n counts observations, not independent laps. F1 corner bands use measured minimum speed: slow <150, medium 150–250, fast ≥250 km/h. Minima and straight-end maxima are matched within ±50 m. Observed braking onset uses saved brake-active rising edges. Simulated onset is inferred from the speed profile; positive bias means later simulated braking. Pairing is one-to-one within 200 m; unmatched events are recorded. This is not a measured brake-pressure comparison. WEC has no measured corner-speed or braking-point channel in these saved inputs. Full per-row sectors, corners, straight maxima and braking matches are in baseline-residuals.json.

## F1: feature correlations

Pearson r against signed percent residual. “Within group” removes each class-season mean from feature and residual. Leave-one-track range shows sensitivity to removing all rows from one track; it is not a confidence interval. Weather and shared-factor associations are confounded by track identity.

| Feature | n | Unique tracks | Pearson r | Within-group r | Leave-one-track r min | max |
|---|---:|---:|---:|---:|---:|---:|
| airDensityKgM3 | 34 | 21 | -0.001 | -0.002 | -0.074 | 0.137 |
| altitudeM | 0 | 0 | unknown | unknown | unknown | unknown |
| factorSourceLatestSeason | 34 | 21 | -0.022 | -0.030 | -0.090 | 0.040 |
| fullThrottleDistanceShare | 34 | 21 | 0.221 | 0.223 | 0.037 | 0.290 |
| fullThrottleShare | 34 | 21 | 0.203 | 0.208 | 0.035 | 0.264 |
| meanCornerSpeedKph | 34 | 21 | 0.173 | 0.173 | 0.062 | 0.296 |
| trackDrag | 34 | 21 | -0.252 | -0.263 | -0.303 | -0.139 |
| trackGrip | 34 | 21 | 0.085 | 0.082 | 0.046 | 0.148 |
| trackLengthM | 34 | 21 | 0.289 | 0.289 | 0.197 | 0.323 |
| trackTempC | 34 | 21 | 0.030 | 0.037 | -0.058 | 0.128 |
| windSpeedMs | 34 | 21 | 0.038 | 0.039 | -0.040 | 0.120 |

## WEC: signed held-out rows, sorted by error

Squared-error share uses percentage residual squared so it reconciles with held-out RMS. Seconds-squared share is also saved in JSON; long laps otherwise receive more weight.

| Group | Track | Real s | Predicted s | Signed s | Signed % | Share of squared % error |
|---|---|---:|---:|---:|---:|---:|
| wec-lmdh/2026 | imola | 90.419000 | 88.876246 | -1.542754 | -1.706227 | 6.481 |
| wec-lmdh/2025 | imola | 89.885000 | 88.351808 | -1.533192 | -1.705727 | 6.477 |
| wec-lmgt3/2026 | interlagos | 93.350000 | 91.858310 | -1.491690 | -1.597954 | 5.684 |
| wec-lmgt3/2025 | sakhir | 121.661000 | 120.304755 | -1.356245 | -1.114774 | 2.767 |
| wec-lmgt3/2025 | imola | 102.326000 | 101.061630 | -1.264370 | -1.235629 | 3.399 |
| wec-lmgt3/2025 | interlagos | 93.849000 | 92.591737 | -1.257263 | -1.339666 | 3.995 |
| wec-lmh/2025 | imola | 88.920000 | 87.714619 | -1.205381 | -1.355579 | 4.091 |
| wec-lmh/2026 | interlagos | 83.387000 | 82.216416 | -1.170584 | -1.403797 | 4.387 |
| wec-lmh/2026 | imola | 90.088000 | 88.952160 | -1.135840 | -1.260812 | 3.539 |
| wec-lmdh/2026 | interlagos | 83.041000 | 82.347921 | -0.693079 | -0.834623 | 1.551 |
| wec-lmh/2025 | sakhir | 106.826000 | 106.283647 | -0.542353 | -0.507697 | 0.574 |
| wec-lmgt3/2026 | austin | 125.103000 | 124.670692 | -0.432308 | -0.345561 | 0.266 |
| wec-lmdh/2025 | interlagos | 82.570000 | 82.150457 | -0.419543 | -0.508106 | 0.575 |
| wec-lmh/2025 | interlagos | 82.948000 | 82.582161 | -0.365839 | -0.441046 | 0.433 |
| wec-lmgt3/2026 | imola | 101.181000 | 100.917016 | -0.263984 | -0.260903 | 0.152 |
| wec-lmh/2026 | catalunya | 90.336000 | 90.165961 | -0.170039 | -0.188230 | 0.079 |
| wec-lmdh/2025 | spa-francorchamps | 120.246000 | 120.093109 | -0.152891 | -0.127149 | 0.036 |
| wec-lmdh/2026 | catalunya | 90.166000 | 90.148613 | -0.017387 | -0.019284 | 0.001 |
| wec-lmdh/2025 | sakhir | 107.543000 | 107.844155 | 0.301155 | 0.280032 | 0.175 |
| wec-lmdh/2026 | monza | 93.460000 | 94.032844 | 0.572844 | 0.612929 | 0.836 |
| wec-lmgt3/2026 | monza | 107.065000 | 107.645697 | 0.580697 | 0.542378 | 0.655 |
| wec-lmgt3/2026 | catalunya | 100.933000 | 101.609686 | 0.676686 | 0.670431 | 1.001 |
| wec-lmh/2026 | monza | 93.364000 | 94.114737 | 0.750737 | 0.804097 | 1.439 |
| wec-lmh/2025 | spa-francorchamps | 119.617000 | 120.868792 | 1.251792 | 1.046500 | 2.438 |
| wec-lmdh/2026 | spa-francorchamps | 120.696000 | 121.949591 | 1.253591 | 1.038635 | 2.402 |
| wec-lmh/2026 | spa-francorchamps | 120.653000 | 122.028712 | 1.375712 | 1.140222 | 2.894 |
| wec-lmdh/2026 | austin | 112.074000 | 113.498738 | 1.424738 | 1.271248 | 3.598 |
| wec-lmh/2026 | austin | 112.020000 | 113.543894 | 1.523894 | 1.360377 | 4.120 |
| wec-lmh/2025 | lusail | 98.359000 | 100.004728 | 1.645728 | 1.673185 | 6.232 |
| wec-lmgt3/2025 | spa-francorchamps | 137.732000 | 139.527806 | 1.795806 | 1.303841 | 3.785 |
| wec-lmgt3/2025 | lusail | 113.861000 | 115.906129 | 2.045129 | 1.796163 | 7.182 |
| wec-lmdh/2025 | lusail | 98.495000 | 100.686634 | 2.191634 | 2.225122 | 11.022 |
| wec-lmgt3/2026 | spa-francorchamps | 136.612000 | 139.158699 | 2.546699 | 1.864184 | 7.736 |

| Track | n | Mean signed % | Squared % error share | Squared seconds error share |
|---|---:|---:|---:|---:|
| lusail | 3 | 1.898156 | 24.437 | 23.366 |
| imola | 6 | -1.254146 | 24.138 | 18.267 |
| spa-francorchamps | 6 | 1.044372 | 19.291 | 29.502 |
| interlagos | 6 | -1.020865 | 16.625 | 11.921 |
| austin | 3 | 0.762021 | 7.983 | 9.070 |
| sakhir | 3 | -0.447480 | 3.515 | 4.444 |
| monza | 3 | 0.653135 | 2.931 | 2.456 |
| catalunya | 3 | 0.154306 | 1.080 | 0.973 |

## WEC: lap parts

Sector residuals use held-out cars and factors; F1 time-only team/development multiplier is included. WEC sector positions come from the verified WEC mapping, not the F1 timing lines. All valid mapped observations are reported, including measurements excluded from the fitting objective by its frozen sector-share eligibility check.

| Group | Part | n | Mean signed error | RMS error | Unit |
|---|---|---:|---:|---:|---|
| wec-lmdh/2025 | sector 1 | 5 | 0.505480 | 0.806663 | seconds |
| wec-lmdh/2025 | sector 2 | 5 | -0.234997 | 0.785254 | seconds |
| wec-lmdh/2025 | sector 3 | 5 | -0.193051 | 0.500005 | seconds |
| wec-lmdh/2025 | lap maximum vs measured trap (positions differ) | 5 | 0.145329 | 14.451073 | km/h |
| wec-lmdh/2026 | sector 1 | 6 | 0.540353 | 0.921388 | seconds |
| wec-lmdh/2026 | sector 2 | 6 | -0.239002 | 0.720291 | seconds |
| wec-lmdh/2026 | sector 3 | 6 | -0.135026 | 0.527227 | seconds |
| wec-lmdh/2026 | lap maximum vs measured trap (positions differ) | 6 | 6.032745 | 16.752218 | km/h |
| wec-lmgt3/2025 | sector 1 | 5 | 0.467630 | 1.047904 | seconds |
| wec-lmgt3/2025 | sector 2 | 5 | -0.286146 | 0.591893 | seconds |
| wec-lmgt3/2025 | sector 3 | 5 | -0.188873 | 0.666356 | seconds |
| wec-lmgt3/2025 | lap maximum vs measured trap (positions differ) | 5 | -2.916863 | 6.295994 | km/h |
| wec-lmgt3/2026 | sector 1 | 6 | 0.646648 | 1.143338 | seconds |
| wec-lmgt3/2026 | sector 2 | 6 | -0.276291 | 0.811695 | seconds |
| wec-lmgt3/2026 | sector 3 | 6 | -0.101006 | 0.620646 | seconds |
| wec-lmgt3/2026 | lap maximum vs measured trap (positions differ) | 6 | 1.648266 | 9.315844 | km/h |
| wec-lmh/2025 | sector 1 | 5 | 0.542378 | 0.917604 | seconds |
| wec-lmh/2025 | sector 2 | 5 | -0.250461 | 0.644374 | seconds |
| wec-lmh/2025 | sector 3 | 5 | -0.135128 | 0.413910 | seconds |
| wec-lmh/2025 | lap maximum vs measured trap (positions differ) | 5 | -1.010485 | 12.967225 | km/h |
| wec-lmh/2026 | sector 1 | 6 | 0.526223 | 0.980213 | seconds |
| wec-lmh/2026 | sector 2 | 6 | -0.233045 | 0.702231 | seconds |
| wec-lmh/2026 | sector 3 | 6 | -0.097532 | 0.554005 | seconds |
| wec-lmh/2026 | lap maximum vs measured trap (positions differ) | 6 | 7.463132 | 19.416476 | km/h |

Lap-part n counts observations, not independent laps. F1 corner bands use measured minimum speed: slow <150, medium 150–250, fast ≥250 km/h. Minima and straight-end maxima are matched within ±50 m. Observed braking onset uses saved brake-active rising edges. Simulated onset is inferred from the speed profile; positive bias means later simulated braking. Pairing is one-to-one within 200 m; unmatched events are recorded. This is not a measured brake-pressure comparison. WEC has no measured corner-speed or braking-point channel in these saved inputs. Full per-row sectors, corners, straight maxima and braking matches are in baseline-residuals.json.

## WEC: feature correlations

Pearson r against signed percent residual. “Within group” removes each class-season mean from feature and residual. Leave-one-track range shows sensitivity to removing all rows from one track; it is not a confidence interval. Weather and shared-factor associations are confounded by track identity.

| Feature | n | Unique tracks | Pearson r | Within-group r | Leave-one-track r min | max |
|---|---:|---:|---:|---:|---:|---:|
| airDensityKgM3 | 33 | 8 | 0.398 | 0.413 | 0.115 | 0.637 |
| altitudeM | 0 | 0 | unknown | unknown | unknown | unknown |
| bopAbove250Pct | 10 | 5 | 0.262 | 0.267 | 0.040 | 0.524 |
| bopMassKg | 10 | 5 | -0.061 | -0.063 | -0.203 | 0.452 |
| bopPowerKW | 10 | 5 | -0.360 | -0.361 | -0.622 | -0.183 |
| bopStintMJ | 10 | 5 | -0.408 | -0.416 | -0.510 | -0.341 |
| f1OwnGrip | 33 | 8 | -0.128 | -0.128 | -0.346 | 0.721 |
| factorSourceLatestSeason | 5 | 5 | 0.434 | 0.434 | 0.369 | 0.909 |
| fullThrottleShare | 0 | 0 | unknown | unknown | unknown | unknown |
| meanCornerSpeedKph | 0 | 0 | unknown | unknown | unknown | unknown |
| trackDrag | 0 | 0 | unknown | unknown | unknown | unknown |
| trackGrip | 33 | 8 | -0.106 | -0.107 | -0.271 | 0.626 |
| trackLengthM | 33 | 8 | 0.622 | 0.625 | 0.514 | 0.709 |
| trackTempC | 33 | 8 | -0.328 | -0.331 | -0.614 | -0.172 |
| windSpeedMs | 33 | 8 | 0.080 | 0.105 | -0.407 | 0.280 |

## Factor provenance and missing measurements

F1 factors are jointly fitted from the other seasons in each fold. The JSON lists all source seasons; latest source year is only a summary, not a claim that one year alone supplied the factor. WEC own-F1 factors use the latest stored season; B-transfer factors come from a joint 2023–2026 fit with per-track lineage not retained, so their source-year correlation is unknown. BoP joins are exact event/model/entry matches for verified Hypercar 2025 only; 2026 and LMGT3 cells stay unknown. No BoP zero is invented. Geographic altitude is absent from the pinned evidence, and pressure-derived altitude is not substituted. Measured WEC throttle share and corner speed are also absent.

## Three patterns and their possible meaning

The largest F1 error is Monaco 2026: it contributes about 31% of F1 squared percentage error, so the aggregate is sensitive to one low-speed circuit; this points first to a session/geometry/energy audit, not a broad tyre-temperature fit. Across F1 laps, medium-speed corner minima are too slow while straight-end speeds are too high, especially in 2026: errors cancel across the lap, pointing to aero-mode, energy-delivery or braking-shape mismatch rather than one scalar grip correction. WEC has shared track signs across classes—Lusail and Spa too slow, Imola and Interlagos too fast—and a strong raw track-length correlation; this points to common geometry/track-factor transfer or sector allocation, with weather and BoP correlations confounded by track. These are explainable diagnostic patterns, not proof of one cause; the independent track count is small.

## Recommended next experiment

After completing the current round diagnostic, declare one F1 experiment replacing guessed low-drag straight zones with verified per-event zones, keeping weights, bounds, kernel battery behaviour and fold rule fixed. Judge held-out lap error together with matched straight-end speed, corner minimum and braking bias. Verify zone sources before launch. Do not tune weather, BoP or track factors to these residuals. A WEC alternative first needs measured trap positions; its current lap-maximum comparison cannot isolate drag. No experiment beyond the already-authorized round sweep was launched.

## Reproduction and limitations

Run `node scripts/sim/analyse-owner-residuals.mjs`, then `python scripts/sim/report-owner-residuals.py` from the diagnostics checkout after restoring the pinned aligned control traces. The first script asserts all saved lap residuals. No optimizer is called. The raw input traces remain outside git; only derived residuals are saved. Hashes are in baseline-residuals.json.

- Altitude is not available as a verified track feature in these inputs; pressure is not substituted for surveyed altitude.
- F1 slow/medium/fast bins use measured minima below150/150–250/at least250kmh; extrema and ±50m alignment are proxies.
- Observed brake-active rising edges from the pinned OpenF1 brake channel, paired one-to-one with simulated speed-deceleration landmarks within 200m. Positive bias = simulated onset later. Matching remains approximate; unmatched edges are recorded. Brake indicator is not pressure. Original speed-only comparison retained in brakesSpeedProxy.
- WEC lap maximum vs trap is not an end-of-straight position match.
- WEC measured full-throttle share and corner minimum speeds are unavailable.
- Fold factors use multiple other seasons; main-fit factors must not replace hidden-fold factors.
- Old-kernel replay holds current fitted states fixed; it does not recreate missing production held-out fits.

## Observed brake and throttle audit

Observed brake-active rising edges from the pinned OpenF1 brake channel, paired one-to-one with simulated speed-deceleration landmarks within 200m. Positive bias = simulated onset later. Matching remains approximate; unmatched edges are recorded. Brake indicator is not pressure. Original speed-only comparison retained in brakesSpeedProxy.

fullThrottleShare is the sample fraction at throttle>=98 among valid 0–100 readings. fullThrottleDistanceShare weights adjacent flags by projected travel distance, excluding invalid throttle readings and backwards/over-200m intervals and requiring 80–120% lap coverage. It is distance share, not time share; timestamps are absent from this normalized snapshot.

| Season | Track | Observed brake edges | Simulated landmarks | Matched n | Unmatched observed | Mean signed bias m | Throttle distance coverage |
|---:|---|---:|---:|---:|---:|---:|---:|
| 2025 | monza | 7 | 6 | 6 | 1 | 22.319537 | 0.993750 |
| 2025 | singapore | 12 | 12 | 12 | 0 | -0.786057 | 0.996577 |
| 2025 | austin | 9 | 11 | 9 | 0 | 0.178732 | 0.997751 |
| 2025 | mexico-city | 10 | 9 | 8 | 2 | -2.377130 | 0.995732 |
| 2025 | yas-marina-circuit | 7 | 8 | 7 | 0 | 16.352479 | 0.996715 |
| 2025 | sakhir | 8 | 8 | 8 | 0 | -5.213353 | 0.993001 |
| 2025 | jeddah | 7 | 7 | 7 | 0 | 22.794975 | 0.997250 |
| 2025 | miami | 8 | 8 | 8 | 0 | 8.524019 | 0.996709 |
| 2025 | catalunya | 6 | 7 | 6 | 0 | 13.302345 | 0.993906 |
| 2025 | spa-francorchamps | 7 | 8 | 6 | 1 | 55.093145 | 0.999138 |
| 2025 | zandvoort | 9 | 8 | 7 | 2 | 23.509821 | 0.987218 |
| 2025 | shanghai | 9 | 8 | 8 | 1 | 37.779732 | 0.996103 |
| 2025 | monte-carlo | 13 | 12 | 12 | 1 | 16.179401 | 0.993181 |
| 2025 | spielberg | 6 | 7 | 6 | 0 | 19.875150 | 0.990409 |
| 2025 | hungaroring | 13 | 11 | 11 | 2 | 37.646148 | 0.997117 |
| 2025 | lusail | 7 | 9 | 7 | 0 | 56.931389 | 0.996333 |
| 2025 | melbourne | 7 | 9 | 6 | 1 | 25.078779 | 0.993192 |
| 2025 | suzuka | 6 | 9 | 5 | 1 | 30.171020 | 0.990324 |
| 2025 | imola | 8 | 8 | 8 | 0 | 13.320232 | 0.991153 |
| 2025 | silverstone | 7 | 8 | 6 | 1 | 9.872290 | 0.994267 |
| 2026 | miami | 8 | 8 | 8 | 0 | 7.272703 | 0.996541 |
| 2026 | silverstone | 7 | 8 | 7 | 0 | 16.488309 | 0.995005 |
| 2026 | austin | 10 | 9 | 9 | 1 | -5.075016 | 0.994764 |
| 2026 | monte-carlo | 13 | 11 | 11 | 2 | 11.807061 | 0.992569 |
| 2026 | baku | 12 | 10 | 10 | 2 | 11.985361 | 1.000453 |
| 2026 | singapore | 12 | 12 | 12 | 0 | -9.876567 | 0.996227 |
| 2026 | melbourne | 5 | 7 | 5 | 0 | 6.715846 | 0.993363 |
| 2026 | catalunya | 7 | 8 | 6 | 1 | 0.449861 | 0.995292 |
| 2026 | spa-francorchamps | 7 | 9 | 6 | 1 | 39.489854 | 0.995007 |
| 2026 | monza | 6 | 6 | 5 | 1 | -7.699302 | 0.944440 |
| 2026 | shanghai | 8 | 9 | 6 | 2 | 39.319051 | 0.998713 |
| 2026 | spielberg | 8 | 7 | 6 | 2 | 25.255867 | 0.999336 |
| 2026 | hungaroring | 10 | 11 | 10 | 0 | 24.269969 | 0.994574 |
| 2026 | mexico-city | 10 | 9 | 8 | 2 | -7.647744 | 0.994247 |

Reproduce this addendum with node scripts/sim/analyse-owner-brake-observations.mjs after restoring pinned aligned traces. This replays the same 34 saved F1 folds and changes no fit, model or gate.

Signal audit: all 262 matched brake onsets use the recorded value 100. One rising edge with value 104 (Shanghai 2026) is unmatched and contributes no braking-bias value. Its physical meaning is not assumed. The raw edge counts include that unmatched record. Across all 34 F1 laps, distance coverage for the throttle calculation is 94.443985–100.045326%; no throttle samples fall outside 0–100. All 67 held-out predictions are unchanged by this measurement-only update.
