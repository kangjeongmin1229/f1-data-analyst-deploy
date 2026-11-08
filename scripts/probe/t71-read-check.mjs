// Probe: run scripts/sim/t71-read.mjs on recent qualifying + race replays of each target series and
// write only check numbers and a few sample rows (no raw timing) to probe-out/read-check.json.
import {writeFileSync, mkdirSync} from 'node:fs';
import {readReplay, checkReplay} from '../sim/t71-read.mjs';

const API = 'https://archive.timing71.org';
const SERIES = {f1: /^formula 1$/i, wec: /^(fia )?wec$|world endurance/i, imsa: /imsa weathertech/i, fe: /formula e/i,
  gtwc: /gt world challenge/i, igtc: /bathurst 12|igtc|kyalami 9/i, dtm: /^dtm$/i, nur: /24h n(u|ü)rburgring|^nls$|^vln/i,
  macau: /macau grand prix/i, elms: /european le mans/i, alms: /asian le mans/i};
const get = async (u, n = 3) => { try { const r = await fetch(u.startsWith(API) ? u : encodeURI(u)); if (!r.ok) throw new Error(`${r.status} ${u}`); return r; } catch (x) { if (n <= 1) throw x; await new Promise(f => setTimeout(f, 3000)); return get(u, n - 1); } };
const all = [];
for (let skip = 0; skip < 20000; skip += 500) {
  const page = await (await get(`${API}/replays?filter[order]=startTime%20DESC&filter[limit]=500&filter[skip]=${skip}`)).json();
  all.push(...page); if (page.length < 500) break;
}
const out = {listed: all.length, sessions: []};
mkdirSync('probe-out', {recursive: true});
for (const [key, re] of Object.entries(SERIES)) {
  for (const kind of [/qualif|hyperpole/i, /- race$|race \d?$/i]) {
    const r = all.find(x => re.test(x.series) && kind.test(x.description) && x.analysisFilename && x.startTime > 1.7e9);
    if (!r) { out.sessions.push({key, kind: String(kind), miss: true}); continue; }
    const e = {key, series: r.series, description: r.description, start: new Date(r.startTime * 1e3).toISOString()};
    try {
      writeFileSync('/tmp/t71.zip', Buffer.from(await (await get(r.filename)).arrayBuffer()));
      const analysis = await (await get(r.analysisFilename)).json();
      const t0 = Date.now(); const rep = readReplay('/tmp/t71.zip'); e.ms = Date.now() - t0;
      e.cols = rep.manifest.colSpec; e.trackDataSpec = rep.manifest.trackDataSpec;
      e.check = checkReplay(rep, analysis);
      e.tyres = [...new Set(rep.laps.map(l => JSON.stringify(l.tyre)))].slice(0, 12);
      e.flags = [...new Set(rep.laps.map(l => l.flag))];
      e.sample = rep.laps.filter(l => l.s.every(x => x != null)).slice(5, 8);
      e.mismatch = rep.laps.filter(l => l.aflag === undefined).slice(0, 3);
      e.weather = rep.weather.slice(0, 2);
    } catch (x) { e.error = String(x).slice(0, 300); }
    out.sessions.push(e); console.log(key, e.description, JSON.stringify(e.check || e.error));
  }
}
writeFileSync('probe-out/read-check.json', JSON.stringify(out, null, 1));
