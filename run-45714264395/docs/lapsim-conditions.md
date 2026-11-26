# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-25 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(86 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 86 | -0.0112 | -0.0320 … 0.0112 | 0.01 |
| all | air temperature (°C) | 86 | -0.0301 | -0.0632 … 0.0023 | 0.03 |
| all | wind (m/s) | 86 | -0.1442 | -0.3397 … 0.0344 | 0.02 |
| all | humidity (%) | 86 | 0.0110 | 0.0008 … 0.0204 | 0.03 |
| all | air pressure (hPa) | 86 | 0.0024 | -0.0011 … 0.0079 | 0.01 |
| f1 | track temperature (°C) | 53 | 0.0102 | -0.0303 … 0.0467 | 0.01 |
| f1 | air temperature (°C) | 53 | -0.0009 | -0.0699 … 0.0556 | 0.00 |
| f1 | wind (m/s) | 53 | -0.2417 | -0.4404 … -0.0478 | 0.06 |
| f1 | humidity (%) | 53 | 0.0102 | -0.0028 … 0.0232 | 0.03 |
| f1 | air pressure (hPa) | 53 | 0.0003 | -0.0036 … 0.0051 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0260 | -0.0572 … -0.0017 | 0.09 |
| wec | air temperature (°C) | 33 | -0.0531 | -0.1146 … -0.0139 | 0.15 |
| wec | wind (m/s) | 33 | -0.0138 | -0.4186 … 0.2600 | 0.00 |
| wec | humidity (%) | 33 | 0.0121 | -0.0048 … 0.0272 | 0.04 |
| wec | air pressure (hPa) | 33 | 0.0132 | 0.0036 … 0.0197 | 0.17 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
