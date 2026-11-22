# Conditions and held-out error

Built by `scripts/sim/condition-report.mjs` on 2026-11-22 (AGENTS.md Gate G v3.1, item 7) from the production held-out rows
(68 rows). Slope = change of held-out lap error (% of the real lap) per unit of the condition, with its 90 % bootstrap interval;
R² = share of the error variance that condition explains alone. An interval that excludes 0 marks a condition the model may be missing;
it becomes a model term only through a pre-registered gate. Real laps and weather are never changed.

| Group | Condition | n | Slope (%/unit) | 90 % interval | R² |
|---|---|---|---|---|---|
| all | track temperature (°C) | 68 | -0.0327 | -0.0508 … -0.0138 | 0.09 |
| all | air temperature (°C) | 68 | -0.0721 | -0.1026 … -0.0435 | 0.18 |
| all | wind (m/s) | 68 | 0.1344 | -0.1139 … 0.3524 | 0.02 |
| all | humidity (%) | 68 | 0.0040 | -0.0080 … 0.0153 | 0.00 |
| all | air pressure (hPa) | 68 | 0.0035 | -0.0001 … 0.0109 | 0.02 |
| f1 | track temperature (°C) | 35 | -0.0082 | -0.0374 … 0.0177 | 0.01 |
| f1 | air temperature (°C) | 35 | -0.0199 | -0.0579 … 0.0176 | 0.01 |
| f1 | wind (m/s) | 35 | 0.1370 | -0.0808 … 0.3779 | 0.03 |
| f1 | humidity (%) | 35 | -0.0063 | -0.0209 … 0.0084 | 0.02 |
| f1 | air pressure (hPa) | 35 | 0.0003 | -0.0025 … 0.0069 | 0.00 |
| wec | track temperature (°C) | 33 | -0.0418 | -0.0710 … -0.0186 | 0.14 |
| wec | air temperature (°C) | 33 | -0.0990 | -0.1644 … -0.0614 | 0.31 |
| wec | wind (m/s) | 33 | 0.1528 | -0.3528 … 0.4763 | 0.02 |
| wec | humidity (%) | 33 | 0.0129 | -0.0065 … 0.0326 | 0.03 |
| wec | air pressure (hPa) | 33 | 0.0139 | -0.0008 … 0.0231 | 0.11 |

Rows without weather: none.
Not recorded in the data (cannot be checked yet): tyre age / set, tow (slipstream), fuel load, track evolution (rubber).
