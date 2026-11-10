// Timing71 all laps: one row per lap for every archived session of the collected series (practice, qualifying, race; 2018 on).
//   node scripts/sim/laps/build-t71.mjs          → shard $T71_SHARD of $T71_SHARDS, writes .cache/lapsim/laps/t71/<key>-<shard>.ndjson
//   node scripts/sim/laps/build-t71.mjs merge    → marks across sessions/years, writes t71-counts.json (rows never committed)
// Calibration use only (docs/lapsim-t71.md). Lap list = analysis JSON when present; frames add sectors, tyre, age, trap, pit.
import {appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {readReplay} from '../t71-read.mjs';
import {trackOf} from '../t71-tracks.mjs';
import {SERIES, weatherOf} from '../t71-collect.mjs';
import {markRelative, markWetAcrossYears, counts, sessionType} from './schema.mjs';

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
  const log = {listed: all.length, picked: pick.length, shard, done: 0, failed: [], carKeys: {}, sessions: []};
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
      const rows = [];
      for (const [car, c] of Object.entries(cars)) {
        for (const k of Object.keys(c)) if (k !== 'stints') (log.carKeys[r.key] ||= {})[k] = 1;
        (c.stints || []).forEach((st, si) => (st.laps || []).forEach((l, li) => {
          const f = frame.get(`${car}:${l.lapNumber}`), n = st.laps.length, tyre = tyreOf(f?.tyre), time = l.laptime > 0 ? l.laptime : null;
          const sx = (f?.s || []).slice(0, 3), q = [];
          if (!time) q.push('no_time');
          // stint boundaries from the analysis file; the frame pit state backs them up
          const pitOut = (li === 0 && (si > 0 || r.type !== 'R')) || false, pitIn = (li === n - 1 && si < c.stints.length - 1) || !!f?.pit;
          if (pitIn) q.push('pit_in'); if (pitOut) q.push('pit_out');
          if (!['green', 'chequered'].includes(l.flag ?? f?.flag)) q.push('not_green');   // local yellow is not a clean lap here
          if (/^W+$/i.test(String(tyre || ''))) q.push('wet_lap');
          if (w?.wet > 0) q.push('wet_session');
          if (!w) q.push('no_weather');
          if (rep.endFlag !== 'chequered') q.push('incomplete_replay');
          if (!track) q.push('no_track');
          if (r.type === 'R' && l.lapNumber === 1) q.push('first_lap');
          rows.push({source: 'timing71', series: r.key, season, event: r.series + ' | ' + String(r.description).replace(/\s*-\s*[^-]*$/, ''), track, layout: track, sessionType: r.type, session,
            cls: c.raceClass ?? f?.cls ?? null, carModel: c.make ?? null, team: c.teamName ?? null, entry: String(c.raceNum ?? car), driver: st.driver?.name ?? st.driver ?? f?.driver ?? null,
            lap: l.lapNumber, time, s1: sx[0] ?? null, s2: sx[1] ?? null, s3: sx[2] ?? null, sectors: f?.s?.length > 3 ? f.s : undefined, trapKph: f?.spd ?? null,
            tyre, tyreAge: f?.age ?? null, stint: si + 1, stintLap: li + 1, pitIn: pitIn ? 1 : 0, pitOut: pitOut ? 1 : 0, flag: l.flag ?? f?.flag ?? null,
            rid: String(r.filename).split('/').pop(), airC: w?.air ?? null, trackC: w?.track ?? null, rain: w?.wet > 0 ? 1 : 0, vft: f?.vft ?? undefined, q});
        }));
      }
      markRelative(rows);
      if (rows.length) appendFileSync(join(OUT, `${r.key}-${shard}.ndjson`), rows.map(x => JSON.stringify(x)).join('\n') + '\n');
      log.sessions.push([r.key, season, r.type, r.description, rows.length, rep.endFlag, !!analysis, track]);
      log.done++;
    } catch (x) { log.failed.push([r.series, r.description, String(x).slice(0, 160)]); }
  }
  writeFileSync(join(OUT, `log-${shard}.json`), JSON.stringify(log));
  console.log(`shard ${shard}/${shards}: picked ${pick.length}, mine ${mine.length}, done ${log.done}, failed ${log.failed.length}`);
}

function merge() {
  const files = readdirSync(OUT), table = [], wet = [], models = {};
  for (const key of [...new Set(files.filter(f => /-\d+\.ndjson$/.test(f)).map(f => f.replace(/-\d+\.ndjson$/, '')))].sort()) {
    let rows = files.filter(f => f.replace(/-\d+\.ndjson$/, '') === key && /-\d+\.ndjson$/.test(f)).flatMap(f => readFileSync(join(OUT, f), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)));
    if (!rows.length) continue;
    // duplicate replays of one session (same description and start): keep the replay with more laps
    const n = {}; for (const r of rows) (n[r.session] ||= {})[r.rid] = (n[r.session][r.rid] || 0) + 1;
    const keep = Object.fromEntries(Object.entries(n).map(([s, m]) => [s, Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]]));
    rows = rows.filter(r => keep[r.session] === r.rid);
    wet.push(...markWetAcrossYears(rows));
    table.push(...counts(rows));
    for (const r of rows) { const k = `${key}|${r.season}|${r.cls}|${r.carModel}`; models[k] = (models[k] || 0) + 1; }
    writeFileSync(join(OUT, `${key}.ndjson`), rows.map(x => JSON.stringify(x)).join('\n'));
  }
  const logs = files.filter(f => /^log-\d+\.json$/.test(f)).map(f => JSON.parse(readFileSync(join(OUT, f), 'utf8')));
  const carKeys = {}; for (const l of logs) for (const [k, v] of Object.entries(l.carKeys)) Object.assign(carKeys[k] ||= {}, v);
  writeFileSync(join(OUT, '..', 't71-counts.json'), JSON.stringify({source: 'Timing71 archive (archive.timing71.org); calibration use only; rows are not committed',
    listed: logs[0]?.listed, picked: logs[0]?.picked, done: logs.reduce((a, l) => a + l.done, 0), failed: logs.flatMap(l => l.failed),
    inventory: existsSync(join(OUT, 'inventory.json')) ? JSON.parse(readFileSync(join(OUT, 'inventory.json'), 'utf8')) : null, sessionsNoLaps: logs.flatMap(l => l.sessions).filter(s => !s[4]).length, counts: table, wetAcrossYears: wet, lapsByModel: models,
    carKeys: Object.fromEntries(Object.entries(carKeys).map(([k, v]) => [k, Object.keys(v)]))}, null, 1));
  console.table(table);
}
await (process.argv[2] === 'merge' ? merge() : collect());
