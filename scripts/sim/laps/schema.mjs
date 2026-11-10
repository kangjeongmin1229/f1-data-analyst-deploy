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

// Wet check across years, per class, track and session type of one series. Dry reference = median best clean lap of
// the sessions with no rain mark in other seasons. Sets r.wetLevel for every lap of a marked session:
//   0 dry · 1 damp (rain mark, pace within 3 % of dry) · 2 wet (3–10 % off, or intermediate tyre) · 3 heavy (over 10 % off, or full wet tyre)
// No rain mark but over 3 % off = wet_suspect (stays wetLevel 0: not proven wet, kept and listed).
const TRAP_OK = v => v >= 150 && v <= 400; // traps outside this range are timing errors, not evidence
export function markWetAcrossYears(rows) {
  // F1 2026 is a new car generation: lap times are not comparable with 2025 and earlier
  const era = r => r.series === 'f1' ? (r.season >= 2026 ? 'f1-2026' : r.season >= 2022 ? 'f1-2022' : 'f1-2017') : '';
  const key = r => [r.series, r.track, r.cls, r.sessionType, era(r)].join('|');
  const rainy = r => r.q.includes('wet_session') || r.q.includes('wet_lap');
  const g = new Map();
  for (const r of rows) if (r.track && r.time > 0) {
    const k = key(r) + '|' + r.season + '|' + r.session;
    const o = g.get(k) || g.set(k, {best: Infinity, trap: 0, base: key(r), season: r.season, session: r.session, rain: false, tyre: 0}).get(k);
    if (rainy(r)) o.rain = true;
    if (/^INTER/i.test(r.tyre || '') || /^W+$/i.test(r.tyre || '')) o.tyre = Math.max(o.tyre, 2);
    if (/^WET$/i.test(r.tyre || '')) o.tyre = 3;
    const usable = !r.q.some(m => ['no_time', 'pit_in', 'pit_out', 'not_green', 'deleted', 'sector_sum', 'inaccurate'].includes(m));
    if (usable && r.time < o.best) o.best = r.time;
    if (usable && TRAP_OK(r.trapKph) && r.trapKph > o.trap) o.trap = r.trapKph;
  }
  const info = new Map(), list = [];
  for (const [k, o] of g) {
    const dry = [...g.values()].filter(x => x.base === o.base && x.season !== o.season && !x.rain && Number.isFinite(x.best));
    const refT = med(dry.map(x => x.best)), refV = med(dry.map(x => x.trap).filter(v => v > 0));
    const ratio = refT && Number.isFinite(o.best) ? o.best / refT : null, trapRatio = refV && o.trap ? o.trap / refV : null;
    const trapWet = trapRatio != null && trapRatio < TRAP_WET;
    let mark = null, level = o.rain ? Math.max(1, o.tyre) : 0;
    if (o.rain || trapWet) { mark = 'wet_session'; level = Math.max(level, ratio == null ? 1 : ratio > 1.10 ? 3 : ratio > PACE_SUSPECT ? 2 : 1); }
    else if (ratio != null && ratio > PACE_SUSPECT) { mark = 'wet_suspect'; level = 0; }
    info.set(k, {mark, level, ratio});
    if (mark) list.push({group: k, mark, wetLevel: level, rainMark: o.rain, best: Number.isFinite(o.best) ? o.best : null, dryRef: refT, paceRatio: ratio && +ratio.toFixed(4), trap: o.trap || null, dryTrap: refV});
  }
  for (const r of rows) {
    const i = info.get(key(r) + '|' + r.season + '|' + r.session);
    r.wetLevel = i ? i.level : rainy(r) ? 1 : null; r.paceRatio = i?.ratio ?? null;
    if (i?.mark && !r.q.includes(i.mark)) r.q.push(i.mark);
    if (r.q.includes('wet_lap') && /^WET$/i.test(r.tyre || '')) r.wetLevel = 3; else if (r.q.includes('wet_lap') && (r.wetLevel ?? 0) < 2 && /^INTER|^W+$/i.test(r.tyre || '')) r.wetLevel = 2;
  }
  return list;
}

export function counts(rows) {
  const out = {};
  for (const r of rows) {
    const k = [r.source, r.series, r.season, r.sessionType].join('|');
    const o = out[k] ||= {source: r.source, series: r.series, season: r.season, sessionType: r.sessionType, sessions: new Set(), cars: new Set(), laps: 0, timed: 0, clean: 0, cleanNotSlow: 0, push: 0, wet: 0, wet1: 0, wet2: 0, wet3: 0, wetSuspect: 0, dryPush: 0, noModel: 0, noTrack: 0, flags: {}};
    o.sessions.add(r.event + '|' + r.session); o.cars.add(r.carModel + '|' + r.entry); o.laps++;
    if (!r.q.includes('no_time')) o.timed++;
    if (r.q.includes('wet_session') || r.q.includes('wet_lap')) o.wet++;
    if (r.q.includes('no_track')) o.noTrack++;
    if (r.wetLevel >= 1) o['wet' + r.wetLevel]++;
    if (r.q.includes('wet_suspect')) o.wetSuspect++;
    if (!r.carModel) o.noModel++;
    o.flags[r.flag] = (o.flags[r.flag] || 0) + 1;
    if (isClean(r)) { o.clean++; if (!r.q.includes('slow')) o.cleanNotSlow++; }
    if (r.push) o.push++;
    if (r.push && r.wetLevel === 0) o.dryPush++;
  }
  return Object.values(out).map(o => ({...o, sessions: o.sessions.size, cars: o.cars.size})).sort((a, b) => (a.series + a.season + a.sessionType).localeCompare(b.series + b.season + b.sessionType));
}
