// Step 32 (docs/prereg/step32-empirical-ggv-*.md): F1 car limits learned from public telemetry (model, not measured).
// null = flag off (today). When set: {2025: {car: {...fields}}, 2026: {car: {...}}} — car-level fields only (lateralCap, decoupled,
// cdA scale, cdALow ratio, pIce); read by carsFor for the F1 2025/2026 entries only (A4.3). Written only by an approved ship package.
export const lapsimStep32Limits = null;
