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

// worker/fia.js reads hrefs up to the first quote of either kind, so a 2019–2021 file name with an apostrophe ("Race Directors' Event
// Notes") comes back cut; this reads the event page's double-quoted hrefs itself and keeps the FIA reader for the PDFs.
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function fiaHtml(url) {
  for (let k = 0; k < 6; k++) {
    const r = await fetch(url, {headers: {Accept: 'text/html'}, signal: AbortSignal.timeout(30000)});
    if (r.status === 429 || r.status >= 500) { await sleep(15000 * (k + 1)); continue; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.text();
  }
  throw new Error('HTTP 429 (gave up)');
}
const decodeHtml = s => s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'");
function eventDocs(html) {
  return [...html.matchAll(/<li\b[^>]*class="[^"]*\bdocument-row\b[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)].map(m => {
    const href = m[1].match(/<a\b[^>]*href="([^"]+)"/i)?.[1], title = decodeHtml((m[1].match(/class="[^"]*\btitle\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    const published = (m[1].match(/class="[^"]*\bpublished\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
    return href ? {title, url: new URL(decodeHtml(href), 'https://www.fia.com').href.replace(/'/g, '%27'), published, recalled: /recall/i.test(m[0].slice(0, 300) + title)} : null;
  }).filter(Boolean);
}
// the Race Director's own notes (not a summons that cites them, not the Pirelli preview); highest version
export function pickNotes(docs) {
  const ok = docs.filter(r => /race director/i.test(r.title) && /event notes|competition notes/i.test(r.title) && !r.recalled
    && !/summons|decision|offence|infringement|penalt|reprimand|SC1|SC2|times/i.test(r.title));
  const v = t => Number(t.match(/\bV(\d+)\b/)?.[1] || 1);
  return ok.sort((a, b) => v(b.title) - v(a.title) || (Number(b.title.match(/Doc\s*(\d+)/i)?.[1] || 0) - Number(a.title.match(/Doc\s*(\d+)/i)?.[1] || 0)))[0] || null;
}

async function fetchFia(years) {
  const {fiaCall} = await import('../../worker/fia.js');
  const {parseTrackChanges} = await import('../../worker/lapsim/track-changes.js');
  const call = async (name, args) => {
    for (let k = 0; k < 6; k++) {
      try { return JSON.parse((await fiaCall(name, args)).content[0].text); }
      catch (e) { if (!/429|50\d/.test(e.message) || k === 5) throw e; await sleep(15000 * (k + 1)); }
    }
  };
  const readAll = async url => {
    const pages = [];
    for (let start = 1; start < 60;) {
      await sleep(1500);
      const r = await call('fia_read_document', {url, start_page: start, page_count: 5, limit: 16000});
      if (!r.pages?.length) break;
      pages.push(...r.pages.map(p => p.text));
      if (!r.next_page) break;
      start = r.next_page;
    }
    return pages.join('\n');
  };
  const f = join(CACHE, 'fia-notes.json'), out = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  for (const year of years) {
    let index;
    try { index = (await call('fia_list_archive', {year})).records; }
    catch (e) { console.log(`${year}: archive ${e.message}`); continue; }
    for (const id of Object.keys(FIA_EVENTS)) {
      if (out[id]?.[year]?.every(x => !x.error)) continue;
      const list = [];
      for (const ev of index.filter(r => eventsOf(id, year).includes(r.event))) {
        try {
          await sleep(1500);
          const doc = pickNotes(eventDocs(await fiaHtml(ev.url)));
          if (!doc) { console.log(`${id} ${year} ${ev.event}: no notes`); list.push({event: ev.event, document: null, sectionFound: false, changes: []}); continue; }
          const parsed = parseTrackChanges(await readAll(doc.url));
          list.push({event: ev.event, document: {title: doc.title, url: doc.url, published: doc.published}, sectionFound: parsed.sectionFound,
            changes: parsed.changes.map(({source, effect, ...c}) => c)});
          console.log(`${id} ${year} ${ev.event}: ${parsed.changes.length} changes (section ${parsed.sectionFound}) ${doc.title}`);
        } catch (e) { console.log(`${id} ${year} ${ev.event}: ${e.message}`); list.push({event: ev.event, error: e.message, changes: []}); }
      }
      if (list.length) (out[id] ||= {})[year] = list;
      save(f, out);
    }
  }
}

if (cmd === 'fia') await fetchFia(String(arg || '2019,2020,2021,2022').split(',').map(Number));

// ---- TracingInsights qualifying corner minima (one source for every year, prereg section 3) ----
const TI_RAW = join(CACHE, 'ti');
const num = v => v === 'None' || v == null || !Number.isFinite(+v) ? null : +v;
const median = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? (s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2 : NaN; };
async function tiGet(year, path) {
  const f = join(TI_RAW, String(year), path);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/TracingInsights/${year}/main/${path.split('/').map(encodeURIComponent).join('/')}`, {signal: AbortSignal.timeout(60000)});
      if (r.status === 404) return null;
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const t = await r.text(); mkdirSync(dirname(f), {recursive: true}); writeFileSync(f, t); return JSON.parse(t);
    } catch (e) { if (k === 2) throw e; }
  }
}
const SLICK = new Set(['SOFT', 'MEDIUM', 'HARD', 'ULTRASOFT', 'SUPERSOFT', 'HYPERSOFT']);
// Fastest clean dry lap of each of the top 5 drivers; corner minimum speed ±40 m around each corner of that session's corner map
async function tiSession(year, event) {
  const dir = `${event}/Qualifying`, dj = await tiGet(year, `${dir}/drivers.json`), cj = await tiGet(year, `${dir}/corners.json`);
  if (!dj || !cj?.Distance) return null;
  const best = [];
  let rain = 0;
  for (const d of dj.drivers) {
    const lt = await tiGet(year, `${dir}/${d.driver}/laptimes.json`).catch(() => null); if (!lt) continue;
    let b = null;
    lt.time.forEach((t, i) => {
      if (lt.wR?.[i] === true) rain++;
      const lap = num(t);
      if (lap == null || lt.del?.[i] === true || lt.wR?.[i] === true || !SLICK.has(lt.compound?.[i])) return;
      if (!b || lap < b.lap) b = {driver: d.driver, n: lt.lap[i], lap};
    });
    if (b) best.push(b);
  }
  best.sort((a, b) => a.lap - b.lap);
  const refLen = Math.max(...cj.SectionEndDistance || [0]) || null, labels = cj.CornerNumber.map((n, i) => n + (cj.CornerLetter?.[i] || ''));
  const per = {}; let used = 0;
  for (const b of best.slice(0, 5)) {
    const tel = (await tiGet(year, `${dir}/${b.driver}/${b.n}_tel.json`).catch(() => null))?.tel; if (!tel?.distance?.length) continue;
    const L = tel.distance.at(-1), scale = refLen ? L / refLen : 1; used++;
    labels.forEach((k, i) => {
      const c = cj.Distance[i] * scale; let v = Infinity;
      for (let j = 0; j < tel.distance.length; j++) if (Math.abs(tel.distance[j] - c) <= 40 && Number.isFinite(tel.speed[j])) v = Math.min(v, tel.speed[j]);
      if (Number.isFinite(v)) (per[k] ||= []).push(v);
    });
  }
  return {event, layoutYear: cj.LayoutYear ?? null, laps: used, poleLap: best[0]?.lap ?? null, rainLaps: rain,
    corners: Object.fromEntries(Object.entries(per).map(([k, a]) => [k, {v: median(a), n: a.length, spread: median(a.map(x => Math.abs(x - median(a))))}]))};
}
async function fetchTi(years) {
  const f = join(CACHE, 'corners.json'), out = existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
  for (const year of years) {
    for (const id of Object.keys(FIA_EVENTS)) {
      if (out[id]?.[year]) continue;
      for (const name of eventsOf(id, year)) {
        const s = await tiSession(year, name).catch(e => (console.log(`${id} ${year} ${name}: ${e.message}`), null));
        if (s?.laps) { (out[id] ||= {})[year] = s; console.log(`${id} ${year} ${name}: ${s.laps} laps, ${Object.keys(s.corners).length} corners, layout ${s.layoutYear}`); break; }
      }
    }
    save(f, out);
  }
}
if (cmd === 'ti') await fetchTi(String(arg || '2018,2019,2020,2021,2022,2023,2024,2025,2026').split(',').map(Number));

// ---- altitude: Open-Meteo elevation API (Copernicus DEM GLO-90) at the track coordinates of track-coords.js ----
async function fetchAltitude() {
  const {TRACK_LL} = await import('../../worker/lapsim/track-coords.js');
  const ids = Object.keys(TRACK_LL), out = {};
  for (let i = 0; i < ids.length; i += 50) {
    const part = ids.slice(i, i + 50), q = part.map(id => TRACK_LL[id]);
    const url = `https://api.open-meteo.com/v1/elevation?latitude=${q.map(x => x[0]).join(',')}&longitude=${q.map(x => x[1]).join(',')}`;
    const r = await (await fetch(url, {signal: AbortSignal.timeout(30000)})).json();
    part.forEach((id, k) => { out[id] = {m: r.elevation[k], lat: TRACK_LL[id][0], lon: TRACK_LL[id][1]}; });
  }
  save(join(CACHE, 'altitude.json'), {source: 'Open-Meteo elevation API (Copernicus DEM GLO-90, 90 m), at worker/lapsim/track-coords.js', url: 'https://open-meteo.com/en/docs/elevation-api', retrieved: new Date().toISOString().slice(0, 10), tracks: out});
  console.log(Object.keys(out).length, 'altitudes');
}
if (cmd === 'alt') await fetchAltitude();
