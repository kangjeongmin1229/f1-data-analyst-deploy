# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-23 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0308 | -0.0487 … -0.0119 | 0.08 |
| all | air temperature (°C) | 68 | -0.0668 | -0.0966 … -0.0385 | 0.16 |
| all | wind (m/s) | 68 | 0.1204 | -0.1292 … 0.3410 | 0.01 |
| all | humidity (%) | 68 | 0.0014 | -0.0107 … 0.0131 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0035 | 0.0000 … 0.0113 | 0.02 |
| f1 | track temperature (°C) | 35 | -0.0035 | -0.0283 … 0.0226 | 0.00 |
| f1 | air temperature (°C) | 35 | -0.0054 | -0.0393 … 0.0317 | 0.00 |
| f1 | wind (m/s) | 35 | 0.1069 | -0.1182 … 0.3483 | 0.02 |
| f1 | humidity (%) | 35 | -0.0111 | -0.0263 … 0.0036 | 0.05 |
| f1 | air pressure (hPa) | 35 | 0.0003 | -0.0020 … 0.0076 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0418 | -0.0710 … -0.0186 | 0.14 |
| wec | air temperature (°C) | 33 | -0.0990 | -0.1644 … -0.0614 | 0.31 |
| wec | wind (m/s) | 33 | 0.1528 | -0.3528 … 0.4763 | 0.02 |
| wec | humidity (%) | 33 | 0.0129 | -0.0065 … 0.0326 | 0.03 |
| wec | air pressure (hPa) | 33 | 0.0139 | -0.0008 … 0.0231 | 0.11 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
