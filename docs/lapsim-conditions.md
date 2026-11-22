# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-22 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0318 | -0.0592 … -0.0079 | 0.07 |
| all | air temperature (°C) | 68 | -0.0550 | -0.0943 … -0.0201 | 0.09 |
| all | wind (m/s) | 68 | 0.2550 | 0.0055 … 0.4777 | 0.05 |
| all | humidity (%) | 68 | 0.0006 | -0.0109 … 0.0143 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0007 | -0.0033 … 0.0063 | 0.00 |
| f1 | track temperature (°C) | 35 | 0.0047 | -0.0252 … 0.0326 | 0.00 |
| f1 | air temperature (°C) | 35 | -0.0090 | -0.0487 … 0.0277 | 0.00 |
| f1 | wind (m/s) | 35 | 0.0645 | -0.1278 … 0.2747 | 0.01 |
| f1 | humidity (%) | 35 | -0.0131 | -0.0294 … 0.0033 | 0.07 |
| f1 | air pressure (hPa) | 35 | 0.0002 | -0.0030 … 0.0078 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0537 | -0.0974 … -0.0221 | 0.17 |
| wec | air temperature (°C) | 33 | -0.0873 | -0.1558 … -0.0423 | 0.18 |
| wec | wind (m/s) | 33 | 0.4484 | -0.0365 … 0.7567 | 0.11 |
| wec | humidity (%) | 33 | 0.0155 | -0.0028 … 0.0416 | 0.03 |
| wec | air pressure (hPa) | 33 | 0.0024 | -0.0135 … 0.0137 | 0.00 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
