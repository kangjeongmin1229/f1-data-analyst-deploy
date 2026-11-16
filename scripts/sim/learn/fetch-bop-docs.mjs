// BoP decision PDFs from the Al Kamel notice boards (WEC and ELMS), 2024-2026, for the BoP simulator (owner 2026-11-16):
// WEC LMGT3 tables 2024-2025 (published) and ELMS LMGT3/LMP3 committee decisions (e.g. ELMS_2026_D12_LMGT3_BOP_CAS).
// The notice-board manifest names are read from each site's own JavaScript (no guessing), then every file whose title says BOP
// is downloaded and turned into layout text with pdftotext. Text only is kept (small, parsed by scripts/sim/gt3-bop-estimate.mjs).
// Runs in GitHub Actions (lapsim-learn.yml): the shell of a Claude session cannot reach Al Kamel.
// Out: scripts/sim/data/learn/bop-docs/<series>/<season>/<file>.txt and scripts/sim/data/learn/bop-docs/index.json
import {mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';

const OUT = 'scripts/sim/data/learn/bop-docs';
const SITES = {wec: 'https://fiawec.alkamelsystems.com/', elms: 'https://elms.alkamelsystems.com/'};
const get = async (url, as = 'text') => { const r = await fetch(url, {headers: {'user-agent': 'Mozilla/5.0 kongboda-learn'}}); if (!r.ok) throw Error(`${r.status} ${url}`); return as === 'buf' ? Buffer.from(await r.arrayBuffer()) : r.text(); };
const flat = (nodes, folders = [], out = []) => { for (const n of nodes ?? []) { if (n.url) out.push({title: n.name, url: new URL(n.url, 'https://files.alkamelcloud.com/').href, folders}); else flat(n.children, [...folders, n.name].filter(Boolean), out); } return out; };
const index = {generated: new Date().toISOString(), probe: {}, files: []};

for (const [series, site] of Object.entries(SITES)) {
  // 1. manifest names from the site bundle (results.json is known; the notice board / committee ones sit next to it)
  const names = new Set();
  try {
    const html = await get(site);
    for (const js of new Set([...html.matchAll(/(?:src|href)="([^"]+\.js)"/g)].map(m => new URL(m[1], site).href))) {
      let code; try { code = await get(js); } catch { continue; }
      for (const m of code.matchAll(/manifests\/([A-Za-z0-9_\-]+)\.json/g)) names.add(m[1]);
      for (const m of code.matchAll(/["'`]([a-z_]*(?:notice|committee)[a-z_]*)["'`]/gi)) names.add(m[1]);
    }
  } catch (e) { console.log(series, 'site', e.message); }
  for (const n of ['results', 'committee', 'notice_boards', 'noticeboard', 'notice_board', 'decisions']) names.add(n);
  const probe = index.probe[series] = {};
  for (const n of names) {
    const url = `https://files.alkamelcloud.com/${series}/manifests/${n}.json`;
    let data; try { data = JSON.parse(await get(url)); } catch (e) { probe[n] = String(e.message).slice(0, 60); continue; }
    probe[n] = {type: data.type, seasons: (data.seasons || []).map(s => s.name)};
    for (const s of (data.seasons || []).filter(s => /202[4-6]/.test(s.name))) {
      let m; try { m = JSON.parse(await get(new URL(s.manifestUrl, 'https://files.alkamelcloud.com/').href)); } catch (e) { console.log(series, n, s.name, e.message); continue; }
      const files = flat(m.folders).filter(f => /\.pdf$/i.test(new URL(f.url).pathname) && /\bBO?P\b|_BOP|balance of performance/i.test(f.title + ' ' + new URL(f.url).pathname));
      console.log(series, n, s.name, 'BoP files', files.length);
      for (const f of files) {
        const year = s.name.match(/20\d\d/)[0], base = decodeURIComponent(new URL(f.url).pathname.split('/').pop()).replace(/\.pdf$/i, '').replace(/[^\w.\-]+/g, '_');
        if (index.files.some(x => x.series === series && x.base === base)) continue;
        try {
          const pdf = await get(f.url, 'buf'); await mkdir(`/tmp/bop`, {recursive: true}); await writeFile(`/tmp/bop/${base}.pdf`, pdf);
          const text = execFileSync('pdftotext', ['-layout', `/tmp/bop/${base}.pdf`, '-'], {encoding: 'utf8'});
          await mkdir(`${OUT}/${series}/${year}`, {recursive: true}); await writeFile(`${OUT}/${series}/${year}/${base}.txt`, text);
          index.files.push({series, year, base, title: f.title, folders: f.folders, url: f.url});
        } catch (e) { console.log(series, base, e.message); }
      }
    }
  }
}
await mkdir(OUT, {recursive: true});
await writeFile(`${OUT}/index.json`, JSON.stringify(index, null, 1));
console.log(JSON.stringify(index.probe), index.files.length, 'BoP files');
