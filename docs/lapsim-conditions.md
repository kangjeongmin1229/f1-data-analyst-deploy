# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-23 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0357 | -0.0551 … -0.0159 | 0.11 |
| all | air temperature (°C) | 68 | -0.0709 | -0.1019 … -0.0422 | 0.19 |
| all | wind (m/s) | 68 | 0.1519 | -0.1004 … 0.3723 | 0.02 |
| all | humidity (%) | 68 | 0.0025 | -0.0096 … 0.0141 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0035 | -0.0011 … 0.0131 | 0.02 |
| f1 | track temperature (°C) | 35 | -0.0137 | -0.0431 … 0.0138 | 0.02 |
| f1 | air temperature (°C) | 35 | -0.0216 | -0.0598 … 0.0173 | 0.02 |
| f1 | wind (m/s) | 35 | 0.1617 | -0.0402 … 0.3658 | 0.05 |
| f1 | humidity (%) | 35 | -0.0087 | -0.0229 … 0.0056 | 0.03 |
| f1 | air pressure (hPa) | 35 | -0.0005 | -0.0044 … 0.0087 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0450 | -0.0757 … -0.0211 | 0.16 |
| wec | air temperature (°C) | 33 | -0.0976 | -0.1603 … -0.0599 | 0.30 |
| wec | wind (m/s) | 33 | 0.1610 | -0.3802 … 0.4999 | 0.02 |
| wec | humidity (%) | 33 | 0.0127 | -0.0068 … 0.0326 | 0.03 |
| wec | air pressure (hPa) | 33 | 0.0165 | 0.0023 … 0.0256 | 0.15 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
