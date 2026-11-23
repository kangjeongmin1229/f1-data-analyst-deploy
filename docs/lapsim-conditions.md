# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-23 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0197 | -0.0371 … -0.0008 | 0.05 |
| all | air temperature (°C) | 68 | -0.0392 | -0.0683 … -0.0102 | 0.08 |
| all | wind (m/s) | 68 | 0.0687 | -0.1329 … 0.2405 | 0.01 |
| all | humidity (%) | 68 | 0.0003 | -0.0106 … 0.0103 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0026 | -0.0015 … 0.0107 | 0.02 |
| f1 | track temperature (°C) | 35 | -0.0137 | -0.0431 … 0.0138 | 0.02 |
| f1 | air temperature (°C) | 35 | -0.0216 | -0.0598 … 0.0173 | 0.02 |
| f1 | wind (m/s) | 35 | 0.1617 | -0.0402 … 0.3658 | 0.05 |
| f1 | humidity (%) | 35 | -0.0087 | -0.0229 … 0.0056 | 0.03 |
| f1 | air pressure (hPa) | 35 | -0.0005 | -0.0044 … 0.0087 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0213 | -0.0533 … 0.0036 | 0.06 |
| wec | air temperature (°C) | 33 | -0.0479 | -0.1108 … -0.0074 | 0.13 |
| wec | wind (m/s) | 33 | -0.0124 | -0.4209 … 0.2527 | 0.00 |
| wec | humidity (%) | 33 | 0.0088 | -0.0068 … 0.0236 | 0.02 |
| wec | air pressure (hPa) | 33 | 0.0126 | 0.0026 … 0.0191 | 0.16 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
