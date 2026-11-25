# Step 35 amendment A3 — Formula E speed from onboard sound (diagnostic, report only; hashed before any extraction)

Central reviews 2026-11-25 09:49 and 09:51 KST. No model change, no gate. Nothing has been extracted with this method; the stored v2 audio
(F1 half-order comb) is **not used** (seen only: it exists, 4,000–13,600 rpm range, unchecked for FE).

## Clips (fixed now)
Gen3 Evo pole laps on YouTube with a known driver, event and session (data/onboard-captures other/v2 index):
v88 Jeddah 2025 R4 (Barnard), v89 Miami 2025 (Nato), v90 Shanghai 2025 R10 (Günther), v91 London 2025 R16 (Ticktum),
y_GBKQG1YYi10 London 2025 pole, y_5GKIN5irq_E Monaco 2025 (Barnard), y_OlLNegFcUyo Tokyo 2025 (Rowland), y_lsEBPtBhhTA São Paulo 2025
(Wehrlein). The lap = that driver's fastest Qualifying Duel lap of that event (fe-duels.csv). The four Season 12 "Pure Sound" laps have no
known session → excluded from the check (tracked and reported only). Gen4: none yet; tracked separately when they exist.
Truth: the official sector times of that lap from the Al Kamel duel "Classification Practice With Analysis" PDF; if the PDF has no sector
times for the lap, the clip is "no truth" and does not count.

## Tone tracker (FE-specific, central 09:51 item 1)
- Audio mono 16 kHz; STFT 4096 samples, hop 40 ms. Search band 150–6000 Hz (inverter/motor whine and its harmonics; the engine-style
  comb is not used).
- Harmonic-sum ridge: candidate fundamental f0 in 50–1500 Hz, score = Σ_{h=1..6} log-magnitude at h·f0 (±1 bin), normalised by the
  frame's band median. The track is the dynamic-programming (Viterbi) path maximising score with a jump cost for |Δln f0| > 0.08 per hop.
- Quality per frame q = (score − median score of the frame's candidates) / MAD; a frame is tracked if q ≥ 3. Report per clip the tracked share.
- **Rear motor only (item 4):** two tone families may exist (Gen3 Evo front motor drives in duels, with its own reduction). The kept
  family is the one present (q ≥ 3) in ≥ 80 % of the lap; if both qualify, the one with the higher median q; its k is reported and the other
  family's ratio to it is reported but never used for speed. A frame where the track jumps between families (|Δln f0| > 0.15 in one hop) is
  marked lost. Gen4 (permanent AWD) is tracked and calibrated separately, never pooled with Gen3 Evo.

## Calibration and check (item 2)
- One gear ⇒ v(t) = k · f0(t). Unknowns per lap: k and the lap-start time t0 in the clip.
- **Calibrate on S1 and S2:** distance from t0 to t0 + S1 = printed I1, and to t0 + S1 + S2 = printed I2 (fe-sector-lines.json), with the
  official S1, S2 of that lap. Two equations, two unknowns (least squares over a t0 grid of 0.04 s).
- **Check on S3 (never calibrated on):** predicted S3 = time from distance I2 to the printed lap length, compared with the official S3.
  Secondary (reported only): calibrate on S2 + S3, check S1.

## Slip (item 3)
Frames where motor speed may differ from road speed are excluded and bridged by linear interpolation of v, and their time counts in a
widened error: (a) acceleration above 1.2 g (traction-limited exits; the 350 kW power limit gives < 1.2 g above about 110 km/h for 859 kg);
(b) deceleration above 2.0 g (peak regen + friction braking). Thresholds fixed now from the rules (350 kW, 859 kg); not tuned.
Error band: each excluded second adds ± 2 % of its distance to the predicted S3 distance error.

## Pass rule (item 5)
- A clip passes if |predicted S3 − official S3| ≤ σ_meas,S3 (0.69 % of S3) ⊕ its slip band, and the tracked share is ≥ 70 %.
- **Sound speed is usable for FE** if clips on **≥ 5 circuits** pass. Then, and only then, the sound speeds are used (diagnostic) to split
  grip (corner minima) from power/drag (straight-end speeds) against the model.
- Otherwise: "sound speed not usable for FE" (labelled), and the candidate (step 35 B) goes ahead with published top speeds only.

## Where it runs
YouTube audio is not reachable from the cloud session (googlevideo blocked). It runs in GitHub Actions (yt-dlp) or on the owner's PC with
the same script (`scripts/sim/learn/fe-sound-speed.py`); audio is deleted after extraction, only derived traces are kept (rule 2.9).
