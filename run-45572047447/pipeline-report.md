# LapSim pipeline report — run 45572047447

Mode: **research** (not a production number) · repo kangjeongmin1229/f1-data-analyst-deploy · commit `2f262f42a3085b94d97b4ccc4f6969b1df4061c3` · snapshot `lapsim-inputs-r45123509702` (sha256 `88fbb3bceb4519c73371941e0faa2f8aee85b4f27f15109b5a13f5a0863823ca`) · generated 2026-11-25T08:44:29.635Z

Fit settings (.github/lapsim-fit.env): LAPSIM_FIA_ZONES=on, LAPSIM_PU_QUALI=on, LAPSIM_PU_RAMP=on, LAPSIM_BRAKE_ENV_HYPER=8.63,0.003234, LAPSIM_TRACE_MASK=1. Seeds: fit: none (deterministic Nelder–Mead / BCD); condition-report bootstrap seed 7; gate.mjs sign-flip / bootstrap seed 1.

Fit job: failure.

## Held-out lap error (RMS %, shipped → this run)

| group | n | shipped | this run |
|---|---|---|---|
| all | 68 | 0.901 | 0.915 |
| f1 | 35 | 0.823 | 0.836 |
| wec | 33 | 0.977 | 0.992 |
| f1/2025 | 20 | 0.734 | 0.791 |
| f1/2026 | 15 | 0.93 | 0.892 |
| wec-lmh/2025 | 5 | 0.667 | 0.658 |
| wec-lmh/2026 | 6 | 1.084 | 1.145 |
| wec-lmdh/2025 | 5 | 0.811 | 0.844 |
| wec-lmdh/2026 | 6 | 0.893 | 0.928 |
| wec-lmgt3/2025 | 5 | 1.281 | 1.236 |
| wec-lmgt3/2026 | 6 | 0.994 | 1.008 |

Ship rule (paired harm per held-out track/event vs shipped, one-sided 95 % UB ≤ 0.10 pp, no row worse than +1.0 pp): f1 n 35, mean 0.0312 pp, UB 0.1026 pp, worse 17, worst row +0.7197 pp → FAIL; wec n 33, mean 0.0112 pp, UB 0.0588 pp, worse 16, worst row +0.3984 pp → PASS.

WEC per class (paired harm, all seasons of the class):

| class | n | mean pp | UB pp | worse | worst pp | rows > +1.0 pp | pass |
|---|---|---|---|---|---|---|---|
| wec-lmh | 11 | 0.0178 | 0.1157 | 5 | 0.3984 | 0 | FAIL |
| wec-lmdh | 11 | 0.0438 | 0.1389 | 6 | 0.3745 | 0 | FAIL |
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

Ships per series: f1 **blocked (keeps the shipped calibration)** · wec ships · fe ships.

Reproduction: **67 held-out rows and 55 car parameters differ** (tables below).

