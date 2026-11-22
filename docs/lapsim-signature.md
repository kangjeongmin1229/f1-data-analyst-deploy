# Residual signature (model vs measured F1 pole laps)

Built by `scripts/sim/residual-signature.mjs` on 2026-11-22 (AGENTS.md Gate G v3.1, item 6). Median over tracks of the
per-track median. Corner and decel are model / measured; straight is model − measured km/h; brake is model − measured metres
(+ = model brakes later). A physics change reports this table before and after; no part may get worse beyond its own noise.
Limits: measured pole telemetry is about 7.5 Hz, so its corner minima read a little high (B1: about +1.3 km/h on the model side) and its
peak deceleration reads low (a short peak falls between samples): decel ratios above 1 are partly sampling. F1 brake is on/off, so brake
onset is the first sample with the brake on.

| Season | Tracks | Corner min < 120 / 120–180 / 180–240 / ≥ 240 km/h | End-of-straight Δ < 400 / 400–800 / ≥ 800 m | Brake onset Δ (m) | Peak decel 150–250 / ≥ 250 km/h |
|---|---|---|---|---|---|
| 2025 | 23 | 0.945 / 0.886 / 0.874 / 0.977 | 3.7 / -3.9 / -5.3 | 2 | 1.343 / 1.242 |
| 2026 | 21 | 0.964 / 0.881 / 0.833 / 0.828 | 13.9 / -2.2 / 0.2 | -6 | 1.363 / 1.239 |
