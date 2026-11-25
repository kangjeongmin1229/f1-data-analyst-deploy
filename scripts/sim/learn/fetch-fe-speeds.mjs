// Step 35 (central 2): speed columns of the Al Kamel Formula E Analysis CSVs (top speed / speed traps / intermediate speeds), which
// build-endurance.mjs sessionCars does not keep for FE (its TOP_SPEED field was empty). Records every column whose name contains KPH or
// SPEED: the header once per season, and per car and qualifying/practice session the value on the car's best clean lap and the session max.
// Needs network: GitHub Actions (fe-fetch-speeds.yml). Raw files are not stored (rule 2.9). Out: fe-speeds.csv, fe-speed-headers.json.
import {writeFileSync} from 'node:fs';
import {officialArchive, officialSource, textOf} from '../../../worker/official.js';
import {parseCsv, sessionType} from './build-endurance.mjs';
const FROM = +(process.env.FE_FROM_SEASON || 11), TO = +(process.env.FE_TO_SEASON || 13), rows = [], headers = {}, log = [];
const list = async id => { for (let i = 0; ; i++) { try { return await officialArchive('formula-e', id); } catch (e) { if (i >= 2) { log.push(`${id}: ${e.message}`); return {catalogs: [], files: []}; } await new Promise(r => setTimeout(r, 2000 * (i + 1))); } } };
const secs = v => { if (v == null || v === '') return NaN; const p = String(v).split(':').map(Number); return p.length === 2 ? p[0] * 60 + p[1] : p[0]; };
for (const s of (await list()).catalogs.filter(c => { const n = +(c.name.match(/Season (\d+)/) || [])[1]; return n >= FROM && n <= TO; })) {
  for (const ev of (await list(s.id)).catalogs) for (const champ of (await list(ev.id)).catalogs.filter(c => /formula e/i.test(c.name))) for (const se of (await list(champ.id)).catalogs) {
    const type = sessionType(se.name.toLowerCase().replace(/ /g, '-').replace('duel', 'qualifying-duel')); if (type !== 'Q' && type !== 'P') continue;
    const lf = (await list(se.id)).files.find(f => /analysis/i.test(f.title) && (f.format === 'csv' || /\.csv$/i.test(f.url))); if (!lf) continue;
    try { const laps = parseCsv(textOf(await officialSource(lf.url))); if (!laps.length) continue; const cols = Object.keys(laps[0]).filter(k => /KPH|SPEED/i.test(k));
      headers[s.name] ||= Object.keys(laps[0]);
      const by = new Map(); for (const r of laps) { const e = String(r.NUMBER), t = secs(r.LAP_TIME); const c = by.get(e) || by.set(e, {best: null, max: {}}).get(e);
        for (const k of cols) { const v = +String(r[k]).replace(',', '.'); if (v > 0 && v < 450) c.max[k] = Math.max(c.max[k] || 0, v); }
        if (t > 30 && (!c.best || t < c.best.t)) c.best = {t, r}; }
      for (const [e, c] of by) if (c.best) rows.push([s.name.match(/Season (\d+)/)[1], ev.name.replace(/^R\d+\s*/, ''), se.name, type, e, c.best.t.toFixed(3), ...cols.flatMap(k => [k, c.best.r[k] ?? '', c.max[k] ?? ''])].join(','));
    } catch (er) { log.push(`${s.name} ${ev.name} ${se.name}: ${er.message}`); }
  }
  console.log(s.name, rows.length);
}
writeFileSync('fe-speeds.csv', 'season,event,session,type,entry,best,then repeated: column,value on best lap,session max\n' + rows.join('\n') + '\n');
writeFileSync('fe-speed-headers.json', JSON.stringify({source: 'https://results.fiaformulae.com/ (Al Kamel Systems)', headers, log}, null, 1));
console.log(rows.length, 'rows', log.length, 'errors', Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, v.filter(x => /KPH|SPEED/i.test(x))])));