| car | param | shipped | this run |
|---|---|---|---|
| f1 2023 | muX | 1.563 | 1.595 |
| f1 2023 | muY | 1.7525 | 1.7884 |
| f1 2023 | muXTrac | 1.8472 | 1.885 |
| f1 2023 | clA | 7.2873 | 6.9842 |
| f1 2023 | cdA | 1.2686 | 1.2321 |
| f1 2023 | cdALow | 0.7614 | 0.7548 |
| f1 2023 | pIce | 482526.5472 | 476000 |
| f1 2024 | muX | 1.5501 | 1.557 |
| f1 2024 | muY | 1.738 | 1.7457 |
| f1 2024 | muXTrac | 1.8319 | 1.8401 |
| f1 2024 | cdA | 1.2029 | 1.2062 |
| f1 2024 | cdALow | 0.7717 | 0.7728 |
| f1 2025 | muX | 1.583 | 1.5884 |
| f1 2025 | muY | 1.7749 | 1.781 |
| f1 2025 | muXTrac | 1.8708 | 1.8772 |
| f1 2025 | cdA | 1.178 | 1.1728 |
| f1 2025 | cdALow | 0.79 | 0.7949 |
| f1 2026 | muX | 1.5329 | 1.4768 |
| f1 2026 | muY | 1.7187 | 1.6558 |
| f1 2026 | muXTrac | 1.8116 | 1.7453 |
| f1 2026 | clA | 6.6455 | 7.4686 |
| f1 2026 | cdA | 1.889 | 1.803 |
| f1 2026 | cdALow | 1.1394 | 1.1475 |
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
| f1/2025|monza | -0.0736 | -0.0457 |
| f1/2025|singapore | -0.4419 | -0.4195 |
| f1/2025|austin | -0.6864 | -0.6053 |
| f1/2025|mexico-city | -0.5821 | -0.4895 |
| f1/2025|yas-marina-circuit | -0.4172 | -0.3406 |
| f1/2025|jeddah | -0.4009 | -0.4273 |
| f1/2025|miami | -0.7679 | -0.7389 |
| f1/2025|catalunya | -0.3606 | -0.4053 |
| f1/2025|spa-francorchamps | -0.0845 | 0.0746 |
| f1/2025|zandvoort | 0.118 | 0.0626 |
| f1/2025|shanghai | 1.6957 | 1.8446 |
| f1/2025|monte-carlo | -0.243 | -0.0972 |
| f1/2025|spielberg | -1.0427 | -0.9645 |
| f1/2025|hungaroring | -1.0972 | -1.0335 |
| f1/2025|lusail | 1.0128 | 1.1173 |
| f1/2025|melbourne | 0.7737 | 1.2091 |
| f1/2025|suzuka | 0.1644 | 0.1782 |
| f1/2025|imola | -0.4393 | -0.446 |
| f1/2025|silverstone | 0.172 | -0.8917 |
| f1/2026|shanghai | 1.2676 | 0.5648 |
| f1/2026|spielberg | -0.3797 | -0.6428 |
| f1/2026|austin | 1.2899 | 1.3048 |
| f1/2026|mexico-city | 1.0743 | 1.1109 |
| f1/2026|miami | 0.9533 | 0.8816 |
| f1/2026|silverstone | -0.2769 | 0.8966 |
| f1/2026|baku | 0.2926 | 0.1161 |
| f1/2026|las-vegas | -0.1566 | -0.1427 |
| f1/2026|monte-carlo | -2.1082 | -1.7279 |
| f1/2026|catalunya | -1.3645 | -1.4127 |
| f1/2026|singapore | -0.7223 | -0.777 |
| f1/2026|melbourne | -0.4623 | -0.5973 |
| f1/2026|spa-francorchamps | -0.276 | -0.6631 |
| f1/2026|hungaroring | -0.2798 | -0.158 |
| f1/2026|monza | -0.3228 | -0.5062 |
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

## Level C and forward chaining (RMS %, shipped → this run)

| group | level C shipped | level C | forward shipped | forward |
|---|---|---|---|---|
| f1-2025 | 3.093 | 3.072 | 3.181 | 3.158 |
| f1-2026 | 2.695 | 2.573 | 1.302 | 1.258 |
| wec-lmh | 1.889 | 1.938 | 0.917 | 1.02 |
| wec-lmdh | 1.658 | 1.7 | 0.699 | 0.798 |
| wec-lmgt3 | 1.858 | 1.858 | 0.882 | 0.891 |
| f1 | 2.92 | 2.858 | 2.516 | 2.49 |
| wec | 1.805 | 1.835 | 0.838 | 0.908 |
| all | 2.625 | 2.584 | 2.141 | 2.128 |

FE ship rule (event-hidden paired harm per row vs shipped, build-fe.mjs on this run's kernel): n 32, mean 0 pp, UB 0.0065 pp, worse 8, worst row +0.08 pp (limit +1.0) → pass.

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

Not run.

## Δ benchmarks

- F1 DRS Δ v1 per stint (cases sha256 7b2c16ff…): 0 model rows (every case stopped on noise in step 24: no kept case)
- F1 pooled DRS Δ v2 (cases sha256 5a153cf1…): n 125, pass rate 0.008, bias -0.2767 s [-0.3018, -0.2529], sign errors 12, median pred -0.4183 s vs meas -0.1264 s; baseline CSV differs from the shipped baseline-pooled-2026-11-24.csv
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

```
ship checks (mesh, energy closure) on this run's calibration:
# tests 30
# pass 30
# fail 0
```
