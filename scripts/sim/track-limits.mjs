// Track-limit catalogue (step 4a, data only): reads the "Track limits" text in the FIA F1 Race Director's
// Event / Competition Notes and stores, per track and year, the corners where track limits apply and how they
// are judged (white line, kerb edge, detection loop, other). No lap uses this yet (step 4b).
// Run: node scripts/sim/track-limits.mjs            fetch 2019–2026 from fia.com (needs network)
//      node scripts/sim/track-limits.mjs --reparse  re-parse the stored raw section text only
import {writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {cornerRefs} from '../../worker/lapsim/track-changes.js';

// "17. | Track Limits", "9.4 | Track limits at Turn 4" or an unnumbered "Track Limits" line
const HEAD = /^\s*(?:(\d{1,2})(\.\d{1,2})?\.?\s*\|\s*[^\n|]{0,40}\btrack[- ]limits?\b[^\n]{0,60}|Track[- ]limits?\b[^\n.]{0,50})$/i;
const SUB = /^\s*\d{1,2}\.\d{1,2}\.?\s*\|/;
const NEXT = /^\s*(\d{1,2})\.\s*\|?\s*[A-Z“"][^\n]{2,90}$/;
const ALL = /\ball (?:the )?(?:corners|turns)\b|\bentire (?:circuit|track)\b|\bthroughout the (?:circuit|lap)\b|\bat every corner\b/i;
const PLACE = /\b(?:corner|kerb|curb|exit|apex|bollard|chicane|hairpin|loop|sausage)\b/i;

// rule type of one sentence; a loop or kerb edge is more specific than "white line"
export function ruleOf(s) {
  if (/\bloops?\b|timing line|detection (?:line|system)/i.test(s)) return 'loop';
  if (/\bkerbs?\b|\bcurbs?\b/i.test(s) && !/\bwhite lines?\b[^.]*\bnot\b[^.]*\bkerb/i.test(s)) return 'kerb';
  if (/\bwhite lines?\b|\btrack edge|\bedges? of the track/i.test(s)) return 'line';
  return 'other';
}

// Track-limit sections of one notes text (pages joined with newlines, cells joined with " | ").
export function trackLimitSections(text) {
  const lines = String(text || '').split(/\r?\n/), out = [];
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(HEAD);
    // a heading is short and is not a sentence ending in a full stop
    if (!h || lines[i].length > 110 || /\.\s*$/.test(lines[i])) continue;
    const own = Number(h[1] || 0), sub = !!h[2], body = [lines[i].replace(/\s*\|\s*/g, ' ').trim()];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const n = lines[j].match(NEXT);
      if (n && (!own || Number(n[1]) !== own)) break;
      if (sub && SUB.test(lines[j])) break;
      if (/^\s*\d{1,3}\s*$/.test(lines[j])) continue; // page number
      body.push(lines[j].replace(/\s*\|\s*/g, ' ').trim());
    }
    out.push(body.filter(Boolean).join(' '));
    i = j - 1;
  }
  return out;
}

// Corners, rules and unparsed lines from the sections' text.
export function parseTrackLimits(sections) {
  const corners = [], unparsed = [], seen = new Set();
  let allCorners = false;
  const sentences = sections.flatMap(s => s.split(/(?<=[a-z0-9)”"])\.\s+(?=[A-Z“"(])/)).map(s => s.trim()).filter(Boolean);
  for (const s of sentences) {
    if (ALL.test(s)) allCorners = true;
    const refs = cornerRefs(s);
    if (!refs.length) { if (PLACE.test(s) && !ALL.test(s)) unparsed.push(s); continue; }
    const rule = ruleOf(s);
    for (const r of refs) {
      const key = r.turn + r.letter + rule;
      if (seen.has(key)) continue;
      seen.add(key);
      corners.push({turn: r.turn, ...(r.letter ? {letter: r.letter} : {}), rule, text: s.slice(0, 400)});
    }
  }
  corners.sort((a, b) => a.turn - b.turn || (a.letter || '').localeCompare(b.letter || ''));
  return {corners, allCorners, unparsed};
}

export function entryFrom(meta, sections) {
  const p = parseTrackLimits(sections);
  const status = !meta.doc ? 'no document' : p.corners.length || p.allCorners ? 'parsed' : 'unparsed';
  return {track: meta.track, year: meta.year, series: 'f1', event: meta.event || null, status, ...p,
    doc: meta.doc || null, sectionFound: sections.length > 0, raw: sections.join('\n').slice(0, 6000)};
}

