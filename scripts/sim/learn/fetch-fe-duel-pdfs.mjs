// Step 35 A3 truth: official sector times of Formula E pole laps, from the Al Kamel "Classification Practice With Analysis" PDFs of the
// qualifying duels (Season 11 venues of the onboard clips). Needs network (Actions). The PDFs carry a copyright notice: only the parsed
// lap rows (car, lap, time, three sectors) are kept, no PDF and no text (rule 2.9; central 78/100). Out: fe-duel-analysis.json.
import {writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const T = '(\\d+:\\d\\d\\.\\d{3}|\\d\\d\\.\\d{3})', D = '(\\d+\\.\\d{3})';
const ROW = new RegExp(`^\\s*(\\d+)\\s+${T}\\s+${D}\\s+${D}\\s+${D}\\b`), sec = t => t.split(':').reduce((a, x) => a * 60 + +x, 0);
// Analysis block: two cars side by side; a line of two car numbers, then lap rows (lap, time, S1, S2, S3, kph, elapsed) per car
export function parseAnalysis(text) {
  const L = text.split('\n'), rows = []; let cars = null, on = false;
  for (const l of L) {
    if (/^\s*ANALYSIS\s*$/.test(l)) { on = true; continue; }
    if (!on) continue;
    const c = l.match(/^\s*(\d{1,3})\s{3,}\S.*?\s{3,}(\d{1,3})\s{3,}\S/); if (c && !ROW.test(l)) { cars = [+c[1], +c[2]]; continue; }
    if (!cars) continue;
    let rest = l;
    for (const car of cars) { const m = rest.match(ROW); if (!m) break;
      rows.push({car, lap: +m[1], time: sec(m[2]), s1: +m[3], s2: +m[4], s3: +m[5]}); rest = rest.slice(m.index + m[0].length).replace(/^\s+[\d.]+\s+[\d:.]+/, ''); }
  }
  return rows;
}
if (process.argv[2] === '--selftest') {
  const r = parseAnalysis(`ANALYSIS\n   33          Cupra Kiro                Porsche 99X     37           Jaguar TCS Racing     Jaguar I-Type 7\n      1      1:07.278                23.912        22.368         20.998 105.3            1:07.278               1      1:07.494                  23.980        22.420       21.094 104.9            1:07.494`);
  if (JSON.stringify(r) !== JSON.stringify([{car: 33, lap: 1, time: 67.278, s1: 23.912, s2: 22.368, s3: 20.998}, {car: 37, lap: 1, time: 67.494, s1: 23.98, s2: 22.42, s3: 21.094}])) throw new Error('selftest: ' + JSON.stringify(r));
  console.log('selftest ok'); process.exit(0);
}
import {officialArchive, officialSource} from '../../../worker/official.js';
if (import.meta.url === `file://${process.argv[1]}`) {
const VENUES = /Jeddah|Miami|Shanghai|London|Monaco|Tokyo|S.o Pa/i, out = [], log = [], tmp = mkdtempSync('/tmp/fe-pdf-');
const list = async id => { for (let i = 0; ; i++) { try { return await officialArchive('formula-e', id); } catch (e) { if (i >= 2) { log.push(`${id}: ${e.message}`); return {catalogs: [], files: []}; } await new Promise(r => setTimeout(r, 2000 * (i + 1))); } } };
const season = (await list()).catalogs.find(c => /Season 11/.test(c.name));
for (const ev of (await list(season.id)).catalogs.filter(e => VENUES.test(e.name)))
  for (const champ of (await list(ev.id)).catalogs.filter(c => /formula e/i.test(c.name)))
    for (const se of (await list(champ.id)).catalogs.filter(s => /Duel/i.test(s.name))) {
      for (const f of (await list(se.id)).files.filter(f => /Analysis/i.test(f.title) && /pdf/i.test(f.format || f.url))) {
        try { const b = (await officialSource(f.url)).bytes, p = `${tmp}/x.pdf`; writeFileSync(p, b);
          const text = execFileSync('pdftotext', ['-layout', p, '-'], {encoding: 'utf8'}); out.push({event: ev.name, session: se.name, title: f.title, url: f.url, rows: parseAnalysis(text)}); }
        catch (e) { log.push(`${ev.name} ${se.name} ${f.title}: ${e.message}`); } } }
writeFileSync('fe-duel-analysis.json', JSON.stringify({source: 'https://results.fiaformulae.com/ (Al Kamel Systems)', files: out, log}, null, 1));
console.log(out.length, 'PDFs', log.length, 'errors', log.slice(0, 5));
}
