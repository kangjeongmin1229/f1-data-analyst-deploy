# LapSim pipeline report — run 45712552853

Mode: **research** (not a production number) · repo kangjeongmin1229/f1-data-analyst-deploy · commit `2611336b5d4d9262bf3a4213abc210132cba1a89` · snapshot `lapsim-inputs-r45123509702` (sha256 `88fbb3bceb4519c73371941e0faa2f8aee85b4f27f15109b5a13f5a0863823ca`) · generated 2026-11-25T23:32:29.773Z

Fit settings (.github/lapsim-fit.env): LAPSIM_FIA_ZONES=on, LAPSIM_PU_QUALI=on, LAPSIM_PU_RAMP=on, LAPSIM_BRAKE_ENV_HYPER=8.63,0.003234, LAPSIM_TRACE_MASK=1, LAPSIM_FE_AXLE=v1, LAPSIM_FE_BRAKE=on, LAPSIM_HOLDOUT_YEARS=2023,2024,2025, LAPSIM_CLA_MAX=14. Seeds: fit: none (deterministic Nelder–Mead / BCD); condition-report bootstrap seed 7; gate.mjs sign-flip / bootstrap seed 1.

Fit job: failure.

## Held-out lap error (RMS %, shipped → this run)

| group | n | shipped | this run |
|---|---|---|---|
| all | 53 | 0.893 | 0.896 |
| f1 | 20 | 0.734 | 0.708 |
| wec | 33 | 0.977 | 0.992 |
| f1/2025 | 20 | 0.734 | 0.708 |
| wec-lmh/2025 | 5 | 0.667 | 0.658 |
| wec-lmh/2026 | 6 | 1.084 | 1.145 |
| wec-lmdh/2025 | 5 | 0.811 | 0.844 |
| wec-lmdh/2026 | 6 | 0.893 | 0.928 |
| wec-lmgt3/2025 | 5 | 1.281 | 1.236 |
| wec-lmgt3/2026 | 6 | 0.994 | 1.008 |

Ship rule, gate honest (paired harm per held-out track/event vs shipped, one-sided 95 % UB ≤ 0.15 pp, no row worse than +1.0 pp, no fitted parameter at a bound): f1 n 20, mean -0.0256 pp, UB 0.1486 pp, worse 6, worst row +1.2244 pp (over +1.0: f1/2025|catalunya) → FAIL; wec n 33, mean 0.0112 pp, UB 0.0588 pp, worse 16, worst row +0.3984 pp → PASS.

WEC per class (paired harm, all seasons of the class):

| class | n | mean pp | UB pp | worse | worst pp | rows > +1.0 pp | pass |
|---|---|---|---|---|---|---|---|
| wec-lmh | 11 | 0.0178 | 0.1157 | 5 | 0.3984 | 0 | pass |
| wec-lmdh | 11 | 0.0438 | 0.1389 | 6 | 0.3745 | 0 | pass |
| wec-lmgt3 | 11 | -0.0279 | 0.0457 | 5 | 0.1843 | 0 | pass |

WEC per track (mean over the class × season rows that hold it out):

| track | rows | mean harm pp | max harm pp |
|---|---|---|---|
| monza | 3 | 0.2866 | 0.3984 |
| catalunya | 3 | 0.2465 | 0.2817 |
| lusail | 3 | 0.0337 | 0.0492 |
| imola | 6 | -0.0056 | 0.081 |
| interlagos | 6 | -0.0176 | 0.0161 |
| spa-francorchamps | 6 | -0.0491 | 0.0542 |
| sakhir | 3 | -0.0571 | 0.1423 |
| austin | 3 | -0.2413 | -0.2 |

Fitted cars (this run): μx, μy, μx/μy, ClA and every parameter on a fit bound:

| car | μx | μy | μx/μy | ClA | at bound |
|---|---|---|---|---|---|
| f1/2023 | 1.2259 | 1.7514 | 0.7 | 7.9893 | – |
| f1/2024 | 1.0521 | 1.5029 | 0.7 | 12.8917 | **clA at max** |
| f1/2025 | 1.0526 | 1.5037 | 0.7 | 13.1566 | **clA at max** |
| f1/2026 | 1.4597 | 1.6366 | 0.8919 | 7.3694 | – |
| wec-lmh/2025 | 1.4713 | 1.6093 | 0.9143 | 7 | **clA at max** |
| wec-lmh/2026 | 1.4208 | 1.554 | 0.9143 | 7 | **clA at max** |
| wec-lmdh/2025 | 1.4628 | 1.5999 | 0.9143 | 7 | **clA at max** |
| wec-lmdh/2026 | 1.4205 | 1.5536 | 0.9143 | 6.994 | – |
| wec-lmgt3/2025 | 1.4991 | 1.6025 | 0.9355 | 3.5 | **clA at max** |
| wec-lmgt3/2026 | 1.5268 | 1.6321 | 0.9355 | 3.5 | **clA at max** |

Ships per series: f1 **blocked (keeps the shipped calibration): series rule; at bound: f1/2024 clA max, f1/2025 clA max** · wec **blocked (keeps the shipped calibration): at bound: wec-lmh/2025 clA max, wec-lmh/2026 clA max, wec-lmdh/2025 clA max, wec-lmgt3/2025 clA max, wec-lmgt3/2026 clA max** · fe ships.

Reproduction: **101 held-out rows and 59 car parameters differ** (tables below).

| car | param | shipped | this run |
|---|---|---|---|
| f1 2023 | muX | 1.563 | 1.2259 |
| f1 2023 | muY | 1.7525 | 1.7514 |
| f1 2023 | muXTrac | 1.8472 | 1.846 |
| f1 2023 | clA | 7.2873 | 7.9893 |
| f1 2023 | cdA | 1.2686 | 1.5859 |
| f1 2023 | cdALow | 0.7614 | 1.2338 |
| f1 2023 | pIce | 482526.5472 | 546691.3482 |
| f1 2024 | muX | 1.5501 | 1.0521 |
| f1 2024 | muY | 1.738 | 1.5029 |
| f1 2024 | muXTrac | 1.8319 | 1.5842 |
| f1 2024 | clA | 8 | 12.8917 |
| f1 2024 | cdA | 1.2029 | 1.5534 |
| f1 2024 | cdALow | 0.7717 | 1.2086 |
| f1 2024 | pIce | 476000 | 541945.3967 |
| f1 2025 | muX | 1.583 | 1.0526 |
| f1 2025 | muY | 1.7749 | 1.5037 |
| f1 2025 | muXTrac | 1.8708 | 1.585 |
| f1 2025 | clA | 8 | 13.1566 |
| f1 2025 | cdA | 1.178 | 1.5264 |
| f1 2025 | cdALow | 0.79 | 1.1875 |
| f1 2025 | pIce | 476000 | 544819.9487 |
| f1 2026 | muX | 1.5329 | 1.4597 |
| f1 2026 | muY | 1.7187 | 1.6366 |
| f1 2026 | muXTrac | 1.8116 | 1.7251 |
| f1 2026 | clA | 6.6455 | 7.3694 |
| f1 2026 | cdA | 1.889 | 1.8367 |
| f1 2026 | cdALow | 1.1394 | 1.0529 |
| wec-lmh 2025 | muX | 1.4759 | 1.4713 |
| wec-lmh 2025 | muY | 1.6143 | 1.6093 |
| wec-lmh 2025 | muXTrac | 1.5682 | 1.5633 |
| wec-lmh 2025 | cdA | 1.0695 | 1.0218 |
| wec-lmh 2025 | cdALow | 1.0695 | 1.0218 |
| wec-lmh 2026 | muX | 1.4419 | 1.4208 |
| wec-lmh 2026 | muY | 1.5771 | 1.554 |
| wec-lmh 2026 | muXTrac | 1.532 | 1.5096 |
| wec-lmh 2026 | clA | 6.315 | 7 |
| wec-lmh 2026 | cdA | 0.9454 | 1.0158 |
| wec-lmh 2026 | cdALow | 0.9454 | 1.0158 |
| wec-lmdh 2025 | muX | 1.4665 | 1.4628 |
| wec-lmdh 2025 | muY | 1.604 | 1.5999 |
| wec-lmdh 2025 | muXTrac | 1.5582 | 1.5542 |
| wec-lmdh 2025 | cdA | 1.0871 | 1.0448 |
| wec-lmdh 2025 | cdALow | 1.0871 | 1.0448 |
| wec-lmdh 2026 | muX | 1.4335 | 1.4205 |
| wec-lmdh 2026 | muY | 1.5679 | 1.5536 |
| wec-lmdh 2026 | muXTrac | 1.5231 | 1.5092 |
| wec-lmdh 2026 | clA | 6.4628 | 6.994 |
| wec-lmdh 2026 | cdA | 0.9318 | 0.9993 |
| wec-lmdh 2026 | cdALow | 0.9318 | 0.9993 |
| wec-lmgt3 2025 | muX | 1.5021 | 1.4991 |
| wec-lmgt3 2025 | muY | 1.6057 | 1.6025 |
| wec-lmgt3 2025 | muXTrac | 1.5539 | 1.5508 |
| wec-lmgt3 2025 | cdA | 1.3 | 1.2408 |
| wec-lmgt3 2025 | cdALow | 1.3 | 1.2408 |
| wec-lmgt3 2026 | muX | 1.5166 | 1.5268 |
| wec-lmgt3 2026 | muY | 1.6212 | 1.6321 |
| wec-lmgt3 2026 | muXTrac | 1.5689 | 1.5795 |
| wec-lmgt3 2026 | cdA | 1.2659 | 1.2631 |
| wec-lmgt3 2026 | cdALow | 1.2659 | 1.2631 |

| held-out row | shipped % | this run % |
|---|---|---|
| f1/2025|monza | -0.0736 | -0.9201 |
| f1/2025|singapore | -0.4419 | -0.2826 |
| f1/2025|austin | -0.6864 | 0.0346 |
| f1/2025|mexico-city | -0.5821 | -0.2765 |
| f1/2025|yas-marina-circuit | -0.4172 | -0.017 |
| f1/2025|sakhir | -1.2567 | -1.2478 |
| f1/2025|jeddah | -0.4009 | -0.3861 |
| f1/2025|miami | -0.7679 | -0.268 |
| f1/2025|catalunya | -0.3606 | 1.585 |
| f1/2025|spa-francorchamps | -0.0845 | 0.2934 |
| f1/2025|zandvoort | 0.118 | -0.4005 |
| f1/2025|shanghai | 1.6957 | 1.1319 |
| f1/2025|monte-carlo | -0.243 | 0.4875 |
| f1/2025|spielberg | -1.0427 | -0.9801 |
| f1/2025|hungaroring | -1.0972 | -0.9141 |
| f1/2025|lusail | 1.0128 | 0.679 |
| f1/2025|melbourne | 0.7737 | 0.7111 |
| f1/2025|suzuka | 0.1644 | -0.3035 |
| f1/2025|imola | -0.4393 | 0.3027 |
| f1/2025|silverstone | 0.172 | -0.0978 |
| f1/2026|shanghai | 1.2676 | null |
| f1/2026|spielberg | -0.3797 | null |
| f1/2026|austin | 1.2899 | null |
| f1/2026|mexico-city | 1.0743 | null |
| f1/2026|miami | 0.9533 | null |
| f1/2026|silverstone | -0.2769 | null |
| f1/2026|baku | 0.2926 | null |
| f1/2026|las-vegas | -0.1566 | null |
| f1/2026|monte-carlo | -2.1082 | null |
| f1/2026|catalunya | -1.3645 | null |
| f1/2026|singapore | -0.7223 | null |
| f1/2026|melbourne | -0.4623 | null |
| f1/2026|spa-francorchamps | -0.276 | null |
| f1/2026|hungaroring | -0.2798 | null |
| f1/2026|monza | -0.3228 | null |
| wec-lmh/2025|imola | -0.1968 | -0.2778 |
| wec-lmh/2025|interlagos | -0.5956 | -0.5618 |
| wec-lmh/2025|lusail | 1.0086 | 1.035 |
| wec-lmh/2025|sakhir | -0.3772 | -0.2855 |
| wec-lmh/2025|spa-francorchamps | 0.8193 | 0.7883 |
| wec-lmh/2026|austin | 1.3024 | 1.1025 |
| wec-lmh/2026|catalunya | -0.9044 | -1.1778 |
| wec-lmh/2026|imola | -0.2065 | -0.1388 |
| wec-lmh/2026|interlagos | -1.7209 | -1.7293 |
| wec-lmh/2026|monza | 0.9918 | 1.3903 |
| wec-lmh/2026|spa-francorchamps | 0.7393 | 0.5719 |
| wec-lmdh/2025|imola | -0.534 | -0.6108 |
| wec-lmdh/2025|interlagos | -0.6237 | -0.6068 |
| wec-lmdh/2025|lusail | 1.5574 | 1.5828 |
| wec-lmdh/2025|sakhir | 0.2938 | 0.4361 |
| wec-lmdh/2025|spa-francorchamps | -0.316 | -0.3518 |
| wec-lmdh/2026|austin | 1.2144 | 0.9806 |
| wec-lmdh/2026|catalunya | -0.6399 | -0.9216 |
| wec-lmdh/2026|imola | -0.6592 | -0.5994 |
| wec-lmdh/2026|interlagos | -1.1464 | -1.1344 |
| wec-lmdh/2026|monza | 0.7843 | 1.1588 |
| wec-lmdh/2026|spa-francorchamps | 0.7332 | 0.6015 |
| wec-lmgt3/2025|imola | -1.1766 | -1.1512 |
| wec-lmgt3/2025|interlagos | -1.2797 | -1.2126 |
| wec-lmgt3/2025|lusail | 1.6757 | 1.7249 |
| wec-lmgt3/2025|sakhir | -0.9633 | -0.7414 |
| wec-lmgt3/2025|spa-francorchamps | 1.2045 | 1.1501 |
| wec-lmgt3/2026|austin | -0.5587 | -0.2686 |
| wec-lmgt3/2026|catalunya | 0.2546 | 0.4389 |
| wec-lmgt3/2026|imola | -0.335 | -0.2965 |
| wec-lmgt3/2026|interlagos | -1.7215 | -1.7375 |
| wec-lmgt3/2026|monza | 0.4147 | 0.5016 |
| wec-lmgt3/2026|spa-francorchamps | 1.5167 | 1.5709 |
| f1/2023|monte-carlo | null | -1.1883 |
| f1/2023|spielberg | null | 0.2935 |
| f1/2023|austin | null | -0.7337 |
| f1/2023|las-vegas | null | 0.4314 |
| f1/2023|baku | null | 1.4161 |
| f1/2023|monza | null | -1.02 |
| f1/2023|suzuka | null | -1.2028 |
| f1/2023|lusail | null | -2.7 |
| f1/2023|sakhir | null | 0.7903 |
| f1/2023|hungaroring | null | 0.265 |
| f1/2023|mexico-city | null | 1.0393 |
| f1/2023|yas-marina-circuit | null | 1.6286 |
| f1/2023|jeddah | null | 0.503 |
| f1/2023|miami | null | -0.3685 |
| f1/2023|singapore | null | -0.5682 |
| f1/2024|jeddah | null | 0.2744 |
| f1/2024|shanghai | null | 0.6855 |
| f1/2024|miami | null | -0.0332 |
| f1/2024|austin | null | -0.0661 |
| f1/2024|yas-marina-circuit | null | -1.1974 |
| f1/2024|monte-carlo | null | 1.8785 |
| f1/2024|zandvoort | null | 0.6287 |
| f1/2024|baku | null | 0.2032 |
| f1/2024|singapore | null | 1.1315 |
| f1/2024|las-vegas | null | -2.0875 |
| f1/2024|catalunya | null | 1.3491 |
| f1/2024|spielberg | null | 1.4118 |
| f1/2024|monza | null | 0.4387 |
| f1/2024|lusail | null | 2.2007 |
| f1/2024|sakhir | null | -0.6403 |
| f1/2024|suzuka | null | -2.2518 |
| f1/2024|imola | null | -0.8014 |
| f1/2024|mexico-city | null | -0.6597 |

## Level C and forward chaining (RMS %, shipped → this run)

| group | level C shipped | level C | forward shipped | forward |
|---|---|---|---|---|
| f1-2025 | 3.093 | 2.982 | 3.181 | 3.128 |
| f1-2026 | 2.695 | 2.421 | 1.302 | 1.358 |
| wec-lmh | 1.889 | 1.938 | 0.917 | 1.02 |
| wec-lmdh | 1.658 | 1.7 | 0.699 | 0.798 |
| wec-lmgt3 | 1.858 | 1.858 | 0.882 | 0.891 |
| f1 | 2.92 | 2.744 | 2.516 | 2.492 |
| wec | 1.805 | 1.835 | 0.838 | 0.908 |
| all | 2.625 | 2.497 | 2.141 | 2.131 |

