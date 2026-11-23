// Step 5a (Project claude/gate-track-state-prereg-2026-11-23.md): track-state registry per track and year (2019–2026).
// Read-only use of the FIA parser (worker/lapsim/track-changes.js) and of the stored notes (track-changes-data.js).
//   node scripts/sim/track-state.mjs fia 2019,2020,2021,2022   FIA notes → .cache/track-state/fia-notes.json (needs fia.com)
//   node scripts/sim/track-state.mjs ti 2018,...,2026          TI qualifying corner minima → .cache/track-state/corners.json
//   node scripts/sim/track-state.mjs build                     registry, effects, docs (no network)
import {mkdirSync, readFileSync, writeFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';

const CACHE = process.env.TRACK_STATE_CACHE || '.cache/track-state';
const [cmd, arg] = process.argv.slice(2);
const save = (f, x) => { mkdirSync(dirname(f), {recursive: true}); writeFileSync(f, JSON.stringify(x)); };

// FIA archive event names of each simulator track (all seasons). The first event of a season at a track carries the changes;
// a second event the same year (Styrian, 70th Anniversary) is read too and merged. Sakhir GP 2020 is the outer loop: another track.
export const FIA_EVENTS = {
  melbourne: ['Australian Grand Prix'], shanghai: ['Chinese Grand Prix'], suzuka: ['Japanese Grand Prix'], sakhir: ['Bahrain Grand Prix'],
  jeddah: ['Saudi Arabian Grand Prix'], miami: ['Miami Grand Prix'], montreal: ['Canadian Grand Prix'], 'monte-carlo': ['Monaco Grand Prix'],
  catalunya: ['Spanish Grand Prix', 'Barcelona-Catalunya Grand Prix'], spielberg: ['Austrian Grand Prix', 'Styrian Grand Prix'],
  silverstone: ['British Grand Prix', '70th Anniversary Grand Prix'], 'spa-francorchamps': ['Belgian Grand Prix'], hungaroring: ['Hungarian Grand Prix'],
  zandvoort: ['Dutch Grand Prix'], monza: ['Italian Grand Prix'], madring: ['Spanish Grand Prix'], baku: ['Azerbaijan Grand Prix'],
  singapore: ['Singapore Grand Prix'], austin: ['United States Grand Prix'], 'mexico-city': ['Mexican Grand Prix', 'Mexico City Grand Prix'],
  interlagos: ['Brazilian Grand Prix', 'São Paulo Grand Prix'], 'las-vegas': ['Las Vegas Grand Prix'], lusail: ['Qatar Grand Prix'],
  'yas-marina-circuit': ['Abu Dhabi Grand Prix'], imola: ['Emilia Romagna Grand Prix'], 'kuala-lumpur': ['Bahrain Grand Prix'],
};
// which track an event name means in a year (Spanish GP: Catalunya until 2025, Madring from 2026; Bahrain GP 2026 ran at Sepang)
export function eventsOf(id, year) {
  if (id === 'madring') return year >= 2026 ? FIA_EVENTS.madring : [];
  if (id === 'catalunya') return year >= 2026 ? ['Barcelona-Catalunya Grand Prix'] : ['Spanish Grand Prix'];
  if (id === 'kuala-lumpur') return year === 2026 ? FIA_EVENTS[id] : [];
  if (id === 'sakhir' && year === 2026) return [];
  return FIA_EVENTS[id] || [];
}

async function fetchFia(years) {
  const {fiaCall, eventDocuments} = await import('../../worker/fia.js');
  const {parseTrackChanges} = await import('../../worker/lapsim/track-changes.js');
  const NOTES = /event notes|competition notes/i;
  const readAll = async url => {
    const pages = [];
    for (let start = 1; start < 60;) {
      const r = JSON.parse((await fiaCall('fia_read_document', {url, start_page: start, page_count: 5, limit: 16000})).content[0].text);
      if (!r.pages?.length) break;
      pages.push(...r.pages.map(p => p.text));
      if (!r.next_page) break;
      start = r.next_page;
    }
    return pages.join('\n');
  };
  const f = join(CACHE, 'fia-notes.json'), out = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  for (const year of years) {
    let names;
    try { names = JSON.parse((await fiaCall('fia_list_archive', {year})).content[0].text).records.map(r => r.event); }
    catch (e) { console.log(`${year}: archive ${e.message}`); continue; }
    for (const id of Object.keys(FIA_EVENTS)) { const list = []; for (const name of eventsOf(id, year).filter(n => names.includes(n))) {
      try {
        const ev = await eventDocuments(year, name);
        const docs = (ev?.records || []).filter(r => NOTES.test(r.title) && !r.recalled && !/SC2|SC1|times/i.test(r.title));
        docs.sort((a, b) => (Number(b.title.match(/V(\d+)\b/)?.[1] || 1) - Number(a.title.match(/V(\d+)\b/)?.[1] || 1)) || (Number(b.document_number || 0) - Number(a.document_number || 0)));
        const doc = docs[0];
        if (!doc) { console.log(`${id} ${year} ${name}: no notes`); list.push({event: name, document: null, sectionFound: false, changes: []}); continue; }
        const parsed = parseTrackChanges(await readAll(doc.url));
        list.push({event: name, document: {title: doc.title, url: doc.url, published: doc.published || null},
          sectionFound: parsed.sectionFound, changes: parsed.changes.map(({source, effect, ...c}) => c)});
        console.log(`${id} ${year} ${name}: ${parsed.changes.length} changes (section ${parsed.sectionFound})`);
      } catch (e) { console.log(`${id} ${year} ${name}: ${e.message}`); list.push({event: name, error: e.message, changes: []}); }
    } if (list.length) (out[id] ||= {})[year] = list; }
    save(f, out);
  }
}

if (cmd === 'fia') await fetchFia(String(arg || '2019,2020,2021,2022').split(',').map(Number));
