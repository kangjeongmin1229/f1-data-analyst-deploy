// Probe (task P1g): layouts needed by fetch-alkamel-ratings.mjs and the 2014 FIA GT3 list parser. Logs only, writes nothing.
import {writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const TMP = mkdtempSync(join(tmpdir(), 'pr-')), UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
const get = async u => { try { const r = await fetch(u, {...UA, signal: AbortSignal.timeout(60000)}); return {s: r.status, b: Buffer.from(await r.arrayBuffer())}; } catch (e) { return {s: e.message, b: Buffer.alloc(0)}; } };
// 1. WEC manifest: the first nodes that look like files
{ const {b} = await get('https://files.alkamelcloud.com/wec/manifests/results_04_2014.json'); const t = b.toString(); console.log('==== manifest', t.length);
  const i = t.search(/\.CSV/i); console.log('around first CSV:', t.slice(Math.max(0, i - 700), i + 200));
  const j = JSON.parse(t); const walk = (n, d = 0) => { if (d > 12 || !n) return; if (Array.isArray(n)) return n.forEach(x => walk(x, d + 1)); if (typeof n === 'object') { if (n.files || n.documents) { console.log('node with files keys', Object.keys(n).join(','), JSON.stringify(n.files || n.documents).slice(0, 600)); throw 0; } for (const v of Object.values(n)) walk(v, d + 1); } };
  try { walk(j); } catch {} }
// 2. ELMS / LMC result site root and a season page
for (const u of ['https://elms.alkamelsystems.com/', 'https://elms.alkamelsystems.com/?season=04_2016', 'https://lemanscup.alkamelsystems.com/?season=04_2020']) { const {s, b} = await get(u); const t = b.toString();
  console.log('====', u, s, t.length); console.log([...new Set([...t.matchAll(/(?:href|value)="([^"]{0,160})"/g)].map(m => m[1]))].slice(0, 40).join('\n')); }
// 3. the 2014 FIA GT3 list
{ const {s, b} = await get('https://web.archive.org/web/20140709150026id_/http://www.fia.com/sites/default/files/basicpage/file/2014%20GT3%20Driver%20Categorisation%20270614.pdf'); console.log('==== GT3 2014', s, b.length);
  if (b.subarray(0, 4).toString() === '%PDF') { const f = join(TMP, 'g.pdf'); writeFileSync(f, b); console.log(execFileSync('pdftotext', ['-layout', '-l', '2', f, '-']).toString().split('\n').slice(0, 60).join('\n'));
    console.log(execFileSync('pdftohtml', ['-xml', '-i', '-zoom', '1', '-f', '1', '-l', '1', '-stdout', f]).toString().split('\n').filter(l => /<text/.test(l)).slice(0, 30).join('\n')); } }
