// Probe (task P1g): layouts needed by fetch-alkamel-ratings.mjs and the 2014 FIA GT3 list parser. Logs only, writes nothing.
import {writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const TMP = mkdtempSync(join(tmpdir(), 'pr-')), UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
const get = async u => { try { const r = await fetch(u, {...UA, signal: AbortSignal.timeout(60000)}); return {s: r.status, b: Buffer.from(await r.arrayBuffer())}; } catch (e) { return {s: e.message, b: Buffer.alloc(0)}; } };
// 1. WEC manifest: a leaf node (file)
{ const {b} = await get('https://files.alkamelcloud.com/wec/manifests/results_04_2014.json'); const j = JSON.parse(b.toString()); let shown = 0;
  const walk = n => { if (!n || shown > 3) return; if (Array.isArray(n)) return n.forEach(walk); if (typeof n === 'object') { if (!n.children && !n.folders) { console.log('leaf', JSON.stringify(n).slice(0, 500)); shown++; return; } walk(n.children || n.folders); } };
  walk(j); console.log('top keys', Object.keys(j).join(',')); }
// 2. ELMS site: season options and event parameters
for (const u of ['https://elms.alkamelsystems.com/', 'https://asianlms.alkamelsystems.com/']) { const {s, b} = await get(u); const t = b.toString();
  console.log('====', u, s); console.log('options', [...t.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)/g)].map(m => m[1] + '=' + m[2].trim()).slice(0, 80).join(' | '));
  console.log('params', [...new Set([...t.matchAll(/[?&]([a-z_]+)=/gi)].map(m => m[1]))].join(','));
  console.log('forms', (t.match(/<form[\s\S]{0,600}/) || [''])[0].slice(0, 600)); }
// 3. the 2014 FIA GT3 list
{ const {s, b} = await get('https://web.archive.org/web/20140709150026id_/http://www.fia.com/sites/default/files/basicpage/file/2014%20GT3%20Driver%20Categorisation%20270614.pdf'); console.log('==== GT3 2014', s, b.length);
  if (b.subarray(0, 4).toString() === '%PDF') { const f = join(TMP, 'g.pdf'); writeFileSync(f, b); console.log(execFileSync('pdftotext', ['-layout', '-l', '2', f, '-']).toString().split('\n').slice(0, 60).join('\n'));
    console.log(execFileSync('pdftohtml', ['-xml', '-i', '-zoom', '1', '-f', '1', '-l', '1', '-stdout', f]).toString().split('\n').filter(l => /<text/.test(l)).slice(0, 30).join('\n')); } }
