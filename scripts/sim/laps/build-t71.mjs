// Timing71 all laps: one row per lap for every archived session of the collected series (practice, qualifying, race; 2018 on).
//   node scripts/sim/laps/build-t71.mjs          → shard $T71_SHARD of $T71_SHARDS, writes .cache/lapsim/laps/t71/<key>-<shard>.ndjson
//   node scripts/sim/laps/build-t71.mjs merge    → marks across sessions/years, writes t71-counts.json (rows never committed)
// Calibration use only (docs/lapsim-t71.md). Lap list = analysis JSON when present; frames add sectors, tyre, age, trap, pit.
import {appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {readReplay} from '../t71-read.mjs';
import {trackOf} from '../t71-tracks.mjs';
import {SERIES, weatherOf} from '../t71-collect.mjs';
import {markRelative, markRainTiming, markWetAcrossYears, counts, sessionType, isClean} from './schema.mjs';
import {modelIdentity} from './models.mjs';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';

const API = 'https://archive.timing71.org', OUT = join(process.env.LAPSIM_LAPS || '.cache/lapsim/laps', 't71');
const get = async (u, n = 3) => {
  if (!/^https?:/.test(u)) u = `https://s3.us-east-005.backblazeb2.com/t71-archive/${u}`;
  try { const r = await fetch(u.startsWith(API) ? u : encodeURI(u)); if (!r.ok) throw new Error(`${r.status}`); return r; }
  catch (x) { if (n <= 1) throw x; await new Promise(f => setTimeout(f, 3000)); return get(u, n - 1); }
};
const tyreOf = t => (Array.isArray(t) ? t[0] || t[1] : t) || null;

async function collect() {
  const shard = +(process.env.T71_SHARD || 0), shards = +(process.env.T71_SHARDS || 1), limit = +(process.env.T71_LIMIT || 0);
  const all = [];
  for (let skip = 0; skip < 60000; skip += 500) {
    const page = await (await get(`${API}/replays?filter[order]=startTime%20ASC&filter[limit]=500&filter[skip]=${skip}`)).json();
    all.push(...page); if (page.length < 500) break;
  }
  const slug = x => String(x || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'unknown';
  const ALL = process.env.T71_ALL === '1';
  const pick = all.map(r => ({...r, key: Object.keys(SERIES).find(k => SERIES[k].test(r.series)) || (ALL ? 'x-' + slug(r.series) : null), type: /no current session|backup feed|\bn\/a\b/i.test(r.description || '') ? 'other' : sessionType(r.description || '')}))
    .filter(r => r.key && r.type !== 'other' && (ALL || r.startTime >= Date.UTC(2018, 0, 1) / 1e3));
  if (shard === 0) { const inv = {}; for (const r of all) { const k = `${r.series}|${new Date(r.startTime * 1e3).getUTCFullYear()}|${sessionType(r.description || '')}`; inv[k] = (inv[k] || 0) + 1; } mkdirSync(OUT, {recursive: true}); writeFileSync(join(OUT, 'inventory.json'), JSON.stringify(inv)); }
  let mine = pick.filter((r, i) => i % shards === shard); if (limit) mine = mine.slice(0, limit);
  mkdirSync(OUT, {recursive: true});
  const log = {listed: all.length, picked: pick.length, shard, done: 0, failed: [], carKeys: {}, wxFields: {}, sessions: []};
  for (const r of mine) {
    try {
      const zip = join(OUT, `r-${shard}.zip`);
      writeFileSync(zip, Buffer.from(await (await get(r.filename)).arrayBuffer()));
      const analysis = r.analysisFilename ? await (await get(r.analysisFilename)).json().catch(() => null) : null;
      const rep = readReplay(zip);
      const frame = new Map(rep.laps.map(l => [`${l.car}:${l.lap + 1}`, l]));
      const w = weatherOf(rep.manifest.trackDataSpec, rep.weather), season = new Date(r.startTime * 1e3).getUTCFullYear(), track = trackOf(r.series, r.description) || null;
      const session = `${r.description}|${r.startTime}`;
      const cars = analysis?.cars?.cars || Object.fromEntries([...new Set(rep.laps.map(l => l.car))].map(c => [c, {stints: [{laps: rep.laps.filter(l => l.car === c).map(l => ({lapNumber: l.lap + 1, laptime: l.time, flag: l.flag}))}]}]));
      // every weather field of the feed, as published, at the time of the lap (frame clock)
      const spec = (rep.manifest.trackDataSpec || []).map(n => String(n)), wxAt = t => { let b = null; for (const x of rep.weather) { if (x.t <= t) b = x; else break; } return b || rep.weather[0] || null; };
      const wv = x => Array.isArray(x) ? x.filter(y => y !== '' && y != null).join(' ') : x;
      const wxOf = t => { const x = wxAt(t); return x && Array.isArray(x.v) ? Object.fromEntries(spec.map((n, i) => [n, wv(x.v[i])]).filter(([, y]) => y !== '' && y != null)) : null; };
      const pickN = (o, re) => { if (!o) return null; const k = Object.keys(o).find(n => re.test(n)); const y = k ? parseFloat(o[k]) : NaN; return Number.isFinite(y) ? y : null; };
      const rows = [];
      for (const [car, c] of Object.entries(cars)) {
        for (const k of Object.keys(c)) if (k !== 'stints') (log.carKeys[r.key] ||= {})[k] = 1;
        (c.stints || []).forEach((st, si) => (st.laps || []).forEach((l, li) => {
          const f = frame.get(`${car}:${l.lapNumber}`), n = st.laps.length, tyre = tyreOf(f?.tyre), time = l.laptime > 0 ? l.laptime : null;
          const sx = (f?.s || []).slice(0, 3), q = [], wx = f ? wxOf(f.t) : null, cond = wx ? Object.entries(wx).filter(([n]) => /^track$|rain|condition|weather/i.test(n)).map(([n, y]) => `${n}: ${y}`).join('; ') || null : null;
          const rainNow = cond && /wet|rain|damp/i.test(cond) && !/no rain|rain: (0|no|false|-)\b/i.test(cond) ? 1 : 0;
          if (!time) q.push('no_time');
          // stint boundaries from the analysis file; the frame pit state backs them up
          const pitOut = (li === 0 && (si > 0 || r.type !== 'R')) || false, pitIn = (li === n - 1 && si < c.stints.length - 1) || !!f?.pit;
          if (pitIn) q.push('pit_in'); if (pitOut) q.push('pit_out');
          if (!['green', 'chequered'].includes(l.flag ?? f?.flag)) q.push('not_green');   // local yellow is not a clean lap here
          if (/^W+$/i.test(String(tyre || ''))) q.push('wet_lap');
          if (w?.wet > 0 || rainNow) q.push('wet_session');
          if (!w) q.push('no_weather');
          if (rep.endFlag !== 'chequered') q.push('incomplete_replay');
          if (!track) q.push('no_track');
          if (r.type === 'R' && l.lapNumber === 1) q.push('first_lap');
          rows.push({source: 'timing71', series: r.key, season, event: r.series + ' | ' + String(r.description).replace(/\s*-\s*[^-]*$/, ''), track, layout: track, sessionType: r.type, session,
            cls: c.raceClass ?? f?.cls ?? null, carModel: c.make ?? null, team: c.teamName ?? null, entry: String(c.raceNum ?? car), driver: st.driver?.name ?? st.driver ?? f?.driver ?? null,
            lap: l.lapNumber, time, s1: sx[0] ?? null, s2: sx[1] ?? null, s3: sx[2] ?? null, sectors: f?.s?.length > 3 ? f.s : undefined, trapKph: f?.spd ?? null,
            tyre, tyreAge: f?.age ?? null, stint: si + 1, stintLap: li + 1, pitIn: pitIn ? 1 : 0, pitOut: pitOut ? 1 : 0, flag: l.flag ?? f?.flag ?? null,
            rid: String(r.filename).split('/').pop(), tEnd: f?.t ?? (l.timestamp ? l.timestamp / 1e3 : null), rain: rainNow,
            airC: pickN(wx, /air/i) ?? w?.air ?? null, trackC: pickN(wx, /track temp/i) ?? w?.track ?? null, humidityPct: pickN(wx, /humid/i), pressureHpa: pickN(wx, /press/i),
            windMs: pickN(wx, /wind speed/i), windFromDeg: pickN(wx, /wind dir/i), trackCondition: cond, wx, vft: f?.vft ?? undefined, q});
        }));
      }
      markRainTiming(markRelative(rows));
      if (rows.length) appendFileSync(join(OUT, `${r.key}-${shard}.ndjson`), rows.map(x => JSON.stringify(x)).join('\n') + '\n');
      log.sessions.push([r.key, season, r.type, r.description, rows.length, rep.endFlag, !!analysis, track]);
      for (const n of spec) (log.wxFields[r.key] ||= {})[n] = 1;
      log.done++;
    } catch (x) { log.failed.push([r.series, r.description, String(x).slice(0, 160)]); }
  }
  writeFileSync(join(OUT, `log-${shard}.json`), JSON.stringify(log));
  console.log(`shard ${shard}/${shards}: picked ${pick.length}, mine ${mine.length}, done ${log.done}, failed ${log.failed.length}`);
}

// Merge: shard files stay as they are (they are the dataset). This step reads them line by line, keeps a slim copy of each row,
// and writes the cross-session results as small side tables: t71-session-marks.json (per session and class: mark, paceRatio,
// trapRatio; replay to keep when a session was archived twice) and t71-counts.json.
const SIM = /iracing|e-?sports?|esport|sim ?racing|simracing|virtual|lionheart|\bvco\b|\bivra\b|rfactor|assetto|prosim|eracing|realsimracing/i;
async function merge() {
  const {createInterface} = await import('node:readline'); const {createReadStream} = await import('node:fs');
  const files = readdirSync(OUT).filter(f => /-\d+\.ndjson$/.test(f)), table = [], wet = [], models = {}, marks = {}, simSeries = [];
  const gap = {}, venues = {}, info = {}, cond = {}, evo = {}; const medn = a => { const x = a.filter(Number.isFinite).sort((p, q) => p - q); return x.length ? +x[x.length >> 1].toFixed(1) : null; };
  for (const key of [...new Set(files.map(f => f.replace(/-\d+\.ndjson$/, '')))].sort()) {
    let rows = [];
    for (const f of files.filter(f => f.replace(/-\d+\.ndjson$/, '') === key)) {
      for await (const line of createInterface({input: createReadStream(join(OUT, f)), crlfDelay: Infinity})) {
        if (!line) continue; const r = JSON.parse(line);
        rows.push({source: r.source, series: r.series, season: r.season, event: r.event, track: r.track, cls: r.cls, sessionType: r.sessionType, session: r.session, carModel: r.carModel,
          entry: r.entry, time: r.time, trapKph: r.trapKph, tyre: r.tyre, flag: r.flag, rain: r.rain, push: r.push, rid: r.rid, q: r.q,
          airC: r.airC, trackC: r.trackC, humidityPct: r.humidityPct, pressureHpa: r.pressureHpa, windMs: r.windMs, cond: r.trackCondition ? 1 : 0, venue: r.track ? null : String(r.event).split(' | ').pop()});
      }
    }
    if (!rows.length) continue;
    // duplicate replays of one session (same description and start): keep the replay with more laps
    const n = {}; for (const r of rows) (n[r.session] ||= {})[r.rid] = (n[r.session][r.rid] || 0) + 1;
    const keep = Object.fromEntries(Object.entries(n).map(([s, m]) => [s, Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]]));
    rows = rows.filter(r => keep[r.session] === r.rid);
    // sim-racing feeds: marked per event (series name or event text), never fitted (rules 2.10)
    let simRows = 0; for (const r of rows) if (SIM.test(key) || SIM.test(r.event || '')) { r.q.push('sim'); simRows++; }
    const sim = simRows > rows.length / 2; if (simRows) simSeries.push([key, simRows, rows.length]);
    const list = markWetAcrossYears(rows); wet.push(...list);
    for (const w of list) marks[w.group] = {mark: w.mark, paceRatio: w.paceRatio, trapRatio: w.trapRatio};
    for (const [sess, rid] of Object.entries(keep)) if (Object.keys(n[sess]).length > 1) (marks.__keepReplay ||= {})[key + '|' + sess] = rid;
    table.push(...counts(rows).map(c => ({...c, sim})));
    if (!sim) {
      // geometry gap: laps per track id, with or without simulator geometry; venues with no id at all
      const sess = new Map();
      for (const r of rows) {
        if (r.q.includes('sim')) continue;
        if (r.track) { const g = gap[r.track] ||= {geometry: !!lapsimTracks[r.track], laps: 0, clean: 0, push: 0, series: {}}; g.laps++; if (isClean(r)) g.clean++; if (r.push) g.push++; g.series[key] = 1; }
        else { const v = venues[key + ' | ' + r.venue] ||= [0, 0]; v[0]++; if (r.push) v[1]++; }
        const o = sess.get(r.session) || sess.set(r.session, {type: r.sessionType, track: r.track, season: r.season, start: +String(r.session).split('|').pop(), air: [], trk: [], hum: [], prs: [], wind: [], n: 0, rain: 0, cond: 0, flags: new Set(), wetMark: false}).get(r.session);
        o.n++; if (r.rain === 1) o.rain++; if (r.cond) o.cond++; o.flags.add(r.flag); if (r.q.includes('wet_session')) o.wetMark = true;
        if (o.n % 25 === 1) { o.air.push(r.airC); o.trk.push(r.trackC); o.hum.push(r.humidityPct); o.prs.push(r.pressureHpa); o.wind.push(r.windMs); }
        const id = modelIdentity(r.carModel); if (id?.category === 'GT3') { const e = evo[id.base] ||= {}; const k = `${key}|${r.season}|${id.evo || 'base'}`; e[k] = (e[k] || 0) + 1; }
      }
      // what each series' feed tells us: air/track temperature, a rain or track-condition field, any non-green flag
      const I = info[key] = {sessions: sess.size, withTemp: 0, withRainField: 0, withNonGreenFlag: 0, wetMarked: 0};
      for (const o of sess.values()) {
        if (medn(o.air) != null) I.withTemp++; if (o.cond) I.withRainField++; if ([...o.flags].some(f => f && !['green', 'chequered', 'none'].includes(f))) I.withNonGreenFlag++; if (o.wetMark) I.wetMarked++;
        // typical conditions of an event: series, track, month and session type (dry sessions only), for the automatic season choice
        if (o.track && !o.wetMark && Number.isFinite(o.start) && medn(o.air) != null) { const k = `${key}|${o.track}|${new Date(o.start * 1e3).getUTCMonth() + 1}|${o.type}`; const c = cond[k] ||= {n: 0, air: [], trk: [], hum: [], prs: [], wind: [], seasons: {}}; c.n++; c.seasons[o.season] = 1; c.air.push(medn(o.air)); c.trk.push(medn(o.trk)); c.hum.push(medn(o.hum)); c.prs.push(medn(o.prs)); c.wind.push(medn(o.wind)); }
      }
    }
    for (const r of rows) { const k = `${key}|${r.season}|${r.cls}|${r.carModel}`; models[k] = (models[k] || 0) + 1; }
  }
  const all = readdirSync(OUT);
  const logs = all.filter(f => /^log-\d+\.json$/.test(f)).map(f => JSON.parse(readFileSync(join(OUT, f), 'utf8')));
  const merged = (name) => { const o = {}; for (const l of logs) for (const [k, v] of Object.entries(l[name] || {})) Object.assign(o[k] ||= {}, v); return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Object.keys(v)])); };
  writeFileSync(join(OUT, '..', 't71-session-marks.json'), JSON.stringify(marks));
  writeFileSync(join(OUT, '..', 't71-tracks-counts.json'), JSON.stringify({source: 'Timing71 rows, real series only', note: 'geometry = the simulator has this track today',
    tracks: Object.fromEntries(Object.entries(gap).sort((a, b) => b[1].laps - a[1].laps).map(([k, g]) => [k, {...g, series: Object.keys(g.series)}])),
    venuesWithNoTrackId: Object.fromEntries(Object.entries(venues).sort((a, b) => b[1][0] - a[1][0]).slice(0, 400))}, null, 1));
  writeFileSync(join(OUT, '..', 't71-info-counts.json'), JSON.stringify({source: 'Timing71 rows', note: 'per series: how many sessions carry temperature, a rain or track-condition field, and any non-green flag', series: info}, null, 1));
  writeFileSync(join(OUT, '..', 't71-conditions-counts.json'), JSON.stringify({source: 'Timing71 feed weather, dry sessions, median per session then median over sessions', key: 'series|track|month|sessionType',
    conditions: Object.fromEntries(Object.entries(cond).map(([k, c]) => [k, {sessions: c.n, seasons: Object.keys(c.seasons), airC: medn(c.air), trackC: medn(c.trk), humidityPct: medn(c.hum), pressureHpa: medn(c.prs), windMs: medn(c.wind)}]))}, null, 1));
  writeFileSync(join(OUT, '..', 't71-evo-counts.json'), JSON.stringify({source: 'Timing71 car model text', note: 'GT3 laps per base model, series, season and kit (base / evo / evo2)', models: evo}, null, 1));
  writeFileSync(join(OUT, '..', 't71-counts.json'), JSON.stringify({source: 'Timing71 archive (archive.timing71.org); calibration use only; rows are not committed',
    listed: logs.find(l => l.shard === 0)?.listed ?? logs[0]?.listed, picked: logs[0]?.picked, shards: logs.length, done: logs.reduce((a, l) => a + l.done, 0), failed: logs.flatMap(l => l.failed),
    inventory: existsSync(join(OUT, 'inventory.json')) ? JSON.parse(readFileSync(join(OUT, 'inventory.json'), 'utf8')) : null,
    sessionsNoLaps: logs.flatMap(l => l.sessions).filter(s => !s[4]).length, simSeries, counts: table, wetAcrossYears: wet.length, lapsByModel: models,
    weatherFields: merged('wxFields'), carKeys: merged('carKeys')}, null, 1));
  console.log('series', new Set(table.map(c => c.series)).size, 'laps', table.reduce((a, c) => a + c.laps, 0));
}
await (process.argv[2] === 'merge' ? merge() : collect());
