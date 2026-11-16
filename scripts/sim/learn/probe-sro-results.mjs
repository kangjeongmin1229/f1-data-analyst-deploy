// Probe (task P1g): layouts needed by fetch-alkamel-ratings.mjs and the 2014 FIA GT3 list parser. Logs only, writes nothing.
import {writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const TMP = mkdtempSync(join(tmpdir(), 'pr-')), UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
const get = async u => { try { const r = await fetch(u, {...UA, signal: AbortSignal.timeout(60000)}); return {s: r.status, b: Buffer.from(await r.arrayBuffer())}; } catch (e) { return {s: e.message, b: Buffer.alloc(0)}; } };
// 2. how a season page names its events (lemanscup 2020: Paul Ricard is an earlier event than the one listed)
for (const u of ['https://lemanscup.alkamelsystems.com/?season=04_2020', 'https://elms.alkamelsystems.com/?season=11_2016', 'https://elms.alkamelsystems.com/?season=08_2013']) { const {s, b} = await get(u); const t = b.toString(); console.log('====', u, s, t.length);
  for (const m of [...t.matchAll(/PAUL RICARD|SILVERSTONE|IMOLA/g)].slice(0, 6)) console.log('ctx', JSON.stringify(t.slice(Math.max(0, m.index - 220), m.index + 80)));
  console.log('scripts', [...t.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]).join(' ')); }
for (const h of ['https://asianlms.alkamelsystems.com/', 'https://alms.alkamelsystems.com/', 'https://asianlemansseries.alkamelsystems.com/']) { const {s, b} = await get(h); console.log('host', h, s, b.length, (b.toString().match(/Results\/[^"/]+/) || [''])[0]); }
if (false) // 3. the 2014 FIA GT3 list
{ const {s, b} = await get('https://web.archive.org/web/20140709150026id_/http://www.fia.com/sites/default/files/basicpage/file/2014%20GT3%20Driver%20Categorisation%20270614.pdf'); console.log('==== GT3 2014', s, b.length);
  if (b.subarray(0, 4).toString() === '%PDF') { const f = join(TMP, 'g.pdf'); writeFileSync(f, b); console.log(execFileSync('pdftotext', ['-layout', '-l', '2', f, '-']).toString().split('\n').slice(0, 60).join('\n'));
    console.log(execFileSync('pdftohtml', ['-xml', '-i', '-zoom', '1', '-f', '1', '-l', '1', '-stdout', f]).toString().split('\n').filter(l => /<text/.test(l)).slice(0, 30).join('\n')); } }
