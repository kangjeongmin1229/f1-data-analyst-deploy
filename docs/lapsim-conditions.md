# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-24 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0195 | -0.0367 … -0.0011 | 0.05 |
| all | air temperature (°C) | 68 | -0.0386 | -0.0674 … -0.0100 | 0.08 |
| all | wind (m/s) | 68 | 0.0605 | -0.1450 … 0.2338 | 0.01 |
| all | humidity (%) | 68 | -0.0004 | -0.0114 … 0.0098 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0026 | -0.0010 … 0.0105 | 0.02 |
| f1 | track temperature (°C) | 35 | -0.0138 | -0.0422 … 0.0115 | 0.02 |
| f1 | air temperature (°C) | 35 | -0.0207 | -0.0579 … 0.0183 | 0.02 |
| f1 | wind (m/s) | 35 | 0.1443 | -0.0585 … 0.3560 | 0.04 |
| f1 | humidity (%) | 35 | -0.0099 | -0.0241 … 0.0044 | 0.04 |
| f1 | air pressure (hPa) | 35 | -0.0004 | -0.0036 … 0.0079 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0213 | -0.0533 … 0.0036 | 0.06 |
| wec | air temperature (°C) | 33 | -0.0479 | -0.1108 … -0.0074 | 0.13 |
| wec | wind (m/s) | 33 | -0.0124 | -0.4209 … 0.2527 | 0.00 |
| wec | humidity (%) | 33 | 0.0088 | -0.0068 … 0.0236 | 0.02 |
| wec | air pressure (hPa) | 33 | 0.0126 | 0.0026 … 0.0191 | 0.16 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
