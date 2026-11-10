// All-laps dataset: one row per lap, every source in one shape. Laps are marked, never deleted.
// Rules are declared in docs/lapsim-all-laps.md (written before any fit). Raw rows stay out of git.
export const COLUMNS = ['source', 'series', 'season', 'event', 'track', 'layout', 'sessionType', 'session', 'cls', 'carModel', 'team', 'entry', 'driver',
  'lap', 'time', 's1', 's2', 's3', 'trapKph', 'tyre', 'tyreAge', 'stint', 'stintLap', 'pitIn', 'pitOut', 'flag', 'airC', 'trackC', 'rain', 'q'];
// Quality marks (row.q is a list of these). A lap is CLEAN when it has none of the HARD marks.
export const HARD = ['no_time', 'pit_in', 'pit_out', 'not_green', 'deleted', 'wet_lap', 'wet_session', 'sector_sum', 'inaccurate'];
export const SOFT = ['slow', 'first_lap', 'wet_suspect', 'no_weather', 'incomplete_replay', 'no_track'];
export const PUSH_QUALI = 1.02;   // qualifying push lap: clean and within 2 % of the car's own best clean lap of that session
export const SLOW = 1.07;         // 'slow' mark: more than 7 % off the car's own best clean lap (traffic, cool-down, lift)
export const TRAP_WET = 0.90;     // class session trap under 90 % of the same class/track in other years = wet (rules 3.3.1)
export const PACE_SUSPECT = 1.03; // class session best more than 3 % off other years = wet_suspect (kept, listed, not removed)
export const isClean = r => !r.q.some(m => HARD.includes(m));
export const sessionType = name => /hyperpole|qualif|shootout|superpole|duel/i.test(name) ? 'Q' : /practice|\bfp ?\d|test|warm/i.test(name) ? 'P' : /race|grand prix|sprint/i.test(name) ? 'R' : 'other';
const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };

// Session-level marks that need all rows of a session: slow laps and push laps per car.
export function markRelative(rows) {
  const best = new Map();
  for (const r of rows) if (isClean(r)) { const k = r.session + '|' + r.entry; if (!(best.get(k) <= r.time)) best.set(k, r.time); }
  for (const r of rows) {
    const b = best.get(r.session + '|' + r.entry);
    if (isClean(r) && r.time > b * SLOW) r.q.push('slow');
    r.push = isClean(r) && r.sessionType === 'Q' && r.time <= b * PUSH_QUALI ? 1 : 0;
  }
  return rows;
}

// Wet check across years: needs the rows of one series (all seasons). Marks whole class-sessions.
export function markWetAcrossYears(rows) {
  const key = r => [r.series, r.track, r.cls, r.sessionType].join('|');
  const g = new Map();
  for (const r of rows) if (isClean(r) && r.track) {
    const k = key(r) + '|' + r.season + '|' + r.event;
    const o = g.get(k) || g.set(k, {best: Infinity, trap: 0, base: key(r), season: r.season, event: r.event}).get(k);
    if (r.time < o.best) o.best = r.time; if (r.trapKph > o.trap) o.trap = r.trapKph;
  }
  const marks = new Map(), list = [];
  for (const [k, o] of g) {
    const others = [...g.values()].filter(x => x.base === o.base && x.season !== o.season);
    if (!others.length) continue;
    const refT = med(others.map(x => x.best)), refV = med(others.map(x => x.trap).filter(v => v > 0));
    const m = refV && o.trap > 0 && o.trap < refV * TRAP_WET ? 'wet_session' : o.best > refT * PACE_SUSPECT ? 'wet_suspect' : null;
    if (m) { marks.set(k, m); list.push({group: k, mark: m, best: o.best, otherYearsBest: refT, trap: o.trap || null, otherYearsTrap: refV}); }
  }
  for (const r of rows) { const m = marks.get(key(r) + '|' + r.season + '|' + r.event); if (m && !r.q.includes(m)) r.q.push(m); }
  return list;
}

export function counts(rows) {
  const out = {};
  for (const r of rows) {
    const k = [r.source, r.series, r.season, r.sessionType].join('|');
    const o = out[k] ||= {source: r.source, series: r.series, season: r.season, sessionType: r.sessionType, sessions: new Set(), cars: new Set(), laps: 0, timed: 0, clean: 0, cleanNotSlow: 0, push: 0, wet: 0, noTrack: 0};
    o.sessions.add(r.event + '|' + r.session); o.cars.add(r.carModel + '|' + r.entry); o.laps++;
    if (!r.q.includes('no_time')) o.timed++;
    if (r.q.includes('wet_session') || r.q.includes('wet_lap')) o.wet++;
    if (r.q.includes('no_track')) o.noTrack++;
    if (isClean(r)) { o.clean++; if (!r.q.includes('slow')) o.cleanNotSlow++; }
    if (r.push) o.push++;
  }
  return Object.values(out).map(o => ({...o, sessions: o.sessions.size, cars: o.cars.size})).sort((a, b) => (a.series + a.season + a.sessionType).localeCompare(b.series + b.season + b.sessionType));
}
