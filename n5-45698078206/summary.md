# Step 32 N5 — run 45698078206, commit ff162598ce6eb9bdbc9752d117238dec9dbc8032
```json
{
 "rule": "docs/night/step32-n5-sharpness-rule-2026-11-26.md sha256 a7c900d5...",
 "n_rows": 1509,
 "n_tracks": 23,
 "skipped": "las-vegas",
 "sharpness_summary": {
  "0.1": 1.0234982939667254,
  "0.5": 1.099091502173855,
  "0.9": 1.345901868010459,
  "0.99": 1.7384993185394457
 },
 "sharp": {
  "coef_kph_per_sd": -8.579450472915562,
  "ci95": [
   -9.735700940370332,
   -7.423200005460791
  ],
  "loto_R2_gain_single": 0.2555469093681334,
  "sign_ok": true
 },
 "ln_sharp_report_only": {
  "coef_kph_per_sd": -9.514499356282318,
  "ci95": [
   -10.642332780299913,
   -8.386665932264723
  ],
  "loto_R2_gain_single": 0.2881923448804695,
  "sign_ok": true
 },
 "decision": "stop",
 "report_only_over_n3_set": {
  "covariates": [
   "vcurv",
   "dz_entry",
   "R_geom",
   "entry_kph",
   "lappos"
  ],
  "R2_loto_without": 0.21534832587480235,
  "R2_loto_with_sharp": 0.26900283149216775,
  "gain": 0.0536545056173654
 },
 "rows_over_6g_in_band": 136,
 "ay_raw_band": {
  "0.5": 42.60279465246915,
  "0.9": 57.65993969271606,
  "0.99": 85.13928892177779
 },
 "ols_fallbacks": 0,
 "tracks_any_apex_over_6g": [
  {
   "track": "shanghai",
   "max_ay_g": 12.640361749991646,
   "corners": [
    "T16"
   ],
   "n_laps_corners": 16,
   "worst": "T16",
   "worst_vmin": 183.52
  },
  {
   "track": "melbourne",
   "max_ay_g": 8.909718119847247,
   "corners": [
    "T6",
    "T9"
   ],
   "n_laps_corners": 42,
   "worst": "T6",
   "worst_vmin": 240.24
  },
  {
   "track": "imola",
   "max_ay_g": 8.559929871220545,
   "corners": [
    "T2",
    "T6",
    "T9"
   ],
   "n_laps_corners": 47,
   "worst": "T2",
   "worst_vmin": 184.24
  },
  {
   "track": "lusail",
   "max_ay_g": 7.734834506667905,
   "corners": [
    "T14",
    "T15",
    "T4",
    "T5"
   ],
   "n_laps_corners": 44,
   "worst": "T14",
   "worst_vmin": 278
  },
  {
   "track": "spa-francorchamps",
   "max_ay_g": 7.432214996966345,
   "corners": [
    "T10",
    "T3"
   ],
   "n_laps_corners": 4,
   "worst": "T3",
   "worst_vmin": 306.12
  },
  {
   "track": "jeddah",
   "max_ay_g": 7.4157146486577235,
   "corners": [
    "None"
   ],
   "n_laps_corners": 36,
   "worst": null,
   "worst_vmin": 200.18
  },
  {
   "track": "zandvoort",
   "max_ay_g": 6.83286155414476,
   "corners": [
    "T13",
    "T7"
   ],
   "n_laps_corners": 20,
   "worst": "T7",
   "worst_vmin": 268.01
  },
  {
   "track": "singapore",
   "max_ay_g": 6.467889901240485,
   "corners": [
    "T18"
   ],
   "n_laps_corners": 8,
   "worst": "T18",
   "worst_vmin": 221.4
  },
  {
   "track": "catalunya",
   "max_ay_g": 6.456088108642327,
   "corners": [
    "T14"
   ],
   "n_laps_corners": 16,
   "worst": "T14",
   "worst_vmin": 275
  },
  {
   "track": "spielberg",
   "max_ay_g": 6.417661757213061,
   "corners": [
    "T7"
   ],
   "n_laps_corners": 10,
   "worst": "T7",
   "worst_vmin": 233.11
  },
  {
   "track": "austin",
   "max_ay_g": 6.171907216879412,
   "corners": [
    "T19"
   ],
   "n_laps_corners": 3,
   "worst": "T19",
   "worst_vmin": 223.31
  }
 ]
}```
