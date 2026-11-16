// Pit lane speed limit of every F1 event (task A5, owner 2026-11-16: "pit speed per rules and per track"). Reads the Race Director's
// event / competition notes of each event and keeps every text row that states a pit lane speed limit, with the document link.
//   node scripts/sim/learn/fetch-f1-pit-speed.mjs [years]   -> scripts/sim/data/learn/f1-pit-speed-raw.json
// Runs in GitHub Actions: a Claude session's shell cannot reach fia.com.
import {writeFile} from 'node:fs/promises';
import {lapsimTracks} from '../../../worker/lapsim/tracks-data.js';
import {eventDocuments, fiaCall} from '../../../worker/fia.js';
import {eventFor} from '../../../worker/lapsim/names.js';

const years = (process.argv[2] || '2024,2025,2026').split(',').map(Number), out = {source: 'FIA F1 event documents (fia.com): Race Director\'s event / competition notes', events: []};
for (const year of years) for (const id of Object.keys(lapsimTracks)) {
  const name = id === 'madring' ? 'Spanish Grand Prix' : eventFor(id, year); if (!name) continue;
  try {
    const ev = await eventDocuments(year, name); if (!ev?.records?.length) continue;
    const docs = ev.records.filter(r => /event notes|competition notes/i.test(r.title) && !r.recalled).sort((a, b) => Number(a.document_number || 0) - Number(b.document_number || 0));
    const rows = [];
    for (const doc of docs.slice(0, 2)) for (let p = 1; p <= 10; p++) {
      const r = JSON.parse((await fiaCall('fia_read_document', {url: doc.url, start_page: p, page_count: 1, limit: 16000})).content[0].text);
      for (const pg of r.pages || []) for (const row of pg.rows || []) { const t = row.cells.map(c => c.text).join(' ');
        if (/speed limit|km\/h/i.test(t) && /pit/i.test(t)) rows.push({doc: doc.title, url: doc.url, page: pg.page, text: t}); }
      if (!r.next_page) break;
    }
    const kph = [...new Set(rows.flatMap(r => [...r.text.matchAll(/(\d{2,3})\s?km\/h/gi)].map(m => +m[1])))];
    out.events.push({year, track: id, event: ev.event || name, kph, rows: rows.slice(0, 6)});
    console.log(year, id, kph.join('/') || '-', rows.length);
  } catch (err) { console.log(year, id, err.message); }
}
await writeFile('scripts/sim/data/learn/f1-pit-speed-raw.json', JSON.stringify(out, null, 1) + '\n');
