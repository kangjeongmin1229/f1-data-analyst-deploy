# Battery consistency audit

The existing F1 causal battery limiter can reduce reported deployment after
it has already calculated acceleration with the full motor power. It also
omits motor energy needed to maintain a capped constant speed. Closing the lap
changes the first point's speed after its energy was calculated.

This audit uses the existing forces and stored geometry, cars and weather.
It does not fit to residuals, return observations or update production parameters.

## Verified evidence

- 130 stored-condition combinations: 26 geometries × F1 2026/2027/2028 and
  LMH/LMDh. These include extrapolated class/track combinations, not 130 races.
- F1 2028 Silverstone has an exported-flow battery deficit of
  863.392710821704 J. The existing test tolerates a 1,000 J deficit.
- Exact instrumentation of 78 F1 cases finds partially funded acceleration in
  72 cases, 2,784 segments, up to 28,722.0275659784 J omitted from one segment's
  requested DC energy. This is a numerical diagnostic, not measured energy.
- A one-joule, zero-recovery boundary fixture can maintain 288 km/h while
  reporting no motor energy, despite drag/rolling demand exceeding ICE power.
- A private research candidate restricts acceleration before accepting a
  speed, iterates the lap seam, and accounts for required constant-speed motor
  power. No force equations or fitted coefficients change.
- Candidate v2: 234 combinations (stored conditions, zero recharge and a
  one-joule window), 241,128 segments. Independent Python force/work and
  battery-ledger reconstruction finds no violation above 0.0001 J and 0.000001 J
  respectively. Largest positive force/work residual is 0.000002695764123927802 J.
- Five physical boundary tests and four diagnostic-ledger tests pass. The
  candidate preserves the no-hybrid results exactly.

## Admission decision

**Held, not integrated.** On 17 previously fitted 2026 lap references, RMS
changes from 0.8864363818692389% to 1.277871757742134%. These references are not
an untouched holdout set. Stored-condition 2026 Spa lap time changes by
1.5724293513614782 seconds. Numerical consistency is not evidence of improved
real-lap prediction, and there is no measured battery-energy validation here.

The requested scope permits small parameter adjustments; this materially
changes fitted lap behavior and needs a separate decision before integration
and recalibration. Keep the original model and all observations meanwhile.

`battery-ledger.mjs` is a diagnostic only: it keeps negative states visible,
separates the recharge cap from overflow, and rejects malformed flows. It is
not used by the production kernel or page. Private checkpoints retain frozen
inputs, scripts, exact per-case results, unsuccessful v1 and candidate v2.

Hypercar's 0.5 MJ window is not a causal battery model. All 52 extrapolated
Hypercar cases underflow when that window is applied literally; this does not
establish actual battery capacities or measured deficits. Multi-lap state,
regeneration losses and manufacturer architecture remain unvalidated.
