// Circuit-map pictures for F1 zone reading (owner 2026-11-15: where the FIA map has no text, read the zones from the picture).
// Downloads the FIA circuit map of each listed event and renders its map page to PNG (poppler pdftoppm) for review; derived zone
// positions are written by hand into scripts/sim/data/learn/f1-zones-visual.json. Pictures stay on this branch only, never on main.
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {eventDocuments} from '../../../worker/fia.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const LIST = [[2025, 'Australian Grand Prix', 'melbourne'], [2025, 'Bahrain Grand Prix', 'sakhir'], [2025, 'Chinese Grand Prix', 'shanghai'], [2025, 'Japanese Grand Prix', 'suzuka'],
  [2025, 'Miami Grand Prix', 'miami'], [2025, 'Monaco Grand Prix', 'monte-carlo'], [2025, 'Saudi Arabian Grand Prix', 'jeddah'], [2020, 'Tuscan Grand Prix', 'mugello'],
  [2020, 'Sakhir Grand Prix', 'sakhir-outer'], [2021, 'Russian Grand Prix', 'sochi'], [2021, 'Turkish Grand Prix', 'istanbul'], [2021, 'Portuguese Grand Prix', 'portimao'], [2019, 'German Grand Prix', 'hockenheim']];
const OUT = 'scripts/sim/data/learn/zone-maps'; mkdirSync(OUT, {recursive: true});
const log = [];
for (const [y, ev, id] of LIST) {
  try {
    await sleep(3000);
    const d = await eventDocuments(y, ev); if (!d) { log.push(`${y} ${ev}: not found`); continue; }
    const doc = d.records.find(r => /circuit map/i.test(r.title) && !r.recalled); if (!doc) { log.push(`${y} ${ev}: no circuit map`); continue; }
    let res; for (let k = 0; k < 5; k++) { res = await fetch(doc.url, {headers: {'user-agent': 'Mozilla/5.0 kongboda-lapsim'}}); if (res.status !== 429) break; await sleep(20000 * (k + 1)); }
    if (!res.ok) { log.push(`${y} ${ev}: HTTP ${res.status}`); continue; }
    const pdf = `/tmp/${y}-${id}.pdf`; writeFileSync(pdf, Buffer.from(await res.arrayBuffer()));
    const pages = Number((execFileSync('pdfinfo', [pdf]).toString().match(/Pages:\s+(\d+)/) || [])[1] || 1);
    for (let p = 1; p <= Math.min(pages, 3); p++) execFileSync('pdftoppm', ['-f', String(p), '-l', String(p), '-r', '110', '-png', '-singlefile', pdf, `${OUT}/${y}-${id}-p${p}`]);
    log.push(`${y} ${ev}: ${doc.title} (${pages} pages)`); console.log(log.at(-1));
  } catch (e) { log.push(`${y} ${ev}: ${e.message}`); }
}
writeFileSync(`${OUT}/index.json`, JSON.stringify({log}, null, 1));
