# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-23 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0191 | -0.0364 … 0.0003 | 0.04 |
| all | air temperature (°C) | 68 | -0.0389 | -0.0682 … -0.0096 | 0.07 |
| all | wind (m/s) | 68 | 0.0519 | -0.1670 … 0.2420 | 0.00 |
| all | humidity (%) | 68 | -0.0007 | -0.0119 … 0.0097 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0032 | 0.0003 … 0.0100 | 0.02 |
| f1 | track temperature (°C) | 35 | -0.0035 | -0.0283 … 0.0226 | 0.00 |
| f1 | air temperature (°C) | 35 | -0.0054 | -0.0393 … 0.0317 | 0.00 |
| f1 | wind (m/s) | 35 | 0.1069 | -0.1182 … 0.3483 | 0.02 |
| f1 | humidity (%) | 35 | -0.0111 | -0.0263 … 0.0036 | 0.05 |
| f1 | air pressure (hPa) | 35 | 0.0003 | -0.0020 … 0.0076 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0229 | -0.0546 … 0.0011 | 0.07 |
| wec | air temperature (°C) | 33 | -0.0525 | -0.1171 … -0.0126 | 0.14 |
| wec | wind (m/s) | 33 | 0.0145 | -0.3981 … 0.2860 | 0.00 |
| wec | humidity (%) | 33 | 0.0084 | -0.0079 … 0.0238 | 0.02 |
| wec | air pressure (hPa) | 33 | 0.0126 | 0.0019 … 0.0193 | 0.15 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
