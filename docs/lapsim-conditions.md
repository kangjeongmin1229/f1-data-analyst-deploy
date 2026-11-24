# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-24 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0192 | -0.0368 … -0.0005 | 0.04 |
| all | air temperature (°C) | 68 | -0.0391 | -0.0682 … -0.0101 | 0.08 |
| all | wind (m/s) | 68 | 0.0668 | -0.1345 … 0.2370 | 0.01 |
| all | humidity (%) | 68 | -0.0011 | -0.0124 … 0.0095 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0010 | -0.0044 … 0.0110 | 0.00 |
| f1 | track temperature (°C) | 35 | -0.0152 | -0.0457 … 0.0102 | 0.02 |
| f1 | air temperature (°C) | 35 | -0.0254 | -0.0643 … 0.0129 | 0.02 |
| f1 | wind (m/s) | 35 | 0.1601 | -0.0372 … 0.3674 | 0.04 |
| f1 | humidity (%) | 35 | -0.0107 | -0.0253 … 0.0044 | 0.05 |
| f1 | air pressure (hPa) | 35 | -0.0024 | -0.0080 … 0.0094 | 0.02 |
| wec | track temperature (°C) | 33 | -0.0214 | -0.0537 … 0.0040 | 0.06 |
| wec | air temperature (°C) | 33 | -0.0482 | -0.1124 … -0.0065 | 0.12 |
| wec | wind (m/s) | 33 | -0.0191 | -0.4252 … 0.2480 | 0.00 |
| wec | humidity (%) | 33 | 0.0086 | -0.0071 … 0.0236 | 0.02 |
| wec | air pressure (hPa) | 33 | 0.0123 | 0.0020 … 0.0191 | 0.15 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