// Simulator track → FIA event names (2019–2026). Sakhir GP 2020 used the outer loop: kept, flagged by its name.
export const EVENTS = {
  sakhir: [/^Bahrain Grand Prix$/i, /^Sakhir Grand Prix$/i], jeddah: [/^Saudi Arabian Grand Prix$/i],
  imola: [/^Emilia Romagna Grand Prix$/i], interlagos: [/^(?:Brazilian|S[aã]o Paulo) Grand Prix$/i],
  'las-vegas': [/^Las Vegas Grand Prix$/i], lusail: [/^Qatar Grand Prix$/i], 'yas-marina-circuit': [/^Abu Dhabi Grand Prix$/i],
  melbourne: [/^Australian Grand Prix$/i], shanghai: [/^Chinese Grand Prix$/i], suzuka: [/^Japanese Grand Prix$/i],
  miami: [/^Miami Grand Prix$/i], montreal: [/^Canadian Grand Prix$/i], 'monte-carlo': [/^Monaco Grand Prix$/i],
  catalunya: [/^Spanish Grand Prix$/i, /^Barcelona-Catalunya Grand Prix$/i], spielberg: [/^Austrian Grand Prix$/i, /^Styrian Grand Prix$/i],
  silverstone: [/^British Grand Prix$/i, /^70th Anniversary Grand Prix$/i], 'spa-francorchamps': [/^Belgian Grand Prix$/i],
  hungaroring: [/^Hungarian Grand Prix$/i], zandvoort: [/^Dutch Grand Prix$/i], monza: [/^Italian Grand Prix$/i],
  madring: [/^Spanish Grand Prix$/i], baku: [/^Azerbaijan Grand Prix$/i], 'kuala-lumpur': [/^Bahrain Grand Prix$/i],
  singapore: [/^Singapore Grand Prix$/i], austin: [/^United States Grand Prix$/i], 'mexico-city': [/^Mexic(?:an|o City) Grand Prix$/i],
};
// 2026: the Spanish GP moved to Madring and the Bahrain GP ran at Sepang (worker/lapsim/names.js)
export function tracksFor(event, year) {
  return Object.entries(EVENTS).filter(([id, res]) => res.some(r => r.test(event))
    && !(id === 'madring' && year !== 2026) && !(id === 'catalunya' && year === 2026 && /^Spanish/i.test(event))
    && !(id === 'kuala-lumpur' && year !== 2026) && !(id === 'sakhir' && year === 2026)).map(([id]) => id);
}

const NOTES = /race director'?s? (?:event|competition) notes|^(?:doc \d+ - )?(?:event|competition) notes(?: v\d+)?$|track limits?/i;
const rank = d => (/race director/i.test(d.title) ? 0 : /track limit/i.test(d.title) ? 1 : 2) * 100 - Number(d.title.match(/\bV(\d+)\b/i)?.[1] || 1);

async function fetchAll(years) {
  const {fiaCall, eventDocuments, fiaDocumentText} = await import('../../worker/fia.js');
  const out = [];
  for (const year of years) {
    let events;
    try { events = JSON.parse((await fiaCall('fia_list_archive', {year})).content[0].text).records.map(r => r.event); }
    catch (e) { console.log(`${year}: archive ${e.message}`); continue; }
    for (const event of events) for (const track of tracksFor(event, year)) {
      const meta = {track, year, event};
      try {
        const ev = await eventDocuments(year, event);
        const docs = (ev?.records || []).filter(d => d.url && !d.recalled && NOTES.test(d.title) && !/pirelli|pit lane|circuit map|red zone|times|sc[12]\b/i.test(d.title)).sort((a, b) => rank(a) - rank(b));
        let sections = [];
        for (const d of docs.slice(0, 3)) {
          meta.doc = {title: d.title, url: d.url, published: d.published || null};
          sections = trackLimitSections(await fiaDocumentText(d.url, 30));
          if (sections.length) break;
        }
        const e = entryFrom(meta, sections);
        out.push(e);
        console.log(`${track} ${year} ${event}: ${e.status}, ${e.corners.length} corners${e.allCorners ? ' + all' : ''}, ${e.unparsed.length} unparsed`);
      } catch (err) { out.push({...entryFrom(meta, []), error: err.message}); console.log(`${track} ${year}: ${err.message}`); }
    }
  }
  return out;
}

const write = rows => writeFile('worker/lapsim/track-limits-data.js', `// Generated by scripts/sim/track-limits.mjs from FIA Race Director's Event / Competition Notes ("Track limits").\n// Data only (step 4a): not used by any lap. raw = the section text the corners were read from.\nexport const lapsimTrackLimits=${JSON.stringify(rows)};\n`);

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  if (process.argv.includes('--reparse')) {
    const {lapsimTrackLimits} = await import('../../worker/lapsim/track-limits-data.js');
    await write(lapsimTrackLimits.map(r => r.series !== 'f1' ? r : {...entryFrom(r, r.raw ? r.raw.split('\n') : []), ...(r.error ? {error: r.error} : {})}));
  } else {
    const years = (process.env.TL_YEARS || '2019,2020,2021,2022,2023,2024,2025,2026').split(',').map(Number);
    await write(await fetchAll(years));
  }
}
