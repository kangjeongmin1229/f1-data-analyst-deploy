// Real Hypercar stint lengths from Al Kamel race timing (Analysis CSV of the race): for every car, the
// laps between two pit stops, kept only for full green stints (no FCY/SC/red flag lap, not the first or
// last stint). BoP energy divided by an inferred full-stint length is a proxy,
// not a measurement of driveshaft energy or actual refuelling.
// Writes .cache/lapsim/wec-stints.json: {year: {track: {event, cars: {number: {manufacturer, stints: [laps...]}}}}}
import {writeFile, mkdir} from 'node:fs/promises';
import {archive, readDocument} from '../../worker/wec.js';
import {SERIES, WEC_SEASONS} from '../../worker/lapsim/series.js';
import {extractStints} from './stint-extraction.mjs';

const CACHE = process.env.LAPSIM_CACHE || '.cache/lapsim', YEARS = (process.env.LAPSIM_STINT_YEARS || '2025,2026').split(',').map(Number);
const out = {};
await mkdir(CACHE, {recursive: true});
for (const year of YEARS) {
  let a; try { a = await archive(WEC_SEASONS[year]); } catch (e) { console.log(`wec ${year}: ${e.message}`); continue; }
  for (const event of a.events) {
    const track = SERIES.wec.events[event] || event;
    // race lap analysis (Hour 24 / final version when several are published)
    const files = a.files.filter(f => f.folders[0] === event && f.folders[1] === 'FIA WEC' && f.format === 'csv' && /^Analysis_Race/i.test(f.title) && /race/i.test(f.folders[2] || ''));
    const f = files.sort((x, y) => (y.folders.join('/') + y.title).localeCompare(x.folders.join('/') + x.title))[0];
    if (!f) { console.log(`${year} ${event}: no race analysis`); continue; }
    let rows; try { rows = (await readDocument({url: f.url, limit: 100000})).records; } catch (e) { console.log(`${year} ${event}: ${e.message}`); continue; }
    const cars = {};
    for (const r of rows) {
      if (r.CLASS !== 'HYPERCAR') continue;
      const c = (cars[r.NUMBER] ||= {manufacturer: r.MANUFACTURER, team: r.TEAM, laps: []});
      c.laps.push({lap: +r.LAP_NUMBER, pit: !!r.CROSSING_FINISH_LINE_IN_PIT, flag: r.FLAG_AT_FL});
    }
    for (const c of Object.values(cars)) {
      Object.assign(c, extractStints(c.laps));
      delete c.laps;
    }
    ((out[year] ||= {})[track] = {event, file: f.title, cars});
    console.log(year, event, track, Object.keys(cars).length, 'cars');
  }
}
await writeFile(`${CACHE}/wec-stints.json`, JSON.stringify(out, null, 1));
