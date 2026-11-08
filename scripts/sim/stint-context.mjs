// Resolve the calibration that belongs to the observed event. Never substitute
// another season's car, weather or fitted track grip for a historical record.
export function stintContext(calibration, year, track, cls) {
  const season = calibration?.series?.wec?.[cls]?.[year];
  const event = season?.tracks?.[track];
  if (!season?.car) return {ok: false, reason: 'missing-year-class-model'};
  if (!event) return {ok: false, reason: 'missing-year-track-calibration'};
  if (!event.weather || !['airTempC', 'pressureHpa'].every(k => Number.isFinite(event.weather[k]))) return {ok: false, reason: 'missing-event-weather'};
  if (!Number.isFinite(event.grip) || event.grip <= 0) return {ok: false, reason: 'missing-event-grip'};
  return {ok: true, year: Number(year), track, cls, car: season.car, grip: event.grip, weather: event.weather,
    weatherBasis: 'same-year-qualifying-proxy-not-race-weather'};
}
