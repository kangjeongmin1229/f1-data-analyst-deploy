# Step 34a — power check on the base: NOT JUDGEABLE (run 45557705662)

Base run **45557705662** (fork, research, wec_only=yes; branch s34a/base-2026-11-25 @ 1e32d00 = A5 build on REGEN FIX 2 2512d18).
Rule: A5 §5 / r1 §5, fixed before the numbers (script power34a.mjs, sha256 1ff48019…; r1's "r_k²" read as per-track sector RMS).

| check | value | limit | result |
|---|---|---|---|
| sector MDE = 1.84·SD/√n, n = 6 tracks with sector lines (54 values) | 0.319 pp (base sector RMS 1.014 %, SD 0.425) | ≤ 0.101 pp (10 %) | not judgeable |
| trap bias 95 % half-width, LMH (n 11) | 13.97 km/h (bias −0.15) | ≤ 2 | not resolvable |
| trap bias 95 % half-width, LMDh (n 11) | 13.23 km/h (bias −0.07) | ≤ 2 | not resolvable |
| trap bias 95 % half-width, LMGT3 (n 11) | 5.86 km/h (bias −0.67) | ≤ 2 | not resolvable |

Outcome: V (s34a/v-2026-11-25) not dispatched; no attempt spent. n needed for the sector rule at this spread: ≈ 60 tracks.

Base diagnostics (report-only, same run): WEC held-out 0.977 % (shipped) → 1.774 %; F1 rows identical (0.823 %). Every base car has ClA
at its upper bound (Hypercar 7.0 in all 4 class-seasons, LMGT3 3.5 in both). Held-out errors share their sign across classes per track
(Lusail +3.3…+3.6 %, Interlagos −1.8…−2.8 %, Sakhir −1.9…−2.4 %): a track-level term, not a class car. The fit/rebuild job's Test step
failed (report job ran; see status doc).
