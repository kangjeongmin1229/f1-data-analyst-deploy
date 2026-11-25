// Step 35 A3 truth: official sector times of Formula E pole laps, from the Al Kamel "Classification Practice With Analysis" PDFs of the
// qualifying duels (Season 11 venues of the onboard clips). Needs network (Actions). Keeps only the text lines of the PDF (pdftotext
// -layout), no PDF file (rule 2.9). Out: fe-duel-analysis.json.
import {writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {officialArchive, officialSource} from '../../../worker/official.js';
const VENUES = /Jeddah|Miami|Shanghai|London|Monaco|Tokyo|S.o Pa/i, out = [], log = [], tmp = mkdtempSync('/tmp/fe-pdf-');
const list = async id => { for (let i = 0; ; i++) { try { return await officialArchive('formula-e', id); } catch (e) { if (i >= 2) { log.push(`${id}: ${e.message}`); return {catalogs: [], files: []}; } await new Promise(r => setTimeout(r, 2000 * (i + 1))); } } };
const season = (await list()).catalogs.find(c => /Season 11/.test(c.name));
for (const ev of (await list(season.id)).catalogs.filter(e => VENUES.test(e.name)))
  for (const champ of (await list(ev.id)).catalogs.filter(c => /formula e/i.test(c.name)))
    for (const se of (await list(champ.id)).catalogs.filter(s => /Duel/i.test(s.name))) {
      for (const f of (await list(se.id)).files.filter(f => /Analysis/i.test(f.title) && /pdf/i.test(f.format || f.url))) {
        try { const b = (await officialSource(f.url)).bytes, p = `${tmp}/x.pdf`; writeFileSync(p, b);
          const text = execFileSync('pdftotext', ['-layout', p, '-'], {encoding: 'utf8'}); out.push({event: ev.name, session: se.name, title: f.title, url: f.url, lines: text.split('\n').filter(l => l.trim())}); }
        catch (e) { log.push(`${ev.name} ${se.name} ${f.title}: ${e.message}`); } } }
writeFileSync('fe-duel-analysis.json', JSON.stringify({source: 'https://results.fiaformulae.com/ (Al Kamel Systems)', files: out, log}, null, 1));
console.log(out.length, 'PDFs', log.length, 'errors', log.slice(0, 5));
