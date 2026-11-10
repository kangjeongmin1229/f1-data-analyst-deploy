// WEC all laps: every car, every session with an Al Kamel Analysis CSV (practice, qualifying, Hyperpole, race).
//   node scripts/sim/laps/build-wec.mjs            (seasons: every Al Kamel WEC season from LAPSIM_WEC_FROM, default 2021)
// Writes .cache/lapsim/laps/wec-<year>.ndjson (not committed) and wec-counts.json.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {archive, readDocument} from '../../../worker/wec.js';
import {SERIES} from '../../../worker/lapsim/series.js';
import {sessionType, markRelative, markWetAcrossYears, counts} from './schema.mjs';

const OUT = process.env.LAPSIM_LAPS || '.cache/lapsim/laps', FROM = Number(process.env.LAPSIM_WEC_FROM || 2021);
const WET = JSON.parse(readFileSync('scripts/sim/data/wet-sessions.json', 'utf8')).wec || {};
const secs = t => { const p = String(t || '').split(':').map(Number); return p.some(x => !Number.isFinite(x)) || !p.length ? NaN : p.reduce((a, x) => a * 60 + x, 0); };
const num = x => { const v = Number(String(x ?? '').replace(',', '.')); return String(x ?? '').trim() !== '' && Number.isFinite(v) ? v : null; };
const rowsOf = async url => (await readDocument({url, limit: 1000000})).records;
const clsOf = (c, manufacturer) => /hypercar/i.test(c) ? (SERIES.wec.classes.lmh.manufacturers?.test(manufacturer || '') ? 'lmh' : 'lmdh') : String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const mean = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : null;

mkdirSync(OUT, {recursive: true});
const seasons = (await archive()).records.map(s => ({...s, year: Number((String(s.season_id).match(/(20\d\d)/) || [])[1])})).filter(s => s.year >= FROM);
const all = [], log = [], sources = [];
for (const s of seasons) {
  let a; try { a = await archive(s.season_id); } catch (e) { log.push(`${s.season_id}: ${e.message}`); continue; }
  for (const event of a.events) {
    const files = a.files.filter(f => f.folders[0] === event && /WEC/i.test(f.folders[1] || '') && f.format === 'csv');
    const track = SERIES.wec.events[event] || null;
    // car model per entry from the classification files of this event (VEHICLE column)
    const model = new Map();
    for (const f of files.filter(f => /Classification/i.test(f.title))) {
      try { for (const r of await rowsOf(f.url)) if (r.NUMBER != null && r.VEHICLE) model.set(String(r.NUMBER), String(r.VEHICLE).trim()); } catch (e) { log.push(`${s.year} ${event} ${f.title}: ${e.message}`); }
    }
    for (const f of files.filter(f => /^Analysis_/i.test(f.title))) {
      const session = f.folders[2] || f.title, type = sessionType(f.title);
      let recs; try { recs = await rowsOf(f.url); } catch (e) { log.push(`${s.year} ${event} ${f.title}: ${e.message}`); continue; }
      let w = []; const wf = files.find(x => x.folders[2] === f.folders[2] && /^Weather_/i.test(x.title));
      if (wf) try { w = await rowsOf(wf.url); } catch {}
      const col = k => w.map(r => num(r[k])).filter(x => x != null);
      const rain = w.some(r => num(r.RAIN) > 0), listed = track && WET[`${s.year} ${track}`];
      sources.push({year: s.year, event, session, url: f.url, published_at: f.published_at, rows: recs.length});
      const rows = [], state = new Map();
      for (const r of recs) {
        const entry = String(r.NUMBER), st = state.get(entry) || state.set(entry, {stint: 1, stintLap: 0, prevPit: false}).get(entry);
        const pitIn = !!String(r.CROSSING_FINISH_LINE_IN_PIT || '').trim(), pitOut = st.prevPit || num(secs(r.PIT_TIME)) > 0;
        if (pitOut && st.stintLap > 0) { st.stint++; st.stintLap = 0; } st.stintLap++; st.prevPit = pitIn;
        const time = secs(r.LAP_TIME), sx = [num(r.S1_SECONDS), num(r.S2_SECONDS), num(r.S3_SECONDS)], flag = String(r.FLAG_AT_FL || '').trim();
        const q = [];
        if (!(time > 30)) q.push('no_time');
        if (pitIn) q.push('pit_in'); if (pitOut) q.push('pit_out');
        if (!['GF', 'FF'].includes(flag)) q.push('not_green');
        if (rain || listed) q.push('wet_session');
        if (!w.length) q.push('no_weather');
        if (time > 30 && sx.every(x => x != null) && Math.abs(sx[0] + sx[1] + sx[2] - time) > 0.002) q.push('sector_sum');
        if (type === 'R' && num(r.LAP_NUMBER) === 1) q.push('first_lap');
        if (!track) q.push('no_track');
        rows.push({source: 'alkamel', series: 'wec', season: s.year, event, track, layout: track, sessionType: type, session, cls: clsOf(r.CLASS, r.MANUFACTURER),
          carModel: model.get(entry) || r.MANUFACTURER || null, team: r.TEAM ?? null, entry, driver: r.DRIVER_NAME ?? null, lap: num(r.LAP_NUMBER), time: time > 0 ? time : null,
          s1: sx[0], s2: sx[1], s3: sx[2], trapKph: num(r.TOP_SPEED), tyre: null, tyreAge: null, stint: st.stint, stintLap: st.stintLap, pitIn: pitIn ? 1 : 0, pitOut: pitOut ? 1 : 0,
          flag, airC: mean(col('AIR_TEMP')), trackC: mean(col('TRACK_TEMP')), rain: rain ? 1 : 0, q});
      }
      all.push(...markRelative(rows));
    }
  }
}
const wetList = markWetAcrossYears(all);
for (const y of [...new Set(all.map(r => r.season))]) writeFileSync(join(OUT, `wec-${y}.ndjson`), all.filter(r => r.season === y).map(r => JSON.stringify(r)).join('\n'));
const models = {}; for (const r of all) { const k = `${r.season}|${r.cls}|${r.carModel}`; models[k] = (models[k] || 0) + 1; }
writeFileSync(join(OUT, 'wec-counts.json'), JSON.stringify({source: 'Al Kamel Systems published WEC timing (fiawec.alkamelsystems.com), Analysis and Classification CSV', counts: counts(all), wetAcrossYears: wetList, lapsByModel: models, files: sources, log}, null, 1));
console.table(counts(all)); console.log('log', log.length, log.slice(0, 10));