FE ship rule (event-hidden paired harm per row vs shipped, build-fe.mjs on this run's kernel): n 32, mean -0.01 pp, UB 0.022 pp, worse 12, worst row +0.25 pp (limit +1.0) → pass.

## Change-effects table (track-state build on the pinned inputs)

Effects **identical** to the shipped table; registry tracks changed: none; year pairs changed: false. Cases 121 on 18 circuits, skipped 33 (|r − 1| ≥ 0.1 11, wet or < 2 clean laps 16, layout change between years 3, no earlier TI session 2, corner map from another layout 1).

## σ_meas per class (step 34: Q → Hyperpole repeat; IMSA split-half)

| class series | σ_rep lap % [90 %] | pairs |
|---|---|---|
| gt3 elms | –  | 0 |
| gt3 imsa | –  | 0 |
| gt3 wec | 0.2803 [0.2259, 0.3426] | 191 |
| lmdh imsa | –  | 0 |
| lmdh wec | 0.2131 [0.1778, 0.2704] | 112 |
| lmh imsa | –  | 0 |
| lmh wec | 0.217 [0.1451, 0.2902] | 91 |
| lmp2 alms | –  | 0 |
| lmp2 elms | –  | 0 |
| lmp2 imsa | –  | 0 |
| lmp2 wec | 0.3254 [0.1663, 0.6114] | 49 |
| gt3 elms (split-half) | 0.2723 | 95 cars |
| gt3 imsa (split-half) | 0.197 | 820 cars |
| gt3 wec (split-half) | 0.1916 | 91 cars |
| lmdh imsa (split-half) | 0.1664 | 154 cars |
| lmdh wec (split-half) | 0.225 | 20 cars |
| lmh imsa (split-half) | – | 6 cars |
| lmh wec (split-half) | – | 12 cars |
| lmp2 elms (split-half) | 0.2462 | 137 cars |
| lmp2 imsa (split-half) | 0.222 | 281 cars |
| lmp2 wec (split-half) | 0.3169 | 66 cars |

## Endurance / GT3 learning (fit-endurance.mjs, pinned committed tables; RMS %)

Rows 2621, events 316, layouts 56, models 59. Reproduction (date field ignored): **endurance-fit.json 3010 values differ, learned-data.js 5165 values differ** (first 40 each in the JSON).

| group / series | models | before | raw | eventOut | eventOutClass | layoutOut | modelOut |
|---|---|---|---|---|---|---|---|
| gt3 | 2144 | 2.62 | 2.73 | 1.09 | 0.97 | 2.67 | 0.94 |
| lmp2 | 101 | 4.19 | 3.98 | 1.11 | 1.11 | 2.36 | 2.88 |
| lmdh | 249 | 1.91 | 2.18 | 0.97 | 0.91 | 1.95 | 0.86 |
| lmh | 127 | 1.96 | 2.43 | 1.06 | 1.06 | 1.92 | 1.56 |
| gt3 imsa | 594 | 1.73 | 1.93 | 1.01 | 0.88 | 2.5 | 0.89 |
| lmp2 imsa | 40 | 5.27 | 4.73 | 0.81 | 0.81 | 2.02 | 3.78 |
| lmdh imsa | 145 | 2.26 | 2.11 | 0.87 | 0.71 | 2.14 | 0.91 |
| lmh imsa | 17 | 2.09 | 2.19 | 0.84 | 0.84 | 2.32 | 1.41 |
| lmp2 wec | 21 | 3.9 | 4.28 | 1.08 | 1.08 | 2.83 | 2.53 |
| lmdh wec | 104 | 1.28 | 2.27 | 1.09 | 1.11 | 1.66 | 0.79 |
| lmh wec | 110 | 1.94 | 2.47 | 1.09 | 1.17 | 1.86 | 1.59 |
| gt3 wec | 198 | 1.56 | 2.62 | 0.96 | 0.67 | 1.35 | 0.85 |
| lmp2 elms | 27 | 2.96 | 3.04 | 1.51 | 1.51 | 2.83 | 1.74 |
| gt3 elms | 54 | 2.03 | 1.87 | 1.02 | 0.95 | 2.54 | 0.9 |
| gt3 alms | 84 | 1.95 | 1.93 | 0.77 | 0.69 | 1.02 | 0.84 |
| lmp2 alms | 13 | 2.81 | 2.42 | 0.98 | 0.98 | 1.12 | 1.97 |
| gt3 x-gtworldcheu-pwrd-by-aws-endurance-cup | 61 | 5.78 | 5.22 | 0.58 | 0.52 | 4.83 | 0.54 |
| gt3 igtc | 72 | 1.41 | 1.25 | 1.02 | 0.81 | 1.97 | 0.81 |
| gt3 x-crowdstrike-24-hours-of-spa | 19 | 1.97 | 2.3 | 0.83 | 0.58 | 0.94 | 0.81 |
| gt3 nur | 36 | 2.98 | 3.31 | 1.73 | 1.34 | 4.22 | 1.45 |
| gt3 gtwc | 712 | 3.35 | 3.38 | 1.21 | 1.09 | 3.18 | 1.03 |
| gt3 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup | 18 | 2.34 | 3.13 | 0.41 | 0.16 | 2.46 | 0.68 |
| gt3 x-gtworldcheu-pwrd-by-aws-sprint-cup | 17 | 3.84 | 3.74 | 2.31 | 2.46 | 3.11 | 0.58 |
| gt3 x-suzuka-1000km-intercontinental-gt-challenge | 9 | 2.43 | 2.05 | 1 | 0.3 | 0.79 | 1.34 |
| gt3 britishgt | 270 | 1.91 | 1.98 | 1.02 | 0.95 | 1.86 | 0.95 |

## Noise floors σ_meas (noise-floor.mjs, report-only)

| Quantity | median | 90 % CI | events |
|---|---|---|---|
| F1 within-driver σ v1 (% lap) | 0.351 | 0.333 – 0.372 | 76 |
| F1 within-driver σ v2 (% lap) | 0.365 | 0.354 – 0.379 | 76 |
| F1 within-driver σ (s) | 0.286 | 0.264 – 0.306 | 76 |
| F1 s1 σ (% lap) | 0.14 | 0.128 – 0.152 | 76 |
| F1 s2 σ (% lap) | 0.171 | 0.158 – 0.182 | 76 |
| F1 s3 σ (% lap) | 0.136 | 0.129 – 0.146 | 76 |
| F1 team-mate σ (% lap, contains skill) | 0.501 | 0.448 – 0.539 | 76 |
| F1 best ÷ ideal − 1 (%, proxy) | 0.053 | 0.049 – 0.068 | 76 |
| imsa gt3 best ÷ ideal − 1 (%, proxy) | 0.114 | 0.104 – 0.121 | 76 |
| imsa lmp2 best ÷ ideal − 1 (%, proxy) | 0.172 | 0.161 – 0.181 | 51 |
| imsa proto best ÷ ideal − 1 (%, proxy) | 0.143 | 0.131 – 0.166 | 43 |
| wec lmp2 best ÷ ideal − 1 (%, proxy) | 0.084 | 0.069 – 0.093 | 24 |
| wec proto best ÷ ideal − 1 (%, proxy) | 0.131 | 0.102 – 0.149 | 38 |
| wec gt3 best ÷ ideal − 1 (%, proxy) | 0.13 | 0.114 – 0.15 | 19 |
| elms lmp2 best ÷ ideal − 1 (%, proxy) | 0.134 | 0.122 – 0.153 | 38 |
| elms gt3 best ÷ ideal − 1 (%, proxy) | 0.142 | 0.139 – 0.147 | 18 |
| alms lmp2 best ÷ ideal − 1 (%, proxy) | 0.18 | 0.134 – 0.226 | 13 |
| F1 sector share error RMS s1/s2/s3 (% lap, diagnostic; held-out n 35) | 0.99 / 1.14 / 1.123 | all n 73: 0.855 / 0.987 / 0.92 | – |
| FE within-driver σ v1 (duels, % lap) | 0.4 | 0.29 – 0.488 | 49 |
| FE within-driver σ v2 (duels, % lap) | 0.308 | 0.268 – 0.366 | 44 |
| FE team-mate σ (% lap, contains skill) | 0.309 | 0.272 – 0.635 | 21 |
| NLS SP9 PRO co-driver σ (% lap, contains skill) | 2.08 | 1.584 – 3.816 | 7 |
| NLS SP9 PRO clean median ÷ best − 1 (%) | 2 | 1.814 – 2.438 | 7 |
| NLS SP9 PRO-AM co-driver σ (% lap, contains skill) | 2.217 | 1.189 – 4.158 | 7 |
| NLS SP9 PRO-AM clean median ÷ best − 1 (%) | 2.002 | 1.118 – 2.584 | 7 |
| NLS SP9 all co-driver σ (% lap, contains skill) | 3.492 | 2.305 – 5.08 | 8 |
| NLS SP9 all clean median ÷ best − 1 (%) | 1.898 | 1.453 – 2.358 | 8 |
| Timing71 alms GT v2 (q 14 / p 3) (% lap) | 0.395 | 0.361 – 0.466 | 17 |
| Timing71 dtm – v2 (q 11 / p 3) (% lap) | 0.378 | 0.352 – 0.392 | 14 |
| Timing71 elms LMP3 v2 (q 31 / p 37) (% lap) | 0.483 | 0.431 – 0.507 | 68 |
| Timing71 elms LMP2 v2 (q 31 / p 36) (% lap) | 0.526 | 0.431 – 0.551 | 67 |
| Timing71 elms LMGTE v2 (q 23 / p 25) (% lap) | 0.457 | 0.414 – 0.473 | 48 |
| Timing71 elms LMP2 P/A v2 (q 4 / p 9) (% lap) | 0.554 | 0.48 – 0.591 | 13 |
| Timing71 elms INNOVATIVE CAR v2 (q 0 / p 1) (% lap) | 0.563 | 0.563 – 0.563 | 1 |
| Timing71 elms LMGT3 v2 (q 12 / p 12) (% lap) | 0.472 | 0.453 – 0.489 | 24 |
| Timing71 f1 – v2 (q 123 / p 29) (% lap) | 0.365 | 0.354 – 0.377 | 152 |
| Timing71 fe – v2 (q 39 / p 68) (% lap) | 0.546 | 0.491 – 0.575 | 107 |
| Timing71 gtwc – v2 (q 26 / p 8) (% lap) | 0.387 | 0.307 – 0.423 | 34 |
| Timing71 gtwc Silver v2 (q 26 / p 5) (% lap) | 0.367 | 0.329 – 0.428 | 31 |
| Timing71 gtwc Pro v2 (q 10 / p 6) (% lap) | 0.458 | 0.392 – 0.52 | 16 |
| Timing71 gtwc Pro-Am v2 (q 9 / p 5) (% lap) | 0.443 | 0.387 – 0.556 | 14 |
| Timing71 gtwc Pro/Am v2 (q 10 / p 7) (% lap) | 0.426 | 0.394 – 0.454 | 17 |
| Timing71 gtwc Am v2 (q 1 / p 9) (% lap) | 0.444 | 0.331 – 0.528 | 10 |
| Timing71 gtwc GT4 v2 (q 2 / p 0) (% lap) | 0.473 | 0.414 – 0.532 | 2 |
| Timing71 gtwc Overall v2 (q 2 / p 2) (% lap) | 0.483 | 0.395 – 0.769 | 4 |
| Timing71 igtc P v2 (q 2 / p 0) (% lap) | 0.361 | 0.208 – 0.514 | 2 |
| Timing71 igtc C v2 (q 4 / p 0) (% lap) | 0.508 | 0.28 – 0.828 | 4 |
| Timing71 igtc 488 v2 (q 2 / p 0) (% lap) | 0.509 | 0.411 – 0.607 | 2 |
| Timing71 imsa P v2 (q 10 / p 1) (% lap) | 0.412 | 0.348 – 0.522 | 11 |
| Timing71 imsa GTLM v2 (q 38 / p 10) (% lap) | 0.443 | 0.421 – 0.468 | 48 |
| Timing71 imsa GTD v2 (q 82 / p 12) (% lap) | 0.409 | 0.38 – 0.448 | 94 |
| Timing71 imsa DPi v2 (q 27 / p 10) (% lap) | 0.436 | 0.409 – 0.523 | 37 |
| Timing71 imsa LMP3 v2 (q 11 / p 7) (% lap) | 0.557 | 0.46 – 0.592 | 18 |
| Timing71 imsa LMP2 v2 (q 37 / p 15) (% lap) | 0.507 | 0.458 – 0.552 | 52 |
| Timing71 imsa TCR v2 (q 1 / p 3) (% lap) | 0.437 | 0.32 – 0.589 | 4 |
| Timing71 imsa GS v2 (q 1 / p 3) (% lap) | 0.508 | 0.463 – 0.553 | 4 |
| Timing71 macau – v2 (q 16 / p 8) (% lap) | 0.455 | 0.388 – 0.535 | 24 |
| Timing71 wec LMP1 v2 (q 18 / p 22) (% lap) | 0.536 | 0.494 – 0.61 | 40 |
| Timing71 wec LMP2 v2 (q 29 / p 47) (% lap) | 0.488 | 0.463 – 0.523 | 76 |
| Timing71 wec LMGTEPro v2 (q 20 / p 25) (% lap) | 0.393 | 0.348 – 0.437 | 45 |
| Timing71 wec LMGTEAm v2 (q 20 / p 27) (% lap) | 0.449 | 0.416 – 0.462 | 47 |
| Timing71 wec Hypercar H v2 (q 5 / p 16) (% lap) | 0.524 | 0.438 – 0.543 | 21 |
| Timing71 wec Hypercar v2 (q 21 / p 32) (% lap) | 0.464 | 0.439 – 0.506 | 53 |
| Timing71 wec LMGTE Am v2 (q 6 / p 12) (% lap) | 0.443 | 0.406 – 0.483 | 18 |
| Timing71 wec LMP2 P/A v2 (q 4 / p 17) (% lap) | 0.517 | 0.469 – 0.58 | 21 |
| Timing71 wec LMGTE Pro v2 (q 3 / p 9) (% lap) | 0.418 | 0.398 – 0.459 | 12 |
| Timing71 wec CDNT v2 (q 0 / p 2) (% lap) | 0.377 | 0.266 – 0.488 | 2 |
| Timing71 wec LMGT3 v2 (q 33 / p 28) (% lap) | 0.388 | 0.363 – 0.412 | 61 |
| Timing71 wec HYPERCAR v2 (q 9 / p 8) (% lap) | 0.369 | 0.341 – 0.506 | 17 |
| Timing71 x-110cc 160 v2 (q 0 / p 1) (% lap) | 0.384 | 0.384 – 0.384 | 1 |
| Timing71 x-110cc 190 v2 (q 0 / p 1) (% lap) | 0.369 | 0.369 – 0.369 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint R v2 (q 1 / p 1) (% lap) | 0.394 | 0.368 – 0.419 | 2 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint – v2 (q 3 / p 2) (% lap) | 0.395 | 0.297 – 0.624 | 5 |
| Timing71 x-2024-vailo-adelaide-500 P v2 (q 1 / p 0) (% lap) | 0.395 | 0.395 – 0.395 | 1 |
| Timing71 x-2024-vailo-adelaide-500 A v2 (q 1 / p 0) (% lap) | 0.384 | 0.384 – 0.384 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final – v2 (q 2 / p 0) (% lap) | 0.521 | 0.473 – 0.568 | 2 |
| Timing71 x-2025-f1-academy – v2 (q 6 / p 0) (% lap) | 0.38 | 0.323 – 0.489 | 6 |
| Timing71 x-2025-repco-bathurst-1000 – v2 (q 3 / p 3) (% lap) | 0.443 | 0.24 – 0.604 | 6 |
| Timing71 x-2026-nti-townsville-500 M v2 (q 1 / p 0) (% lap) | 0.366 | 0.366 – 0.366 | 1 |
| Timing71 x-2026-nti-townsville-500 G v2 (q 1 / p 0) (% lap) | 0.604 | 0.604 – 0.604 | 1 |
| Timing71 x-2026-nti-townsville-500 C v2 (q 1 / p 0) (% lap) | 0.418 | 0.418 – 0.418 | 1 |
| Timing71 x-2026-nti-townsville-500 R v2 (q 1 / p 0) (% lap) | 0.385 | 0.385 – 0.385 | 1 |
| Timing71 x-24h-series GT4 v2 (q 21 / p 21) (% lap) | 0.513 | 0.478 – 0.545 | 42 |
| Timing71 x-24h-series A6-AM v2 (q 10 / p 7) (% lap) | 0.506 | 0.448 – 0.572 | 17 |
| Timing71 x-24h-series A6-PRO v2 (q 9 / p 7) (% lap) | 0.501 | 0.451 – 0.613 | 16 |
| Timing71 x-24h-series TCR v2 (q 33 / p 20) (% lap) | 0.476 | 0.451 – 0.495 | 53 |
| Timing71 x-24h-series SPX v2 (q 9 / p 3) (% lap) | 0.52 | 0.446 – 0.585 | 12 |
| Timing71 x-24h-series SP3 v2 (q 4 / p 4) (% lap) | 0.46 | 0.299 – 0.597 | 8 |
| Timing71 x-24h-series SP4 v2 (q 0 / p 1) (% lap) | 0.496 | 0.496 – 0.496 | 1 |
| Timing71 x-24h-series A3 v2 (q 6 / p 3) (% lap) | 0.599 | 0.547 – 0.704 | 9 |
| Timing71 x-24h-series 991 v2 (q 21 / p 15) (% lap) | 0.545 | 0.475 – 0.583 | 36 |
| Timing71 x-24h-series GT3 v2 (q 11 / p 11) (% lap) | 0.496 | 0.458 – 0.517 | 22 |
| Timing71 x-24h-series GTX v2 (q 15 / p 12) (% lap) | 0.525 | 0.518 – 0.578 | 27 |
| Timing71 x-24h-series TG v2 (q 1 / p 0) (% lap) | 0.518 | 0.518 – 0.518 | 1 |
| Timing71 x-24h-series 992 v2 (q 5 / p 4) (% lap) | 0.409 | 0.305 – 0.6 | 9 |
| Timing71 x-24h-series-powered-by-hankook GT3 v2 (q 4 / p 2) (% lap) | 0.438 | 0.296 – 0.528 | 6 |
| Timing71 x-488-challenge P v2 (q 4 / p 0) (% lap) | 0.506 | 0.316 – 0.654 | 4 |
| Timing71 x-488-challenge S v2 (q 4 / p 0) (% lap) | 0.709 | 0.449 – 0.767 | 4 |
| Timing71 x-adac-gt-masters – v2 (q 9 / p 2) (% lap) | 0.349 | 0.314 – 0.416 | 11 |
| Timing71 x-adac-gt-masters Rookie v2 (q 0 / p 1) (% lap) | 0.525 | 0.525 – 0.525 | 1 |
| Timing71 x-coppa-shell S-AM v2 (q 29 / p 0) (% lap) | 0.553 | 0.496 – 0.577 | 29 |
| Timing71 x-coppa-shell S v2 (q 37 / p 0) (% lap) | 0.519 | 0.464 – 0.556 | 37 |
| Timing71 x-endurance-icons LMP2B v2 (q 1 / p 0) (% lap) | 0.355 | 0.355 – 0.355 | 1 |
| Timing71 x-endurance-icons GT2B v2 (q 1 / p 0) (% lap) | 0.4 | 0.4 – 0.4 | 1 |
| Timing71 x-f4-cez F4-H2 v2 (q 1 / p 0) (% lap) | 0.487 | 0.487 – 0.487 | 1 |
| Timing71 x-formula-2 – v2 (q 29 / p 9) (% lap) | 0.369 | 0.316 – 0.413 | 38 |
| Timing71 x-formula-2-2024 – v2 (q 13 / p 1) (% lap) | 0.397 | 0.334 – 0.429 | 14 |
| Timing71 x-formula-3 – v2 (q 15 / p 3) (% lap) | 0.37 | 0.337 – 0.414 | 18 |
| Timing71 x-formula-3-2023 – v2 (q 6 / p 0) (% lap) | 0.392 | 0.269 – 0.581 | 6 |
| Timing71 x-formula-3-2025 – v2 (q 9 / p 1) (% lap) | 0.369 | 0.302 – 0.428 | 10 |
| Timing71 x-gp3 – v2 (q 6 / p 1) (% lap) | 0.351 | 0.251 – 0.388 | 7 |
| Timing71 x-gt-cup-europe PROAM v2 (q 6 / p 0) (% lap) | 0.509 | 0.476 – 0.566 | 6 |
| Timing71 x-gt3-revival-series Pro v2 (q 1 / p 0) (% lap) | 0.492 | 0.492 – 0.492 | 1 |
| Timing71 x-gt3-revival-series Silver v2 (q 2 / p 0) (% lap) | 0.438 | 0.275 – 0.602 | 2 |
| Timing71 x-gt3-revival-series Gold v2 (q 1 / p 0) (% lap) | 0.288 | 0.288 – 0.288 | 1 |
| Timing71 x-gt3-revival-series Bronze Cup v2 (q 1 / p 0) (% lap) | 0.189 | 0.189 – 0.189 | 1 |
| Timing71 x-gulf-12-hours GT4 v2 (q 1 / p 0) (% lap) | 0.41 | 0.41 – 0.41 | 1 |
| Timing71 x-hi-tec-oils-bathurst-6-hour-2019 A1 v2 (q 1 / p 3) (% lap) | 0.591 | 0.443 – 0.648 | 4 |
| Timing71 x-hi-tec-oils-bathurst-6-hour-2019 E v2 (q 0 / p 2) (% lap) | 0.491 | 0.37 – 0.612 | 2 |
| Timing71 x-hi-tec-oils-bathurst-6-hour-2019 C v2 (q 1 / p 3) (% lap) | 0.578 | 0.462 – 0.627 | 4 |
| Timing71 x-hi-tec-oils-bathurst-6-hour-2019 D v2 (q 1 / p 3) (% lap) | 0.53 | 0.503 – 0.593 | 4 |
| Timing71 x-hi-tec-oils-bathurst-6-hour-2019 A2 v2 (q 1 / p 3) (% lap) | 0.651 | 0.525 – 0.707 | 4 |
| Timing71 x-hi-tec-oils-bathurst-6-hour-2019 B v2 (q 1 / p 3) (% lap) | 0.574 | 0.44 – 0.704 | 4 |
| Timing71 x-hockenheim – v2 (q 3 / p 0) (% lap) | 0.224 | 0.009 – 0.573 | 3 |
| Timing71 x-idemitsu-mazda-mx-5-cup-presented-by-bfgoodrich-tires ND2 v2 (q 1 / p 2) (% lap) | 0.456 | 0.448 – 0.695 | 3 |
| Timing71 x-imsa-continental-tire-sportscar-challenge GS v2 (q 10 / p 1) (% lap) | 0.406 | 0.358 – 0.423 | 11 |
| Timing71 x-imsa-continental-tire-sportscar-challenge TCR v2 (q 9 / p 1) (% lap) | 0.487 | 0.445 – 0.522 | 10 |
| Timing71 x-imsa-continental-tire-sportscar-challenge ST v2 (q 9 / p 1) (% lap) | 0.396 | 0.344 – 0.478 | 10 |
| Timing71 x-imsa-michelin-pilot-challenge GS v2 (q 28 / p 4) (% lap) | 0.455 | 0.427 – 0.483 | 32 |
| Timing71 x-imsa-michelin-pilot-challenge TCR v2 (q 27 / p 5) (% lap) | 0.494 | 0.417 – 0.542 | 32 |
| Timing71 x-imsa-michelin-pilot-sportscar-challenge GS v2 (q 5 / p 0) (% lap) | 0.444 | 0.335 – 0.511 | 5 |
| Timing71 x-imsa-michelin-pilot-sportscar-challenge TCR v2 (q 5 / p 0) (% lap) | 0.582 | 0.459 – 0.639 | 5 |
| Timing71 x-imsa-prototype-challenge LMP3 v2 (q 7 / p 5) (% lap) | 0.496 | 0.478 – 0.586 | 12 |
| Timing71 x-indycar – v2 (q 118 / p 195) (% lap) | 0.54 | 0.524 – 0.553 | 313 |
| Timing71 x-intelligent-money-british-gt-championship GT3S v2 (q 2 / p 3) (% lap) | 0.438 | 0.247 – 0.582 | 5 |
| Timing71 x-intelligent-money-british-gt-championship GT3PA v2 (q 2 / p 3) (% lap) | 0.452 | 0.299 – 0.532 | 5 |
| Timing71 x-intelligent-money-british-gt-championship GT4S v2 (q 3 / p 3) (% lap) | 0.362 | 0.282 – 0.412 | 6 |
| Timing71 x-intelligent-money-british-gt-championship GTCPA v2 (q 1 / p 1) (% lap) | 0.43 | 0.32 – 0.54 | 2 |
| Timing71 x-international-gt-open PROAM v2 (q 6 / p 0) (% lap) | 0.425 | 0.352 – 0.449 | 6 |
| Timing71 x-international-gt-open PRO v2 (q 6 / p 0) (% lap) | 0.432 | 0.336 – 0.476 | 6 |
| Timing71 x-international-gt-open AM v2 (q 6 / p 0) (% lap) | 0.419 | 0.39 – 0.471 | 6 |
| Timing71 x-le-mans-cup LMP3 v2 (q 31 / p 31) (% lap) | 0.487 | 0.46 – 0.5 | 62 |
| Timing71 x-le-mans-cup GT3 v2 (q 30 / p 33) (% lap) | 0.466 | 0.424 – 0.496 | 63 |
| Timing71 x-lionheart-retro-series-s6 – v2 (q 4 / p 4) (% lap) | 0.398 | 0.247 – 0.477 | 8 |
| Timing71 x-michelin-imsa-sportscar-encore-at-sebring LMP3 v2 (q 2 / p 0) (% lap) | 0.481 | 0.45 – 0.511 | 2 |
| Timing71 x-michelin-imsa-sportscar-encore-at-sebring GT3 v2 (q 1 / p 0) (% lap) | 0.754 | 0.754 – 0.754 | 1 |
| Timing71 x-michelin-imsa-sportscar-encore-at-sebring GT4 v2 (q 2 / p 0) (% lap) | 0.294 | 0.231 – 0.357 | 2 |
| Timing71 x-monza – v2 (q 3 / p 0) (% lap) | 0.409 | 0.277 – 0.6 | 3 |
| Timing71 x-moto2 – v2 (q 33 / p 2) (% lap) | 0.338 | 0.319 – 0.38 | 35 |
| Timing71 x-moto3 – v2 (q 34 / p 1) (% lap) | 0.421 | 0.377 – 0.451 | 35 |
| Timing71 x-motoe – v2 (q 4 / p 0) (% lap) | 0.355 | 0.284 – 0.385 | 4 |
| Timing71 x-motogp – v2 (q 35 / p 2) (% lap) | 0.35 | 0.312 – 0.375 | 37 |
| Timing71 x-n-rburgring-24-hours SP 9 v2 (q 5 / p 0) (% lap) | 0.587 | 0.556 – 0.897 | 5 |
| Timing71 x-n-rburgring-24-hours SP 10 v2 (q 4 / p 0) (% lap) | 0.597 | 0.474 – 0.752 | 4 |
| Timing71 x-n-rburgring-24-hours V 5 v2 (q 1 / p 0) (% lap) | 0.596 | 0.596 – 0.596 | 1 |
| Timing71 x-n-rburgring-24-hours TCR v2 (q 5 / p 0) (% lap) | 0.495 | 0.213 – 0.726 | 5 |
| Timing71 x-n-rburgring-24-hours Cup 5 v2 (q 2 / p 0) (% lap) | 0.541 | 0.531 – 0.551 | 2 |
| Timing71 x-n-rburgring-24-hours Cup 3 v2 (q 4 / p 0) (% lap) | 0.564 | 0.22 – 0.573 | 4 |
| Timing71 x-n-rburgring-24-hours V 6 v2 (q 3 / p 0) (% lap) | 0.536 | 0.525 – 0.721 | 3 |
| Timing71 x-n-rburgring-24-hours VT2 Hecka v2 (q 2 / p 0) (% lap) | 0.552 | 0.503 – 0.601 | 2 |
| Timing71 x-nascar-cup-series – v2 (q 118 / p 13) (% lap) | 0.436 | 0.42 – 0.47 | 131 |
| Timing71 x-nascar-truck-series – v2 (q 54 / p 4) (% lap) | 0.49 | 0.482 – 0.505 | 58 |
| Timing71 x-nascar-xfinity-series – v2 (q 73 / p 6) (% lap) | 0.491 | 0.476 – 0.506 | 79 |
| Timing71 x-pirelli-gt4-america-sprintx-west Am v2 (q 1 / p 1) (% lap) | 0.458 | 0.448 – 0.468 | 2 |
| Timing71 x-pirelli-gt4-america-sprintx-west WPro-Am v2 (q 3 / p 0) (% lap) | 0.57 | 0.318 – 0.965 | 3 |
| Timing71 x-pirelli-gt4-america-sprintx-west WAm v2 (q 2 / p 0) (% lap) | 0.455 | 0.359 – 0.552 | 2 |
| Timing71 x-pirelli-gt4-america-sprintx-west Pro-Am v2 (q 3 / p 0) (% lap) | 0.321 | 0.268 – 0.658 | 3 |
| Timing71 x-porsche-sprint-challenge-north-america-gt3-cup 992 M v2 (q 4 / p 0) (% lap) | 0.361 | 0.346 – 0.459 | 4 |
| Timing71 x-porsche-sprint-challenge-north-america-gt3-cup 992 P/A v2 (q 4 / p 0) (% lap) | 0.327 | 0.181 – 0.404 | 4 |
| Timing71 x-prototype-cup-germany – v2 (q 1 / p 0) (% lap) | 0.528 | 0.528 – 0.528 | 1 |
| Timing71 x-prototype-cup-germany GT3 v2 (q 1 / p 0) (% lap) | 0.715 | 0.715 – 0.715 | 1 |
| Timing71 x-prototype-cup-germany GTX v2 (q 1 / p 0) (% lap) | 0.888 | 0.888 – 0.888 | 1 |
| Timing71 x-prototype-cup-germany GT4 v2 (q 1 / p 0) (% lap) | 0.247 | 0.247 – 0.247 | 1 |
| Timing71 x-prototype-cup-germany 992 v2 (q 1 / p 0) (% lap) | 0.542 | 0.542 – 0.542 | 1 |
| Timing71 x-renault-clio-cup – v2 (q 1 / p 0) (% lap) | 0.249 | 0.249 – 0.249 | 1 |
| Timing71 x-renault-clio-cup J v2 (q 1 / p 0) (% lap) | 0.252 | 0.252 – 0.252 | 1 |
| Timing71 x-renault-clio-cup G v2 (q 1 / p 0) (% lap) | 0.435 | 0.435 – 0.435 | 1 |
| Timing71 x-reykjavik-international-games-2022 – v2 (q 1 / p 0) (% lap) | 0.527 | 0.527 – 0.527 | 1 |
| Timing71 x-round-02-jeddah-corniche-circuit – v2 (q 1 / p 0) (% lap) | 0.368 | 0.368 – 0.368 | 1 |
| Timing71 x-round-03-bahrain-international-circuit – v2 (q 1 / p 0) (% lap) | 0.197 | 0.197 – 0.197 | 1 |
| Timing71 x-total-24-hours-of-spa – v2 (q 6 / p 0) (% lap) | 0.422 | 0.35 – 0.483 | 6 |
| Timing71 x-total-24-hours-of-spa PAM v2 (q 6 / p 0) (% lap) | 0.518 | 0.455 – 0.581 | 6 |
| Timing71 x-total-24-hours-of-spa AM v2 (q 6 / p 0) (% lap) | 0.574 | 0.432 – 0.587 | 6 |
| Timing71 x-total-24-hours-of-spa Silver v2 (q 6 / p 0) (% lap) | 0.556 | 0.489 – 0.621 | 6 |
| Timing71 x-toyota-corolla-altis-gr-sport-omr-toyota-yaris-ativ-lady-omr 6 v2 (q 0 / p 1) (% lap) | 0.796 | 0.796 – 0.796 | 1 |
| Timing71 x-toyota-corolla-altis-gr-sport-omr-toyota-yaris-ativ-lady-omr ALTIS v2 (q 0 / p 1) (% lap) | 0.679 | 0.679 – 0.679 | 1 |
| Timing71 x-toyota-corolla-altis-gr-sport-omr-toyota-yaris-ativ-lady-omr 7 v2 (q 0 / p 1) (% lap) | 0.546 | 0.546 – 0.546 | 1 |
| Timing71 x-toyota-corolla-altis-gr-sport-omr-toyota-yaris-ativ-lady-omr ATIV LADY v2 (q 0 / p 1) (% lap) | 0.961 | 0.961 – 0.961 | 1 |
| Timing71 x-trofeo-pirelli P v2 (q 40 / p 0) (% lap) | 0.454 | 0.423 – 0.507 | 40 |
| Timing71 x-trofeo-pirelli P-AM v2 (q 42 / p 0) (% lap) | 0.482 | 0.434 – 0.524 | 42 |
| Timing71 x-virgin-australia-supercars – v2 (q 8 / p 13) (% lap) | 0.415 | 0.355 – 0.44 | 21 |
| Timing71 alms LMP3 v2 (q 13 / p 1) (% lap) | 0.467 | 0.348 – 0.556 | 14 |
| Timing71 elms P2 v2 (q 0 / p 1) (% lap) | 0.558 | 0.558 – 0.558 | 1 |
| Timing71 elms LMP2 Pro/Am v2 (q 10 / p 11) (% lap) | 0.512 | 0.414 – 0.545 | 21 |
| Timing71 elms GT3 v2 (q 0 / p 2) (% lap) | 0.492 | 0.475 – 0.508 | 2 |
| Timing71 gtwc PAM v2 (q 24 / p 8) (% lap) | 0.433 | 0.411 – 0.5 | 32 |
| Timing71 gtwc AM v2 (q 16 / p 6) (% lap) | 0.487 | 0.45 – 0.547 | 22 |
| Timing71 igtc Silver v2 (q 1 / p 2) (% lap) | 0.406 | 0.394 – 0.687 | 3 |
| Timing71 igtc Pro v2 (q 3 / p 1) (% lap) | 0.395 | 0.372 – 0.658 | 4 |
| Timing71 imsa GTDPRO v2 (q 36 / p 1) (% lap) | 0.392 | 0.334 – 0.413 | 37 |
| Timing71 imsa GTP v2 (q 31 / p 2) (% lap) | 0.392 | 0.314 – 0.457 | 33 |
| Timing71 x-190cc 160 v2 (q 0 / p 1) (% lap) | 0.055 | 0.055 – 0.055 | 1 |
| Timing71 x-2019-pirtek-perth-supernight-supercars CH v2 (q 1 / p 0) (% lap) | 0.391 | 0.391 – 0.391 | 1 |
| Timing71 x-2019-pirtek-perth-supernight-supercars TR v2 (q 1 / p 0) (% lap) | 0.562 | 0.562 – 0.562 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour E v2 (q 1 / p 0) (% lap) | 0.353 | 0.353 – 0.353 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour C v2 (q 1 / p 0) (% lap) | 0.469 | 0.469 – 0.469 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour D v2 (q 1 / p 0) (% lap) | 0.681 | 0.681 – 0.681 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour A1 v2 (q 1 / p 0) (% lap) | 0.564 | 0.564 – 0.564 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown A v2 (q 1 / p 0) (% lap) | 0.565 | 0.565 – 0.565 | 1 |
| Timing71 x-2023-ned-whisky-tasmania-supersprint – v2 (q 1 / p 1) (% lap) | 0.376 | 0.338 – 0.414 | 2 |
| Timing71 x-2023-penrite-oil-sandown-500 – v2 (q 4 / p 2) (% lap) | 0.363 | 0.265 – 0.462 | 6 |
| Timing71 x-2024-f1-academy – v2 (q 5 / p 2) (% lap) | 0.29 | 0.273 – 0.322 | 7 |
| Timing71 x-2025-nti-townsville-500 DS2 v2 (q 2 / p 0) (% lap) | 0.367 | 0.355 – 0.379 | 2 |
| Timing71 x-2026-f1-academy – v2 (q 3 / p 2) (% lap) | 0.48 | 0.303 – 0.528 | 5 |
| Timing71 x-2026-nti-townsville-500 – v2 (q 0 / p 2) (% lap) | 0.444 | 0.329 – 0.559 | 2 |
| Timing71 x-2026-tyrepower-tasmania-super-440 – v2 (q 1 / p 0) (% lap) | 0.711 | 0.711 – 0.711 | 1 |
| Timing71 x-24h-series SP2 v2 (q 2 / p 6) (% lap) | 0.717 | 0.652 – 0.801 | 8 |
| Timing71 x-24h-series TCX v2 (q 7 / p 11) (% lap) | 0.571 | 0.498 – 0.593 | 18 |
| Timing71 x-adac-gt-masters Silver v2 (q 5 / p 0) (% lap) | 0.478 | 0.363 – 0.885 | 5 |
| Timing71 x-adac-gt-masters PAM v2 (q 1 / p 1) (% lap) | 0.487 | 0.449 – 0.524 | 2 |
| Timing71 x-adac-gt4-germany J v2 (q 5 / p 0) (% lap) | 0.424 | 0.358 – 0.444 | 5 |
| Timing71 x-adac-gt4-germany – v2 (q 4 / p 0) (% lap) | 0.322 | 0.174 – 0.732 | 4 |
| Timing71 x-club-division PRO-AM v2 (q 1 / p 0) (% lap) | 0.277 | 0.277 – 0.277 | 1 |
| Timing71 x-club-division PRO v2 (q 4 / p 0) (% lap) | 0.365 | 0.332 – 0.388 | 4 |
| Timing71 x-club-division ROOKIE v2 (q 1 / p 0) (% lap) | 0.367 | 0.367 – 0.367 | 1 |
| Timing71 x-coppa-shell-488 S v2 (q 7 / p 0) (% lap) | 0.547 | 0.382 – 0.628 | 7 |
| Timing71 x-coupe-de-p-ques-2026 – v2 (q 2 / p 0) (% lap) | 0.428 | 0.361 – 0.494 | 2 |
| Timing71 x-dmv-classic-masters-ptrc 2 v2 (q 1 / p 0) (% lap) | 0.528 | 0.528 – 0.528 | 1 |
| Timing71 x-dmv-classic-masters-ptrc-hco-tw PRTC 2 v2 (q 1 / p 0) (% lap) | 0.617 | 0.617 – 0.617 | 1 |
| Timing71 x-dmv-classic-masters-ptrc-hco-tw TW 22 v2 (q 1 / p 0) (% lap) | 0.391 | 0.391 – 0.391 | 1 |
| Timing71 x-dmv-classic-masters-ptrc-hco-tw CM 4 v2 (q 1 / p 0) (% lap) | 0.479 | 0.479 – 0.479 | 1 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup Silver v2 (q 12 / p 0) (% lap) | 0.388 | 0.345 – 0.443 | 12 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup PRO v2 (q 12 / p 0) (% lap) | 0.364 | 0.263 – 0.458 | 12 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup Bronze v2 (q 3 / p 0) (% lap) | 0.451 | 0.296 – 0.505 | 3 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup Gold v2 (q 3 / p 0) (% lap) | 0.57 | 0.517 – 0.632 | 3 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-sprint-cup Silver v2 (q 10 / p 0) (% lap) | 0.456 | 0.395 – 0.51 | 10 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-sprint-cup PAM v2 (q 10 / p 0) (% lap) | 0.39 | 0.367 – 0.464 | 10 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-sprint-cup PRO v2 (q 10 / p 0) (% lap) | 0.388 | 0.346 – 0.447 | 10 |
| Timing71 x-formula-2-2025 – v2 (q 9 / p 5) (% lap) | 0.437 | 0.356 – 0.458 | 14 |
| Timing71 x-formula-3-2024 – v2 (q 7 / p 2) (% lap) | 0.394 | 0.28 – 0.42 | 9 |
| Timing71 x-formula-3-2026 – v2 (q 7 / p 2) (% lap) | 0.371 | 0.266 – 0.432 | 9 |
| Timing71 x-formula-regional-championship-by-alpine AM v2 (q 3 / p 0) (% lap) | 0.433 | 0.298 – 0.441 | 3 |
| Timing71 x-formula-regional-championship-by-alpine PROAM v2 (q 2 / p 0) (% lap) | 0.466 | 0.415 – 0.517 | 2 |
| Timing71 x-gt3-legends GT3C v2 (q 2 / p 0) (% lap) | 0.484 | 0.45 – 0.517 | 2 |
| Timing71 x-gt3-legends GT3B v2 (q 2 / p 0) (% lap) | 0.513 | 0.498 – 0.529 | 2 |
| Timing71 x-gt4-european-series Silver v2 (q 6 / p 1) (% lap) | 0.453 | 0.207 – 0.527 | 7 |
| Timing71 x-gt4-european-series PAM v2 (q 7 / p 2) (% lap) | 0.472 | 0.336 – 0.745 | 9 |
| Timing71 x-international-gt-open RT v2 (q 1 / p 0) (% lap) | 0.387 | 0.387 – 0.387 | 1 |
| Timing71 x-international-gt-open – v2 (q 3 / p 0) (% lap) | 0.414 | 0.341 – 0.521 | 3 |
| Timing71 x-iracing GTE Class v2 (q 2 / p 2) (% lap) | 0.373 | 0.229 – 0.597 | 4 |
| Timing71 x-ivra-endurance-2021-2022 GT3 Class v2 (q 0 / p 2) (% lap) | 0.63 | 0.481 – 0.779 | 2 |
| Timing71 x-ivra-endurance-2021-2022 Dallara P217 v2 (q 2 / p 0) (% lap) | 0.261 | 0.144 – 0.379 | 2 |
| Timing71 x-ivra-endurance-2021-2022 GTE IMSA v2 (q 0 / p 2) (% lap) | 0.461 | 0.331 – 0.591 | 2 |
| Timing71 x-ligier-european-series JS P4 v2 (q 4 / p 0) (% lap) | 0.581 | 0.477 – 0.608 | 4 |
| Timing71 x-ligier-european-series JS2 R v2 (q 4 / p 0) (% lap) | 0.462 | 0.378 – 0.554 | 4 |
| Timing71 x-mugello – v2 (q 13 / p 1) (% lap) | 0.372 | 0.19 – 0.494 | 14 |
| Timing71 x-nogaro – v2 (q 2 / p 0) (% lap) | 0.146 | 0.101 – 0.191 | 2 |
| Timing71 x-porsche-tag-heuer-esports-supercup – v2 (q 1 / p 13) (% lap) | 0.37 | 0.314 – 0.407 | 14 |
| Timing71 x-radical-cup-europe SR3 v2 (q 1 / p 0) (% lap) | 0.506 | 0.506 – 0.506 | 1 |
| Timing71 x-radical-cup-europe SR10 v2 (q 1 / p 0) (% lap) | 0.723 | 0.723 – 0.723 | 1 |
| Timing71 x-real-racers-virtual-club-s4 – v2 (q 0 / p 4) (% lap) | 0.58 | 0.468 – 0.842 | 4 |
| Timing71 x-round-01-jeddah-corniche-circuit – v2 (q 1 / p 0) (% lap) | 0.401 | 0.401 – 0.401 | 1 |
| Timing71 x-round-04-bahrain-international-circuit – v2 (q 1 / p 0) (% lap) | 0.329 | 0.329 – 0.329 | 1 |
| Timing71 x-spezial-tourenwagen-trophy-h-r-cup 2 v2 (q 1 / p 0) (% lap) | 0.478 | 0.478 – 0.478 | 1 |
| Timing71 x-spezial-tourenwagen-trophy-h-r-cup 4 v2 (q 1 / p 0) (% lap) | 0.512 | 0.512 – 0.512 | 1 |
| Timing71 x-spezial-tourenwagen-trophy-h-r-cup 3 v2 (q 1 / p 0) (% lap) | 0.678 | 0.678 – 0.678 | 1 |
| Timing71 x-suzuka-10-hours ProAm v2 (q 1 / p 2) (% lap) | 0.61 | 0.282 – 0.675 | 3 |
| Timing71 x-suzuka-10-hours Silver v2 (q 1 / p 2) (% lap) | 0.497 | 0.273 – 0.559 | 3 |
| Timing71 x-suzuka-10-hours Am v2 (q 1 / p 2) (% lap) | 0.647 | 0.503 – 1.085 | 3 |
| Timing71 x-suzuka-10-hours Pro v2 (q 1 / p 1) (% lap) | 0.372 | 0.335 – 0.409 | 2 |
| Timing71 x-system-test LM P1 v2 (q 0 / p 1) (% lap) | 0.518 | 0.518 – 0.518 | 1 |
| Timing71 x-system-test LM P2 v2 (q 0 / p 1) (% lap) | 0.595 | 0.595 – 0.595 | 1 |
| Timing71 x-system-test LM GTE Am v2 (q 0 / p 1) (% lap) | 0.56 | 0.56 – 0.56 | 1 |
| Timing71 x-system-test LM GTE Pro v2 (q 0 / p 1) (% lap) | 0.469 | 0.469 – 0.469 | 1 |
| Timing71 x-tc-america-tcr-tca-tc TC v2 (q 3 / p 2) (% lap) | 0.46 | 0.38 – 0.472 | 5 |
| Timing71 x-tc-america-tcr-tca-tc TCA v2 (q 3 / p 2) (% lap) | 0.429 | 0.413 – 0.484 | 5 |
| Timing71 x-tc-america-tcr-tca-tc TCR v2 (q 2 / p 3) (% lap) | 0.556 | 0.447 – 0.771 | 5 |
| Timing71 x-tcr-europe D v2 (q 1 / p 0) (% lap) | 0.577 | 0.577 – 0.577 | 1 |
| Timing71 x-tcr-europe   v2 (q 1 / p 0) (% lap) | 0.377 | 0.377 – 0.377 | 1 |
| Timing71 x-tcr-europe Y v2 (q 1 / p 0) (% lap) | 0.422 | 0.422 – 0.422 | 1 |
| Timing71 x-tcr-uk-touring-car-championship TCR v2 (q 1 / p 0) (% lap) | 0.425 | 0.425 – 0.425 | 1 |
| Timing71 x-toyota-hilux-revo-omr ALTIS v2 (q 0 / p 1) (% lap) | 0.907 | 0.907 – 0.907 | 1 |
| Timing71 x-toyota-hilux-revo-omr – v2 (q 0 / p 1) (% lap) | 0.707 | 0.707 – 0.707 | 1 |
| Timing71 x-toyota-hilux-revo-omr ATIV LADY v2 (q 0 / p 1) (% lap) | 1.044 | 1.044 – 1.044 | 1 |
| Timing71 x-trofeo-pirelli S-AM v2 (q 5 / p 0) (% lap) | 0.659 | 0.648 – 0.722 | 5 |
| Timing71 x-winter-greenhell-2020-2021 GT3 German v2 (q 1 / p 0) (% lap) | 0.342 | 0.342 – 0.342 | 1 |
| Timing71 x-woodcote-trophy-stirling-moss-trophy-with-hmrn-pre-63-gt SMT6 v2 (q 1 / p 0) (% lap) | 0.576 | 0.576 – 0.576 | 1 |
| Timing71 x-woodcote-trophy-stirling-moss-trophy-with-hmrn-pre-63-gt WT4a v2 (q 1 / p 0) (% lap) | 0.659 | 0.659 – 0.659 | 1 |
| Timing71 x-woodcote-trophy-stirling-moss-trophy-with-hmrn-pre-63-gt P63GT D v2 (q 1 / p 0) (% lap) | 0.777 | 0.777 – 0.777 | 1 |
| Timing71 x-woodcote-trophy-stirling-moss-trophy-with-hmrn-pre-63-gt WT4 v2 (q 1 / p 0) (% lap) | 0.482 | 0.482 – 0.482 | 1 |
| Timing71 x-woodcote-trophy-stirling-moss-trophy-with-hmrn-pre-63-gt WT3 v2 (q 1 / p 0) (% lap) | 0.747 | 0.747 – 0.747 | 1 |
| Timing71 alms LMP2 v2 (q 11 / p 2) (% lap) | 0.617 | 0.422 – 0.636 | 13 |
| Timing71 igtc AAM v2 (q 2 / p 0) (% lap) | 0.49 | 0.354 – 0.626 | 2 |
| Timing71 igtc B v2 (q 2 / p 0) (% lap) | 0.363 | 0.336 – 0.389 | 2 |
| Timing71 igtc APA v2 (q 2 / p 0) (% lap) | 0.432 | 0.315 – 0.549 | 2 |
| Timing71 igtc APP v2 (q 1 / p 0) (% lap) | 0.51 | 0.51 – 0.51 | 1 |
| Timing71 igtc I v2 (q 3 / p 1) (% lap) | 0.463 | 0.395 – 0.638 | 4 |
| Timing71 igtc BRO v2 (q 2 / p 6) (% lap) | 0.477 | 0.406 – 0.546 | 8 |
| Timing71 igtc SIL v2 (q 2 / p 7) (% lap) | 0.434 | 0.348 – 0.534 | 9 |
| Timing71 igtc GT4 v2 (q 1 / p 4) (% lap) | 0.563 | 0.445 – 0.979 | 5 |
| Timing71 igtc PRO v2 (q 5 / p 5) (% lap) | 0.429 | 0.327 – 0.48 | 10 |
| Timing71 igtc PAM v2 (q 3 / p 6) (% lap) | 0.556 | 0.42 – 0.723 | 9 |
| Timing71 igtc TP v2 (q 1 / p 1) (% lap) | 0.689 | 0.595 – 0.783 | 2 |
| Timing71 igtc CS v2 (q 1 / p 1) (% lap) | 0.654 | 0.368 – 0.94 | 2 |
| Timing71 x-2018-cams-national-racing-championships-round-5 TR v2 (q 1 / p 0) (% lap) | 0.486 | 0.486 – 0.486 | 1 |
| Timing71 x-2023-otr-supersprint – v2 (q 2 / p 1) (% lap) | 0.198 | 0.189 – 0.369 | 3 |
| Timing71 x-2023-thrifty-newcastle-500 – v2 (q 2 / p 1) (% lap) | 0.356 | 0.299 – 0.405 | 3 |
| Timing71 x-2025-airtouch-500-at-the-bend – v2 (q 2 / p 2) (% lap) | 0.286 | 0.209 – 0.305 | 4 |
| Timing71 x-2025-century-batteries-ipswich-super-440 – v2 (q 2 / p 0) (% lap) | 0.372 | 0.325 – 0.418 | 2 |
| Timing71 x-2025-century-batteries-ipswich-super-440 DS2 v2 (q 1 / p 0) (% lap) | 0.359 | 0.359 – 0.359 | 1 |
| Timing71 x-2025-nti-townsville-500 – v2 (q 4 / p 0) (% lap) | 0.34 | 0.321 – 0.389 | 4 |
| Timing71 x-2026-formula-1-qatar-airways-australian-grand-prix P v2 (q 1 / p 0) (% lap) | 0.45 | 0.45 – 0.45 | 1 |
| Timing71 x-2026-formula-1-qatar-airways-australian-grand-prix A v2 (q 1 / p 0) (% lap) | 0.423 | 0.423 – 0.423 | 1 |
| Timing71 x-2026-itm-christchurch-super-440 – v2 (q 1 / p 0) (% lap) | 0.301 | 0.301 – 0.301 | 1 |
| Timing71 x-24h-series GT3-PRO v2 (q 3 / p 3) (% lap) | 0.573 | 0.346 – 0.608 | 6 |
| Timing71 x-24h-series GT3-AM v2 (q 10 / p 9) (% lap) | 0.573 | 0.449 – 0.621 | 19 |
| Timing71 x-amx-esports – v2 (q 1 / p 1) (% lap) | 0.582 | 0.543 – 0.621 | 2 |
| Timing71 x-anglesey-international-gp E v2 (q 2 / p 1) (% lap) | 0.568 | 0.235 – 0.749 | 3 |
| Timing71 x-anglesey-international-gp D v2 (q 2 / p 0) (% lap) | 0.576 | 0.451 – 0.7 | 2 |
| Timing71 x-anglesey-international-gp F v2 (q 2 / p 0) (% lap) | 0.382 | 0.165 – 0.599 | 2 |
| Timing71 x-bmw-sim-cup-120 – v2 (q 0 / p 1) (% lap) | 0.451 | 0.451 – 0.451 | 1 |
| Timing71 x-championnat-de-france-ffsa-des-circuits-dijon-prenois – v2 (q 2 / p 0) (% lap) | 0.47 | 0.445 – 0.495 | 2 |
| Timing71 x-coppa-shell-488 488 v2 (q 7 / p 0) (% lap) | 0.582 | 0.569 – 0.613 | 7 |
| Timing71 x-euroformula-open – v2 (q 3 / p 0) (% lap) | 0.492 | 0.474 – 0.535 | 3 |
| Timing71 x-euroformula-open R v2 (q 2 / p 0) (% lap) | 0.364 | 0.214 – 0.514 | 2 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup PAM v2 (q 10 / p 0) (% lap) | 0.388 | 0.353 – 0.424 | 10 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup GOLD v2 (q 1 / p 0) (% lap) | 0.508 | 0.508 – 0.508 | 1 |
| Timing71 x-fia-f3-european-championship – v2 (q 1 / p 0) (% lap) | 0.258 | 0.258 – 0.258 | 1 |
| Timing71 x-fia-f3-european-championship R v2 (q 1 / p 0) (% lap) | 0.299 | 0.299 – 0.299 | 1 |
| Timing71 x-ford-mustang-cup DH v2 (q 1 / p 0) (% lap) | 0.425 | 0.425 – 0.425 | 1 |
| Timing71 x-gt-worldcheu-pwrd-by-aws-endurance-cup – v2 (q 6 / p 0) (% lap) | 0.377 | 0.287 – 0.481 | 6 |
| Timing71 x-gt-worldcheu-pwrd-by-aws-endurance-cup Silver v2 (q 6 / p 0) (% lap) | 0.417 | 0.339 – 0.446 | 6 |
| Timing71 x-gt-worldcheu-pwrd-by-aws-endurance-cup PAM v2 (q 6 / p 0) (% lap) | 0.47 | 0.318 – 0.544 | 6 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup – v2 (q 8 / p 0) (% lap) | 0.404 | 0.255 – 0.479 | 8 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Silver v2 (q 11 / p 0) (% lap) | 0.435 | 0.369 – 0.493 | 11 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup PAM v2 (q 10 / p 0) (% lap) | 0.458 | 0.436 – 0.505 | 10 |
| Timing71 x-imsa GTD v2 (q 4 / p 3) (% lap) | 0.519 | 0.365 – 0.591 | 7 |
| Timing71 x-imsa LMP3 v2 (q 2 / p 3) (% lap) | 0.642 | 0.391 – 1.007 | 5 |
| Timing71 x-imsa GTLM v2 (q 2 / p 2) (% lap) | 0.451 | 0.39 – 0.68 | 4 |
| Timing71 x-imsa DPi v2 (q 2 / p 2) (% lap) | 0.566 | 0.276 – 0.706 | 4 |
| Timing71 x-imsa LMP2 v2 (q 2 / p 3) (% lap) | 0.413 | 0.22 – 0.62 | 5 |
| Timing71 x-imsa GTDPRO v2 (q 1 / p 1) (% lap) | 0.433 | 0.348 – 0.519 | 2 |
| Timing71 x-imsa-iracing-pro-series – v2 (q 2 / p 0) (% lap) | 0.154 | 0.114 – 0.195 | 2 |
| Timing71 x-indianapolis-8-hour-presented-by-aws Overall v2 (q 2 / p 0) (% lap) | 0.485 | 0.405 – 0.565 | 2 |
| Timing71 x-indianapolis-8-hour-presented-by-aws GT4 v2 (q 2 / p 0) (% lap) | 0.529 | 0.433 – 0.625 | 2 |
| Timing71 x-indianapolis-8-hour-presented-by-aws Pro/Am v2 (q 2 / p 0) (% lap) | 0.591 | 0.482 – 0.699 | 2 |
| Timing71 x-indianapolis-8-hour-presented-by-aws Silver Cup v2 (q 2 / p 0) (% lap) | 0.478 | 0.305 – 0.652 | 2 |
| Timing71 x-le-mans-cup LMP3 Pro/Am v2 (q 4 / p 6) (% lap) | 0.508 | 0.435 – 0.539 | 10 |
| Timing71 x-lionheart-speedway-series – v2 (q 0 / p 7) (% lap) | 0.431 | 0.419 – 0.472 | 7 |
| Timing71 x-magny-cours – v2 (q 14 / p 0) (% lap) | 0.502 | 0.473 – 0.54 | 14 |
| Timing71 x-pirelli-gt4-america Pro/Am v2 (q 5 / p 1) (% lap) | 0.534 | 0.444 – 0.666 | 6 |
| Timing71 x-pirelli-gt4-america Am v2 (q 7 / p 0) (% lap) | 0.457 | 0.381 – 0.466 | 7 |
| Timing71 x-pirelli-gt4-america Silver v2 (q 4 / p 1) (% lap) | 0.416 | 0.304 – 0.546 | 5 |
| Timing71 x-spa-speedweek – v2 (q 2 / p 1) (% lap) | 0.367 | 0.336 – 0.617 | 3 |
| Timing71 x-tc-america-powered-by-skip-barber-racing-school TCA v2 (q 6 / p 0) (% lap) | 0.564 | 0.495 – 0.605 | 6 |
| Timing71 x-tc-america-powered-by-skip-barber-racing-school TC v2 (q 6 / p 0) (% lap) | 0.431 | 0.376 – 0.502 | 6 |
| Timing71 x-tc-america-tc-tca-tcr-classes TCR v2 (q 1 / p 0) (% lap) | 0.655 | 0.655 – 0.655 | 1 |
| Timing71 x-tc-america-tc-tca-tcr-classes TC v2 (q 1 / p 0) (% lap) | 0.628 | 0.628 – 0.628 | 1 |
| Timing71 x-tc-america-tc-tca-tcr-classes TCA v2 (q 1 / p 0) (% lap) | 0.814 | 0.814 – 0.814 | 1 |
| Timing71 x-timeservice-nl-feed GT4 v2 (q 2 / p 0) (% lap) | 0.438 | 0.426 – 0.451 | 2 |
| Timing71 x-timeservice-nl-feed P v2 (q 1 / p 0) (% lap) | 0.458 | 0.458 – 0.458 | 1 |
| Timing71 x-timeservice-nl-feed GT3 P v2 (q 2 / p 0) (% lap) | 0.445 | 0.43 – 0.461 | 2 |
| Timing71 x-timeservice-nl-feed GT3 G v2 (q 2 / p 0) (% lap) | 0.427 | 0.391 – 0.462 | 2 |
| Timing71 x-timeservice-nl-feed GT Cup v2 (q 1 / p 0) (% lap) | 0.516 | 0.516 – 0.516 | 1 |
| Timing71 x-timeservice-nl-feed GT3 PA v2 (q 2 / p 0) (% lap) | 0.561 | 0.51 – 0.612 | 2 |
| Timing71 x-toyota-corolla-altis-gr-sport-omr-toyota-yaris-ativ-lady-omr – v2 (q 1 / p 0) (% lap) | 0.573 | 0.573 – 0.573 | 1 |
| Timing71 x-trofeo-pirelli S v2 (q 6 / p 0) (% lap) | 0.627 | 0.429 – 0.691 | 6 |
| Timing71 x-trofeo-pirelli-pirelli-am P v2 (q 8 / p 0) (% lap) | 0.364 | 0.331 – 0.458 | 8 |
| Timing71 x-trofeo-pirelli-pirelli-am P-AM v2 (q 8 / p 0) (% lap) | 0.416 | 0.366 – 0.562 | 8 |
| Timing71 x-vco-prosim-series – v2 (q 10 / p 1) (% lap) | 0.356 | 0.219 – 0.522 | 11 |
| Timing71 dtm Silver v2 (q 6 / p 0) (% lap) | 0.408 | 0.295 – 0.508 | 6 |
| Timing71 igtc S v2 (q 1 / p 0) (% lap) | 0.611 | 0.611 – 0.611 | 1 |
| Timing71 x-2019-shannons-nationals-round-3 – v2 (q 0 / p 1) (% lap) | 0.612 | 0.612 – 0.612 | 1 |
| Timing71 x-2023-formula-1-rolex-australian-grand-prix P v2 (q 0 / p 2) (% lap) | 0.38 | 0.241 – 0.518 | 2 |
| Timing71 x-2023-formula-1-rolex-australian-grand-prix A v2 (q 0 / p 2) (% lap) | 0.639 | 0.57 – 0.707 | 2 |
| Timing71 x-2024-boost-mobile-gold-coast-500 – v2 (q 3 / p 1) (% lap) | 0.369 | 0.331 – 0.394 | 4 |
| Timing71 x-2025-airtouch-500-at-the-bend O v2 (q 1 / p 1) (% lap) | 0.454 | 0.415 – 0.494 | 2 |
| Timing71 x-2025-airtouch-500-at-the-bend PA v2 (q 2 / p 0) (% lap) | 0.341 | 0.304 – 0.378 | 2 |
| Timing71 x-2026-formula-1-qatar-airways-australian-grand-prix – v2 (q 0 / p 1) (% lap) | 0.4 | 0.4 – 0.4 | 1 |
| Timing71 x-2026-itm-taupo-super-440 – v2 (q 4 / p 0) (% lap) | 0.42 | 0.249 – 0.578 | 4 |
| Timing71 x-2026-repco-bathurst-1000 – v2 (q 3 / p 0) (% lap) | 0.35 | 0.338 – 0.405 | 3 |
| Timing71 x-24h-series GT3-P/A v2 (q 5 / p 6) (% lap) | 0.448 | 0.422 – 0.637 | 11 |
| Timing71 x-adac-gt-masters J v2 (q 8 / p 0) (% lap) | 0.359 | 0.307 – 0.399 | 8 |
| Timing71 x-adac-gt-masters T v2 (q 7 / p 1) (% lap) | 0.356 | 0.309 – 0.467 | 8 |
| Timing71 x-anglesey-international-gp A v2 (q 2 / p 0) (% lap) | 0.526 | 0.443 – 0.609 | 2 |
| Timing71 x-anglesey-international-gp B v2 (q 2 / p 0) (% lap) | 0.371 | 0.334 – 0.407 | 2 |
| Timing71 x-california-8-hours GT3 v2 (q 4 / p 0) (% lap) | 0.402 | 0.316 – 0.427 | 4 |
| Timing71 x-california-8-hours GT4 v2 (q 3 / p 0) (% lap) | 0.527 | 0.443 – 0.987 | 3 |
| Timing71 x-california-8-hours GTC v2 (q 0 / p 1) (% lap) | 0.651 | 0.651 – 0.651 | 1 |
| Timing71 x-club-division R v2 (q 6 / p 0) (% lap) | 0.46 | 0.441 – 0.563 | 6 |
| Timing71 x-coppa-shell-am S-AM v2 (q 15 / p 0) (% lap) | 0.498 | 0.486 – 0.548 | 15 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli Masters v2 (q 3 / p 0) (% lap) | 0.834 | 0.449 – 0.906 | 3 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli PAM v2 (q 3 / p 0) (% lap) | 0.556 | 0.385 – 0.648 | 3 |
| Timing71 x-gt4-european-series LC Cup v2 (q 1 / p 0) (% lap) | 0.468 | 0.468 – 0.468 | 1 |
| Timing71 x-gt4-european-series AM v2 (q 3 / p 3) (% lap) | 0.51 | 0.366 – 0.635 | 6 |
| Timing71 x-gt4-european-series PRO v2 (q 3 / p 0) (% lap) | 0.422 | 0.224 – 0.559 | 3 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup Silver v2 (q 7 / p 0) (% lap) | 0.363 | 0.334 – 0.475 | 7 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup Gold v2 (q 7 / p 0) (% lap) | 0.294 | 0.229 – 0.428 | 7 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup PRO v2 (q 2 / p 1) (% lap) | 0.465 | 0.39 – 0.61 | 3 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup Bronze v2 (q 7 / p 0) (% lap) | 0.439 | 0.3 – 0.474 | 7 |
| Timing71 x-imsa GS v2 (q 1 / p 0) (% lap) | 0.384 | 0.384 – 0.384 | 1 |
| Timing71 x-imsa TCR v2 (q 1 / p 0) (% lap) | 0.416 | 0.416 – 0.416 | 1 |
| Timing71 x-lionheart-indycar-series – v2 (q 2 / p 3) (% lap) | 0.489 | 0.133 – 0.504 | 5 |
| Timing71 x-n-rburgring-24-hours SP 7 v2 (q 3 / p 0) (% lap) | 0.516 | 0.393 – 0.678 | 3 |
| Timing71 x-n-rburgring-24-hours CUP 3 v2 (q 1 / p 0) (% lap) | 0.616 | 0.616 – 0.616 | 1 |
| Timing71 x-n-rburgring-24-hours SP 3T v2 (q 3 / p 0) (% lap) | 0.29 | 0 – 0.711 | 3 |
| Timing71 x-n-rburgring-24-hours Cup-X v2 (q 2 / p 0) (% lap) | 0.598 | 0.502 – 0.693 | 2 |
| Timing71 x-n-rburgring-24-hours SP 4T v2 (q 2 / p 0) (% lap) | 0.467 | 0 – 0.935 | 2 |
| Timing71 x-n-rburgring-24-hours SP 3 v2 (q 2 / p 0) (% lap) | 0.52 | 0 – 1.04 | 2 |
| Timing71 x-n-rburgring-24-hours V2T v2 (q 3 / p 0) (% lap) | 0.314 | 0.147 – 0.495 | 3 |
| Timing71 x-n-rburgring-24-hours VT2 Front v2 (q 1 / p 0) (% lap) | 1.268 | 1.268 – 1.268 | 1 |
| Timing71 x-n-rburgring-24-hours Cup 2 v2 (q 2 / p 0) (% lap) | 0.549 | 0.501 – 0.597 | 2 |
| Timing71 x-pirelli-gt4-america-sprint Am v2 (q 6 / p 0) (% lap) | 0.426 | 0.364 – 0.483 | 6 |
| Timing71 x-pirelli-gt4-america-sprint Pro v2 (q 5 / p 0) (% lap) | 0.338 | 0.215 – 0.612 | 5 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx Pro/Am v2 (q 0 / p 4) (% lap) | 0.409 | 0.233 – 0.517 | 4 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx Am v2 (q 0 / p 4) (% lap) | 0.21 | 0.033 – 0.576 | 4 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx Pro v2 (q 0 / p 4) (% lap) | 0.424 | 0.372 – 0.45 | 4 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx Silver v2 (q 0 / p 4) (% lap) | 0.468 | 0.378 – 0.518 | 4 |
| Timing71 x-porsche-carrera-cup-asia ALTIS v2 (q 0 / p 1) (% lap) | 0.481 | 0.481 – 0.481 | 1 |
| Timing71 x-porsche-carrera-cup-asia ATIV LADY v2 (q 0 / p 1) (% lap) | 0.024 | 0.024 – 0.024 | 1 |
| Timing71 x-prototype-cup-germany LMP3 v2 (q 2 / p 0) (% lap) | 0.55 | 0.437 – 0.664 | 2 |
| Timing71 x-twingo-cup-series D4-TCC2 v2 (q 1 / p 0) (% lap) | 0.475 | 0.475 – 0.475 | 1 |
| Timing71 x-twingo-cup-series D4-TCC4 v2 (q 1 / p 0) (% lap) | 0.537 | 0.537 – 0.537 | 1 |
| Timing71 x-twingo-cup-series 1.4T v2 (q 1 / p 0) (% lap) | 0.344 | 0.344 – 0.344 | 1 |
| Timing71 x-twingo-cup-series 1.6 v2 (q 1 / p 0) (% lap) | 0.438 | 0.438 – 0.438 | 1 |
| Timing71 elms 4159 v2 (q 1 / p 0) (% lap) | 0.58 | 0.58 – 0.58 | 1 |
| Timing71 x-2019-shannons-nationals-round-3 C v2 (q 1 / p 0) (% lap) | 0.557 | 0.557 – 0.557 | 1 |
| Timing71 x-2019-shannons-nationals-round-3 GT4 v2 (q 0 / p 1) (% lap) | 0.964 | 0.964 – 0.964 | 1 |
| Timing71 x-2023-formula-1-rolex-australian-grand-prix – v2 (q 1 / p 1) (% lap) | 0.487 | 0.443 – 0.532 | 2 |
| Timing71 x-2023-thrifty-newcastle-500 PM v2 (q 0 / p 3) (% lap) | 0.5 | 0.461 – 0.791 | 3 |
| Timing71 x-24h-series A6 v2 (q 0 / p 2) (% lap) | 0.675 | 0.662 – 0.688 | 2 |
| Timing71 x-24h-series 992-AM v2 (q 5 / p 2) (% lap) | 0.479 | 0.198 – 0.602 | 7 |
| Timing71 x-24h-series-powered-by-hankook TCR v2 (q 1 / p 0) (% lap) | 0.355 | 0.355 – 0.355 | 1 |
| Timing71 x-24h-series-powered-by-hankook GT4 v2 (q 3 / p 2) (% lap) | 0.384 | 0.25 – 0.641 | 5 |
| Timing71 x-24h-series-powered-by-hankook GTX v2 (q 4 / p 1) (% lap) | 0.597 | 0.346 – 0.65 | 5 |
| Timing71 x-24h-series-powered-by-hankook 992 v2 (q 4 / p 2) (% lap) | 0.428 | 0.405 – 0.543 | 6 |
| Timing71 x-bwc – v2 (q 4 / p 0) (% lap) | 0.517 | 0.347 – 0.685 | 4 |
| Timing71 x-clio-cup-series R v2 (q 1 / p 0) (% lap) | 0.462 | 0.462 – 0.462 | 1 |
| Timing71 x-club-division AM v2 (q 4 / p 0) (% lap) | 0.45 | 0.436 – 0.478 | 4 |
| Timing71 x-continental-tire-sportscar-challenge P v2 (q 0 / p 1) (% lap) | 0.541 | 0.541 – 0.541 | 1 |
| Timing71 x-continental-tire-sportscar-challenge GS v2 (q 0 / p 1) (% lap) | 0.531 | 0.531 – 0.531 | 1 |
| Timing71 x-continental-tire-sportscar-challenge GTLM v2 (q 0 / p 1) (% lap) | 0.507 | 0.507 – 0.507 | 1 |
| Timing71 x-continental-tire-sportscar-challenge TCR v2 (q 0 / p 1) (% lap) | 0.504 | 0.504 – 0.504 | 1 |
| Timing71 x-continental-tire-sportscar-challenge GTD v2 (q 0 / p 1) (% lap) | 0.446 | 0.446 – 0.446 | 1 |
| Timing71 x-continental-tire-sportscar-challenge ST v2 (q 0 / p 1) (% lap) | 0.556 | 0.556 – 0.556 | 1 |
| Timing71 x-formula-2-2026 – v2 (q 9 / p 2) (% lap) | 0.408 | 0.363 – 0.523 | 11 |
| Timing71 x-formula-renault-eurocup – v2 (q 0 / p 3) (% lap) | 0.429 | 0.302 – 0.489 | 3 |
| Timing71 x-lionheart-speedway-series-s2 – v2 (q 0 / p 7) (% lap) | 0.503 | 0.454 – 0.552 | 7 |
| Timing71 x-misano – v2 (q 3 / p 0) (% lap) | 0.486 | 0.345 – 0.531 | 3 |
| Timing71 x-pirelli-gt4-america-sprintx Pro/Am v2 (q 4 / p 0) (% lap) | 0.386 | 0.228 – 0.557 | 4 |
| Timing71 x-pirelli-gt4-america-sprintx Am v2 (q 4 / p 0) (% lap) | 0.465 | 0.382 – 0.534 | 4 |
| Timing71 x-pirelli-gt4-america-sprintx Silver v2 (q 4 / p 0) (% lap) | 0.399 | 0.265 – 0.567 | 4 |
| Timing71 x-porsche-sixt-carrera-cup-deutschland RT v2 (q 1 / p 0) (% lap) | 0.565 | 0.565 – 0.565 | 1 |
| Timing71 x-porsche-sixt-carrera-cup-deutschland – v2 (q 3 / p 2) (% lap) | 0.363 | 0.274 – 0.439 | 5 |
| Timing71 x-red-bull-ring – v2 (q 1 / p 0) (% lap) | 0.421 | 0.421 – 0.421 | 1 |
| Timing71 x-sco-endurance-series-2021-2022 Dallara P217 v2 (q 2 / p 0) (% lap) | 0.376 | 0.232 – 0.521 | 2 |
| Timing71 x-th-supercar-gtc ALTIS v2 (q 1 / p 0) (% lap) | 0.902 | 0.902 – 0.902 | 1 |
| Timing71 x-th-supercar-gtc ATIV LADY v2 (q 1 / p 0) (% lap) | 0.663 | 0.663 – 0.663 | 1 |
| Timing71 x-th-supercar-gtc Am v2 (q 1 / p 0) (% lap) | 0.441 | 0.441 – 0.441 | 1 |
| Timing71 x-2024-boost-mobile-gold-coast-500 C v2 (q 1 / p 1) (% lap) | 0.375 | 0.241 – 0.508 | 2 |
| Timing71 x-2024-boost-mobile-gold-coast-500 M v2 (q 1 / p 1) (% lap) | 0.373 | 0.359 – 0.387 | 2 |
| Timing71 x-2024-boost-mobile-gold-coast-500 G v2 (q 1 / p 0) (% lap) | 0.622 | 0.622 – 0.622 | 1 |
| Timing71 x-2025-airtouch-500-at-the-bend P v2 (q 1 / p 0) (% lap) | 0.45 | 0.45 – 0.45 | 1 |
| Timing71 x-2025-airtouch-500-at-the-bend A v2 (q 1 / p 0) (% lap) | 0.468 | 0.468 – 0.468 | 1 |
| Timing71 x-2025-itm-taupo-super-440 – v2 (q 5 / p 0) (% lap) | 0.365 | 0.049 – 0.858 | 5 |
| Timing71 x-2025-repco-bathurst-1000 DS2 v2 (q 1 / p 1) (% lap) | 0.331 | 0.315 – 0.347 | 2 |
| Timing71 x-24h-series P2 v2 (q 1 / p 1) (% lap) | 0.613 | 0.587 – 0.639 | 2 |
| Timing71 x-24h-series CUP1 v2 (q 1 / p 6) (% lap) | 0.484 | 0.415 – 0.535 | 7 |
| Timing71 x-bosch-power-tools-perth-super-440 – v2 (q 2 / p 0) (% lap) | 0.486 | 0.438 – 0.534 | 2 |
| Timing71 x-club-division P-A v2 (q 2 / p 0) (% lap) | 0.348 | 0.249 – 0.447 | 2 |
| Timing71 x-crowdstrike-24-hours-of-spa PRO v2 (q 2 / p 0) (% lap) | 0.508 | 0.498 – 0.517 | 2 |
| Timing71 x-formula-2-2023 – v2 (q 6 / p 4) (% lap) | 0.399 | 0.393 – 0.502 | 10 |
| Timing71 x-formula-regional-championship-by-alpine R v2 (q 7 / p 0) (% lap) | 0.428 | 0.33 – 0.45 | 7 |
| Timing71 x-formula-regional-championship-by-alpine – v2 (q 7 / p 0) (% lap) | 0.388 | 0.242 – 0.483 | 7 |
| Timing71 x-formula-regional-championship-by-alpine PRO v2 (q 2 / p 0) (% lap) | 0.434 | 0.379 – 0.49 | 2 |
| Timing71 x-gt4-european-series-pwrd-by-rafa-racing-club GOLD v2 (q 1 / p 0) (% lap) | 0.228 | 0.228 – 0.228 | 1 |
| Timing71 x-gt4-european-series-pwrd-by-rafa-racing-club PRO v2 (q 2 / p 0) (% lap) | 0.301 | 0.28 – 0.321 | 2 |
| Timing71 x-gt4-european-series-pwrd-by-rafa-racing-club Silver v2 (q 3 / p 0) (% lap) | 0.305 | 0.275 – 0.362 | 3 |
| Timing71 x-gt4-european-series-pwrd-by-rafa-racing-club Bronze Cup v2 (q 1 / p 0) (% lap) | 0.164 | 0.164 – 0.164 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup Pro v2 (q 5 / p 0) (% lap) | 0.293 | 0.207 – 0.315 | 5 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup Masters v2 (q 0 / p 1) (% lap) | 0.381 | 0.381 – 0.381 | 1 |
| Timing71 x-ivra-club-cup – v2 (q 1 / p 0) (% lap) | 0.352 | 0.352 – 0.352 | 1 |
| Timing71 x-le-mans-cup 4159 v2 (q 0 / p 3) (% lap) | 0.519 | 0.382 – 0.53 | 3 |
| Timing71 x-le-mans-cup 4182 v2 (q 0 / p 2) (% lap) | 0.447 | 0.441 – 0.452 | 2 |
| Timing71 x-n-rburgring-24-hours SP-X v2 (q 4 / p 0) (% lap) | 0.567 | 0.531 – 0.73 | 4 |
| Timing71 x-open-wheels-500-mile-race – v2 (q 0 / p 1) (% lap) | 0.48 | 0.48 – 0.48 | 1 |
| Timing71 x-paul-ricard – v2 (q 3 / p 1) (% lap) | 0.547 | 0.212 – 0.566 | 4 |
| Timing71 x-silverlake-c1-endurance-series R v2 (q 1 / p 0) (% lap) | 0.635 | 0.635 – 0.635 | 1 |
| Timing71 x-silverlake-c1-endurance-series BRSCC Mazda MX-5 Championship v2 (q 1 / p 0) (% lap) | 0.478 | 0.478 – 0.478 | 1 |
| Timing71 x-silverlake-c1-endurance-series M v2 (q 1 / p 0) (% lap) | 0.451 | 0.451 – 0.451 | 1 |
| Timing71 x-system-test GT3 v2 (q 0 / p 1) (% lap) | 0.37 | 0.37 – 0.37 | 1 |
| Timing71 x-system-test TCE v2 (q 0 / p 1) (% lap) | 0.561 | 0.561 – 0.561 | 1 |
| Timing71 x-system-test GTX v2 (q 0 / p 1) (% lap) | 0.252 | 0.252 – 0.252 | 1 |
| Timing71 x-system-test 992 v2 (q 0 / p 1) (% lap) | 0.406 | 0.406 – 0.406 | 1 |
| Timing71 x-tc-america-powered-by-skip-barber-racing-school TCX v2 (q 6 / p 0) (% lap) | 0.625 | 0.428 – 0.748 | 6 |
| Timing71 x-th-supercar-gt4 GTC v2 (q 1 / p 0) (% lap) | 0.403 | 0.403 – 0.403 | 1 |
| Timing71 x-timeservice-nl-feed LMP3 v2 (q 2 / p 0) (% lap) | 0.369 | 0.327 – 0.41 | 2 |
| Timing71 x-timeservice-nl-feed LMP2 v2 (q 2 / p 0) (% lap) | 0.387 | 0.321 – 0.453 | 2 |
| Timing71 x-timeservice-nl-feed GT v2 (q 2 / p 1) (% lap) | 0.448 | 0.108 – 0.491 | 3 |
| Timing71 elms 4166 v2 (q 0 / p 3) (% lap) | 0.709 | 0.555 – 0.814 | 3 |
| Timing71 elms 4183 v2 (q 0 / p 2) (% lap) | 0.427 | 0.363 – 0.49 | 2 |
| Timing71 igtc INV v2 (q 1 / p 0) (% lap) | 0.577 | 0.577 – 0.577 | 1 |
| Timing71 x-2023-bennetts-british-superbike-championship-with-pirelli SBIKE v2 (q 0 / p 1) (% lap) | 0.423 | 0.423 – 0.423 | 1 |
| Timing71 x-2025-betr-darwin-triple-crown – v2 (q 2 / p 0) (% lap) | 0.319 | 0.293 – 0.344 | 2 |
| Timing71 x-2025-gb3-championship-partnered-by-the-brdc GT3PA v2 (q 1 / p 0) (% lap) | 0.435 | 0.435 – 0.435 | 1 |
| Timing71 x-2025-gb3-championship-partnered-by-the-brdc GT4PEC v2 (q 1 / p 0) (% lap) | 0.66 | 0.66 – 0.66 | 1 |
| Timing71 x-2025-gb3-championship-partnered-by-the-brdc GT4S v2 (q 1 / p 0) (% lap) | 0.521 | 0.521 – 0.521 | 1 |
| Timing71 x-2025-gb3-championship-partnered-by-the-brdc GT3SA v2 (q 1 / p 0) (% lap) | 0.428 | 0.428 – 0.428 | 1 |
| Timing71 x-2025-gb3-championship-partnered-by-the-brdc GT4PA v2 (q 1 / p 0) (% lap) | 0.444 | 0.444 – 0.444 | 1 |
| Timing71 x-24h-series CN1 v2 (q 2 / p 0) (% lap) | 0.75 | 0.453 – 1.047 | 2 |
| Timing71 x-24h-series TC v2 (q 1 / p 2) (% lap) | 0.661 | 0.187 – 0.702 | 3 |
| Timing71 x-bmw-sim-live – v2 (q 0 / p 1) (% lap) | 0.43 | 0.43 – 0.43 | 1 |
| Timing71 x-club-division GT4 v2 (q 2 / p 0) (% lap) | 0.454 | 0.438 – 0.471 | 2 |
| Timing71 x-eracing-association-omega-cup – v2 (q 0 / p 1) (% lap) | 0.512 | 0.512 – 0.512 | 1 |
| Timing71 x-euroformula-open SILVER v2 (q 1 / p 0) (% lap) | 0.387 | 0.387 – 0.387 | 1 |
| Timing71 x-euroformula-open AM v2 (q 2 / p 0) (% lap) | 0.37 | 0.292 – 0.447 | 2 |
| Timing71 x-euroformula-open PROAM v2 (q 2 / p 0) (% lap) | 0.472 | 0.458 – 0.485 | 2 |
| Timing71 x-gt-cup-europe SILVER v2 (q 2 / p 0) (% lap) | 0.399 | 0.376 – 0.422 | 2 |
| Timing71 x-gt-cup-europe AM v2 (q 6 / p 0) (% lap) | 0.486 | 0.438 – 0.518 | 6 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Masters v2 (q 2 / p 0) (% lap) | 0.487 | 0.457 – 0.517 | 2 |
| Timing71 x-gulf-12-hours   v2 (q 1 / p 0) (% lap) | 0.395 | 0.395 – 0.395 | 1 |
| Timing71 x-gulf-12-hours R v2 (q 1 / p 0) (% lap) | 0.336 | 0.336 – 0.336 | 1 |
| Timing71 x-imsa-iracing-pro-series GTE Class v2 (q 3 / p 0) (% lap) | 0.38 | 0.101 – 0.486 | 3 |
| Timing71 x-imsa-iracing-pro-series Dallara P217 v2 (q 3 / p 0) (% lap) | 0.269 | 0.116 – 0.591 | 3 |
| Timing71 x-iracing LMP1 Class v2 (q 1 / p 0) (% lap) | 0.614 | 0.614 – 0.614 | 1 |
| Timing71 x-iracing HPD ARX-01c v2 (q 1 / p 0) (% lap) | 0.156 | 0.156 – 0.156 | 1 |
| Timing71 x-lamborghini-super-trofeo PAM v2 (q 1 / p 2) (% lap) | 0.667 | 0.624 – 0.732 | 3 |
| Timing71 x-lamborghini-super-trofeo PRO v2 (q 2 / p 2) (% lap) | 0.427 | 0.343 – 0.778 | 4 |
| Timing71 x-lamborghini-super-trofeo AM v2 (q 1 / p 1) (% lap) | 0.61 | 0.486 – 0.733 | 2 |
| Timing71 x-lamborghini-super-trofeo LC v2 (q 1 / p 1) (% lap) | 0.379 | 0.18 – 0.578 | 2 |
| Timing71 x-lionheart-indycar-series-s10 – v2 (q 1 / p 7) (% lap) | 0.533 | 0.465 – 0.601 | 8 |
| Timing71 x-michelin-24h-series SR3 v2 (q 0 / p 1) (% lap) | 0.444 | 0.444 – 0.444 | 1 |
| Timing71 x-michelin-992-endurance-cup PRO v2 (q 3 / p 0) (% lap) | 0.399 | 0.24 – 0.582 | 3 |
| Timing71 x-michelin-992-endurance-cup AM-S v2 (q 2 / p 0) (% lap) | 0.556 | 0.55 – 0.562 | 2 |
| Timing71 x-michelin-992-endurance-cup AM-B v2 (q 2 / p 0) (% lap) | 0.632 | 0.417 – 0.847 | 2 |
| Timing71 x-silverlake-c1-endurance-series C1 Racing Series v2 (q 1 / p 0) (% lap) | 0.487 | 0.487 – 0.487 | 1 |
| Timing71 x-timeservice-nl-feed GTCup v2 (q 1 / p 0) (% lap) | 0.721 | 0.721 – 0.721 | 1 |
| Timing71 x-timeservice-nl-feed 1 v2 (q 1 / p 0) (% lap) | 0.62 | 0.62 – 0.62 | 1 |
| Timing71 x-timeservice-nl-feed 3 v2 (q 1 / p 0) (% lap) | 0.595 | 0.595 – 0.595 | 1 |
| Timing71 x-timeservice-nl-feed 2 v2 (q 1 / p 0) (% lap) | 0.72 | 0.72 – 0.72 | 1 |
| Timing71 x-timeservice-nl-feed 5 v2 (q 1 / p 0) (% lap) | 0.596 | 0.596 – 0.596 | 1 |
| Timing71 x-timeservice-nl-feed 4 v2 (q 1 / p 0) (% lap) | 0.585 | 0.585 – 0.585 | 1 |
| Timing71 x-timeservice-nl-feed 6 v2 (q 1 / p 0) (% lap) | 0.43 | 0.43 – 0.43 | 1 |
| Timing71 x-whelen-mazda-mx-5-cup-presented-by-michelin ND2 v2 (q 1 / p 1) (% lap) | 0.518 | 0.501 – 0.535 | 2 |
| Timing71 nur SP 9 v2 (q 3 / p 0) (% lap) | 0.396 | 0.23 – 0.519 | 3 |
| Timing71 nur SP-X v2 (q 1 / p 0) (% lap) | 0 | 0 – 0 | 1 |
| Timing71 nur SP 10 v2 (q 1 / p 0) (% lap) | 0.762 | 0.762 – 0.762 | 1 |
| Timing71 nur BMW M240i v2 (q 1 / p 0) (% lap) | 0.001 | 0.001 – 0.001 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint M v2 (q 0 / p 1) (% lap) | 0.404 | 0.404 – 0.404 | 1 |
| Timing71 x-2023-thrifty-newcastle-500 M v2 (q 1 / p 2) (% lap) | 0.443 | 0.249 – 1.382 | 3 |
| Timing71 x-2023-thrifty-newcastle-500 R v2 (q 1 / p 2) (% lap) | 0.429 | 0.425 – 0.495 | 3 |
| Timing71 x-2025-century-batteries-ipswich-super-440 P v2 (q 1 / p 0) (% lap) | 0.402 | 0.402 – 0.402 | 1 |
| Timing71 x-2025-century-batteries-ipswich-super-440 A v2 (q 1 / p 0) (% lap) | 0.274 | 0.274 – 0.274 | 1 |
| Timing71 x-2026-century-batteries-ipswich-super-440 – v2 (q 1 / p 1) (% lap) | 0.505 | 0.362 – 0.648 | 2 |
| Timing71 x-24h-series PTO v2 (q 0 / p 3) (% lap) | 0.468 | 0.418 – 0.61 | 3 |
| Timing71 x-2k-world-cup – v2 (q 0 / p 1) (% lap) | 0.298 | 0.298 – 0.298 | 1 |
| Timing71 x-club-division P v2 (q 4 / p 0) (% lap) | 0.401 | 0.342 – 0.559 | 4 |
| Timing71 x-dmv-polo-cup 2 v2 (q 1 / p 0) (% lap) | 0.511 | 0.511 – 0.511 | 1 |
| Timing71 x-dmv-polo-cup PC v2 (q 1 / p 0) (% lap) | 0.493 | 0.493 – 0.493 | 1 |
| Timing71 x-fia-formula-regional-european-championship AM v2 (q 1 / p 0) (% lap) | 0.375 | 0.375 – 0.375 | 1 |
| Timing71 x-fia-formula-regional-european-championship PROAM v2 (q 1 / p 0) (% lap) | 0.331 | 0.331 – 0.331 | 1 |
| Timing71 x-fia-formula-regional-european-championship PRO v2 (q 1 / p 0) (% lap) | 0.444 | 0.444 – 0.444 | 1 |
| Timing71 x-formula-4-middle-east-championship F4 v2 (q 1 / p 0) (% lap) | 0.024 | 0.024 – 0.024 | 1 |
| Timing71 x-formula-4-middle-east-championship R v2 (q 1 / p 0) (% lap) | 0.066 | 0.066 – 0.066 | 1 |
| Timing71 x-gt-america-powered-by-aws GT4 v2 (q 1 / p 0) (% lap) | 0.484 | 0.484 – 0.484 | 1 |
| Timing71 x-gt-america-powered-by-aws SRO3 v2 (q 1 / p 0) (% lap) | 0.685 | 0.685 – 0.685 | 1 |
| Timing71 x-gt-america-powered-by-aws Masters v2 (q 1 / p 0) (% lap) | 0.205 | 0.205 – 0.205 | 1 |
| Timing71 x-gt3-revival-series PAM v2 (q 1 / p 0) (% lap) | 0.289 | 0.289 – 0.289 | 1 |
| Timing71 x-gt3-revival-series AM v2 (q 1 / p 0) (% lap) | 0.266 | 0.266 – 0.266 | 1 |
| Timing71 x-gulf-12-hours GT3 P v2 (q 2 / p 0) (% lap) | 0.349 | 0.349 – 0.349 | 2 |
| Timing71 x-gulf-12-hours GT3 PA v2 (q 3 / p 0) (% lap) | 0.379 | 0.184 – 0.401 | 3 |
| Timing71 x-gulf-12-hours GT3 A v2 (q 2 / p 0) (% lap) | 0.44 | 0.436 – 0.444 | 2 |
| Timing71 x-imsa-michelin-pilot-challenge ND2 v2 (q 0 / p 1) (% lap) | 0.625 | 0.625 – 0.625 | 1 |
| Timing71 x-imsa-prototype-challenge P3-1 v2 (q 3 / p 0) (% lap) | 0.601 | 0.494 – 0.719 | 3 |
| Timing71 x-international-gt-open GEN v2 (q 2 / p 0) (% lap) | 0.444 | 0.33 – 0.558 | 2 |
| Timing71 x-international-gt-open JUN v2 (q 1 / p 0) (% lap) | 0.473 | 0.473 – 0.473 | 1 |
| Timing71 x-international-gt-open CHA v2 (q 1 / p 0) (% lap) | 0.443 | 0.443 – 0.443 | 1 |
| Timing71 x-italian-f4-championship AM v2 (q 1 / p 0) (% lap) | 0.377 | 0.377 – 0.377 | 1 |
| Timing71 x-italian-f4-championship PROAM v2 (q 1 / p 0) (% lap) | 0.405 | 0.405 – 0.405 | 1 |
| Timing71 x-mini-max-micro-max Micro MAX v2 (q 1 / p 0) (% lap) | 0.583 | 0.583 – 0.583 | 1 |
| Timing71 x-mini-max-micro-max Mini MAX v2 (q 1 / p 0) (% lap) | 0.338 | 0.338 – 0.338 | 1 |
| Timing71 x-mini-max-micro-max DD2 MAX Master v2 (q 1 / p 0) (% lap) | 0.436 | 0.436 – 0.436 | 1 |
| Timing71 x-pirelli-gt4-america-sprintx-east Pro-Am v2 (q 3 / p 0) (% lap) | 0.278 | 0.232 – 0.326 | 3 |
| Timing71 x-pirelli-gt4-america-sprintx-east EAm v2 (q 3 / p 0) (% lap) | 0.401 | 0.314 – 0.42 | 3 |
| Timing71 x-pirelli-gt4-america-sprintx-east EPro-Am v2 (q 3 / p 0) (% lap) | 0.375 | 0.189 – 0.541 | 3 |
| Timing71 x-porsche-carrera-cup-asia Pro v2 (q 0 / p 1) (% lap) | 0.543 | 0.543 – 0.543 | 1 |
| Timing71 x-porsche-carrera-cup-asia Pro-Am v2 (q 0 / p 1) (% lap) | 0.627 | 0.627 – 0.627 | 1 |
| Timing71 x-porsche-carrera-cup-asia Am v2 (q 0 / p 1) (% lap) | 0.962 | 0.962 – 0.962 | 1 |
| Timing71 x-porsche-esports-carrera-cup-gb – v2 (q 2 / p 0) (% lap) | 0.285 | 0.196 – 0.374 | 2 |
| Timing71 x-snowy-river-caravans-tasmania-super-440 DS2 v2 (q 1 / p 1) (% lap) | 0.404 | 0.343 – 0.465 | 2 |
| Timing71 x-tc-america-tc-class TC v2 (q 4 / p 0) (% lap) | 0.411 | 0.297 – 0.461 | 4 |
| Timing71 x-tcr-eastern-europe TCR v2 (q 1 / p 0) (% lap) | 0.439 | 0.439 – 0.439 | 1 |
| Timing71 x-trofeo-pirelli-coppa-shell P-AM v2 (q 1 / p 0) (% lap) | 0.528 | 0.528 – 0.528 | 1 |
| Timing71 x-trofeo-pirelli-coppa-shell P v2 (q 1 / p 0) (% lap) | 0.533 | 0.533 – 0.533 | 1 |
| Timing71 x-trofeo-pirelli-coppa-shell S-AM v2 (q 1 / p 0) (% lap) | 0.503 | 0.503 – 0.503 | 1 |
| Timing71 x-trofeo-pirelli-coppa-shell S v2 (q 1 / p 0) (% lap) | 0.64 | 0.64 – 0.64 | 1 |
| Timing71 elms LMP2 Pro-Am v2 (q 1 / p 0) (% lap) | 0.533 | 0.533 – 0.533 | 1 |
| Timing71 imsa ST v2 (q 1 / p 0) (% lap) | 0.435 | 0.435 – 0.435 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint NBF v2 (q 1 / p 0) (% lap) | 0.413 | 0.413 – 0.413 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint NCE v2 (q 1 / p 0) (% lap) | 0.333 | 0.333 – 0.333 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint NCA v2 (q 1 / p 0) (% lap) | 0.262 | 0.262 – 0.262 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint NB1 v2 (q 1 / p 0) (% lap) | 0.678 | 0.678 – 0.678 | 1 |
| Timing71 x-2024-boost-mobile-gold-coast-500 P v2 (q 2 / p 0) (% lap) | 0.415 | 0.363 – 0.467 | 2 |
| Timing71 x-2024-boost-mobile-gold-coast-500 A v2 (q 1 / p 0) (% lap) | 0.737 | 0.737 – 0.737 | 1 |
| Timing71 x-2024-vailo-adelaide-500 DS2 v2 (q 1 / p 1) (% lap) | 0.525 | 0.473 – 0.577 | 2 |
| Timing71 x-2025-betr-darwin-triple-crown P v2 (q 1 / p 0) (% lap) | 0.356 | 0.356 – 0.356 | 1 |
| Timing71 x-2025-betr-darwin-triple-crown A v2 (q 1 / p 0) (% lap) | 0.389 | 0.389 – 0.389 | 1 |
| Timing71 x-2025-century-batteries-ipswich-super-440 SBK v2 (q 1 / p 0) (% lap) | 0.359 | 0.359 – 0.359 | 1 |
| Timing71 x-24h-series TCR-L v2 (q 0 / p 1) (% lap) | 0.597 | 0.597 – 0.597 | 1 |
| Timing71 x-bmw-sim-gt-cup-2022 – v2 (q 0 / p 3) (% lap) | 0.294 | 0.244 – 0.342 | 3 |
| Timing71 x-club-division MC v2 (q 4 / p 0) (% lap) | 0.449 | 0.356 – 0.459 | 4 |
| Timing71 x-dmv-formel-vau D-4 v2 (q 0 / p 1) (% lap) | 0.459 | 0.459 – 0.459 | 1 |
| Timing71 x-dmv-formel-vau D-5 v2 (q 0 / p 1) (% lap) | 0.519 | 0.519 – 0.519 | 1 |
| Timing71 x-indy-lights – v2 (q 0 / p 2) (% lap) | 0.474 | 0.447 – 0.5 | 2 |
| Timing71 x-lionheart-retro-series – v2 (q 4 / p 3) (% lap) | 0.345 | 0.208 – 0.441 | 7 |
| Timing71 x-mclaren-trophy-europe PRO v2 (q 0 / p 1) (% lap) | 0.251 | 0.251 – 0.251 | 1 |
| Timing71 x-mclaren-trophy-europe Silver v2 (q 0 / p 4) (% lap) | 0.34 | 0.211 – 0.404 | 4 |
| Timing71 x-mclaren-trophy-europe Bronze v2 (q 0 / p 2) (% lap) | 0.457 | 0.365 – 0.548 | 2 |
| Timing71 x-mclaren-trophy-europe Gold v2 (q 0 / p 3) (% lap) | 0.302 | 0.248 – 0.323 | 3 |
| Timing71 x-mustang-challenge DH v2 (q 0 / p 2) (% lap) | 0.582 | 0.545 – 0.62 | 2 |
| Timing71 x-mustang-challenge DHL v2 (q 0 / p 2) (% lap) | 0.508 | 0.505 – 0.511 | 2 |
| Timing71 x-n-rburgring-24-hours V 4 v2 (q 4 / p 0) (% lap) | 0.716 | 0.586 – 0.991 | 4 |
| Timing71 x-n-rburgring-24-hours SP 2T v2 (q 1 / p 0) (% lap) | 0.79 | 0.79 – 0.79 | 1 |
| Timing71 x-n-rburgring-24-hours SP-PRO v2 (q 1 / p 0) (% lap) | 0.634 | 0.634 – 0.634 | 1 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-west Am v2 (q 0 / p 2) (% lap) | 0.075 | 0.07 – 0.08 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-west WPro-Am v2 (q 0 / p 2) (% lap) | 0.433 | 0.399 – 0.467 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-west Pro v2 (q 0 / p 2) (% lap) | 0.492 | 0.479 – 0.504 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-west Pro-Am v2 (q 0 / p 2) (% lap) | 0.403 | 0.351 – 0.455 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-west WAm v2 (q 0 / p 2) (% lap) | 0.251 | 0.161 – 0.342 | 2 |
| Timing71 x-porsche-carrera-cup-france Pro v2 (q 5 / p 0) (% lap) | 0.345 | 0.229 – 0.455 | 5 |
| Timing71 x-porsche-carrera-cup-france Silver v2 (q 2 / p 0) (% lap) | 0.304 | 0.253 – 0.355 | 2 |
| Timing71 x-porsche-carrera-cup-france Gold v2 (q 2 / p 0) (% lap) | 0.266 | 0.214 – 0.317 | 2 |
| Timing71 x-porsche-carrera-cup-france Bronze Cup v2 (q 2 / p 0) (% lap) | 0.247 | 0.112 – 0.382 | 2 |
| Timing71 x-porsche-carrera-cup-middle-east – v2 (q 1 / p 0) (% lap) | 0.601 | 0.601 – 0.601 | 1 |
| Timing71 x-th-supercar-gt3-gtm GT3 Pro v2 (q 1 / p 0) (% lap) | 0.434 | 0.434 – 0.434 | 1 |
| Timing71 x-th-supercar-gt3-gtm GTM Pro v2 (q 1 / p 0) (% lap) | 0.464 | 0.464 – 0.464 | 1 |
| Timing71 x-weathertech-raceway-laguna-seca GT3 v2 (q 2 / p 0) (% lap) | 0.58 | 0.507 – 0.653 | 2 |
| Timing71 x-weathertech-raceway-laguna-seca GT4 v2 (q 2 / p 0) (% lap) | 0.47 | 0.376 – 0.564 | 2 |
| Timing71 x-weathertech-raceway-laguna-seca GT3 PAM v2 (q 2 / p 0) (% lap) | 0.486 | 0.258 – 0.713 | 2 |
| Timing71 x-whelen-mazda-mx-5-cup-presented-by-michelin TCR v2 (q 0 / p 1) (% lap) | 0.311 | 0.311 – 0.311 | 1 |
| Timing71 x-whelen-mazda-mx-5-cup-presented-by-michelin GS v2 (q 0 / p 1) (% lap) | 0.573 | 0.573 – 0.573 | 1 |
| Timing71 x-2022-imsa-esports-michelin-global-championship GTD v2 (q 0 / p 1) (% lap) | 0.499 | 0.499 – 0.499 | 1 |
| Timing71 x-2022-imsa-esports-michelin-global-championship Touring Car v2 (q 1 / p 0) (% lap) | 0.256 | 0.256 – 0.256 | 1 |
| Timing71 x-2023-beaurepaires-sydney-supernight – v2 (q 2 / p 1) (% lap) | 0.267 | 0.226 – 0.306 | 3 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint GTP v2 (q 1 / p 0) (% lap) | 0.386 | 0.386 – 0.386 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint GTA v2 (q 1 / p 0) (% lap) | 0.603 | 0.603 – 0.603 | 1 |
| Timing71 x-2023-bosch-power-tools-perth-supersprint GT3 v2 (q 0 / p 1) (% lap) | 0.694 | 0.694 – 0.694 | 1 |
| Timing71 x-24h-series-powered-by-hankook TCE v2 (q 1 / p 2) (% lap) | 0.566 | 0.39 – 0.574 | 3 |
| Timing71 x-coppa-shell P-AM v2 (q 3 / p 0) (% lap) | 0.364 | 0.335 – 0.393 | 3 |
| Timing71 x-coppa-shell P v2 (q 3 / p 0) (% lap) | 0.411 | 0.343 – 0.445 | 3 |
| Timing71 x-dd2-max-master Junior MAX v2 (q 1 / p 0) (% lap) | 0.325 | 0.325 – 0.325 | 1 |
| Timing71 x-e4-championship RT v2 (q 1 / p 0) (% lap) | 0.265 | 0.265 – 0.265 | 1 |
| Timing71 x-e4-championship – v2 (q 1 / p 0) (% lap) | 0.382 | 0.382 – 0.382 | 1 |
| Timing71 x-f4-cez F4 v2 (q 1 / p 0) (% lap) | 0.357 | 0.357 – 0.357 | 1 |
| Timing71 x-ferrari-challenge-north-america P-AM v2 (q 1 / p 0) (% lap) | 0.531 | 0.531 – 0.531 | 1 |
| Timing71 x-gt-cup-europe Rookie v2 (q 1 / p 0) (% lap) | 0.278 | 0.278 – 0.278 | 1 |
| Timing71 x-gt-cup-europe PRO v2 (q 1 / p 0) (% lap) | 0.169 | 0.169 – 0.169 | 1 |
| Timing71 x-imsa-prototype-challenge-presented-by-mazda LMP3 v2 (q 6 / p 1) (% lap) | 0.597 | 0.444 – 0.637 | 7 |
| Timing71 x-imsa-prototype-challenge-presented-by-mazda MPC v2 (q 5 / p 1) (% lap) | 0.53 | 0.444 – 0.686 | 6 |
| Timing71 x-intelligent-money-british-gt-championship GT4PA v2 (q 0 / p 2) (% lap) | 0.479 | 0.432 – 0.527 | 2 |
| Timing71 x-international-gt-open SILVER v2 (q 2 / p 0) (% lap) | 0.276 | 0.259 – 0.292 | 2 |
| Timing71 x-l-denon – v2 (q 6 / p 0) (% lap) | 0.126 | 0.03 – 0.244 | 6 |
| Timing71 x-n-rburgring-24-hours SP 8T v2 (q 3 / p 0) (% lap) | 0.611 | 0.463 – 0.707 | 3 |
| Timing71 x-n-rburgring-24-hours SP 8 v2 (q 1 / p 0) (% lap) | 0.379 | 0.379 – 0.379 | 1 |
| Timing71 x-n-rburgring-24-hours AT v2 (q 2 / p 0) (% lap) | 0.581 | 0.17 – 0.992 | 2 |
| Timing71 x-porsche-supercup – v2 (q 1 / p 1) (% lap) | 0.398 | 0.388 – 0.408 | 2 |
| Timing71 x-prototype-cup-europe SR3 v2 (q 2 / p 0) (% lap) | 0.491 | 0.449 – 0.534 | 2 |
| Timing71 x-snowy-river-caravans-tasmania-super-440 – v2 (q 2 / p 0) (% lap) | 0.441 | 0.412 – 0.47 | 2 |
| Timing71 x-tc-america-tcr-tca-classes TCR Cup v2 (q 3 / p 1) (% lap) | 0.456 | 0.389 – 0.865 | 4 |
| Timing71 x-tc-america-tcr-tca-classes TCR v2 (q 3 / p 1) (% lap) | 0.466 | 0.341 – 0.645 | 4 |
| Timing71 x-tc-america-tcr-tca-classes TCA v2 (q 4 / p 1) (% lap) | 0.489 | 0.343 – 0.709 | 5 |
| Timing71 x-totalenergies-24-hours-of-spa PAM v2 (q 2 / p 1) (% lap) | 0.434 | 0.42 – 0.503 | 3 |
| Timing71 x-totalenergies-24-hours-of-spa PRO v2 (q 2 / p 1) (% lap) | 0.406 | 0.249 – 0.442 | 3 |
| Timing71 x-totalenergies-24-hours-of-spa Silver v2 (q 2 / p 1) (% lap) | 0.411 | 0.385 – 0.476 | 3 |
| Timing71 x-totalenergies-24-hours-of-spa – v2 (q 1 / p 2) (% lap) | 0.418 | 0.388 – 0.484 | 3 |
| Timing71 dtm J v2 (q 3 / p 0) (% lap) | 0.379 | 0.257 – 0.471 | 3 |
| Timing71 dtm T v2 (q 1 / p 0) (% lap) | 0.734 | 0.734 – 0.734 | 1 |
| Timing71 x-2024-repco-bathurst-1000 – v2 (q 2 / p 1) (% lap) | 0.259 | 0.223 – 0.415 | 3 |
| Timing71 x-2025-penrite-oil-sandown-500 – v2 (q 2 / p 0) (% lap) | 0.546 | 0.519 – 0.573 | 2 |
| Timing71 x-2026-formula-regional-middle-east-trophy – v2 (q 1 / p 0) (% lap) | 0.422 | 0.422 – 0.422 | 1 |
| Timing71 x-2026-formula-regional-middle-east-trophy R v2 (q 1 / p 0) (% lap) | 0.337 | 0.337 – 0.337 | 1 |
| Timing71 x-24h-series 991-AM v2 (q 1 / p 4) (% lap) | 0.6 | 0.353 – 0.661 | 5 |
| Timing71 x-24h-series 991-PRO v2 (q 1 / p 4) (% lap) | 0.572 | 0.551 – 1.557 | 5 |
| Timing71 x-24h-series A2 v2 (q 0 / p 4) (% lap) | 0.587 | 0.244 – 0.85 | 4 |
| Timing71 x-adac-tcr-germany – v2 (q 0 / p 2) (% lap) | 0.259 | 0.023 – 0.495 | 2 |
| Timing71 x-crowdstrike-24-hours-of-spa Bronze v2 (q 2 / p 0) (% lap) | 0.471 | 0.316 – 0.626 | 2 |
| Timing71 x-crowdstrike-24-hours-of-spa Silver v2 (q 2 / p 0) (% lap) | 0.539 | 0.453 – 0.625 | 2 |
| Timing71 x-crowdstrike-24-hours-of-spa PAM v2 (q 2 / p 0) (% lap) | 0.64 | 0.552 – 0.727 | 2 |
| Timing71 x-crowdstrike-24-hours-of-spa Gold v2 (q 2 / p 0) (% lap) | 0.266 | 0.232 – 0.3 | 2 |
| Timing71 x-fanatec-gt2-european-series-pwrd-by-pirelli PAM v2 (q 1 / p 0) (% lap) | 0.369 | 0.369 – 0.369 | 1 |
| Timing71 x-fanatec-gt2-european-series-pwrd-by-pirelli AM v2 (q 1 / p 0) (% lap) | 0.406 | 0.406 – 0.406 | 1 |
| Timing71 x-ferrari-challenge-north-america P v2 (q 1 / p 0) (% lap) | 0.885 | 0.885 – 0.885 | 1 |
| Timing71 x-finale-mondiale-coppa-shell-am S-AM v2 (q 1 / p 0) (% lap) | 0.507 | 0.507 – 0.507 | 1 |
| Timing71 x-imsa-prototype-challenge P3-2 v2 (q 0 / p 2) (% lap) | 0.717 | 0.574 – 0.859 | 2 |
| Timing71 x-lamborghini-super-trofeo Pro v2 (q 0 / p 3) (% lap) | 0.316 | 0.095 – 0.427 | 3 |
| Timing71 x-lamborghini-super-trofeo ProAm v2 (q 1 / p 1) (% lap) | 1.112 | 1.085 – 1.139 | 2 |
| Timing71 x-lamborghini-super-trofeo LBCup v2 (q 0 / p 2) (% lap) | 0.678 | 0.433 – 0.923 | 2 |
| Timing71 x-lamborghini-super-trofeo Am v2 (q 0 / p 2) (% lap) | 0.723 | 0.577 – 0.869 | 2 |
| Timing71 x-le-castellet – v2 (q 2 / p 1) (% lap) | 0.174 | 0 – 0.348 | 3 |
| Timing71 x-mclaren-trophy-europe Pam v2 (q 0 / p 1) (% lap) | 0.356 | 0.356 – 0.356 | 1 |
| Timing71 x-mclaren-trophy-europe Pro v2 (q 0 / p 2) (% lap) | 0.22 | 0.189 – 0.252 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-east Am v2 (q 0 / p 2) (% lap) | 0.455 | 0.247 – 0.662 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-east Pro-Am v2 (q 0 / p 2) (% lap) | 0.383 | 0.298 – 0.468 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-east EAm v2 (q 0 / p 2) (% lap) | 0.538 | 0.397 – 0.678 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-east Pro v2 (q 0 / p 2) (% lap) | 0.468 | 0.446 – 0.491 | 2 |
| Timing71 x-pirelli-gt4-america-sprint-sprintx-east EPro-Am v2 (q 0 / p 2) (% lap) | 0.382 | 0.355 – 0.41 | 2 |
| Timing71 x-porsche-carrera-cup-france Am v2 (q 3 / p 0) (% lap) | 0.448 | 0.4 – 0.512 | 3 |
| Timing71 x-porsche-carrera-cup-france Pro-Am v2 (q 3 / p 0) (% lap) | 0.437 | 0.246 – 0.539 | 3 |
| Timing71 x-porsche-endurance-challenge-north-america Cay Pro-Am v2 (q 1 / p 0) (% lap) | 0.391 | 0.391 – 0.391 | 1 |
| Timing71 x-prototype-cup-europe LMP3 v2 (q 1 / p 0) (% lap) | 0.462 | 0.462 – 0.462 | 1 |
| Timing71 x-quarantine-gt-challenge – v2 (q 1 / p 0) (% lap) | 0.258 | 0.258 – 0.258 | 1 |
| Timing71 x-race-of-remembrance AC1 v2 (q 1 / p 0) (% lap) | 0.724 | 0.724 – 0.724 | 1 |
| Timing71 x-race-of-remembrance D v2 (q 1 / p 0) (% lap) | 0.642 | 0.642 – 0.642 | 1 |
| Timing71 x-race-of-remembrance CST v2 (q 0 / p 1) (% lap) | 0.649 | 0.649 – 0.649 | 1 |
| Timing71 x-race-of-remembrance C v2 (q 1 / p 0) (% lap) | 0.772 | 0.772 – 0.772 | 1 |
| Timing71 x-race-of-remembrance E v2 (q 2 / p 0) (% lap) | 0.592 | 0.506 – 0.677 | 2 |
| Timing71 x-race-of-remembrance B v2 (q 2 / p 0) (% lap) | 0.597 | 0.492 – 0.701 | 2 |
| Timing71 x-race-of-remembrance ACC v2 (q 1 / p 0) (% lap) | 0.611 | 0.611 – 0.611 | 1 |
| Timing71 x-race-of-remembrance R v2 (q 2 / p 0) (% lap) | 0.604 | 0.558 – 0.649 | 2 |
| Timing71 x-trofeo-predators GT3 v2 (q 1 / p 0) (% lap) | 0.581 | 0.581 – 0.581 | 1 |
| Timing71 x-trofeo-predators GT4 v2 (q 1 / p 0) (% lap) | 0.413 | 0.413 – 0.413 | 1 |
| Timing71 x-trofeo-predators 992 v2 (q 1 / p 0) (% lap) | 0.528 | 0.528 – 0.528 | 1 |
| Timing71 alms LMP2 AM v2 (q 0 / p 4) (% lap) | 0.692 | 0.678 – 0.71 | 4 |
| Timing71 x-2024-vailo-adelaide-500 – v2 (q 2 / p 2) (% lap) | 0.545 | 0.388 – 0.831 | 4 |
| Timing71 x-2025-airtouch-500-at-the-bend PM v2 (q 1 / p 0) (% lap) | 0.304 | 0.304 – 0.304 | 1 |
| Timing71 x-2025-airtouch-500-at-the-bend PS v2 (q 1 / p 0) (% lap) | 0.545 | 0.545 – 0.545 | 1 |
| Timing71 x-2025-boost-mobile-gold-coast-500 – v2 (q 1 / p 1) (% lap) | 0.465 | 0.403 – 0.526 | 2 |
| Timing71 x-2026-airtouch-500-at-the-bend – v2 (q 0 / p 1) (% lap) | 0.37 | 0.37 – 0.37 | 1 |
| Timing71 x-24h-series AM v2 (q 1 / p 0) (% lap) | 0.567 | 0.567 – 0.567 | 1 |
| Timing71 x-24h-series PRO/AM v2 (q 1 / p 0) (% lap) | 0.745 | 0.745 – 0.745 | 1 |
| Timing71 x-24h-series PRO v2 (q 1 / p 0) (% lap) | 0.65 | 0.65 – 0.65 | 1 |
| Timing71 x-24h-series-me-trophy GT3 v2 (q 2 / p 3) (% lap) | 0.522 | 0.425 – 0.619 | 5 |
| Timing71 x-24h-series-me-trophy TCE v2 (q 2 / p 3) (% lap) | 0.608 | 0.565 – 0.664 | 5 |
| Timing71 x-24h-series-me-trophy GT4 v2 (q 2 / p 3) (% lap) | 0.529 | 0.33 – 0.75 | 5 |
| Timing71 x-24h-series-me-trophy GTX v2 (q 1 / p 3) (% lap) | 0.505 | 0.453 – 0.622 | 4 |
| Timing71 x-24h-series-me-trophy 992 v2 (q 2 / p 3) (% lap) | 0.514 | 0.438 – 0.562 | 5 |
| Timing71 x-clubsport-summer-series GT4 Class v2 (q 1 / p 1) (% lap) | 0.246 | 0.226 – 0.266 | 2 |
| Timing71 x-clubsport-summer-series Audi RS 3 LMS v2 (q 2 / p 0) (% lap) | 0.402 | 0.335 – 0.47 | 2 |
| Timing71 x-dmv-formel-vau A v2 (q 0 / p 1) (% lap) | 0.698 | 0.698 – 0.698 | 1 |
| Timing71 x-dmv-formel-vau B v2 (q 0 / p 1) (% lap) | 0.511 | 0.511 – 0.511 | 1 |
| Timing71 x-dmv-formel-vau C v2 (q 0 / p 1) (% lap) | 0.549 | 0.549 – 0.549 | 1 |
| Timing71 x-f4-cez F4-H1 v2 (q 1 / p 0) (% lap) | 0.348 | 0.348 – 0.348 | 1 |
| Timing71 x-f4-uae-championship F4UAE v2 (q 2 / p 0) (% lap) | 0.199 | 0.057 – 0.341 | 2 |
| Timing71 x-f4-uae-championship R v2 (q 2 / p 0) (% lap) | 0.031 | 0.025 – 0.038 | 2 |
| Timing71 x-fia-formula-regional Silver v2 (q 2 / p 0) (% lap) | 0.357 | 0.342 – 0.372 | 2 |
| Timing71 x-finale-mondiale-coppa-shell S v2 (q 1 / p 0) (% lap) | 0.589 | 0.589 – 0.589 | 1 |
| Timing71 x-gt-cup-europe CHA v2 (q 1 / p 0) (% lap) | 0.248 | 0.248 – 0.248 | 1 |
| Timing71 x-gt-cup-europe JUN v2 (q 1 / p 0) (% lap) | 0.376 | 0.376 – 0.376 | 1 |
| Timing71 x-gt-cup-europe GEN v2 (q 1 / p 0) (% lap) | 0.472 | 0.472 – 0.472 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup Pam v2 (q 1 / p 0) (% lap) | 0.993 | 0.993 – 0.993 | 1 |
| Timing71 x-imsa P3-1 v2 (q 1 / p 0) (% lap) | 0.631 | 0.631 – 0.631 | 1 |
| Timing71 x-international-gt-open R v2 (q 2 / p 0) (% lap) | 0.392 | 0.359 – 0.425 | 2 |
| Timing71 x-ivra-gt-sprint-series – v2 (q 5 / p 0) (% lap) | 0.297 | 0.226 – 0.695 | 5 |
| Timing71 x-official-paid-fanatec-gtwc-pwrd-by-aws-gt2 – v2 (q 0 / p 1) (% lap) | 0.488 | 0.488 – 0.488 | 1 |
| Timing71 x-porsche-carrera-cup-benelux PAM v2 (q 0 / p 1) (% lap) | 0.724 | 0.724 – 0.724 | 1 |
| Timing71 x-porsche-carrera-cup-benelux GT4 v2 (q 0 / p 1) (% lap) | 0.56 | 0.56 – 0.56 | 1 |
| Timing71 x-porsche-endurance-challenge-north-america GT3 Cup Pro-Am v2 (q 3 / p 0) (% lap) | 0.447 | 0.437 – 0.677 | 3 |
| Timing71 x-porsche-endurance-challenge-north-america GT3 Cup Am v2 (q 3 / p 0) (% lap) | 0.455 | 0.446 – 0.605 | 3 |
| Timing71 x-porsche-sprint-challenge-usa-west 992 M v2 (q 0 / p 2) (% lap) | 0.402 | 0.277 – 0.527 | 2 |
| Timing71 x-vco-esports-racing-world-cup – v2 (q 0 / p 1) (% lap) | 0.518 | 0.518 – 0.518 | 1 |
| Timing71 x-weathertech-raceway-laguna-seca TCR v2 (q 1 / p 0) (% lap) | 0.326 | 0.326 – 0.326 | 1 |
| Timing71 x-winter-greenhell-2020-2021 GT3 Class v2 (q 1 / p 0) (% lap) | 0.349 | 0.349 – 0.349 | 1 |
| Timing71 x-winter-greenhell-2020-2021 GT4 Class v2 (q 1 / p 0) (% lap) | 0.017 | 0.017 – 0.017 | 1 |
| Timing71 alms F3 v2 (q 0 / p 1) (% lap) | 0.234 | 0.234 – 0.234 | 1 |
| Timing71 alms F3R v2 (q 0 / p 1) (% lap) | 0.348 | 0.348 – 0.348 | 1 |
| Timing71 igtc CH v2 (q 1 / p 2) (% lap) | 0.926 | 0.506 – 0.978 | 3 |
| Timing71 igtc SC v2 (q 1 / p 4) (% lap) | 0.592 | 0.381 – 0.907 | 5 |
| Timing71 x-190cc 190 v2 (q 0 / p 1) (% lap) | 0.547 | 0.547 – 0.547 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour X v2 (q 1 / p 0) (% lap) | 0.449 | 0.449 – 0.449 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour A2 v2 (q 1 / p 0) (% lap) | 0.423 | 0.423 – 0.423 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown P v2 (q 1 / p 0) (% lap) | 0.347 | 0.347 – 0.347 | 1 |
| Timing71 x-2025-boost-mobile-gold-coast-500 P v2 (q 1 / p 0) (% lap) | 0.509 | 0.509 – 0.509 | 1 |
| Timing71 x-2025-boost-mobile-gold-coast-500 A v2 (q 1 / p 0) (% lap) | 0.646 | 0.646 – 0.646 | 1 |
| Timing71 x-2026-century-batteries-ipswich-super-440 C v2 (q 0 / p 1) (% lap) | 0.737 | 0.737 – 0.737 | 1 |
| Timing71 x-2026-dunlop-sydney-500 – v2 (q 2 / p 2) (% lap) | 0.27 | 0.252 – 0.515 | 4 |
| Timing71 x-adac-tourenwagen-junior-cup – v2 (q 1 / p 0) (% lap) | 0.46 | 0.46 – 0.46 | 1 |
| Timing71 x-fia-motorsport-games-2019-gt-cup – v2 (q 2 / p 1) (% lap) | 0.448 | 0.401 – 0.643 | 3 |
| Timing71 x-gr-4-kla-j-k-youngtimer-ber-850ccm-bj-94-04-supersport J v2 (q 1 / p 0) (% lap) | 0.628 | 0.628 – 0.628 | 1 |
| Timing71 x-gr-4-kla-j-k-youngtimer-ber-850ccm-bj-94-04-supersport G v2 (q 1 / p 0) (% lap) | 0.601 | 0.601 – 0.601 | 1 |
| Timing71 x-gr-4-kla-j-k-youngtimer-ber-850ccm-bj-94-04-supersport K v2 (q 1 / p 0) (% lap) | 0.515 | 0.515 – 0.515 | 1 |
| Timing71 x-gr-4-kla-j-k-youngtimer-ber-850ccm-bj-94-04-supersport I v2 (q 1 / p 0) (% lap) | 0.592 | 0.592 – 0.592 | 1 |
| Timing71 x-gt-worldcheu-pwrd-by-aws-endurance-cup AM v2 (q 2 / p 2) (% lap) | 0.507 | 0.378 – 0.633 | 4 |
| Timing71 x-gt4-european-series-pwrd-by-rafa-racing-club AM v2 (q 4 / p 0) (% lap) | 0.408 | 0.187 – 0.53 | 4 |
| Timing71 x-gt4-european-series-pwrd-by-rafa-racing-club PAM v2 (q 4 / p 0) (% lap) | 0.455 | 0.328 – 0.549 | 4 |
| Timing71 x-ivra-endurance-series Dallara P217 v2 (q 7 / p 0) (% lap) | 0.394 | 0.326 – 0.411 | 7 |
| Timing71 x-porsche-carrera-cup-north-america Pro v2 (q 3 / p 0) (% lap) | 0.249 | 0.241 – 0.308 | 3 |
| Timing71 x-porsche-carrera-cup-north-america Pro-Am v2 (q 3 / p 0) (% lap) | 0.367 | 0.352 – 0.541 | 3 |
| Timing71 x-porsche-carrera-cup-north-america Masters v2 (q 3 / p 0) (% lap) | 0.453 | 0.405 – 0.463 | 3 |
| Timing71 x-spa-francorchamps – v2 (q 2 / p 0) (% lap) | 0.381 | 0.319 – 0.444 | 2 |
| Timing71 x-theracingline-app-presents GTE Class v2 (q 0 / p 2) (% lap) | 0.35 | 0.25 – 0.45 | 2 |
| Timing71 x-theracingline-app-presents Dallara P217 v2 (q 1 / p 2) (% lap) | 0.489 | 0.458 – 0.617 | 3 |
| Timing71 x-total-24-hours-of-spa NAT v2 (q 1 / p 1) (% lap) | 0.672 | 0.502 – 0.843 | 2 |
| Timing71 x-toyota-yaris-omr – v2 (q 1 / p 0) (% lap) | 0.405 | 0.405 – 0.405 | 1 |
| Timing71 x-2021-hi-tec-oils-bathurst-6-hour X v2 (q 1 / p 0) (% lap) | 0.571 | 0.571 – 0.571 | 1 |
| Timing71 x-2021-hi-tec-oils-bathurst-6-hour C v2 (q 1 / p 0) (% lap) | 0.311 | 0.311 – 0.311 | 1 |
| Timing71 x-2021-hi-tec-oils-bathurst-6-hour A1 v2 (q 1 / p 0) (% lap) | 0.558 | 0.558 – 0.558 | 1 |
| Timing71 x-2021-hi-tec-oils-bathurst-6-hour A2 v2 (q 1 / p 0) (% lap) | 0.315 | 0.315 – 0.315 | 1 |
| Timing71 x-2021-hi-tec-oils-bathurst-6-hour D v2 (q 1 / p 0) (% lap) | 0.386 | 0.386 – 0.386 | 1 |
| Timing71 x-2026-bosch-power-tools-perth-super-440 DS2 v2 (q 1 / p 0) (% lap) | 0.348 | 0.348 – 0.348 | 1 |
| Timing71 x-adac-gt4-germany T v2 (q 1 / p 0) (% lap) | 0.545 | 0.545 – 0.545 | 1 |
| Timing71 x-clubsport-summer-series Porsche 911 v2 (q 1 / p 0) (% lap) | 0.366 | 0.366 – 0.366 | 1 |
| Timing71 x-dmv-polo-cup TW 22 v2 (q 1 / p 0) (% lap) | 0.452 | 0.452 – 0.452 | 1 |
| Timing71 x-euroformula-open PRO v2 (q 2 / p 0) (% lap) | 0.355 | 0.274 – 0.437 | 2 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup AM v2 (q 1 / p 0) (% lap) | 0.653 | 0.653 – 0.653 | 1 |
| Timing71 x-ferrari-challenge-north-america S-AM v2 (q 1 / p 0) (% lap) | 0.571 | 0.571 – 0.571 | 1 |
| Timing71 x-ferrari-challenge-uk P v2 (q 1 / p 0) (% lap) | 0.586 | 0.586 – 0.586 | 1 |
| Timing71 x-ferrari-challenge-uk S v2 (q 1 / p 0) (% lap) | 0.497 | 0.497 – 0.497 | 1 |
| Timing71 x-finale-mondiale-trofeo-pirelli-pirelli-am P-AM v2 (q 1 / p 0) (% lap) | 0.519 | 0.519 – 0.519 | 1 |
| Timing71 x-finale-mondiale-trofeo-pirelli-pirelli-am P v2 (q 1 / p 0) (% lap) | 0.561 | 0.561 – 0.561 | 1 |
| Timing71 x-formula-regional-middle-east-championship R v2 (q 2 / p 0) (% lap) | 0 | 0 – 0 | 2 |
| Timing71 x-formula-regional-middle-east-championship   v2 (q 2 / p 0) (% lap) | 0.029 | 0 – 0.058 | 2 |
| Timing71 x-gt4-european-series PRO-AM v2 (q 1 / p 0) (% lap) | 0.856 | 0.856 – 0.856 | 1 |
| Timing71 x-gulf-12-hours Am v2 (q 1 / p 0) (% lap) | 0.325 | 0.325 – 0.325 | 1 |
| Timing71 x-gulf-12-hours ProAm v2 (q 1 / p 0) (% lap) | 0.359 | 0.359 – 0.359 | 1 |
| Timing71 x-porsche-carrera-cup-benelux Silver v2 (q 1 / p 0) (% lap) | 0.47 | 0.47 – 0.47 | 1 |
| Timing71 x-prototype-cup-europe GT3 v2 (q 1 / p 0) (% lap) | 0.356 | 0.356 – 0.356 | 1 |
| Timing71 x-prototype-cup-europe TCE v2 (q 1 / p 0) (% lap) | 0.306 | 0.306 – 0.306 | 1 |
| Timing71 x-prototype-cup-europe GT4 v2 (q 1 / p 0) (% lap) | 0.322 | 0.322 – 0.322 | 1 |
| Timing71 x-prototype-cup-europe 992 v2 (q 1 / p 0) (% lap) | 0.318 | 0.318 – 0.318 | 1 |
| Timing71 x-simracing-deutschland GT3 v2 (q 0 / p 1) (% lap) | 0 | 0 – 0 | 1 |
| Timing71 x-tcr-europe SILVER v2 (q 1 / p 0) (% lap) | 0.399 | 0.399 – 0.399 | 1 |
| Timing71 x-tcr-europe AM v2 (q 2 / p 0) (% lap) | 0.598 | 0.526 – 0.67 | 2 |
| Timing71 x-tcr-europe PROAM v2 (q 1 / p 0) (% lap) | 0.509 | 0.509 – 0.509 | 1 |
| Timing71 x-theracingline-app-presents GTE IMSA v2 (q 0 / p 1) (% lap) | 0.414 | 0.414 – 0.414 | 1 |
| Timing71 x-theracingline-app-presents GTD Class v2 (q 0 / p 1) (% lap) | 0.356 | 0.356 – 0.356 | 1 |
| Timing71 x-2025-thrifty-sydney-500-opening-round – v2 (q 1 / p 0) (% lap) | 0.35 | 0.35 – 0.35 | 1 |
| Timing71 x-creventic-endurance-series GT3 Class 4 v2 (q 0 / p 1) (% lap) | 0.504 | 0.504 – 0.504 | 1 |
| Timing71 x-creventic-endurance-series GT4 Class v2 (q 0 / p 1) (% lap) | 1.068 | 1.068 – 1.068 | 1 |
| Timing71 x-dmv-nes-1000-km Cup 1 v2 (q 1 / p 0) (% lap) | 0.446 | 0.446 – 0.446 | 1 |
| Timing71 x-euronascar – v2 (q 2 / p 0) (% lap) | 0.463 | 0.457 – 0.468 | 2 |
| Timing71 x-ferrari-challenge-north-america S v2 (q 1 / p 0) (% lap) | 0.572 | 0.572 – 0.572 | 1 |
| Timing71 x-finale-mondiale-coppa-shell S-AM v2 (q 1 / p 0) (% lap) | 0.541 | 0.541 – 0.541 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Silver Cup v2 (q 0 / p 1) (% lap) | 0.364 | 0.364 – 0.364 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Pro-Am Cup v2 (q 0 / p 1) (% lap) | 0.493 | 0.493 – 0.493 | 1 |
| Timing71 x-gulf-12-hours Pro v2 (q 1 / p 0) (% lap) | 0.404 | 0.404 – 0.404 | 1 |
| Timing71 x-isowc-2021 – v2 (q 0 / p 1) (% lap) | 0.276 | 0.276 – 0.276 | 1 |
| Timing71 x-n-rburgring-24-hours BMW M240i v2 (q 3 / p 0) (% lap) | 0.481 | 0.129 – 1.26 | 3 |
| Timing71 x-official-paid-gtwc-powered-by-aws – v2 (q 0 / p 2) (% lap) | 0.521 | 0.519 – 0.523 | 2 |
| Timing71 x-official-paid-gtwc-powered-by-aws Silver v2 (q 0 / p 1) (% lap) | 0.527 | 0.527 – 0.527 | 1 |
| Timing71 x-official-paid-gtwc-powered-by-aws PAM v2 (q 0 / p 1) (% lap) | 0.532 | 0.532 – 0.532 | 1 |
| Timing71 x-porsche-carrera-cup-benelux RT v2 (q 1 / p 0) (% lap) | 0.348 | 0.348 – 0.348 | 1 |
| Timing71 x-porsche-carrera-cup-france CHA v2 (q 1 / p 0) (% lap) | 0.507 | 0.507 – 0.507 | 1 |
| Timing71 x-race-of-remembrance A v2 (q 1 / p 0) (% lap) | 0.564 | 0.564 – 0.564 | 1 |
| Timing71 dtm PAM v2 (q 3 / p 0) (% lap) | 0.63 | 0.613 – 0.702 | 3 |
| Timing71 igtc – v2 (q 0 / p 1) (% lap) | 0.216 | 0.216 – 0.216 | 1 |
| Timing71 x-2026-dunlop-sydney-500 DS2 v2 (q 1 / p 1) (% lap) | 0.369 | 0.319 – 0.419 | 2 |
| Timing71 x-european-vw-fun-cup EVO3 v2 (q 1 / p 0) (% lap) | 0.598 | 0.598 – 0.598 | 1 |
| Timing71 x-european-vw-fun-cup EVO2 v2 (q 1 / p 0) (% lap) | 0.745 | 0.745 – 0.745 | 1 |
| Timing71 x-european-vw-fun-cup BI3 v2 (q 1 / p 2) (% lap) | 0.627 | 0.554 – 0.656 | 3 |
| Timing71 x-european-vw-fun-cup BI2 v2 (q 1 / p 0) (% lap) | 0.346 | 0.346 – 0.346 | 1 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup Inv v2 (q 1 / p 1) (% lap) | 0.336 | 0.319 – 0.353 | 2 |
| Timing71 x-formula-regional-championship-by-alpine Silver v2 (q 1 / p 0) (% lap) | 0.443 | 0.443 – 0.443 | 1 |
| Timing71 x-formula-renault-eurocup R v2 (q 0 / p 2) (% lap) | 0.27 | 0.192 – 0.347 | 2 |
| Timing71 x-porsche-carrera-cup-middle-east PRO v2 (q 1 / p 0) (% lap) | 0.429 | 0.429 – 0.429 | 1 |
| Timing71 x-porsche-carrera-cup-middle-east Masters v2 (q 1 / p 0) (% lap) | 0.647 | 0.647 – 0.647 | 1 |
| Timing71 x-race-of-remembrance I v2 (q 1 / p 0) (% lap) | 0.595 | 0.595 – 0.595 | 1 |
| Timing71 x-theracingline-app-presents LMP1 Class v2 (q 0 / p 1) (% lap) | 0.976 | 0.976 – 0.976 | 1 |
| Timing71 x-w-series – v2 (q 7 / p 2) (% lap) | 0.429 | 0.341 – 0.447 | 9 |
| Timing71 imsa ND2 v2 (q 0 / p 2) (% lap) | 0.617 | 0.498 – 0.736 | 2 |
| Timing71 x-2024-repco-bathurst-1000 DS2 v2 (q 1 / p 0) (% lap) | 0.35 | 0.35 – 0.35 | 1 |
| Timing71 x-2025-betr-darwin-triple-crown PM v2 (q 1 / p 0) (% lap) | 0.346 | 0.346 – 0.346 | 1 |
| Timing71 x-2025-betr-darwin-triple-crown INV v2 (q 1 / p 0) (% lap) | 0.294 | 0.294 – 0.294 | 1 |
| Timing71 x-2025-betr-darwin-triple-crown PS v2 (q 1 / p 0) (% lap) | 0.498 | 0.498 – 0.498 | 1 |
| Timing71 x-2025-betr-darwin-triple-crown PA v2 (q 1 / p 0) (% lap) | 0.342 | 0.342 – 0.342 | 1 |
| Timing71 x-2025-century-batteries-ipswich-super-440 NG v2 (q 0 / p 1) (% lap) | 0.53 | 0.53 – 0.53 | 1 |
| Timing71 x-fanatec-gt-worldcheu-pwrd-by-aws-sprint-cup PRO v2 (q 2 / p 0) (% lap) | 0.447 | 0.421 – 0.472 | 2 |
| Timing71 x-fanatec-gt-worldcheu-pwrd-by-aws-sprint-cup Silver v2 (q 2 / p 0) (% lap) | 0.447 | 0.385 – 0.508 | 2 |
| Timing71 x-fanatec-gt-worldcheu-pwrd-by-aws-sprint-cup PAM v2 (q 2 / p 0) (% lap) | 0.445 | 0.405 – 0.485 | 2 |
| Timing71 x-fjhra-silverline-historic-formula-junior-championship B2 v2 (q 1 / p 0) (% lap) | 0.712 | 0.712 – 0.712 | 1 |
| Timing71 x-fjhra-silverline-historic-formula-junior-championship E1 v2 (q 1 / p 0) (% lap) | 1.126 | 1.126 – 1.126 | 1 |
| Timing71 x-fjhra-silverline-historic-formula-junior-championship D2 v2 (q 1 / p 0) (% lap) | 0.247 | 0.247 – 0.247 | 1 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli Pro v2 (q 1 / p 0) (% lap) | 0.415 | 0.415 – 0.415 | 1 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli Gold v2 (q 1 / p 0) (% lap) | 0.46 | 0.46 – 0.46 | 1 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli Silver v2 (q 2 / p 0) (% lap) | 0.416 | 0.31 – 0.523 | 2 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli Bronze v2 (q 1 / p 0) (% lap) | 0.426 | 0.426 – 0.426 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Pro v2 (q 2 / p 0) (% lap) | 0.65 | 0.375 – 0.925 | 2 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Gold v2 (q 2 / p 0) (% lap) | 0.36 | 0.237 – 0.484 | 2 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup Bronze Cup v2 (q 2 / p 0) (% lap) | 0.384 | 0.293 – 0.476 | 2 |
| Timing71 x-iracing Hosted All Cars v2 (q 0 / p 2) (% lap) | 0.584 | 0.502 – 0.666 | 2 |
| Timing71 x-michelin-le-mans-cup GT3 v2 (q 4 / p 1) (% lap) | 0.455 | 0.23 – 0.643 | 5 |
| Timing71 x-round-04-jeddah-corniche-circuit – v2 (q 1 / p 0) (% lap) | 0.341 | 0.341 – 0.341 | 1 |
| Timing71 x-super-formula SF v2 (q 0 / p 4) (% lap) | 0.595 | 0.437 – 0.674 | 4 |
| Timing71 x-2023-nti-townsville-500 R v2 (q 2 / p 2) (% lap) | 0.414 | 0.231 – 0.487 | 4 |
| Timing71 x-2023-nti-townsville-500 – v2 (q 2 / p 2) (% lap) | 0.344 | 0.223 – 0.4 | 4 |
| Timing71 x-2026-airtouch-500-at-the-bend P v2 (q 1 / p 0) (% lap) | 0.41 | 0.41 – 0.41 | 1 |
| Timing71 x-2026-airtouch-500-at-the-bend A v2 (q 1 / p 0) (% lap) | 0.379 | 0.379 – 0.379 | 1 |
| Timing71 x-2026-betr-darwin-triple-crown – v2 (q 1 / p 0) (% lap) | 0.305 | 0.305 – 0.305 | 1 |
| Timing71 x-24h-series 992-PRO v2 (q 1 / p 1) (% lap) | 0.356 | 0.146 – 0.567 | 2 |
| Timing71 x-dmv-bmw-318ti-cup – v2 (q 1 / p 0) (% lap) | 0.568 | 0.568 – 0.568 | 1 |
| Timing71 x-european-vw-fun-cup EV3 v2 (q 1 / p 2) (% lap) | 0.622 | 0.503 – 0.653 | 3 |
| Timing71 x-f4-saudi-gulf-prix-of-kuwait 9223372036854775807 v2 (q 0 / p 1) (% lap) | 0.992 | 0.992 – 0.992 | 1 |
| Timing71 x-ford-mustang-cup DHL v2 (q 1 / p 0) (% lap) | 0.397 | 0.397 – 0.397 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup LC Cup v2 (q 1 / p 1) (% lap) | 0.49 | 0.457 – 0.523 | 2 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup AM v2 (q 3 / p 1) (% lap) | 0.391 | 0.379 – 0.418 | 4 |
| Timing71 x-gtworldcheu-pwrd-by-aws-endurance-cup PAM v2 (q 3 / p 1) (% lap) | 0.384 | 0.362 – 0.422 | 4 |
| Timing71 x-mclaren-trophy-europe PAM v2 (q 0 / p 1) (% lap) | 0.443 | 0.443 – 0.443 | 1 |
| Timing71 x-mclaren-trophy-europe Masters v2 (q 0 / p 1) (% lap) | 0.564 | 0.564 – 0.564 | 1 |
| Timing71 x-michelin-992-endurance-cup 992 AM v2 (q 1 / p 0) (% lap) | 0.491 | 0.491 – 0.491 | 1 |
| Timing71 x-michelin-992-endurance-cup AM v2 (q 1 / p 0) (% lap) | 0.671 | 0.671 – 0.671 | 1 |
| Timing71 x-michelin-992-endurance-cup P/A v2 (q 2 / p 0) (% lap) | 0.555 | 0.47 – 0.64 | 2 |
| Timing71 x-michelin-992-endurance-cup 992 v2 (q 1 / p 0) (% lap) | 0.955 | 0.955 – 0.955 | 1 |
| Timing71 x-pirelli-gt4-america Pro v2 (q 2 / p 0) (% lap) | 0.497 | 0.492 – 0.503 | 2 |
| Timing71 x-real-racers-virtual-club – v2 (q 5 / p 0) (% lap) | 0.475 | 0.211 – 0.489 | 5 |
| Timing71 x-tc-america-tc-class TCR v2 (q 0 / p 1) (% lap) | 0.559 | 0.559 – 0.559 | 1 |
| Timing71 x-tc-america-tc-class TCR Cup v2 (q 0 / p 1) (% lap) | 0.671 | 0.671 – 0.671 | 1 |
| Timing71 x-tc-america-tc-class TCA v2 (q 0 / p 1) (% lap) | 0.659 | 0.659 – 0.659 | 1 |
| Timing71 x-x-bow-battle GT4 v2 (q 0 / p 1) (% lap) | 1.389 | 1.389 – 1.389 | 1 |
| Timing71 gtwc EAm v2 (q 0 / p 3) (% lap) | 0.677 | 0.545 – 0.867 | 3 |
| Timing71 gtwc EPro-Am v2 (q 0 / p 2) (% lap) | 0.618 | 0.455 – 0.78 | 2 |
| Timing71 igtc Overall v2 (q 2 / p 0) (% lap) | 0.271 | 0.233 – 0.308 | 2 |
| Timing71 igtc Pro-Am v2 (q 2 / p 1) (% lap) | 0.434 | 0.411 – 0.59 | 3 |
| Timing71 x-24h-series GT v2 (q 1 / p 0) (% lap) | 0.7 | 0.7 – 0.7 | 1 |
| Timing71 x-24h-series CN v2 (q 1 / p 0) (% lap) | 0.412 | 0.412 – 0.412 | 1 |
| Timing71 x-dmv-nes-500 – v2 (q 1 / p 0) (% lap) | 0.767 | 0.767 – 0.767 | 1 |
| Timing71 x-dmv-nes-500 2 v2 (q 1 / p 0) (% lap) | 0.859 | 0.859 – 0.859 | 1 |
| Timing71 x-endurance-racing-legends Silver v2 (q 1 / p 0) (% lap) | 0.19 | 0.19 – 0.19 | 1 |
| Timing71 x-endurance-racing-legends PAM v2 (q 1 / p 0) (% lap) | 0.161 | 0.161 – 0.161 | 1 |
| Timing71 x-f4-saudi-gulf-prix-of-kuwait R v2 (q 1 / p 0) (% lap) | 0.217 | 0.217 – 0.217 | 1 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-endurance-cup – v2 (q 0 / p 3) (% lap) | 0.472 | 0.347 – 0.72 | 3 |
| Timing71 x-generations-trophy Dyn v2 (q 1 / p 0) (% lap) | 0.475 | 0.475 – 0.475 | 1 |
| Timing71 x-generations-trophy Chl v2 (q 1 / p 0) (% lap) | 0.372 | 0.372 – 0.372 | 1 |
| Timing71 x-generations-trophy Spirit v2 (q 1 / p 0) (% lap) | 0.524 | 0.524 – 0.524 | 1 |
| Timing71 x-pirelli-gt4-americasprintx-west Am v2 (q 1 / p 0) (% lap) | 0.415 | 0.415 – 0.415 | 1 |
| Timing71 x-pirelli-gt4-americasprintx-west WPro-Am v2 (q 1 / p 0) (% lap) | 0.349 | 0.349 – 0.349 | 1 |
| Timing71 x-tcr-eastern-europe-croatian-national-championship F4-H2 v2 (q 0 / p 1) (% lap) | 0.261 | 0.261 – 0.261 | 1 |
| Timing71 x-tcr-eastern-europe-croatian-national-championship Cro6 v2 (q 0 / p 1) (% lap) | 0.529 | 0.529 – 0.529 | 1 |
| Timing71 x-tcr-eastern-europe-croatian-national-championship TCR v2 (q 0 / p 1) (% lap) | 0.244 | 0.244 – 0.244 | 1 |
| Timing71 x-tcr-eastern-europe-croatian-national-championship Cro2 v2 (q 0 / p 1) (% lap) | 0.776 | 0.776 – 0.776 | 1 |
| Timing71 x-tcr-eastern-europe-croatian-national-championship Cro3 v2 (q 0 / p 1) (% lap) | 0.719 | 0.719 – 0.719 | 1 |
| Timing71 x-tcr-eastern-europe-croatian-national-championship Cro5 v2 (q 0 / p 1) (% lap) | 0.687 | 0.687 – 0.687 | 1 |
| Timing71 alms AE86 v2 (q 1 / p 0) (% lap) | 0.372 | 0.372 – 0.372 | 1 |
| Timing71 alms CC v2 (q 1 / p 0) (% lap) | 0.488 | 0.488 – 0.488 | 1 |
| Timing71 x-2-0l-cup GTL v2 (q 1 / p 0) (% lap) | 0.493 | 0.493 – 0.493 | 1 |
| Timing71 x-2-0l-cup GTL-ELI v2 (q 1 / p 0) (% lap) | 0.547 | 0.547 – 0.547 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown – v2 (q 1 / p 1) (% lap) | 0.417 | 0.31 – 0.524 | 2 |
| Timing71 x-2023-nti-townsville-500 C v2 (q 1 / p 0) (% lap) | 0.41 | 0.41 – 0.41 | 1 |
| Timing71 x-2023-nti-townsville-500 G v2 (q 1 / p 1) (% lap) | 0.592 | 0.539 – 0.645 | 2 |
| Timing71 x-2023-nti-townsville-500 M v2 (q 1 / p 0) (% lap) | 0.697 | 0.697 – 0.697 | 1 |
| Timing71 x-2026-bosch-power-tools-perth-super-440 – v2 (q 1 / p 0) (% lap) | 0.335 | 0.335 – 0.335 | 1 |
| Timing71 x-aragon – v2 (q 1 / p 0) (% lap) | 0.495 | 0.495 – 0.495 | 1 |
| Timing71 x-clio-cup-bohemia D4-TCC2 v2 (q 1 / p 0) (% lap) | 0.484 | 0.484 – 0.484 | 1 |
| Timing71 x-clio-cup-bohemia Cro6 v2 (q 1 / p 0) (% lap) | 0.146 | 0.146 – 0.146 | 1 |
| Timing71 x-clio-cup-bohemia TCR v2 (q 1 / p 0) (% lap) | 0.418 | 0.418 – 0.418 | 1 |
| Timing71 x-clio-cup-bohemia Cro5 v2 (q 1 / p 0) (% lap) | 0.398 | 0.398 – 0.398 | 1 |
| Timing71 x-f4-saudi-gulf-prix-of-kuwait F4SA v2 (q 1 / p 0) (% lap) | 0.234 | 0.234 – 0.234 | 1 |
| Timing71 x-honda-cbr-650-r NSF250 v2 (q 0 / p 1) (% lap) | 0.307 | 0.307 – 0.307 | 1 |
| Timing71 x-honda-cbr-650-r B v2 (q 0 / p 1) (% lap) | 0.463 | 0.463 – 0.463 | 1 |
| Timing71 x-honda-cbr-650-r A v2 (q 0 / p 1) (% lap) | 0.52 | 0.52 – 0.52 | 1 |
| Timing71 x-honda-cbr-650-r – v2 (q 0 / p 1) (% lap) | 0.554 | 0.554 – 0.554 | 1 |
| Timing71 x-hrdc-top-hat-pre-66-touring-cars SEARS v2 (q 1 / p 0) (% lap) | 0.822 | 0.822 – 0.822 | 1 |
| Timing71 x-hrdc-top-hat-pre-66-touring-cars MANN v2 (q 1 / p 0) (% lap) | 0.703 | 0.703 – 0.703 | 1 |
| Timing71 x-hrdc-top-hat-pre-66-touring-cars LESTON v2 (q 1 / p 0) (% lap) | 0.674 | 0.674 – 0.674 | 1 |
| Timing71 x-hrdc-top-hat-pre-66-touring-cars RHODES v2 (q 1 / p 0) (% lap) | 0.741 | 0.741 – 0.741 | 1 |
| Timing71 x-hrdc-top-hat-pre-66-touring-cars COOMBS v2 (q 1 / p 0) (% lap) | 0.417 | 0.417 – 0.417 | 1 |
| Timing71 x-hrdc-top-hat-pre-66-touring-cars ALEY v2 (q 1 / p 0) (% lap) | 0.853 | 0.853 – 0.853 | 1 |
| Timing71 x-lamborghini-super-trofeo Gold v2 (q 0 / p 2) (% lap) | 0.427 | 0.33 – 0.525 | 2 |
| Timing71 x-lamborghini-super-trofeo Silver v2 (q 0 / p 2) (% lap) | 0.502 | 0.376 – 0.628 | 2 |
| Timing71 x-lamborghini-super-trofeo Bronze v2 (q 0 / p 2) (% lap) | 0.49 | 0.365 – 0.614 | 2 |
| Timing71 x-michelin-imsa-sportscar-encore-at-sebring TCR v2 (q 0 / p 1) (% lap) | 0.36 | 0.36 – 0.36 | 1 |
| Timing71 x-pirelli-gt4-america EAm v2 (q 0 / p 1) (% lap) | 0.665 | 0.665 – 0.665 | 1 |
| Timing71 x-pirelli-gt4-america Pro-Am v2 (q 0 / p 1) (% lap) | 0.441 | 0.441 – 0.441 | 1 |
| Timing71 x-pirelli-gt4-america EPro-Am v2 (q 0 / p 1) (% lap) | 0.222 | 0.222 – 0.222 | 1 |
| Timing71 x-porsche-endurance-challenge-north-america Cayman AM v2 (q 0 / p 1) (% lap) | 0.731 | 0.731 – 0.731 | 1 |
| Timing71 x-porsche-endurance-challenge-north-america Cayman P/A v2 (q 0 / p 1) (% lap) | 0.3 | 0.3 – 0.3 | 1 |
| Timing71 x-porsche-endurance-challenge-north-america GT3 Cup P/A v2 (q 0 / p 1) (% lap) | 0.539 | 0.539 – 0.539 | 1 |
| Timing71 x-suzuka-8-hours – v2 (q 1 / p 0) (% lap) | 0.133 | 0.133 – 0.133 | 1 |
| Timing71 x-tc-america-tc-tcr-tca-classes TCR v2 (q 0 / p 2) (% lap) | 0.543 | 0.476 – 0.61 | 2 |
| Timing71 x-tc-america-tc-tcr-tca-classes TCR Cup v2 (q 0 / p 2) (% lap) | 0.606 | 0.414 – 0.798 | 2 |
| Timing71 x-tc-america-tc-tcr-tca-classes TC v2 (q 0 / p 2) (% lap) | 0.478 | 0.473 – 0.482 | 2 |
| Timing71 x-tc-america-tc-tcr-tca-classes TCA v2 (q 0 / p 2) (% lap) | 0.575 | 0.471 – 0.68 | 2 |
| Timing71 x-tcr-europe LMP3 v2 (q 1 / p 0) (% lap) | 0.419 | 0.419 – 0.419 | 1 |
| Timing71 x-top-hat-pre-66-touring-cars SEARS v2 (q 1 / p 0) (% lap) | 0.478 | 0.478 – 0.478 | 1 |
| Timing71 x-top-hat-pre-66-touring-cars LESTON v2 (q 1 / p 0) (% lap) | 0.663 | 0.663 – 0.663 | 1 |
| Timing71 x-top-hat-pre-66-touring-cars MANN v2 (q 1 / p 0) (% lap) | 0.672 | 0.672 – 0.672 | 1 |
| Timing71 x-tss-supercar-gt3 GT4 Pro v2 (q 1 / p 0) (% lap) | 0.636 | 0.636 – 0.636 | 1 |
| Timing71 x-tss-supercar-gt3 GTM Pro v2 (q 1 / p 0) (% lap) | 0.512 | 0.512 – 0.512 | 1 |
| Timing71 x-tss-supercar-gt3 GT4 Am v2 (q 1 / p 0) (% lap) | 0.363 | 0.363 – 0.363 | 1 |
| Timing71 x-tss-the-super-series-by-b-quik-gt3-gtm-gt4 GT3 Am v2 (q 1 / p 0) (% lap) | 0.975 | 0.975 – 0.975 | 1 |
| Timing71 x-tss-the-super-series-by-b-quik-gt3-gtm-gt4 GT4 Pro-Am v2 (q 1 / p 0) (% lap) | 0.671 | 0.671 – 0.671 | 1 |
| Timing71 x-tss-the-super-series-by-b-quik-gt3-gtm-gt4 GTM Pro-Am v2 (q 1 / p 0) (% lap) | 0.752 | 0.752 – 0.752 | 1 |
| Timing71 x-tss-the-super-series-by-b-quik-gt3-gtm-gt4 GT3 Pro-Am v2 (q 1 / p 0) (% lap) | 0.729 | 0.729 – 0.729 | 1 |
| Timing71 x-tss-the-super-series-by-b-quik-gt3-gtm-gt4 GT4 Am v2 (q 1 / p 0) (% lap) | 0.603 | 0.603 – 0.603 | 1 |
| Timing71 dtm Rookie v2 (q 1 / p 0) (% lap) | 0.419 | 0.419 – 0.419 | 1 |
| Timing71 igtc Nat v2 (q 1 / p 1) (% lap) | 0.492 | 0.238 – 0.746 | 2 |
| Timing71 igtc Am v2 (q 2 / p 1) (% lap) | 0.412 | 0.361 – 0.661 | 3 |
| Timing71 igtc ProAm v2 (q 1 / p 1) (% lap) | 0.493 | 0.365 – 0.62 | 2 |
| Timing71 x-2023-betr-darwin-triple-crown IP v2 (q 1 / p 0) (% lap) | 0.52 | 0.52 – 0.52 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown E v2 (q 1 / p 0) (% lap) | 0.462 | 0.462 – 0.462 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown CC v2 (q 1 / p 0) (% lap) | 1.121 | 1.121 – 1.121 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown HQ v2 (q 1 / p 0) (% lap) | 0.463 | 0.463 – 0.463 | 1 |
| Timing71 x-2023-vailo-adelaide-500 – v2 (q 1 / p 0) (% lap) | 0.373 | 0.373 – 0.373 | 1 |
| Timing71 x-bmw-sim-gt-cup-s1 – v2 (q 0 / p 4) (% lap) | 0.272 | 0.192 – 0.346 | 4 |
| Timing71 x-gt4-european-series SIL v2 (q 0 / p 2) (% lap) | 0.672 | 0.553 – 0.791 | 2 |
| Timing71 x-mazda-mx-5-cup-shootout MX5 Cup v2 (q 5 / p 0) (% lap) | 0.322 | 0.224 – 0.38 | 5 |
| Timing71 x-nxt-gen-cup – v2 (q 2 / p 0) (% lap) | 0.437 | 0.307 – 0.566 | 2 |
| Timing71 x-pirelli-gt4-america-sprintx-gt4-america-east EAm v2 (q 1 / p 0) (% lap) | 0.479 | 0.479 – 0.479 | 1 |
| Timing71 x-pirelli-gt4-america-sprintx-gt4-america-east Am v2 (q 1 / p 0) (% lap) | 0.261 | 0.261 – 0.261 | 1 |
| Timing71 x-pirelli-gt4-america-sprintx-gt4-america-east Pro-Am v2 (q 1 / p 0) (% lap) | 0.634 | 0.634 – 0.634 | 1 |
| Timing71 x-pirelli-gt4-america-sprintx-gt4-america-east EPro-Am v2 (q 1 / p 0) (% lap) | 0.526 | 0.526 – 0.526 | 1 |
| Timing71 x-timeservice-nl-feed E v2 (q 0 / p 3) (% lap) | 0.657 | 0.643 – 0.705 | 3 |
| Timing71 x-timeservice-nl-feed D v2 (q 0 / p 3) (% lap) | 0.643 | 0.637 – 0.841 | 3 |
| Timing71 x-timeservice-nl-feed A1 v2 (q 1 / p 3) (% lap) | 0.64 | 0.385 – 0.683 | 4 |
| Timing71 x-timeservice-nl-feed B1 v2 (q 0 / p 3) (% lap) | 0.842 | 0.776 – 0.949 | 3 |
| Timing71 x-timeservice-nl-feed C v2 (q 0 / p 3) (% lap) | 0.585 | 0.537 – 0.877 | 3 |
| Timing71 x-timeservice-nl-feed A2 v2 (q 1 / p 3) (% lap) | 0.519 | 0.349 – 0.573 | 4 |
| Timing71 x-timeservice-nl-feed B2 v2 (q 0 / p 3) (% lap) | 0.584 | 0.557 – 0.859 | 3 |
| Timing71 x-toyota-yaris-omr YARIS v2 (q 1 / p 0) (% lap) | 0.603 | 0.603 – 0.603 | 1 |
| Timing71 igtc AP v2 (q 1 / p 0) (% lap) | 0.418 | 0.418 – 0.418 | 1 |
| Timing71 igtc PP v2 (q 1 / p 0) (% lap) | 0.356 | 0.356 – 0.356 | 1 |
| Timing71 x-2023-iracing-roar IMPCGT4 Class v2 (q 0 / p 1) (% lap) | 0.203 | 0.203 – 0.203 | 1 |
| Timing71 x-2023-iracing-roar RoarTouringCar v2 (q 0 / p 1) (% lap) | 0.345 | 0.345 – 0.345 | 1 |
| Timing71 x-2023-iracing-roar Toyota GR86 v2 (q 0 / p 1) (% lap) | 0.454 | 0.454 – 0.454 | 1 |
| Timing71 x-2023-nti-townsville-500 P v2 (q 1 / p 0) (% lap) | 0.321 | 0.321 – 0.321 | 1 |
| Timing71 x-2023-nti-townsville-500 A v2 (q 1 / p 0) (% lap) | 0.442 | 0.442 – 0.442 | 1 |
| Timing71 x-2023-penrite-oil-sandown-500 P v2 (q 1 / p 0) (% lap) | 0.395 | 0.395 – 0.395 | 1 |
| Timing71 x-2023-penrite-oil-sandown-500 A v2 (q 1 / p 0) (% lap) | 0.424 | 0.424 – 0.424 | 1 |
| Timing71 x-2025-nti-townsville-500 PRO v2 (q 1 / p 0) (% lap) | 0.578 | 0.578 – 0.578 | 1 |
| Timing71 x-2025-nti-townsville-500 AM v2 (q 1 / p 0) (% lap) | 0.52 | 0.52 – 0.52 | 1 |
| Timing71 x-2025-repco-bathurst-1000 PM v2 (q 1 / p 0) (% lap) | 0.785 | 0.785 – 0.785 | 1 |
| Timing71 x-2025-repco-bathurst-1000 PA v2 (q 0 / p 1) (% lap) | 0.518 | 0.518 – 0.518 | 1 |
| Timing71 x-2025-repco-bathurst-1000 PS v2 (q 1 / p 0) (% lap) | 1.475 | 1.475 – 1.475 | 1 |
| Timing71 x-group-c-super-cup C3 v2 (q 1 / p 0) (% lap) | 0.694 | 0.694 – 0.694 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm PAM v2 (q 1 / p 0) (% lap) | 0.285 | 0.285 – 0.285 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm CT-2 v2 (q 1 / p 0) (% lap) | 0.37 | 0.37 – 0.37 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm AM v2 (q 1 / p 0) (% lap) | 0.418 | 0.418 – 0.418 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm CT-1 v2 (q 1 / p 0) (% lap) | 0.658 | 0.658 – 0.658 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm STW-6 v2 (q 1 / p 0) (% lap) | 0.829 | 0.829 – 0.829 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm BMW v2 (q 1 / p 0) (% lap) | 0.418 | 0.418 – 0.418 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm S-CUP v2 (q 1 / p 0) (% lap) | 0.572 | 0.572 – 0.572 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm YT-6 v2 (q 1 / p 0) (% lap) | 0.398 | 0.398 – 0.398 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm YT-3 v2 (q 1 / p 0) (% lap) | 0.465 | 0.465 – 0.465 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm YT-2 v2 (q 1 / p 0) (% lap) | 1.035 | 1.035 – 1.035 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm JCW-1 v2 (q 1 / p 0) (% lap) | 0.486 | 0.486 – 0.486 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm TCO-2 v2 (q 1 / p 0) (% lap) | 0.49 | 0.49 – 0.49 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm TCO-4 v2 (q 1 / p 0) (% lap) | 0.491 | 0.491 – 0.491 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm TCO-5 v2 (q 1 / p 0) (% lap) | 0.458 | 0.458 – 0.458 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm TCO-7 v2 (q 1 / p 0) (% lap) | 0.43 | 0.43 – 0.43 | 1 |
| Timing71 x-imola – v2 (q 2 / p 0) (% lap) | 0.484 | 0.466 – 0.501 | 2 |
| Timing71 x-iracing-12-hours-of-sebring-powered-by-vco GTE IMSA v2 (q 0 / p 1) (% lap) | 0.179 | 0.179 – 0.179 | 1 |
| Timing71 x-iracing-12-hours-of-sebring-powered-by-vco GTD Class v2 (q 0 / p 1) (% lap) | 0.34 | 0.34 – 0.34 | 1 |
| Timing71 x-iracing-12-hours-of-sebring-powered-by-vco Dallara P217 v2 (q 0 / p 1) (% lap) | 0.568 | 0.568 – 0.568 | 1 |
| Timing71 x-tourenwagen-legenden-pure-group-a 3 v2 (q 1 / p 0) (% lap) | 0.495 | 0.495 – 0.495 | 1 |
| Timing71 igtc SF v2 (q 1 / p 1) (% lap) | 0.801 | 0.691 – 0.912 | 2 |
| Timing71 igtc CH2 v2 (q 0 / p 2) (% lap) | 0.583 | 0.369 – 0.798 | 2 |
| Timing71 igtc CH1 v2 (q 0 / p 1) (% lap) | 0.745 | 0.745 – 0.745 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown C v2 (q 1 / p 0) (% lap) | 0.664 | 0.664 – 0.664 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown G v2 (q 1 / p 0) (% lap) | 0.358 | 0.358 – 0.358 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown M v2 (q 1 / p 0) (% lap) | 0.571 | 0.571 – 0.571 | 1 |
| Timing71 x-2023-betr-darwin-triple-crown R v2 (q 1 / p 0) (% lap) | 0.452 | 0.452 – 0.452 | 1 |
| Timing71 x-2023-penrite-oil-sandown-500 R v2 (q 1 / p 1) (% lap) | 0.408 | 0.35 – 0.466 | 2 |
| Timing71 x-24h-series P4 v2 (q 0 / p 1) (% lap) | 0.374 | 0.374 – 0.374 | 1 |
| Timing71 x-boss-gp G v2 (q 1 / p 0) (% lap) | 0.487 | 0.487 – 0.487 | 1 |
| Timing71 x-imsa-vp-racing-sportscar-challenge GSX v2 (q 2 / p 0) (% lap) | 0.455 | 0.36 – 0.55 | 2 |
| Timing71 x-imsa-vp-racing-sportscar-challenge GTDX v2 (q 1 / p 0) (% lap) | 0.745 | 0.745 – 0.745 | 1 |
| Timing71 x-imsa-vp-racing-sportscar-challenge P3 v2 (q 2 / p 0) (% lap) | 0.486 | 0.407 – 0.565 | 2 |
| Timing71 x-ligier-js-cup . v2 (q 0 / p 1) (% lap) | 0.408 | 0.408 – 0.408 | 1 |
| Timing71 x-pccna Pro v2 (q 1 / p 0) (% lap) | 0.353 | 0.353 – 0.353 | 1 |
| Timing71 x-pccna Pro-Am v2 (q 1 / p 0) (% lap) | 0.417 | 0.417 – 0.417 | 1 |
| Timing71 x-pccna PA991 v2 (q 1 / p 0) (% lap) | 0.637 | 0.637 – 0.637 | 1 |
| Timing71 x-suzuka-1000km-intercontinental-gt-challenge PRO v2 (q 1 / p 0) (% lap) | 0.634 | 0.634 – 0.634 | 1 |
| Timing71 x-suzuka-1000km-intercontinental-gt-challenge BRONZE v2 (q 1 / p 0) (% lap) | 0.419 | 0.419 – 0.419 | 1 |
| Timing71 x-suzuka-1000km-intercontinental-gt-challenge SILVER v2 (q 1 / p 0) (% lap) | 0.399 | 0.399 – 0.399 | 1 |
| Timing71 x-suzuka-1000km-intercontinental-gt-challenge PRO-AM v2 (q 1 / p 0) (% lap) | 0.558 | 0.558 – 0.558 | 1 |
| Timing71 x-toyota-hilux-revo-omr REVO v2 (q 1 / p 0) (% lap) | 0.575 | 0.575 – 0.575 | 1 |
| Timing71 x-wec-beta LMP1 v2 (q 1 / p 1) (% lap) | 0.49 | 0.343 – 0.637 | 2 |
| Timing71 x-wec-beta LMP2 v2 (q 1 / p 1) (% lap) | 0.371 | 0.1 – 0.642 | 2 |
| Timing71 x-wec-beta LMGTE Pro v2 (q 0 / p 1) (% lap) | 0.519 | 0.519 – 0.519 | 1 |
| Timing71 x-wec-beta LMGTE Am v2 (q 0 / p 1) (% lap) | 0.444 | 0.444 – 0.444 | 1 |
| Timing71 imsa Pro v2 (q 0 / p 1) (% lap) | 0.539 | 0.539 – 0.539 | 1 |
| Timing71 imsa Pro-Am v2 (q 0 / p 1) (% lap) | 0.537 | 0.537 – 0.537 | 1 |
| Timing71 imsa Masters v2 (q 0 / p 1) (% lap) | 0.79 | 0.79 – 0.79 | 1 |
| Timing71 x-2026-century-batteries-ipswich-super-440 P v2 (q 0 / p 1) (% lap) | 0.421 | 0.421 – 0.421 | 1 |
| Timing71 x-2026-century-batteries-ipswich-super-440 A v2 (q 0 / p 1) (% lap) | 0.432 | 0.432 – 0.432 | 1 |
| Timing71 x-24h-esports GT3 Nurb v2 (q 1 / p 0) (% lap) | 0.478 | 0.478 – 0.478 | 1 |
| Timing71 x-24h-esports Audi RS 3 LMS v2 (q 1 / p 0) (% lap) | 0.433 | 0.433 – 0.433 | 1 |
| Timing71 x-24h-esports Porsche 718 v2 (q 1 / p 0) (% lap) | 0.325 | 0.325 – 0.325 | 1 |
| Timing71 x-fastlane-tv GT3 Class v2 (q 1 / p 0) (% lap) | 0.207 | 0.207 – 0.207 | 1 |
| Timing71 x-ferrari-challenge-488 P v2 (q 1 / p 0) (% lap) | 0.505 | 0.505 – 0.505 | 1 |
| Timing71 x-ferrari-challenge-488 S v2 (q 1 / p 0) (% lap) | 0.509 | 0.509 – 0.509 | 1 |
| Timing71 x-gt2-european-series-pwrd-by-pirelli AM v2 (q 1 / p 0) (% lap) | 0.378 | 0.378 – 0.378 | 1 |
| Timing71 x-imsa-michelin-pilot-challenge Pro v2 (q 0 / p 1) (% lap) | 0.545 | 0.545 – 0.545 | 1 |
| Timing71 x-imsa-michelin-pilot-challenge Pro-Am v2 (q 0 / p 1) (% lap) | 0.622 | 0.622 – 0.622 | 1 |
| Timing71 x-imsa-michelin-pilot-challenge Masters v2 (q 0 / p 1) (% lap) | 0.741 | 0.741 – 0.741 | 1 |
| Timing71 x-le-vigeant – v2 (q 3 / p 0) (% lap) | 0.509 | 0.438 – 0.609 | 3 |
| Timing71 x-n-rburgring-24-hours Kl. Cup 5 v2 (q 1 / p 0) (% lap) | 0.381 | 0.381 – 0.381 | 1 |
| Timing71 igtc TP4 v2 (q 1 / p 1) (% lap) | 0.625 | 0.541 – 0.709 | 2 |
| Timing71 imsa GTPPRO v2 (q 0 / p 1) (% lap) | 0.634 | 0.634 – 0.634 | 1 |
| Timing71 x-2026-dunlop-sydney-500 PM v2 (q 1 / p 0) (% lap) | 0.591 | 0.591 – 0.591 | 1 |
| Timing71 x-2026-dunlop-sydney-500 PS v2 (q 1 / p 0) (% lap) | 0.432 | 0.432 – 0.432 | 1 |
| Timing71 x-2026-dunlop-sydney-500 PA v2 (q 1 / p 0) (% lap) | 0.521 | 0.521 – 0.521 | 1 |
| Timing71 x-24h-series CAY v2 (q 1 / p 1) (% lap) | 0.332 | 0.192 – 0.472 | 2 |
| Timing71 x-dmv-bmw-challenge PC v2 (q 2 / p 0) (% lap) | 0.514 | 0.424 – 0.604 | 2 |
| Timing71 x-heritage-touring-cup PRO v2 (q 1 / p 0) (% lap) | 0.186 | 0.186 – 0.186 | 1 |
| Timing71 x-heritage-touring-cup Gold v2 (q 1 / p 0) (% lap) | 0.065 | 0.065 – 0.065 | 1 |
| Timing71 x-miata-trophy Pro v2 (q 1 / p 0) (% lap) | 0.529 | 0.529 – 0.529 | 1 |
| Timing71 x-miata-trophy Silver v2 (q 1 / p 0) (% lap) | 0.524 | 0.524 – 0.524 | 1 |
| Timing71 x-miata-trophy Gold v2 (q 1 / p 0) (% lap) | 0.606 | 0.606 – 0.606 | 1 |
| Timing71 x-nxt-gen-cup J v2 (q 1 / p 0) (% lap) | 0.322 | 0.322 – 0.322 | 1 |
| Timing71 x-pirelli-gt4-america-sprintx-east Am v2 (q 2 / p 0) (% lap) | 0.284 | 0.249 – 0.319 | 2 |
| Timing71 x-porsche-gt3-cup-challenge-by-yokohama GT3P v2 (q 0 / p 1) (% lap) | 0.518 | 0.518 – 0.518 | 1 |
| Timing71 x-porsche-gt3-cup-challenge-by-yokohama GT3G v2 (q 0 / p 1) (% lap) | 0.55 | 0.55 – 0.55 | 1 |
| Timing71 x-timeservice-nl-feed P3 v2 (q 0 / p 1) (% lap) | 0.57 | 0.57 – 0.57 | 1 |
| Timing71 x-timeservice-nl-feed GT C1 v2 (q 1 / p 0) (% lap) | 0.496 | 0.496 – 0.496 | 1 |
| Timing71 x-timeservice-nl-feed GT C2 v2 (q 0 / p 1) (% lap) | 0.679 | 0.679 – 0.679 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final DS2 v2 (q 1 / p 0) (% lap) | 0.399 | 0.399 – 0.399 | 1 |
| Timing71 x-2025-repco-bathurst-1000 P v2 (q 0 / p 1) (% lap) | 0.702 | 0.702 – 0.702 | 1 |
| Timing71 x-2025-repco-bathurst-1000 A v2 (q 0 / p 1) (% lap) | 0.56 | 0.56 – 0.56 | 1 |
| Timing71 x-dmv-bmw-challenge 2 v2 (q 1 / p 0) (% lap) | 0.573 | 0.573 – 0.573 | 1 |
| Timing71 x-historic-touring-car-challenge 4A v2 (q 1 / p 0) (% lap) | 0.537 | 0.537 – 0.537 | 1 |
| Timing71 x-historic-touring-car-challenge 5B v2 (q 1 / p 0) (% lap) | 0.647 | 0.647 – 0.647 | 1 |
| Timing71 x-historic-touring-car-challenge 2B v2 (q 1 / p 0) (% lap) | 0.417 | 0.417 – 0.417 | 1 |
| Timing71 x-historic-touring-car-challenge 2A v2 (q 1 / p 0) (% lap) | 1.169 | 1.169 – 1.169 | 1 |
| Timing71 x-hrdc-allstars GTA v2 (q 1 / p 0) (% lap) | 0.354 | 0.354 – 0.354 | 1 |
| Timing71 x-hrdc-allstars CORSA v2 (q 1 / p 0) (% lap) | 0.585 | 0.585 – 0.585 | 1 |
| Timing71 x-hrdc-allstars GT v2 (q 1 / p 0) (% lap) | 0.316 | 0.316 – 0.316 | 1 |
| Timing71 x-hrdc-allstars TC v2 (q 1 / p 0) (% lap) | 0.587 | 0.587 – 0.587 | 1 |
| Timing71 x-hrdc-allstars NORD v2 (q 1 / p 0) (% lap) | 0.404 | 0.404 – 0.404 | 1 |
| Timing71 x-ivra-endurance-series GTE Class v2 (q 6 / p 0) (% lap) | 0.206 | 0.182 – 0.295 | 6 |
| Timing71 x-porsche-mobil-1-supercup – v2 (q 1 / p 1) (% lap) | 0.364 | 0.307 – 0.421 | 2 |
| Timing71 x-1006-km GT3 v2 (q 1 / p 0) (% lap) | 0.198 | 0.198 – 0.198 | 1 |
| Timing71 x-1006-km GTO v2 (q 1 / p 0) (% lap) | 0.389 | 0.389 – 0.389 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final C v2 (q 1 / p 0) (% lap) | 0.557 | 0.557 – 0.557 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final G v2 (q 1 / p 0) (% lap) | 0.634 | 0.634 – 0.634 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final M v2 (q 1 / p 0) (% lap) | 0.435 | 0.435 – 0.435 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final R v2 (q 1 / p 0) (% lap) | 0.611 | 0.611 – 0.611 | 1 |
| Timing71 x-adac-24h-classic 65 v2 (q 1 / p 0) (% lap) | 0.713 | 0.713 – 0.713 | 1 |
| Timing71 x-iberian-historic-endurance GDS v2 (q 1 / p 0) (% lap) | 0.372 | 0.372 – 0.372 | 1 |
| Timing71 x-iberian-historic-endurance GTP & SC v2 (q 1 / p 0) (% lap) | 0.206 | 0.206 – 0.206 | 1 |
| Timing71 x-iberian-historic-endurance H-1971 v2 (q 1 / p 0) (% lap) | 0.576 | 0.576 – 0.576 | 1 |
| Timing71 x-iberian-historic-endurance H-1965 v2 (q 1 / p 0) (% lap) | 0.737 | 0.737 – 0.737 | 1 |
| Timing71 x-iracing-12-hours-of-sebring Dallara P217 v2 (q 0 / p 1) (% lap) | 0.503 | 0.503 – 0.503 | 1 |
| Timing71 x-iracing-12-hours-of-sebring IMSA22 v2 (q 0 / p 1) (% lap) | 0.379 | 0.379 – 0.379 | 1 |
| Timing71 x-mazda-mx-5-cup-presented-by-b-f-goodrich ND2 v2 (q 1 / p 1) (% lap) | 0.52 | 0.512 – 0.529 | 2 |
| Timing71 x-porsche-sprint-challenge-north-america-cayman CAY P/A v2 (q 3 / p 0) (% lap) | 0.344 | 0.331 – 0.527 | 3 |
| Timing71 x-porsche-sprint-challenge-north-america-cayman CAY M v2 (q 3 / p 0) (% lap) | 0.427 | 0.381 – 0.555 | 3 |
| Timing71 x-round-05-jeddah-corniche-circuit – v2 (q 1 / p 0) (% lap) | 0.398 | 0.398 – 0.398 | 1 |
| Timing71 x-tgrna-gr-cup-north-america Am v2 (q 0 / p 1) (% lap) | 0.465 | 0.465 – 0.465 | 1 |
| Timing71 x-thailand-supercar-gt3 GT3 Pro v2 (q 1 / p 0) (% lap) | 0.479 | 0.479 – 0.479 | 1 |
| Timing71 x-thailand-supercar-gt3 GTM Pro v2 (q 1 / p 0) (% lap) | 0.419 | 0.419 – 0.419 | 1 |
| Timing71 x-thailand-supercar-gt3 GTM Am v2 (q 1 / p 0) (% lap) | 0.423 | 0.423 – 0.423 | 1 |
| Timing71 igtc GT3 Pro v2 (q 0 / p 1) (% lap) | 0.506 | 0.506 – 0.506 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final P v2 (q 1 / p 0) (% lap) | 0.571 | 0.571 – 0.571 | 1 |
| Timing71 x-2025-bp-adelaide-grand-final A v2 (q 1 / p 0) (% lap) | 0.361 | 0.361 – 0.361 | 1 |
| Timing71 x-2025-british-gt-championship GT3PA v2 (q 0 / p 1) (% lap) | 0.674 | 0.674 – 0.674 | 1 |
| Timing71 x-2025-repco-bathurst-1000 NZ v2 (q 1 / p 0) (% lap) | 0.797 | 0.797 – 0.797 | 1 |
| Timing71 x-24h-series Pro-Am v2 (q 0 / p 1) (% lap) | 0.057 | 0.057 – 0.057 | 1 |
| Timing71 x-6h-of-barcelona M v2 (q 1 / p 0) (% lap) | 0.444 | 0.444 – 0.444 | 1 |
| Timing71 x-6h-of-barcelona   v2 (q 1 / p 0) (% lap) | 0.553 | 0.553 – 0.553 | 1 |
| Timing71 x-6h-of-barcelona Jr v2 (q 1 / p 0) (% lap) | 0.702 | 0.702 – 0.702 | 1 |
| Timing71 x-adac-historic-cup-ost-formel Cup 3 v2 (q 1 / p 0) (% lap) | 0.703 | 0.703 – 0.703 | 1 |
| Timing71 x-adac-historic-cup-ost-formel GTR 1 EVO v2 (q 1 / p 0) (% lap) | 0.315 | 0.315 – 0.315 | 1 |
| Timing71 x-adac-historic-cup-ost-formel 318ti SC v2 (q 1 / p 0) (% lap) | 0.664 | 0.664 – 0.664 | 1 |
| Timing71 x-adac-historic-cup-ost-formel GTR 3 v2 (q 1 / p 0) (% lap) | 0.69 | 0.69 – 0.69 | 1 |
| Timing71 x-adac-historic-cup-ost-formel GTR 2 v2 (q 1 / p 0) (% lap) | 0.794 | 0.794 – 0.794 | 1 |
| Timing71 x-fastlane-tv Porsche 718 v2 (q 1 / p 0) (% lap) | 0.542 | 0.542 – 0.542 | 1 |
| Timing71 x-gp-icons-presented-by-goodyear B v2 (q 1 / p 0) (% lap) | 0.522 | 0.522 – 0.522 | 1 |
| Timing71 x-gp-icons-presented-by-goodyear C v2 (q 1 / p 0) (% lap) | 0.652 | 0.652 – 0.652 | 1 |
| Timing71 x-gp-icons-presented-by-goodyear A v2 (q 1 / p 0) (% lap) | 0.73 | 0.73 – 0.73 | 1 |
| Timing71 x-imsa-vp-racing-sportscar-challenge GS v2 (q 1 / p 0) (% lap) | 0.296 | 0.296 – 0.296 | 1 |
| Timing71 x-imsa-vp-racing-sportscar-challenge TCR v2 (q 1 / p 0) (% lap) | 0.29 | 0.29 – 0.29 | 1 |
| Timing71 x-lamborghini-super-trofeo Pro-Am v2 (q 0 / p 1) (% lap) | 0.481 | 0.481 – 0.481 | 1 |
| Timing71 x-le-castellet-2 – v2 (q 1 / p 0) (% lap) | 0.605 | 0.605 – 0.605 | 1 |
| Timing71 x-pchc-porsche-club-historic-challenge Cup 3 v2 (q 1 / p 0) (% lap) | 0.633 | 0.633 – 0.633 | 1 |
| Timing71 x-pchc-porsche-club-historic-challenge 318ti SC v2 (q 1 / p 0) (% lap) | 0.933 | 0.933 – 0.933 | 1 |
| Timing71 x-pchc-porsche-club-historic-challenge GTR 1 EVO v2 (q 1 / p 0) (% lap) | 0.315 | 0.315 – 0.315 | 1 |
| Timing71 x-portimao – v2 (q 3 / p 0) (% lap) | 0.48 | 0.196 – 0.486 | 3 |
| Timing71 x-virgin-australia-supercars C v2 (q 0 / p 1) (% lap) | 0.37 | 0.37 – 0.37 | 1 |
| Timing71 x-virgin-australia-supercars D v2 (q 0 / p 1) (% lap) | 0.683 | 0.683 – 0.683 | 1 |
| Timing71 x-virgin-australia-supercars A2 v2 (q 0 / p 1) (% lap) | 0.75 | 0.75 – 0.75 | 1 |
| Timing71 x-virgin-australia-supercars A1 v2 (q 0 / p 1) (% lap) | 0.417 | 0.417 – 0.417 | 1 |
| Timing71 x-virgin-australia-supercars B1 v2 (q 0 / p 1) (% lap) | 0.137 | 0.137 – 0.137 | 1 |
| Timing71 x-2022-iracing-6-hours-of-the-glen Dallara P217 v2 (q 0 / p 1) (% lap) | 0.331 | 0.331 – 0.331 | 1 |
| Timing71 x-2022-iracing-6-hours-of-the-glen IMSA22 v2 (q 0 / p 1) (% lap) | 0.228 | 0.228 – 0.228 | 1 |
| Timing71 x-2025-formula-1-louis-vuitton-australian-grand-prix – v2 (q 0 / p 1) (% lap) | 0.346 | 0.346 – 0.346 | 1 |
| Timing71 x-dmv-bmw-318ti-cup 9 v2 (q 1 / p 0) (% lap) | 0.4 | 0.4 – 0.4 | 1 |
| Timing71 x-dmv-bmw-318ti-cup FR 11 v2 (q 1 / p 0) (% lap) | 0.763 | 0.763 – 0.763 | 1 |
| Timing71 x-dmv-bmw-318ti-cup FR 12 v2 (q 1 / p 0) (% lap) | 0.593 | 0.593 – 0.593 | 1 |
| Timing71 x-dmv-stgt PRTC 2 v2 (q 1 / p 0) (% lap) | 0.672 | 0.672 – 0.672 | 1 |
| Timing71 x-dmv-stgt CM 5 v2 (q 1 / p 0) (% lap) | 1.08 | 1.08 – 1.08 | 1 |
| Timing71 x-dmv-stgt ARC 3 v2 (q 1 / p 0) (% lap) | 1.133 | 1.133 – 1.133 | 1 |
| Timing71 x-dmv-stgt Cup v2 (q 1 / p 0) (% lap) | 0.329 | 0.329 – 0.329 | 1 |
| Timing71 x-f4-cez D4-TCC4 v2 (q 1 / p 0) (% lap) | 0.488 | 0.488 – 0.488 | 1 |
| Timing71 x-fanatec-gt2-european-series-pwrd-by-pirelli Silver v2 (q 2 / p 0) (% lap) | 0.475 | 0.407 – 0.544 | 2 |
| Timing71 x-gulf-12-hours GT v2 (q 1 / p 0) (% lap) | 0.65 | 0.65 – 0.65 | 1 |
| Timing71 x-heritage-touring-cup TC2 v2 (q 1 / p 0) (% lap) | 0.68 | 0.68 – 0.68 | 1 |
| Timing71 x-heritage-touring-cup H-1971 v2 (q 1 / p 0) (% lap) | 0.444 | 0.444 – 0.444 | 1 |
| Timing71 x-porsche-carrera-cup-benelux PROAM v2 (q 1 / p 0) (% lap) | 0.389 | 0.389 – 0.389 | 1 |
| Timing71 x-porsche-carrera-cup-benelux – v2 (q 1 / p 2) (% lap) | 0.512 | 0.347 – 0.647 | 3 |
| Timing71 x-wec-beta LMGTEPro v2 (q 1 / p 1) (% lap) | 0.247 | 0.065 – 0.428 | 2 |
| Timing71 x-wec-beta LMGTEAm v2 (q 1 / p 1) (% lap) | 0.354 | 0.269 – 0.438 | 2 |
| Timing71 gtwc Silver Cup v2 (q 1 / p 0) (% lap) | 0.38 | 0.38 – 0.38 | 1 |
| Timing71 igtc NAT GT3 v2 (q 1 / p 0) (% lap) | 0.461 | 0.461 – 0.461 | 1 |
| Timing71 igtc SILVER-CUP v2 (q 1 / p 0) (% lap) | 0.475 | 0.475 – 0.475 | 1 |
| Timing71 igtc PRO-AM v2 (q 1 / p 0) (% lap) | 0.553 | 0.553 – 0.553 | 1 |
| Timing71 igtc NAT GT4 v2 (q 1 / p 0) (% lap) | 0.738 | 0.738 – 0.738 | 1 |
| Timing71 x-2018-cams-national-racing-championships-round-3 CH v2 (q 1 / p 0) (% lap) | 0.355 | 0.355 – 0.355 | 1 |
| Timing71 x-2018-cams-national-racing-championships-round-3 GT4 v2 (q 1 / p 0) (% lap) | 0.348 | 0.348 – 0.348 | 1 |
| Timing71 x-2022-iracing-fixed-indy-500 – v2 (q 0 / p 1) (% lap) | 0.354 | 0.354 – 0.354 | 1 |
| Timing71 x-2023-intelligent-money-british-gt-championship GT3PA v2 (q 0 / p 1) (% lap) | 0.394 | 0.394 – 0.394 | 1 |
| Timing71 x-2023-iracing-daytona-24-powered-by-vco IMSA23 v2 (q 0 / p 1) (% lap) | 0.253 | 0.253 – 0.253 | 1 |
| Timing71 x-2023-iracing-daytona-24-powered-by-vco BMW M Hybrid V8 v2 (q 0 / p 1) (% lap) | 0.362 | 0.362 – 0.362 | 1 |
| Timing71 x-2023-iracing-daytona-24-powered-by-vco Dallara P217 v2 (q 0 / p 1) (% lap) | 0.559 | 0.559 – 0.559 | 1 |
| Timing71 x-2025-formula-1-louis-vuitton-australian-grand-prix P v2 (q 1 / p 0) (% lap) | 0.508 | 0.508 – 0.508 | 1 |
| Timing71 x-2025-formula-1-louis-vuitton-australian-grand-prix A v2 (q 1 / p 0) (% lap) | 0.753 | 0.753 – 0.753 | 1 |
| Timing71 x-gulf-12-hours GT3 G v2 (q 0 / p 1) (% lap) | 0.376 | 0.376 – 0.376 | 1 |
| Timing71 x-lotus-cup-italia RT v2 (q 1 / p 0) (% lap) | 0.44 | 0.44 – 0.44 | 1 |
| Timing71 x-lotus-cup-italia – v2 (q 1 / p 0) (% lap) | 0.29 | 0.29 – 0.29 | 1 |
| Timing71 x-michelin-24h-series GT3 v2 (q 0 / p 1) (% lap) | 0.638 | 0.638 – 0.638 | 1 |
| Timing71 x-michelin-24h-series PTO v2 (q 0 / p 1) (% lap) | 0.764 | 0.764 – 0.764 | 1 |
| Timing71 x-michelin-24h-series TCE v2 (q 0 / p 1) (% lap) | 0.481 | 0.481 – 0.481 | 1 |
| Timing71 x-michelin-24h-series GTX v2 (q 0 / p 1) (% lap) | 0.898 | 0.898 – 0.898 | 1 |
| Timing71 x-michelin-24h-series GT4 v2 (q 0 / p 1) (% lap) | 0.667 | 0.667 – 0.667 | 1 |
| Timing71 x-michelin-24h-series 992 v2 (q 0 / p 1) (% lap) | 0.446 | 0.446 – 0.446 | 1 |
| Timing71 x-navarra – v2 (q 2 / p 0) (% lap) | 0.272 | 0.012 – 0.532 | 2 |
| Timing71 x-tcr-europe SR3 v2 (q 0 / p 1) (% lap) | 0.416 | 0.416 – 0.416 | 1 |
| Timing71 x-tcr-europe RT v2 (q 1 / p 0) (% lap) | 0.399 | 0.399 – 0.399 | 1 |
| Timing71 x-tcr-europe – v2 (q 2 / p 0) (% lap) | 0.42 | 0.271 – 0.57 | 2 |
| Timing71 x-total-24-hours-of-spa-bronze-test PAM v2 (q 0 / p 1) (% lap) | 0.546 | 0.546 – 0.546 | 1 |
| Timing71 x-total-24-hours-of-spa-bronze-test AM v2 (q 0 / p 1) (% lap) | 0.501 | 0.501 – 0.501 | 1 |
| Timing71 x-total-24-hours-of-spa-bronze-test NAT v2 (q 0 / p 1) (% lap) | 0.595 | 0.595 – 0.595 | 1 |
| Timing71 x-virgin-australia-supercars H v2 (q 0 / p 1) (% lap) | 0.044 | 0.044 – 0.044 | 1 |
| Timing71 x-virgin-australia-supercars K v2 (q 0 / p 1) (% lap) | 0.639 | 0.639 – 0.639 | 1 |
| Timing71 x-virgin-australia-supercars F v2 (q 0 / p 1) (% lap) | 0.375 | 0.375 – 0.375 | 1 |
| Timing71 x-dmv-nes-500 318isC v2 (q 1 / p 0) (% lap) | 0.484 | 0.484 – 0.484 | 1 |
| Timing71 x-dmv-nes-500 GTR 3 v2 (q 1 / p 0) (% lap) | 0.409 | 0.409 – 0.409 | 1 |
| Timing71 x-dmv-nes-500 GTR 2 v2 (q 1 / p 0) (% lap) | 0.503 | 0.503 – 0.503 | 1 |
| Timing71 x-dmv-nes-500 Cup 2 v2 (q 1 / p 0) (% lap) | 0.597 | 0.597 – 0.597 | 1 |
| Timing71 x-dmv-nes-500 GTR 1 v2 (q 1 / p 0) (% lap) | 0.512 | 0.512 – 0.512 | 1 |
| Timing71 x-dmv-stgt-und-fcd J v2 (q 1 / p 0) (% lap) | 0.661 | 0.661 – 0.661 | 1 |
| Timing71 x-dmv-stgt-und-fcd S v2 (q 1 / p 0) (% lap) | 0.445 | 0.445 – 0.445 | 1 |
| Timing71 x-dmv-stgt-und-fcd O v2 (q 1 / p 0) (% lap) | 0.475 | 0.475 – 0.475 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup PRO v2 (q 1 / p 0) (% lap) | 0.247 | 0.247 – 0.247 | 1 |
| Timing71 x-gtworldcheu-pwrd-by-aws-sprint-cup GOLD v2 (q 1 / p 0) (% lap) | 0.257 | 0.257 – 0.257 | 1 |
| Timing71 x-nurburgring-24-hours SP 9 v2 (q 0 / p 1) (% lap) | 0.062 | 0.062 – 0.062 | 1 |
| Timing71 x-nurburgring-24-hours SP 8T v2 (q 0 / p 1) (% lap) | 0.213 | 0.213 – 0.213 | 1 |
| Timing71 x-nurburgring-24-hours Kl. Cup 5 v2 (q 0 / p 1) (% lap) | 0.272 | 0.272 – 0.272 | 1 |
| Timing71 x-open-wheels-veterans-100 – v2 (q 1 / p 1) (% lap) | 0.35 | 0.317 – 0.383 | 2 |
| Timing71 x-porsche-sprint-challenge-usa-west 992 P/A v2 (q 1 / p 1) (% lap) | 0.359 | 0.325 – 0.393 | 2 |
| Timing71 x-prototype-cup-germany Silver v2 (q 1 / p 0) (% lap) | 0.665 | 0.665 – 0.665 | 1 |
| Timing71 x-prototype-cup-germany PAM v2 (q 1 / p 0) (% lap) | 1.067 | 1.067 – 1.067 | 1 |
| Timing71 x-ravenol-1h-endurance PAM v2 (q 1 / p 0) (% lap) | 0.486 | 0.486 – 0.486 | 1 |
| Timing71 x-ravenol-1h-endurance AM v2 (q 1 / p 0) (% lap) | 0.417 | 0.417 – 0.417 | 1 |
| Timing71 x-ravenol-1h-endurance FR-1 v2 (q 1 / p 0) (% lap) | 0.775 | 0.775 – 0.775 | 1 |
| Timing71 x-ravenol-1h-endurance STW-6 v2 (q 1 / p 0) (% lap) | 1.437 | 1.437 – 1.437 | 1 |
| Timing71 x-ravenol-1h-endurance BMW v2 (q 1 / p 0) (% lap) | 0.482 | 0.482 – 0.482 | 1 |
| Timing71 x-ravenol-1h-endurance S-CUP v2 (q 1 / p 0) (% lap) | 0.472 | 0.472 – 0.472 | 1 |
| Timing71 x-ravenol-1h-endurance YT-6 v2 (q 1 / p 0) (% lap) | 0.863 | 0.863 – 0.863 | 1 |
| Timing71 x-ravenol-1h-endurance YT-3 v2 (q 1 / p 0) (% lap) | 0.843 | 0.843 – 0.843 | 1 |
| Timing71 x-ravenol-1h-endurance JCW-1 v2 (q 1 / p 0) (% lap) | 0.437 | 0.437 – 0.437 | 1 |
| Timing71 x-ravenol-1h-endurance ETCO2 v2 (q 1 / p 0) (% lap) | 0.952 | 0.952 – 0.952 | 1 |
| Timing71 x-ravenol-1h-endurance TCO-2 v2 (q 1 / p 0) (% lap) | 0.431 | 0.431 – 0.431 | 1 |
| Timing71 x-ravenol-1h-endurance TCO-4 v2 (q 1 / p 0) (% lap) | 0.626 | 0.626 – 0.626 | 1 |
| Timing71 x-ravenol-1h-endurance TCO-5 v2 (q 1 / p 0) (% lap) | 0.631 | 0.631 – 0.631 | 1 |
| Timing71 x-ravenol-1h-endurance TCO-7 v2 (q 1 / p 0) (% lap) | 0.728 | 0.728 – 0.728 | 1 |
| Timing71 x-supercar-challenge-powered-by-hankook GT v2 (q 1 / p 0) (% lap) | 0.482 | 0.482 – 0.482 | 1 |
| Timing71 x-supercar-challenge-powered-by-hankook SS+ v2 (q 1 / p 0) (% lap) | 0.3 | 0.3 – 0.3 | 1 |
| Timing71 x-supercar-challenge-powered-by-hankook S v2 (q 1 / p 0) (% lap) | 0.627 | 0.627 – 0.627 | 1 |
| Timing71 x-supersport-gt AM v2 (q 1 / p 0) (% lap) | 0.53 | 0.53 – 0.53 | 1 |
| Timing71 x-supersport-gt PROAM v2 (q 1 / p 0) (% lap) | 0.36 | 0.36 – 0.36 | 1 |
| Timing71 x-supersport-gt PRO v2 (q 1 / p 0) (% lap) | 0.408 | 0.408 – 0.408 | 1 |
| Timing71 x-2-litre-sportscars Elford v2 (q 1 / p 0) (% lap) | 0.515 | 0.515 – 0.515 | 1 |
| Timing71 x-2-litre-sportscars Merzario v2 (q 1 / p 0) (% lap) | 0.603 | 0.603 – 0.603 | 1 |
| Timing71 x-7racing GT3 v2 (q 1 / p 0) (% lap) | 0.699 | 0.699 – 0.699 | 1 |
| Timing71 x-7racing TCE v2 (q 1 / p 0) (% lap) | 0.124 | 0.124 – 0.124 | 1 |
| Timing71 x-7racing GTX v2 (q 1 / p 0) (% lap) | 0.594 | 0.594 – 0.594 | 1 |
| Timing71 x-7racing GT4 v2 (q 1 / p 0) (% lap) | 0.517 | 0.517 – 0.517 | 1 |
| Timing71 x-7racing 992 v2 (q 1 / p 0) (% lap) | 0.567 | 0.567 – 0.567 | 1 |
| Timing71 x-alpine-elf-europa-cup Gentleman v2 (q 1 / p 0) (% lap) | 0.372 | 0.372 – 0.372 | 1 |
| Timing71 x-clio-cup-series AM v2 (q 2 / p 0) (% lap) | 0.615 | 0.461 – 0.769 | 2 |
| Timing71 x-clio-cup-series PROAM v2 (q 1 / p 0) (% lap) | 0.377 | 0.377 – 0.377 | 1 |
| Timing71 x-gulf-12-hours – v2 (q 0 / p 1) (% lap) | 0.547 | 0.547 – 0.547 | 1 |
| Timing71 x-hrdc-allstars-with-classic-alfa-challenge CORSA v2 (q 1 / p 0) (% lap) | 0.612 | 0.612 – 0.612 | 1 |
| Timing71 x-hrdc-allstars-with-classic-alfa-challenge GT v2 (q 1 / p 0) (% lap) | 0.669 | 0.669 – 0.669 | 1 |
| Timing71 x-hrdc-allstars-with-classic-alfa-challenge TC v2 (q 1 / p 0) (% lap) | 0.762 | 0.762 – 0.762 | 1 |
| Timing71 x-official-test-87-edition-des-24-heures-du-mans P1 v2 (q 0 / p 1) (% lap) | 1.175 | 1.175 – 1.175 | 1 |
| Timing71 x-official-test-87-edition-des-24-heures-du-mans P2 v2 (q 0 / p 1) (% lap) | 0.614 | 0.614 – 0.614 | 1 |
| Timing71 x-official-test-87-edition-des-24-heures-du-mans LMGTE Am v2 (q 0 / p 1) (% lap) | 0.649 | 0.649 – 0.649 | 1 |
| Timing71 x-official-test-87-edition-des-24-heures-du-mans LMGTE Pro v2 (q 0 / p 1) (% lap) | 0.436 | 0.436 – 0.436 | 1 |
| Timing71 x-pccme-race ProAM v2 (q 1 / p 0) (% lap) | 0.454 | 0.454 – 0.454 | 1 |
| Timing71 x-pccme-race MAS v2 (q 1 / p 0) (% lap) | 0.256 | 0.256 – 0.256 | 1 |
| Timing71 x-pccme-race Pro v2 (q 1 / p 0) (% lap) | 0.249 | 0.249 – 0.249 | 1 |
| Timing71 x-virgin-australia-supercars HQ v2 (q 0 / p 1) (% lap) | 0.461 | 0.461 – 0.461 | 1 |
| Timing71 x-160cc 160 v2 (q 0 / p 1) (% lap) | 0.387 | 0.387 – 0.387 | 1 |
| Timing71 x-160cc 110 v2 (q 0 / p 1) (% lap) | 0.578 | 0.578 – 0.578 | 1 |
| Timing71 x-arca-menards-series – v2 (q 0 / p 2) (% lap) | 0.509 | 0.467 – 0.552 | 2 |
| Timing71 x-bmw-120 – v2 (q 0 / p 1) (% lap) | 0.339 | 0.339 – 0.339 | 1 |
| Timing71 x-dmv-classic-masters-ptrc J v2 (q 1 / p 0) (% lap) | 0.748 | 0.748 – 0.748 | 1 |
| Timing71 x-dmv-classic-masters-ptrc S v2 (q 1 / p 0) (% lap) | 0.713 | 0.713 – 0.713 | 1 |
| Timing71 x-dmv-classic-masters-ptrc Cup S v2 (q 1 / p 0) (% lap) | 0.418 | 0.418 – 0.418 | 1 |
| Timing71 x-fr-middle-east-trophy UAE4-R v2 (q 1 / p 0) (% lap) | 0.026 | 0.026 – 0.026 | 1 |
| Timing71 x-fr-middle-east-trophy UAE4 v2 (q 1 / p 0) (% lap) | 0.012 | 0.012 – 0.012 | 1 |
| Timing71 x-hscc-historic-road-sports-championship 70d v2 (q 1 / p 0) (% lap) | 0.621 | 0.621 – 0.621 | 1 |
| Timing71 x-hscc-historic-road-sports-championship HRG v2 (q 1 / p 0) (% lap) | 0.553 | 0.553 – 0.553 | 1 |
| Timing71 x-hscc-historic-road-sports-championship 105C v2 (q 1 / p 0) (% lap) | 0.363 | 0.363 – 0.363 | 1 |
| Timing71 x-hscc-historic-road-sports-championship HRC v2 (q 1 / p 0) (% lap) | 0.612 | 0.612 – 0.612 | 1 |
| Timing71 x-hscc-historic-road-sports-championship 70a v2 (q 1 / p 0) (% lap) | 0.355 | 0.355 – 0.355 | 1 |
| Timing71 x-majors-series-european-region – v2 (q 0 / p 1) (% lap) | 0.287 | 0.287 – 0.287 | 1 |
| Timing71 x-porsche-carrera-cup-benelux PRO v2 (q 0 / p 1) (% lap) | 0.702 | 0.702 – 0.702 | 1 |
| Timing71 imsa GTD Pro v2 (q 0 / p 1) (% lap) | 0.471 | 0.471 – 0.471 | 1 |
| Timing71 x-2022-hi-tec-oils-bathurst-6-hour B v2 (q 0 / p 1) (% lap) | 0.848 | 0.848 – 0.848 | 1 |
| Timing71 x-2026-nti-townsville-500 P v2 (q 0 / p 1) (% lap) | 0.358 | 0.358 – 0.358 | 1 |
| Timing71 x-2026-nti-townsville-500 A v2 (q 0 / p 1) (% lap) | 0.413 | 0.413 – 0.413 | 1 |
| Timing71 x-clio-cup-series PAM v2 (q 1 / p 0) (% lap) | 0.335 | 0.335 – 0.335 | 1 |
| Timing71 x-ferrari-challenge-trofeo-pirelli TP v2 (q 0 / p 1) (% lap) | 0.599 | 0.599 – 0.599 | 1 |
| Timing71 x-ferrari-challenge-trofeo-pirelli TP-AM v2 (q 0 / p 1) (% lap) | 0.219 | 0.219 – 0.219 | 1 |
| Timing71 x-ferrari-challenge-trofeo-pirelli CS v2 (q 0 / p 1) (% lap) | 0.697 | 0.697 – 0.697 | 1 |
| Timing71 x-ferrari-challenge-trofeo-pirelli CS-AM v2 (q 0 / p 1) (% lap) | 0.812 | 0.812 – 0.812 | 1 |
| Timing71 x-fr-middle-east-trophy FR v2 (q 1 / p 0) (% lap) | 0.183 | 0.183 – 0.183 | 1 |
| Timing71 x-fr-middle-east-trophy FR-R v2 (q 1 / p 0) (% lap) | 0.008 | 0.008 – 0.008 | 1 |
| Timing71 x-porsche-sixt-carrera-cup-deutschland Rookie v2 (q 2 / p 0) (% lap) | 0.393 | 0.254 – 0.532 | 2 |
| Timing71 x-th-super-pickup-d1-class-a-b – v2 (q 1 / p 0) (% lap) | 0.897 | 0.897 – 0.897 | 1 |
| Timing71 gtwc Sil-Am v2 (q 1 / p 0) (% lap) | 0.386 | 0.386 – 0.386 | 1 |
| Timing71 x-2026-itm-ruapuna-super-440 – v2 (q 0 / p 2) (% lap) | 0.569 | 0.267 – 0.872 | 2 |
| Timing71 x-24h-esports Porsche 911 v2 (q 1 / p 0) (% lap) | 0.591 | 0.591 – 0.591 | 1 |
| Timing71 x-24h-series P3 v2 (q 1 / p 0) (% lap) | 0.693 | 0.693 – 0.693 | 1 |
| Timing71 x-adac-gt4-germany Silver v2 (q 1 / p 0) (% lap) | 0.341 | 0.341 – 0.341 | 1 |
| Timing71 x-clio-cup-middle-east GT3 v2 (q 0 / p 1) (% lap) | 0.547 | 0.547 – 0.547 | 1 |
| Timing71 x-clio-cup-middle-east TCE v2 (q 1 / p 0) (% lap) | 0.68 | 0.68 – 0.68 | 1 |
| Timing71 x-clio-cup-middle-east GTX v2 (q 1 / p 0) (% lap) | 0.27 | 0.27 – 0.27 | 1 |
| Timing71 x-clio-cup-middle-east GT4 v2 (q 1 / p 0) (% lap) | 0.381 | 0.381 – 0.381 | 1 |
| Timing71 x-clio-cup-middle-east 992 v2 (q 0 / p 1) (% lap) | 0.536 | 0.536 – 0.536 | 1 |
| Timing71 x-lamborghini-super-trofeo GTDPRO v2 (q 1 / p 0) (% lap) | 0.668 | 0.668 – 0.668 | 1 |
| Timing71 x-lamborghini-super-trofeo LMP2 v2 (q 1 / p 0) (% lap) | 0.802 | 0.802 – 0.802 | 1 |
| Timing71 x-lamborghini-super-trofeo GTD v2 (q 1 / p 0) (% lap) | 0.738 | 0.738 – 0.738 | 1 |
| Timing71 x-porsche-carrera-cup-benelux Rookie v2 (q 0 / p 1) (% lap) | 0.786 | 0.786 – 0.786 | 1 |
| Timing71 x-thailand-super-compact – v2 (q 1 / p 0) (% lap) | 0.472 | 0.472 – 0.472 | 1 |
| Timing71 x-2023-otr-supersprint P v2 (q 1 / p 0) (% lap) | 0.386 | 0.386 – 0.386 | 1 |
| Timing71 x-2023-otr-supersprint A v2 (q 1 / p 0) (% lap) | 0.863 | 0.863 – 0.863 | 1 |
| Timing71 x-2023-thrifty-newcastle-500 C v2 (q 0 / p 1) (% lap) | 0.451 | 0.451 – 0.451 | 1 |
| Timing71 x-24h-esports-series IMSA2 GT3 v2 (q 1 / p 0) (% lap) | 0.104 | 0.104 – 0.104 | 1 |
| Timing71 x-european-vw-fun-cup EV2 v2 (q 1 / p 0) (% lap) | 0.385 | 0.385 – 0.385 | 1 |
| Timing71 x-ferrari-challenge-na S-AM v2 (q 1 / p 0) (% lap) | 0.449 | 0.449 – 0.449 | 1 |
| Timing71 x-ferrari-challenge-na S v2 (q 1 / p 0) (% lap) | 0.588 | 0.588 – 0.588 | 1 |
| Timing71 x-iracing-race-of-remembrance – v2 (q 1 / p 0) (% lap) | 0.448 | 0.448 – 0.448 | 1 |
| Timing71 x-michelin-le-mans-cup LMP3 v2 (q 0 / p 1) (% lap) | 0.472 | 0.472 – 0.472 | 1 |
| Timing71 x-michelin-le-mans-cup LMP3 Pro/Am v2 (q 0 / p 1) (% lap) | 0.341 | 0.341 – 0.341 | 1 |
| Timing71 x-porsche-carrera-cup-asia -1 v2 (q 1 / p 0) (% lap) | 0.372 | 0.372 – 0.372 | 1 |
| Timing71 x-porsche-carrera-cup-asia – v2 (q 1 / p 0) (% lap) | 0.481 | 0.481 – 0.481 | 1 |
| Timing71 x-thailand-super-pickup-d2-class-c – v2 (q 1 / p 0) (% lap) | 0.598 | 0.598 – 0.598 | 1 |
| Timing71 x-theracingline-app-presents IMSA22 v2 (q 0 / p 1) (% lap) | 0.39 | 0.39 – 0.39 | 1 |
| Timing71 x-2026-repco-bathurst-1000 DS2 v2 (q 1 / p 0) (% lap) | 0.241 | 0.241 – 0.241 | 1 |
| Timing71 x-adac-gt4-germany PAM v2 (q 1 / p 0) (% lap) | 0.499 | 0.499 – 0.499 | 1 |
| Timing71 x-elms-collective-test-day LMP2 Pro/Am v2 (q 0 / p 2) (% lap) | 0.579 | 0.536 – 0.621 | 2 |
| Timing71 x-elms-collective-test-day LMP3 v2 (q 0 / p 2) (% lap) | 0.485 | 0.346 – 0.623 | 2 |
| Timing71 x-elms-collective-test-day LMP2 v2 (q 0 / p 2) (% lap) | 0.585 | 0.535 – 0.635 | 2 |
| Timing71 x-elms-collective-test-day LMGT3 v2 (q 0 / p 2) (% lap) | 0.49 | 0.42 – 0.56 | 2 |
| Timing71 x-fanatec-gt2-european-series-pwrd-by-pirelli GOLD v2 (q 1 / p 0) (% lap) | 0.375 | 0.375 – 0.375 | 1 |
| Timing71 x-fanatec-gt2-european-series-pwrd-by-pirelli PRO v2 (q 1 / p 0) (% lap) | 0.175 | 0.175 – 0.175 | 1 |
| Timing71 x-fanatec-gt2-european-series-pwrd-by-pirelli Bronze Cup v2 (q 1 / p 0) (% lap) | 0.205 | 0.205 – 0.205 | 1 |
| Timing71 x-gt-america GT4 v2 (q 0 / p 1) (% lap) | 0.566 | 0.566 – 0.566 | 1 |
| Timing71 x-gt-america Masters v2 (q 0 / p 1) (% lap) | 0.517 | 0.517 – 0.517 | 1 |
| Timing71 x-gt-america SRO3 v2 (q 0 / p 1) (% lap) | 0.644 | 0.644 – 0.644 | 1 |
| Timing71 x-imsa-iracing-challenge – v2 (q 1 / p 0) (% lap) | 0.236 | 0.236 – 0.236 | 1 |
| Timing71 x-indy-pro-2000 – v2 (q 0 / p 1) (% lap) | 0.479 | 0.479 – 0.479 | 1 |
| Timing71 x-mazda-mx-5-cup-group-2-shootout MX5 v2 (q 1 / p 0) (% lap) | 0.339 | 0.339 – 0.339 | 1 |
| Timing71 x-mazda-mx-5-cup-group-2-shootout SMX v2 (q 1 / p 0) (% lap) | 0.381 | 0.381 – 0.381 | 1 |
| Timing71 x-official-paid-gtwc-powered-by-aws Silver Cup v2 (q 0 / p 1) (% lap) | 0.438 | 0.438 – 0.438 | 1 |
| Timing71 x-official-paid-gtwc-powered-by-aws Pro-Am Cup v2 (q 0 / p 1) (% lap) | 0.537 | 0.537 – 0.537 | 1 |
| Timing71 x-official-paid-gtwc-powered-by-aws LBST v2 (q 0 / p 1) (% lap) | 0.538 | 0.538 – 0.538 | 1 |
| Timing71 x-2026-airtouch-500-at-the-bend PS v2 (q 1 / p 0) (% lap) | 0.371 | 0.371 – 0.371 | 1 |
| Timing71 x-24h-series-me-trophy-powered-by-hankook GT3 v2 (q 0 / p 1) (% lap) | 0.58 | 0.58 – 0.58 | 1 |
| Timing71 x-24h-series-me-trophy-powered-by-hankook TCE v2 (q 0 / p 1) (% lap) | 0.566 | 0.566 – 0.566 | 1 |
| Timing71 x-24h-series-me-trophy-powered-by-hankook GT4 v2 (q 0 / p 1) (% lap) | 0.445 | 0.445 – 0.445 | 1 |
| Timing71 x-24h-series-me-trophy-powered-by-hankook GTX v2 (q 0 / p 1) (% lap) | 0.241 | 0.241 – 0.241 | 1 |
| Timing71 x-24h-series-me-trophy-powered-by-hankook 992 v2 (q 0 / p 1) (% lap) | 0.536 | 0.536 – 0.536 | 1 |
| Timing71 x-clio-cup-bohemia F4-H2 v2 (q 1 / p 0) (% lap) | 0.519 | 0.519 – 0.519 | 1 |
| Timing71 x-clio-cup-bohemia Cro2 v2 (q 1 / p 0) (% lap) | 0.843 | 0.843 – 0.843 | 1 |
| Timing71 x-mlmc-collective-test-day LMP3 v2 (q 0 / p 2) (% lap) | 0.587 | 0.49 – 0.685 | 2 |
| Timing71 x-mlmc-collective-test-day LMP3 Pro/Am v2 (q 0 / p 2) (% lap) | 0.456 | 0.407 – 0.504 | 2 |
| Timing71 x-mlmc-collective-test-day GT3 v2 (q 0 / p 2) (% lap) | 0.599 | 0.415 – 0.782 | 2 |
| Timing71 x-tcr-europe R v2 (q 1 / p 0) (% lap) | 0.713 | 0.713 – 0.713 | 1 |
| Timing71 x-th-supercar-gt3-gtm GTC v2 (q 0 / p 1) (% lap) | 0.526 | 0.526 – 0.526 | 1 |
| Timing71 x-th-supercar-gt3-gtm GT4 Pro v2 (q 0 / p 1) (% lap) | 0.597 | 0.597 – 0.597 | 1 |
| Timing71 x-th-supercar-gt3-gtm GT4 Am v2 (q 0 / p 1) (% lap) | 0.537 | 0.537 – 0.537 | 1 |
| Timing71 x-th-supercar-gt3-gtm 51.982 v2 (q 0 / p 1) (% lap) | 0.567 | 0.567 – 0.567 | 1 |
| Timing71 x-th-supercar-gt3-gtm 0.062 v2 (q 0 / p 1) (% lap) | 0.66 | 0.66 – 0.66 | 1 |
| Timing71 x-thailand-super-pickup-d1-class-a-b Pickup B v2 (q 1 / p 0) (% lap) | 0.538 | 0.538 – 0.538 | 1 |
| Timing71 x-thailand-super-pickup-d1-class-a-b Pickup A v2 (q 1 / p 0) (% lap) | 0.578 | 0.578 – 0.578 | 1 |
| Timing71 x-tourenwagen-legenden 4 v2 (q 1 / p 0) (% lap) | 0.605 | 0.605 – 0.605 | 1 |
| Timing71 x-tourenwagen-legenden 6 v2 (q 1 / p 0) (% lap) | 0.62 | 0.62 – 0.62 | 1 |
| Timing71 x-tourenwagen-legenden 5 v2 (q 1 / p 0) (% lap) | 0.552 | 0.552 – 0.552 | 1 |
| Timing71 x-tourenwagen-legenden 1 v2 (q 1 / p 0) (% lap) | 0.552 | 0.552 – 0.552 | 1 |
| Timing71 x-tourenwagen-legenden 3 v2 (q 1 / p 0) (% lap) | 0.445 | 0.445 – 0.445 | 1 |
| Timing71 x-24h-series-me-trophy C v2 (q 0 / p 1) (% lap) | 0.281 | 0.281 – 0.281 | 1 |
| Timing71 x-24h-series-me-trophy G v2 (q 0 / p 1) (% lap) | 0.547 | 0.547 – 0.547 | 1 |
| Timing71 x-24h-series-me-trophy   v2 (q 0 / p 1) (% lap) | 0.736 | 0.736 – 0.736 | 1 |
| Timing71 x-anglesey-international-gp C v2 (q 1 / p 0) (% lap) | 0.648 | 0.648 – 0.648 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm FH DIV 5 v2 (q 1 / p 0) (% lap) | 1.06 | 1.06 – 1.06 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm FH DIV 2 v2 (q 1 / p 0) (% lap) | 0.478 | 0.478 – 0.478 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm FR-1 v2 (q 1 / p 0) (% lap) | 0.551 | 0.551 – 0.551 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm FR-2 v2 (q 1 / p 0) (% lap) | 0.706 | 0.706 – 0.706 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm STW-3 v2 (q 1 / p 0) (% lap) | 0.382 | 0.382 – 0.382 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm PCC-Y2 v2 (q 1 / p 0) (% lap) | 0.75 | 0.75 – 0.75 | 1 |
| Timing71 x-histo-cup-yt-und-tco-bis-3000ccm TCO-6 v2 (q 1 / p 0) (% lap) | 0.603 | 0.603 – 0.603 | 1 |
| Timing71 x-porsche-sprint-challenge-usa-west CAY M v2 (q 0 / p 1) (% lap) | 0.552 | 0.552 – 0.552 | 1 |
| Timing71 x-tcr-asia-series 6 v2 (q 1 / p 0) (% lap) | 0.343 | 0.343 – 0.343 | 1 |
| Timing71 x-tcr-asia-series 7 v2 (q 1 / p 0) (% lap) | 0.474 | 0.474 – 0.474 | 1 |
| Timing71 x-tcr-asia-series 2 v2 (q 1 / p 0) (% lap) | 0.335 | 0.335 – 0.335 | 1 |
| Timing71 x-th-supercar-gt3-gtm GT3 Am v2 (q 0 / p 1) (% lap) | 1.252 | 1.252 – 1.252 | 1 |
| Timing71 x-vco-cup-of-nations-pro-2021 – v2 (q 0 / p 1) (% lap) | 0.704 | 0.704 – 0.704 | 1 |
| Timing71 igtc SC1 v2 (q 0 / p 1) (% lap) | 0.546 | 0.546 – 0.546 | 1 |
| Timing71 x-crowdstrike-24-hours-of-spa AM v2 (q 1 / p 0) (% lap) | 0.5 | 0.5 – 0.5 | 1 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-sprint-cup – v2 (q 1 / p 0) (% lap) | 0.497 | 0.497 – 0.497 | 1 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-sprint-cup G v2 (q 1 / p 0) (% lap) | 0.579 | 0.579 – 0.579 | 1 |
| Timing71 x-fanatec-gtworldcheu-pwrd-by-aws-sprint-cup J v2 (q 1 / p 0) (% lap) | 0.425 | 0.425 – 0.425 | 1 |
| Timing71 x-mclaren-trophy-europe Bronze Cup v2 (q 0 / p 1) (% lap) | 0.295 | 0.295 – 0.295 | 1 |
| Timing71 x-mlmc-collective-test-day LMP2 Pro/Am v2 (q 0 / p 1) (% lap) | 0.657 | 0.657 – 0.657 | 1 |
| Timing71 x-mlmc-collective-test-day LMP2 v2 (q 0 / p 1) (% lap) | 0.634 | 0.634 – 0.634 | 1 |
| Timing71 x-mlmc-collective-test-day LMGT3 v2 (q 0 / p 1) (% lap) | 0.504 | 0.504 – 0.504 | 1 |
| Al Kamel wec proto all v1 (% lap) | 0.635 | 0.605 – 0.647 | 23 |
| Al Kamel wec proto PG v1 (% lap) | 0.636 | 0.594 – 0.648 | 23 |
| Al Kamel wec proto codriver (% lap) | 0.944 | 0.835 – 1.216 | 22 |
| Al Kamel wec lmp2 all v1 (% lap) | 0.628 | 0.569 – 0.658 | 8 |
| Al Kamel wec lmp2 PG v1 (% lap) | 0.576 | 0.527 – 0.63 | 8 |
| Al Kamel wec lmp2 SB v1 (% lap) | 0.638 | 0.592 – 0.686 | 8 |
| Al Kamel wec gt3 all v1 (% lap) | 0.506 | 0.483 – 0.535 | 16 |
| Al Kamel wec gt3 PG v1 (% lap) | 0.501 | 0.473 – 0.524 | 16 |
| Al Kamel wec gt3 SB v1 (% lap) | 0.513 | 0.465 – 0.542 | 16 |
| Al Kamel wec gt3 codriver (% lap) | 0.647 | 0.552 – 0.734 | 16 |
| Al Kamel elms lmp2 all v1 (% lap) | 0.682 | 0.665 – 0.692 | 19 |
| Al Kamel elms lmp2 PG v1 (% lap) | 0.672 | 0.641 – 0.687 | 19 |
| Al Kamel elms lmp2 SB v1 (% lap) | 0.689 | 0.669 – 0.702 | 19 |
| Al Kamel elms gt3 all v1 (% lap) | 0.595 | 0.546 – 0.611 | 14 |
| Al Kamel elms gt3 PG v1 (% lap) | 0.59 | 0.489 – 0.611 | 14 |
| Al Kamel elms gt3 SB v1 (% lap) | 0.601 | 0.571 – 0.612 | 14 |
| Al Kamel elms gt3 codriver (% lap) | 0.734 | 0.647 – 0.878 | 14 |
| Al Kamel imsa proto all v1 (% lap) | 0.704 | 0.666 – 0.728 | 27 |
| Al Kamel imsa proto PG v1 (% lap) | 0.697 | 0.674 – 0.738 | 27 |
| Al Kamel imsa proto codriver (% lap) | 0.858 | 0.81 – 0.976 | 27 |
| Al Kamel imsa lmp2 all v1 (% lap) | 0.715 | 0.696 – 0.745 | 21 |
| Al Kamel imsa lmp2 PG v1 (% lap) | 0.763 | 0.73 – 0.809 | 21 |
| Al Kamel imsa lmp2 SB v1 (% lap) | 0.689 | 0.659 – 0.716 | 21 |
| Al Kamel imsa gt3 all v1 (% lap) | 0.581 | 0.551 – 0.603 | 33 |
| Al Kamel imsa gt3 PG v1 (% lap) | 0.546 | 0.519 – 0.568 | 33 |
| Al Kamel imsa gt3 SB v1 (% lap) | 0.598 | 0.579 – 0.61 | 32 |
| Al Kamel imsa gt3 codriver (% lap) | 0.951 | 0.824 – 1.019 | 33 |
| Al Kamel wec proto v2 (q 23 / p 0) (% lap) | 0.307 | 0.289 – 0.355 | 23 |
| Al Kamel wec lmp2 v2 (q 8 / p 0) (% lap) | 0.263 | 0.194 – 0.38 | 8 |
| Al Kamel wec gt3 v2 (q 16 / p 0) (% lap) | 0.322 | 0.318 – 0.347 | 16 |
| Al Kamel elms lmp2 v2 (q 16 / p 3) (% lap) | 0.409 | 0.351 – 0.462 | 19 |
| Al Kamel elms gt3 v2 (q 12 / p 2) (% lap) | 0.488 | 0.416 – 0.522 | 14 |
| Al Kamel imsa proto v2 (q 24 / p 3) (% lap) | 0.351 | 0.324 – 0.465 | 27 |
| Al Kamel imsa lmp2 v2 (q 18 / p 3) (% lap) | 0.465 | 0.449 – 0.487 | 21 |
| Al Kamel imsa gt3 v2 (q 31 / p 2) (% lap) | 0.359 | 0.325 – 0.392 | 33 |

| BoP body | cases | σ_level (s) | σ_Δ (s) | robust σ_Δ (s) | data limit (> 0.1 s) |
|---|---|---|---|---|---|
| sro | 1396 | 2.278 | 3.221 | 0.479 | true |
| imsa | 842 | 0.364 | 0.515 | 0.267 | true |
| aco | 515 | 0.621 | 0.879 | 0.385 | true |
| dtm | 18 | 0.547 | 0.773 | 0.769 | true |


## Δ benchmarks

- F1 DRS Δ v1 per stint (cases sha256 7b2c16ff…): 0 model rows (every case stopped on noise in step 24: no kept case)
- F1 pooled DRS Δ v2 (cases sha256 5a153cf1…): n 125, pass rate 0.056, bias -0.2015 s [-0.2265, -0.1798], sign errors 12, median pred -0.3427 s vs meas -0.1264 s; baseline CSV differs from the shipped baseline-pooled-2026-11-24.csv
- F1 2022 LOCKED (cases sha256 92a9f542…): locked, not scored
- WEC BoP Δ v2 (step 21): not on main; report-only after the σ_meas stop (0.82 s > 0.1 s)

## Inputs (SHA256SUMS of the snapshot)

```
88fbb3bceb4519c73371941e0faa2f8aee85b4f27f15109b5a13f5a0863823ca  lapsim-prep.tgz
ff8699ae27eaf7c7beeb021601cc4781d40e29165e27f340899c8077203cf640  ./.cache/lapsim/circuits.json
e67145ddbe5581863839c9fd4303b86db2b3c0e3465e98142912f4126a5a2c5d  ./.cache/lapsim/f1-circuits.geojson
63d4510bae463ff8d76998488ee8304d4bdfe15939e3969948480f7b2fb82ac3  ./.cache/lapsim/index.json
9d3232cb17fefff25f629d91bddd97b037798a10c2b686e841563472f7124b2b  ./.cache/lapsim/races.json
4942a80bf31ad4980fb6715068907f301c97a65134fb72a3a1d5e696ab39a44a  ./.cache/lapsim/races/2023-austin-race.json
9326dcc9edf845750ff82f8d17deb8209ffec6c0e9603aee7d0c5c613b506bca  ./.cache/lapsim/races/2023-austin-sprint.json
5071cf05df5d307c059d4dd5698a0c16f61cccaf49a69c2bfa8a5a0a08f09c56  ./.cache/lapsim/races/2023-baku-race.json
320296c29b0b2be47edd5acd7841842b6fe8cb9f6bced80e7fb8cd18b2ef21ee  ./.cache/lapsim/races/2023-baku-sprint.json
f3755aa5d82e231cf9c3daefe715e72c89ef3fd3c532aaef35913b503cf83c7e  ./.cache/lapsim/races/2023-catalunya-race.json
b8ecb4d9beda53e7a0b54c7cc14f50c8a3dffb7b454b9c2340864bcd5eede9ce  ./.cache/lapsim/races/2023-hungaroring-race.json
fbf33f26f14c39935cb0c3d6090ef86c5ba82c53886ad3ec9807ac97e64a3f26  ./.cache/lapsim/races/2023-interlagos-race.json
14e5367f41102d7d612ba986412e5613674149554cd4ed14dd74d2e3a377b1b0  ./.cache/lapsim/races/2023-interlagos-sprint.json
37373fd6ff976f701e386f003310719fa2c213e46efca4f90e4e1e830d8859e5  ./.cache/lapsim/races/2023-jeddah-race.json
1cbfb3cbff322043881c99cacb74816160adc545dca0d23604e10bd3788ba56d  ./.cache/lapsim/races/2023-las-vegas-race.json
baf05b205dfa695baff0088c2e35b2d968e22dbbb996326a41d500b202546e4a  ./.cache/lapsim/races/2023-lusail-race.json
9f505430ce6a807fce6fc2715960845f8787e60f68ac199867f5b8083911e0ef  ./.cache/lapsim/races/2023-lusail-sprint.json
987b475cceff7275455e16d548def020aa89bc4b0e3127e87b6d881683ffd2f6  ./.cache/lapsim/races/2023-melbourne-race.json
a682328d3aff9122cf8ebcc69a88a678346f86786736b65a43dbae9d4cb56d8a  ./.cache/lapsim/races/2023-mexico-city-race.json
928125c0edffe552122b8e1f81c0deaebe61e3e340e1968cdb53312a2b073403  ./.cache/lapsim/races/2023-miami-race.json
b3f8cd975be851a026063455f12a79236c5a2aeac3615adf4769be08910044a9  ./.cache/lapsim/races/2023-monte-carlo-race.json
7b3f239ba57249065dc2e6720178d288cf0d43fe46dce02bc2f918a52ec4be36  ./.cache/lapsim/races/2023-montreal-race.json
a4de231f306c139cbc973e12a96359886c9c46fc36071b818294df6e9411f76f  ./.cache/lapsim/races/2023-monza-race.json
bbd1da1954d60c6209a29a1ec1c0cc4b5b91acdce71f9b19bd4f0e0713fc7da5  ./.cache/lapsim/races/2023-sakhir-race.json
5b214a184a00f98758f35970c2083071f599fe06fec3ed91a0ceae59bc33303a  ./.cache/lapsim/races/2023-silverstone-race.json
047e1a71b3e632f5ceb9dbb126c144082ec0303d8688e93f8fbef2d030370f0e  ./.cache/lapsim/races/2023-singapore-race.json
513918afae7f3efafae22adbc7cda4c97e0f5f141158d0ab3d0b91c4cddcf5d8  ./.cache/lapsim/races/2023-spa-francorchamps-race.json
9a5e3b9cf1ee70272e7da3d1bf33dda338c251902d4c2829eab359769756dc79  ./.cache/lapsim/races/2023-spa-francorchamps-sprint.json
64ff9841778d432c298a8f3c8e9ea531c4a895512c21a13e6f071ee7cc5d60b6  ./.cache/lapsim/races/2023-spielberg-race.json
21fa3bf26e8c8552f6985497ffa212429ab2d168dd9ad892fa179a16e4baba0f  ./.cache/lapsim/races/2023-spielberg-sprint.json
96fd33aca7434bd1bd5ed637824bea80848b9b1040b0abfb018b6371c60abbd8  ./.cache/lapsim/races/2023-suzuka-race.json
220502e56e5bf0848e35b5f98025a799501d02753219087e327e14e10f40215d  ./.cache/lapsim/races/2023-yas-marina-circuit-race.json
fb2aab778ee12ec5db7f449cc31f1828981abe73bd9a4d7f0434a10519359b31  ./.cache/lapsim/races/2023-zandvoort-race.json
d48fe28c8d19b03ce57a0d746f75e56ce11e1d1739c97eddeaa1a6fb18d2cb9a  ./.cache/lapsim/races/2024-austin-race.json
2cf6a2297c1fb9ad676edb3082068ea8a5f1ed7232c15c54c0d09c93c8660cf0  ./.cache/lapsim/races/2024-austin-sprint.json
0ab7c0b50512b7ae9083aa9d7bb01b98910b134f45972fd85c58fe567f13fd4c  ./.cache/lapsim/races/2024-baku-race.json
681fafe108086a577eee791dc1f760a07b450bc906d598f9f309b69e104ee78c  ./.cache/lapsim/races/2024-catalunya-race.json
2c3c9430895d9b272a4da8d672ebb0c05bb2bd2df313abd31fa2b4bac146526f  ./.cache/lapsim/races/2024-hungaroring-race.json
8ec7f107fdac62b5afcb5134112658832c15dafafd08ae9a28b1003b2dda8dc9  ./.cache/lapsim/races/2024-imola-race.json
635b4d9db9a51eb9db5121b2a4a47159bf08ddc588550208068f769550c9b592  ./.cache/lapsim/races/2024-interlagos-race.json
97b6ed7fd0d0264614663b3508804e9a571a6fb0684d247c89d07bcb4cdf293f  ./.cache/lapsim/races/2024-interlagos-sprint.json
27fb657fe952ec52e328176f1a92816e44998c15f26e6511cce8ee7ba6e1bf1a  ./.cache/lapsim/races/2024-jeddah-race.json
1fdd600aa33296952e1baf7939345c2fd971b091cf5a67b691b1a8d363183d61  ./.cache/lapsim/races/2024-las-vegas-race.json
c1b26195240ba86509785b64925629f9024570ab84d697a913ac3cdafe303e85  ./.cache/lapsim/races/2024-lusail-race.json
450073fe007728b016ed6a7b664c3d8cd99ce5eb754e13440ad60892b28db1c8  ./.cache/lapsim/races/2024-lusail-sprint.json
edd6e767fffb5637a205030adc5d11b47ea652cf3e69fe7267b5a3cc7da7c074  ./.cache/lapsim/races/2024-melbourne-race.json
fb74f46f842f19d760f62c16d731ed77c7f140739fbd723c8aa28bcbd7e60503  ./.cache/lapsim/races/2024-mexico-city-race.json
09c6b87a5c73c6aae1da02a8a776c3e92ce0f9da0c08e4a83884291241e22891  ./.cache/lapsim/races/2024-miami-race.json
aef4bc07d4075cdbadc855932090283f5720019d02559da7985559eb3578bdef  ./.cache/lapsim/races/2024-miami-sprint.json
0ac01217847f7d25e4768b41870ca6380b424d6e68cff03c072d6ddddc91c243  ./.cache/lapsim/races/2024-monte-carlo-race.json
2ce19ecf23a3b76431572d8b018baef0998428245365036dcc29fcf5c9075c24  ./.cache/lapsim/races/2024-montreal-race.json
d11676512b8b7e90e804f5d98844c1040190236751ea711d256e5643a75c7a4a  ./.cache/lapsim/races/2024-monza-race.json
d9866647709e0814965071e0f49ae2adc81a57d9dc42d2407690d0dfd590c983  ./.cache/lapsim/races/2024-sakhir-race.json
ca7f98b2e6b05764e926a2f94e4cad477ddfdb050c17d9c133405bec28a5f764  ./.cache/lapsim/races/2024-shanghai-race.json
162798a21d5ffe465a9cdfbf17981753217341a6d2f9d68c6e45da861d6c6b31  ./.cache/lapsim/races/2024-shanghai-sprint.json
4b039f7e88d980e196f7bd1d67cfcfd1f62c22a12c3d0f3155dc21cfc4c09d33  ./.cache/lapsim/races/2024-silverstone-race.json
762a9ef3375556ac819265f6660fa5d6115f755eda73f03b4566c6def89e2eb2  ./.cache/lapsim/races/2024-singapore-race.json
67b736dd3d746351b2ffea967dbb320debf599749073661f27e845c04ee006d4  ./.cache/lapsim/races/2024-spa-francorchamps-race.json
6725537f122a722a7c4b4f1ea62dce47b7196899fd94f137268a62326d25fa59  ./.cache/lapsim/races/2024-spielberg-race.json
d64ff1e407f98a950a8fd518f0977b1940a02660e0ab6cd1290dca94707c457a  ./.cache/lapsim/races/2024-spielberg-sprint.json
26b0631c11b26a1f5333a526766f69ae69e5ae3745de2a62bff88fb39d2793fc  ./.cache/lapsim/races/2024-suzuka-race.json
84e76e602b67a677f2b97aeee31c439a673a8370bbc691e75eaf7cbe8b1ab2df  ./.cache/lapsim/races/2024-yas-marina-circuit-race.json
3407a2331e0e6902b797d8c3210360c8f344073b42ff29f0e21ab22665bcbeaf  ./.cache/lapsim/races/2024-zandvoort-race.json
4ed0a4fac89f6e085d551f84f86ef77ebdf0aa426140e17d90c689a2f8a726b3  ./.cache/lapsim/races/2025-austin-race.json
9d215c267c4607dd18abe8d37c8ff5e59f75e721b99616767f0620db44c7d7fc  ./.cache/lapsim/races/2025-austin-sprint.json
da82dca9eb1d6a0a6ccd14f66f03cb81f48ed91856aaa7a47b0c62c3d9504f8a  ./.cache/lapsim/races/2025-baku-race.json
821aa200f6d6052a60d36df14308b99a169270601ff6895db9aa801eeaf2472b  ./.cache/lapsim/races/2025-catalunya-race.json
eae15507a05e1f246044219b509cd9baa2d47cfde2cbaf2a0aee79dd041f4aaa  ./.cache/lapsim/races/2025-hungaroring-race.json
f7fea9e34b6f2945c5a5746ac7d5cc348c89f97d349412e0d6ecbd13de2547b6  ./.cache/lapsim/races/2025-imola-race.json
43cfb996fc8bd45956f5e982e3bdfbb92f86ecb8896ea13d466495c65c868ca7  ./.cache/lapsim/races/2025-interlagos-race.json
91ae00f15f3b366d87db03f2ed83b149b2d2fea2f047d029ec7e6545857efeba  ./.cache/lapsim/races/2025-interlagos-sprint.json
b54bed6543040d3fd3983ec8bc8611abd6aaf8735de33f846011b900cde3fb9d  ./.cache/lapsim/races/2025-jeddah-race.json
7f0739a91b0936a0ac28db0fb33b0a648154dcb9142efb370c8fd937632b8efa  ./.cache/lapsim/races/2025-las-vegas-race.json
6f33ea7eba4311c60106f8e52a43b21842f8155ae87ac4d08902f834fa2e4701  ./.cache/lapsim/races/2025-lusail-race.json
b17934c39311a4f13c8d1610d29d85feeb5204f371d87584c8452841be0be4fb  ./.cache/lapsim/races/2025-lusail-sprint.json
c52770b25bce16e963b59eed83cb87387affa4385d59da87d48bdfcb28582ac1  ./.cache/lapsim/races/2025-melbourne-race.json
349ae773ad72ccdd68317283a21296c7906ad4effb1a664ca2b1c2deaad487d6  ./.cache/lapsim/races/2025-mexico-city-race.json
ad52c08f0bce1957b841bda79f8434c25f68691fa8dbe6e4442fbd36100b1c71  ./.cache/lapsim/races/2025-miami-race.json
d33f3cd5cf4404ab9217ce6d3e77ebe30d6997fac7801e2b9b42059424eb6235  ./.cache/lapsim/races/2025-miami-sprint.json
09570d4e020eda5aad5c7887eecd4502748397d6b37cc52d54a3108f2a23b4b1  ./.cache/lapsim/races/2025-monte-carlo-race.json
a75dd56d9c97a4026a9d94c648200284727672a8823aa75f55dd47a084b94856  ./.cache/lapsim/races/2025-montreal-race.json
b8fcea5d436430267baf34d4db5994912a9ba2ebf6ff1a89dfe28a8ddd765d4e  ./.cache/lapsim/races/2025-monza-race.json
0a0d9cb1e9dfd4cf26129a3f7201f66bd1e8e77948daeb1609cb6ccff8a3eac8  ./.cache/lapsim/races/2025-sakhir-race.json
d072d1dd785f605880922d54415950e79648452d3d6f37924506aeef850ece26  ./.cache/lapsim/races/2025-shanghai-race.json
96b6c1fcf1a02e8b04d39bf2647ff280de7af1091e6dc4c30fb3f0ae2f0293ec  ./.cache/lapsim/races/2025-shanghai-sprint.json
cf285780aa01aa16b3bfcd6bc724cd6e9e583783ec2291a54f7e4c10c86bf496  ./.cache/lapsim/races/2025-silverstone-race.json
b8b4f8b9c7637ccdfc683b7e92066bdc5cee9bad3908fdf865b85cced0fa5c78  ./.cache/lapsim/races/2025-singapore-race.json
dd7b31aa537a92f3f599fa7bc1a633f0b424b798dbe68741d79c724f08550430  ./.cache/lapsim/races/2025-spa-francorchamps-race.json
c359efcdd818fad99b79cef1f5f795665d56a682d23ccd561c8ad1131ad8ff33  ./.cache/lapsim/races/2025-spa-francorchamps-sprint.json
0818d10957df3168b70c791b842121b18c9c929abc78f2468ae44db0c4c12f24  ./.cache/lapsim/races/2025-spielberg-race.json
2b8994249028708bfc3a7163bf554aa912ed0094b600d92148e064b6152e0430  ./.cache/lapsim/races/2025-suzuka-race.json
30745f821135219cf0a3f8373a5337ea7d1bd9c95f52755946a1a5941e4d5f61  ./.cache/lapsim/races/2025-yas-marina-circuit-race.json
9bfe4506d17cba259d3079bfa03815891c20b1487e4226b7afd2d10199e7a38a  ./.cache/lapsim/races/2025-zandvoort-race.json
c3e647948200bc4831773f8e3cd27de081a7cd9c6b1a7c85c0075574985688cc  ./.cache/lapsim/races/2026-austin-race.json
f90559d8266f7099f0b486841127ae86ea5c4985e90f804fd060c8f66895f16c  ./.cache/lapsim/races/2026-baku-race.json
69ed92d8b8d3aa3d8e9cbc31f4f4710c16efd939a05377aba25b892dc5c223de  ./.cache/lapsim/races/2026-catalunya-race.json
2a2c743d95243442d02556a7202d431f115c676c92f76478de1b10b10e005375  ./.cache/lapsim/races/2026-hungaroring-race.json
cc7cb006d6c8f170917335b6fd3135fa0da7d4f9131b71b3f54cc5d4bab2eeac  ./.cache/lapsim/races/2026-interlagos-race.json
76e405e23553feebafa4b05ce682340b67908c2fa9da2b56019f9d737c6ab85b  ./.cache/lapsim/races/2026-kuala-lumpur-race.json
cbf32402e8f080975f088344b2cdaccb1e5fbb80366a3652dffb59831a4b11e0  ./.cache/lapsim/races/2026-las-vegas-race.json
f8e369e3d156d297c616bf0bf4a5142bd0994a54d1f6c50941b63ad774692d5f  ./.cache/lapsim/races/2026-madring-race.json
ff622b293812d7851b856502c23c9804559be55bf82b65c30b982358f2d94751  ./.cache/lapsim/races/2026-melbourne-race.json
a9ede38325ff28b9affbe99c1fb1259a84647887f0e233fa6dae20079e1f4049  ./.cache/lapsim/races/2026-mexico-city-race.json
470933160324b2f4d033df5fb584973b4e394b77a7694071947e7913ccaff379  ./.cache/lapsim/races/2026-miami-race.json
1b58afb4919bc7b8ef144de6ea8db9e1dc4cc1c15e3e32ad44f7189021b5eb09  ./.cache/lapsim/races/2026-miami-sprint.json
3a25890158b08f461d24bd081008a23d850cb68ab8e25620502bd9c81e830451  ./.cache/lapsim/races/2026-monte-carlo-race.json
97ea8bda6993fff50470add95c11a083ac278538ac61b8b06b021bc15891cf28  ./.cache/lapsim/races/2026-montreal-race.json
331c70d93d4dbcd5ef3b3754bc439012c24607ca54d34d4fedd530b4ef75d43d  ./.cache/lapsim/races/2026-montreal-sprint.json
da5518fb58fb50adfc36a79604a5561d9979832165a12a64e98e148655540d39  ./.cache/lapsim/races/2026-monza-race.json
3ec6889f577541953fe3a0e3c0e542c54642267835f0f2e5ebf8073d2e77bef6  ./.cache/lapsim/races/2026-shanghai-race.json
e2583973ad308c9c18a4b3fc086e50f2a34f1976f16f7a96e6440e071867071b  ./.cache/lapsim/races/2026-shanghai-sprint.json
016155091da2e7f3eb92e16f65e50cd087b453af9b9a09372bfe933e2d12ffb2  ./.cache/lapsim/races/2026-silverstone-race.json
a9a43df96c33c09f36d10a2f6d04c5b8755cef8e3eb09b89f567eeec803fe990  ./.cache/lapsim/races/2026-silverstone-sprint.json
edffb48fbf24b3ad4032781136df46f5d5b6e288dbe66765bc1f4aae973fd6ce  ./.cache/lapsim/races/2026-singapore-race.json
a76b68b58914e904bf5c2a09c6a60dae0e6c8598f9a27ed7bc9a5a6d92be052a  ./.cache/lapsim/races/2026-singapore-sprint.json
bba82a3c0a1951f071e78cd9563a3cfda7067cd1e4c25f46496fd3fcdb36139e  ./.cache/lapsim/races/2026-spa-francorchamps-race.json
7b0592bbf468f38f53be40dfebf2a99e4e1c47031fb5a42c7a4d335b1c4b4fcb  ./.cache/lapsim/races/2026-spielberg-race.json
3cb7e4e6e19014cecbfe41dfe7cee50f4b04c649254135737a4e24b57686c6f6  ./.cache/lapsim/races/2026-suzuka-race.json
d300438c91236ff65019c6994ef5d90e5ccfbf32260000d8265298b97ac050c2  ./.cache/lapsim/races/2026-zandvoort-race.json
3aa103ae4ebd40e4d4628ff9d82df71e6349a997560609ef5e298d4a72eca8e2  ./.cache/lapsim/races/2026-zandvoort-sprint.json
48f8fbd7f83fe12ff089caf276c76886dabaa541cf9788f59cf1733f37cad491  ./.cache/lapsim/sessions/2023-austin.json
1c0f56bcc467564f4f475096edbf9517c94328ffa264068cbdc0579026879dd4  ./.cache/lapsim/sessions/2023-baku.json
659e2639d0062f88ec6660aa0d9cae1c87cd0a9bb4adf6402ea8d6459792688d  ./.cache/lapsim/sessions/2023-catalunya.json
82e78e7ab6ded24650c4f50787814465cdb2a7b97d2a27b3777953bcac4fa170  ./.cache/lapsim/sessions/2023-hungaroring.json
1fe185f27718ebd93e03555c8f39fca6cb7cfe23c9b2602431b56d2872595c36  ./.cache/lapsim/sessions/2023-interlagos.json
7e301058dcc29bac62706c2289679847d8b14f8f0b9d65c612c87f8586ed4717  ./.cache/lapsim/sessions/2023-jeddah.json
00be332774fdcc86d9c7b34d35fa04fae2f39103d4d547868f134a4bac54edbf  ./.cache/lapsim/sessions/2023-las-vegas.json
0a8c27dae50624c85ca12cbb27863d5bd2f5c07a5886c049aaeaecbc72ff2207  ./.cache/lapsim/sessions/2023-lusail.json
2e4a2916abe512b8f9ceb800a4160e08bbe70dbc9a98ef8e9c6cadd4e9342bb3  ./.cache/lapsim/sessions/2023-melbourne.json
e5cd75edac8a3a032283c785102724f3558f3f66852a9a33a0fd242a1d755a7f  ./.cache/lapsim/sessions/2023-mexico-city.json
e46b201a0aaafa41d21de103a7564eb7d24684097124bebf04d8456de9cb3f46  ./.cache/lapsim/sessions/2023-miami.json
f8ffd9b6e406f288cca876d23de039935190283bc643cd86ee7f7710a9008bd4  ./.cache/lapsim/sessions/2023-monte-carlo.json
4b785086af40f8c34e953aea4c0050e1955c4c618101e808829e5a1c524616bf  ./.cache/lapsim/sessions/2023-montreal.json
be99f341a4feb9da81ee72b81a3f39bd8614215f89429ebb2f07808547879054  ./.cache/lapsim/sessions/2023-monza.json
a3d55284fb6e3624bbd809450aec60b86944666acddd6c2325d834d04b0ffbe2  ./.cache/lapsim/sessions/2023-sakhir.json
b01b8f889990933229b37983f5d7fe13b31731f2766cc7c246cf7240fc538c92  ./.cache/lapsim/sessions/2023-silverstone.json
31d696df384a739ecc40286bbc9b668d5ddfc0e25d31ded219b340a4927254c3  ./.cache/lapsim/sessions/2023-singapore.json
1c68dd92d22a0b9efa56584cd51864d5df66206bd0a9fe17a433c663150ef087  ./.cache/lapsim/sessions/2023-spa-francorchamps.json
a56f2cf352989adc38e1cfa685d054292b7984ac111d95c16f10aa1c85283213  ./.cache/lapsim/sessions/2023-spielberg.json
7f0f4f5e218da479fa0cc9b766079de23bf854dd5dc39e868f3f8cb8e2a25b29  ./.cache/lapsim/sessions/2023-suzuka.json
d7ba0929d5179d26034033981e618a806fbe69608431c8ef27219af0ac45a6d7  ./.cache/lapsim/sessions/2023-yas-marina-circuit.json
7894283de651bf74d464b3d5a13f40f6469a4c1cd70cf65888ecc2c3d9c5fdb1  ./.cache/lapsim/sessions/2023-zandvoort.json
fd7d95a5f20f28dbed38a21a6f879027106c40a6910325482aa9c245bcb58d6b  ./.cache/lapsim/sessions/2024-austin.json
fa79c08a919c38919f2dca927045561ae71d36f2e49c5cffafc63b37bae2df22  ./.cache/lapsim/sessions/2024-baku.json
37021901e1728a753d3a176bb58b732e72311c162c3662cdf1cce2b615302e2c  ./.cache/lapsim/sessions/2024-catalunya.json
98958d12f00a2d07c7353309a0f5d2e1df52cb53fb992d070297c844e628994f  ./.cache/lapsim/sessions/2024-hungaroring.json
11339fc69dcbd58b752fade9366d8293140f668758ccffb22bc77bcaaad3c1ca  ./.cache/lapsim/sessions/2024-imola.json
1b084c64c38ff5a61a124a5a9148882c7166e992c31ab49f66266e3045121cb6  ./.cache/lapsim/sessions/2024-interlagos.json
311f813c0a8842f7c10613cc5f93b54e38d15460b15c327b766c2334b9ff9f68  ./.cache/lapsim/sessions/2024-jeddah.json
d2c03c4a987d36186da462479e97f5b4f99d1f3c027c8365c701b5057b32c685  ./.cache/lapsim/sessions/2024-las-vegas.json
937b7e586394e33fa4406f507078a5bd67ff86c178adbe1d7f1ec282dee74a83  ./.cache/lapsim/sessions/2024-lusail.json
70b949fa9a83322d7709b817f0f3475047699e08272b0f8a353cf49e881f88f2  ./.cache/lapsim/sessions/2024-melbourne.json
c446f2451e00ece6bb7a9605531fa52642bf99411c5cbec31b6f19e875504c2e  ./.cache/lapsim/sessions/2024-mexico-city.json
c95fe1cff5369e36af3079149852fdc10ff01f01bb4bdd8b58b86cefbd6dac32  ./.cache/lapsim/sessions/2024-miami.json
20a07f3daef5756eff69f0af1a367c9af69307c94b36245370f8011e95abc1ea  ./.cache/lapsim/sessions/2024-monte-carlo.json
f96a87c1d211b52c801a8f23d556a14d2967982351e27aabe7437c822c403f83  ./.cache/lapsim/sessions/2024-montreal.json
d8436c432f03793e313d513795b430b3a11024da512fa6683826ddd32354a801  ./.cache/lapsim/sessions/2024-monza.json
ea9720c41d4ab69f0f88369ad171f973739c1acaacec6a794e6d670ffed5d115  ./.cache/lapsim/sessions/2024-sakhir.json
2a8b45d1515a650c72f7f9f641dcb97e51b7baac4229ce6c55659d3910b71977  ./.cache/lapsim/sessions/2024-shanghai.json
d74f7c23fd03633281b79e6be8111eaab6a2840f3229c5663df771cacbe7e77f  ./.cache/lapsim/sessions/2024-silverstone.json
19a5e5b5c8903fee292365740f3271a5f9b2f7b74803744a6c7caf921288dd89  ./.cache/lapsim/sessions/2024-singapore.json
a5f584edbfa744a5a426a1795129737ed03346e9412c5881756b68eae2d6dbb4  ./.cache/lapsim/sessions/2024-spa-francorchamps.json
c27fa41d7262baa75d90468f936b0f76699b927f97056e1439d4de7a71a551e8  ./.cache/lapsim/sessions/2024-spielberg.json
f4a92cca1e33f66f71ec112ddd364673e94c92ad2ff91dc8cd139ced45201786  ./.cache/lapsim/sessions/2024-suzuka.json
bb5d731d9a89607449988b9e78f6906c4ed00f56502203a8c3a4d1ab4a7429d0  ./.cache/lapsim/sessions/2024-yas-marina-circuit.json
a19f4adc3e2d39592f93c536024771c7496e4a62543f2688b129c224fff75bf4  ./.cache/lapsim/sessions/2024-zandvoort.json
e58416f8cdf1ccdaaaa98a3c660e34b08de7e1c7a4a1f3cd5dc8c4a039da2314  ./.cache/lapsim/sessions/2025-austin.json
070747f25c8b541744f33a753073f94d5a483cc7cec52c08d841c3d432360cd8  ./.cache/lapsim/sessions/2025-catalunya.json
40923efac75df129a99dcaaaaa7d0e2c54513c8ae925451c42144914f55466c2  ./.cache/lapsim/sessions/2025-hungaroring.json
10c0a57e8716712636c27022e118e85905d2608ff073d26a79f23583224a67d8  ./.cache/lapsim/sessions/2025-imola.json
50d82ed592919cc101d4d92a9995132effcd97a2d36281c42570f4f568f852c6  ./.cache/lapsim/sessions/2025-interlagos.json
502a02c7a532a557b78e9395759ea3da9288cae202525944f7ae168ca0cfc432  ./.cache/lapsim/sessions/2025-jeddah.json
4dc8425078fbf7dc03a3ee5f6526479abca8d52e3f99275a79d165d913c4e944  ./.cache/lapsim/sessions/2025-las-vegas.json
d16246dbb6f67a190910ae29cdec169191cb9eccde6a1e359098817c37aab697  ./.cache/lapsim/sessions/2025-lusail.json
dffcf901f81073e67d21bb53793c3d0898c7280ab04020126ce401da040ab06d  ./.cache/lapsim/sessions/2025-melbourne.json
b69cc7eeeff33a1491b142ae888f01c4cf1bf4b5ad89739231674d1c0c838bcb  ./.cache/lapsim/sessions/2025-mexico-city.json
333c6c8aee2ad2149255f412752a56b67e358566ca8a2b45c8da9d7cf7f91579  ./.cache/lapsim/sessions/2025-miami.json
90bc6ac6eb66bb8d765e8d7f5b3f2be1427dad4edc287e4d021505783053e0dc  ./.cache/lapsim/sessions/2025-monte-carlo.json
a4f2a8fed1f524a1cb471ef9b99d5db716fa05df550fb17174f9ac6fb05b2e0a  ./.cache/lapsim/sessions/2025-montreal.json
b52d7c727299cf8af68e179d0b2df1716767ea34b15d9e086cd5afbf288acaf6  ./.cache/lapsim/sessions/2025-monza.json
8ad87b6cfacf5ad3efd5cdff4c52bc7d708d6e3772c821a10135184053e70211  ./.cache/lapsim/sessions/2025-sakhir.json
56eb3bfe1e74307dc14104362cc09d10055ad5fd06883d2a2217d4b91e226a27  ./.cache/lapsim/sessions/2025-shanghai.json
f681a82ef250eb4a8ce1827870ccdc3fc57e3875803cc0fa60f59540bd3123f4  ./.cache/lapsim/sessions/2025-silverstone.json
3a0affaa8425ea104a28a188190dafde73f8a55b4d476ccd3c8deb3b4d3cfcc4  ./.cache/lapsim/sessions/2025-singapore.json
85274fb77a52269793ec8354f62c3cc324c847bcf02b26d28d9f50a099ad0719  ./.cache/lapsim/sessions/2025-spa-francorchamps.json
0ff853aba97094e7f4200ae5d3b63dac55e9ac6623636d4a282a246e910825bb  ./.cache/lapsim/sessions/2025-spielberg.json
1492219999b3e73c145c7193a71cf86f40b8b8cf56365a3219ce1906355b87ff  ./.cache/lapsim/sessions/2025-suzuka.json
83eb4155d58ef8d6607b472fa2a7651a554e7ed2d3d35d7cb367392190aa3826  ./.cache/lapsim/sessions/2025-yas-marina-circuit.json
e60fac69011b308c01d32c1ed22cd11a21b5a756cf0745d34772b3d7a55e0164  ./.cache/lapsim/sessions/2025-zandvoort.json
cc819a91a45f3d967f5824fcc901e234c649a419ef599548f677a6db77d8bc2f  ./.cache/lapsim/sessions/2026-austin.json
1319453aae55b6278ca93d68d301a0f037dfe1843aa4aca7a645327c05da1f50  ./.cache/lapsim/sessions/2026-baku.json
bad9edba2c762be31a86c17169e80b198738905fd2127be0c24baa407b1f562d  ./.cache/lapsim/sessions/2026-catalunya.json
68db8933ab37f5e6cbeecfcb504b5147ab3c1a192136f803505e67f76eb9b446  ./.cache/lapsim/sessions/2026-hungaroring.json
58b55d14372bdc4315926ae68f02ff4b08c6de7729b398492a92f1764a21b5e3  ./.cache/lapsim/sessions/2026-interlagos.json
07bd6f6c5801db2baf3de0aa4fdffe0bc5ec91d6c7884d49e9a0ccf4ce76bcf1  ./.cache/lapsim/sessions/2026-kuala-lumpur.json
a6b0771614ce7a09163c1f3b9ea001764e86f62a2dda34f9ad9fac8e8ad73173  ./.cache/lapsim/sessions/2026-las-vegas.json
b6dc298f768d3b1b6431c3be5fa4b579f2d353c4d757ea31946c31dfd8672ee9  ./.cache/lapsim/sessions/2026-madring.json
8c08036f2be0a761d122cdb48b15a58273089a6491c4fd2e482595f542f625ca  ./.cache/lapsim/sessions/2026-melbourne.json
3f64e9aecd3682a8dba16fe845fdfd1ab875dc451d7570c03ad8a530db55c1b1  ./.cache/lapsim/sessions/2026-mexico-city.json
5c079a5b110db158ecaffee917673c131318b7a2daee6eb08a8e2a1dcd2b4a32  ./.cache/lapsim/sessions/2026-miami.json
1e82e7274dd02211a47d70367fec20bc63787150c548a4041f47a050261ed1d6  ./.cache/lapsim/sessions/2026-monte-carlo.json
1a524a7146ca7577545ce2fd8013a04200e49c7e3f2badf09b122202d8c63449  ./.cache/lapsim/sessions/2026-montreal.json
c5b6194fa2c33a4cb77b2f9682c5bd4df63baeb2feb005aa937f6fd58d58783c  ./.cache/lapsim/sessions/2026-monza.json
960652d63f52323f72849dca9f260eaf309a55d32202d1b3ca7a6b5a17d6449c  ./.cache/lapsim/sessions/2026-shanghai.json
4fc35c688e2c6cb4a2a4110d6271d529b71c8b6ce701ae30c72fb3c32f03b25a  ./.cache/lapsim/sessions/2026-silverstone.json
1d008f2f57141e8173230a290986d1264a542d47b55cb7365f61afacc8359490  ./.cache/lapsim/sessions/2026-singapore.json
4549ba16450b94100a822a3df388dfad25288ca5b5480786b361940e6bff49fe  ./.cache/lapsim/sessions/2026-spa-francorchamps.json
8bb3799b0d8498cf0e63c3e05c555551cbf047b162aa549bcfdc3afcbcfdc9fa  ./.cache/lapsim/sessions/2026-spielberg.json
6d81f2a4dcd1eea5d5ad2466fbbeb7827f7db6a6ec7bde483008161f674b9f4c  ./.cache/lapsim/sessions/2026-suzuka.json
5e85b6b7573e21e2f0d6bdcc282b3d16041ba5da0c1d512084cc787821936a2f  ./.cache/lapsim/sessions/2026-zandvoort.json
652acf668ea2d10c7fdcebd6b0f01b5b4c3cab4e13b9138a070a36616082d9d3  ./.cache/lapsim/traces.json
321bddb688a03589cc62bc912b959188b00479f0a92a36ad5f02f2d9a418c187  ./.cache/lapsim/tracks-built.mjs
89904c781f91bb360f1aa4b5569b61f3cb869dd72388c4574f0286282dd0b733  ./.cache/lapsim/wec.json
7395a69b43e357982fd6a8bbc62b41494026e65b3545bea8df67c9007800c845  ./worker/lapsim/wec-poles-data.js
```
