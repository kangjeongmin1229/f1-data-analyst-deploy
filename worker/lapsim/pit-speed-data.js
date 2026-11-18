// Pit lane speed limits (km/h). Series rule first; an event value from the Race Director's notes overrides it for that track and year.
// Edit by hand with a source for every value. Known evidence (layer 1): official regulations and event documents.
// tracks[id].f1 = {kph, years, src}: the limit applied only in the listed seasons (src = the event notes per season); any other season uses the series rule.
const RD = 'https://www.fia.com/sites/default/files/decision-document/', RD25 = 'https://www.fia.com/system/files/decision-document/';
export const lapsimPitSpeed = {
  series: {
    f1: {kph: 80, src: 'FIA F1 Sporting Regulations B1.6.3 a)', note: 'the Race Director may set another limit for an event'},
    wec: {kph: 60, src: 'FIA WEC Sporting Regulations art. 12.1.4'},
    imsa: {kph: 60, src: 'IMSA driver briefings 2025–26'},
  },
  // F1 events 2022–2026 whose Race Director notes amend the 80 km/h limit (all other events: 80 by rule, notes checked, see docs/lapsim-pit-loss.md)
  tracks: {
    'monte-carlo': {f1: {kph: 60, years: [2022, 2024, 2025], src: {
      2022: RD + "2022 Monaco Grand Prix - Race Director's Event Notes.pdf",
      2024: RD + "2024 Monaco Grand Prix - Race Director's Event Notes V2.pdf",
      2025: RD25 + '2025_monaco_grand_prix_-_race_directors_event_notes_v2.pdf'}}},
    singapore: {f1: {kph: 60, years: [2022, 2024], src: {
      2022: RD + "2022 Singapore Grand Prix - Race Director's Event Notes.pdf",
      2024: RD + "2024 Singapore Grand Prix - Race Director's Event Notes V2.pdf"}}},
    zandvoort: {f1: {kph: 60, years: [2024], src: {
      2024: RD + "2024 Dutch Grand Prix - Race Director's Event Notes.pdf"}}},
  },
};

// The limit for one series, track and season; without a season the series rule (callers pass the season they simulate).
export function pitSpeedKph(series, trackId, year) {
  const ev = lapsimPitSpeed.tracks[trackId]?.[series];
  return ev && ev.years.includes(Number(year)) ? ev.kph : lapsimPitSpeed.series[series]?.kph ?? null;
}
