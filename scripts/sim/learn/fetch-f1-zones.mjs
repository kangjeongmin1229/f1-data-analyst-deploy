// F1 overtaking zones for the simulator map (owner 2026-11-15): 2026 Straight Mode zones and overtake detection/activation,
// 2025 DRS zones, and for circuits F1 left before 2025 the DRS zones of the last year raced there. Reads the FIA event documents
// (Race Director event notes, circuit maps, competition notes, power unit information) and keeps every text line that names a zone.
// Out: scripts/sim/data/learn/f1-zones-raw.json (lines only, documents not stored). Needs network: run in Actions (lapsim-learn.yml).
import {writeFileSync} from 'node:fs';
import {fiaCall, eventDocuments} from '../../../worker/fia.js';

const sleep = ms => new Promise(r => setTimeout(r, ms));
// FIA answers 429 when read fast: wait and retry
const call = async (name, args) => { for (let k = 0; ; k++) { try { await sleep(1500); return JSON.parse((await fiaCall(name, args)).content[0].text); } catch (e) { if (k < 6 && /429|timeout|ECONN|fetch failed/i.test(e.message)) { await sleep(20000 * (k + 1)); continue; } throw e; } } };
// a title with an apostrophe cuts the listed link ("…Race Directors"): rebuild it from the title
const fixUrl = (r, y, ev) => /\.pdf$/i.test(r.url) ? r.url : 'https://www.fia.com/sites/default/files/decision-document/' + encodeURIComponent(`${y} ${ev} - ${r.title}.pdf`).replace(/'/g, '%27');
// [year, FIA event name, simulator track id]; 2025 and 2026 events are added from the archive with NAME below
const HISTORIC = [[2020, 'Tuscan Grand Prix', 'mugello'], [2020, 'Sakhir Grand Prix', 'sakhir-outer'], [2021, 'Russian Grand Prix', 'sochi'], [2021, 'Turkish Grand Prix', 'istanbul'],
  [2020, 'Eifel Grand Prix', 'nurburgring-gp'], [2021, 'Portuguese Grand Prix', 'portimao'], [2019, 'German Grand Prix', 'hockenheim'], [2022, 'French Grand Prix', 'paul-ricard-f1'], [2019, 'Malaysian Grand Prix', 'kuala-lumpur']];
const NAME = {'Australian': 'melbourne', 'Chinese': 'shanghai', 'Japanese': 'suzuka', 'Bahrain': 'sakhir', 'Saudi Arabian': 'jeddah', 'Miami': 'miami', 'Emilia Romagna': 'imola', 'Monaco': 'monte-carlo',
  'Spanish': 'catalunya', 'Barcelona-Catalunya': 'catalunya', 'Barcelona': 'catalunya', 'Canadian': 'montreal', 'Austrian': 'spielberg', 'British': 'silverstone', 'Belgian': 'spa-francorchamps', 'Hungarian': 'hungaroring', 'Dutch': 'zandvoort',
  'Italian': 'monza', 'Azerbaijan': 'baku', 'Singapore': 'singapore', 'United States': 'austin', 'Mexico City': 'mexico-city', 'São Paulo': 'interlagos', 'Sao Paulo': 'interlagos', 'Las Vegas': 'las-vegas',
  'Qatar': 'lusail', 'Abu Dhabi': 'yas-marina-circuit', 'Madrid': 'madring'};
const want = /event notes|circuit map|competition notes|power unit information|drs/i, line = /\bDRS\b|detection|activation|straight[ -]?mode|\bSM\s?\d|\bOT\b|overtake|zone/i;
const out = [], log = [];
async function readAll(url) {
  const lines = []; let start = 1;
  for (let k = 0; k < 8 && start; k++) {
    const r = await call('fia_read_document', {url, start_page: start, page_count: 5});
    for (const p of r.pages || []) for (const row of p.rows || []) { const t = row.cells.map(c => c.text).join(' '); if (line.test(t)) lines.push({page: p.page, y: row.y, text: t, cells: row.cells}); }
    start = r.next_page;
  }
  return lines;
}
const only = process.env.ZONES_ONLY ? process.env.ZONES_ONLY.split(',') : null;
const events = [...HISTORIC];
for (const y of [2025, 2026]) {
  try { const a = await call('fia_list_archive', {year: y}); for (const e of a.records || []) { const k = Object.keys(NAME).find(n => e.event.startsWith(n + ' Grand Prix') || e.event === n + ' Grand Prix'); if (k) events.push([y, e.event, NAME[k]]); else log.push(`${y} ${e.event}: no track`); } }
  catch (e) { log.push(`${y} archive: ${e.message}`); }
}
for (const [y, ev, id] of events.filter(e => !only || only.includes(e[0] + ':' + e[2]))) {
  try {
    await sleep(2000); let d = null; for (let k = 0; k < 6 && !d; k++) { try { d = await eventDocuments(y, ev); break; } catch (e) { if (!/429/.test(e.message) || k === 5) throw e; await sleep(20000 * (k + 1)); } } if (!d) { log.push(`${y} ${ev}: not found`); continue; }
    const docs = d.records.filter(r => want.test(r.title) && !r.recalled && !/rescinded/i.test(r.title));
    // newest version of each kind first
    const pick = []; for (const kind of [/event notes/i, /circuit map/i, /competition notes/i, /power unit information/i, /drs/i]) { const r = docs.filter(x => kind.test(x.title)); if (r.length) pick.push(r[0]); }
    const got = [];
    for (const r of pick) { try { const url = fixUrl(r, y, d.event); got.push({title: r.title, url, published: r.published, lines: await readAll(url)}); } catch (e) { log.push(`${y} ${ev} ${r.title}: ${e.message}`); } }
    out.push({year: y, event: d.event, track: id, docs: got});
    console.log(y, d.event, id, got.map(g => g.title + ':' + g.lines.length).join(', '));
  } catch (e) { log.push(`${y} ${ev}: ${e.message}`); }
}
writeFileSync('scripts/sim/data/learn/f1-zones-raw.json', JSON.stringify({source: 'FIA F1 event documents (fia.com); zone lines only', events: out, log}, null, 1));
console.log(out.length, 'events', log);
