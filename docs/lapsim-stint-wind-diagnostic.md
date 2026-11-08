# Wind consistency diagnostic

The lap kernel uses along-track air-relative speed for drag and downforce.
The existing stint-energy helper uses ground speed for both. The research-only
`driveEnergyWithWindJ` carries the kernel's existing wind convention into the
same work integral; ground distance still determines work. Missing headings
retain the existing zero-wind fallback. No production helper or constants change.

Five analytic tests cover zero wind, opposite head/tail headings, crosswind,
missing heading and clamping. On 29 stored BoP-linked stint proxy rows across
four 2025 events, eight event/class simulations yield leave-one-event-out RMS
3.813695855271299% with existing energy versus 4.0178727119386055% with wind.
No correction is admitted. The train factor is recomputed without each held
out event for each alternative; no observation is dropped on residual size.

These targets are allowance / inferred long stint, not measured energy use.
Weather is qualifying weather reused as a race proxy. A better force accounting
formula need not improve those proxy targets. Reconcile actual race weather,
energy boundaries and fuel/mass conventions before integrating this helper.

Private raw files, exact per-row results and restart scripts remain in the
user's checkpoint. No raw telemetry belongs in this public repository.
