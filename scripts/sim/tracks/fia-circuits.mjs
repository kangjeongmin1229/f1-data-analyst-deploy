// Official lap lengths: the FIA "List of FIA Licensed Circuits" (fia.com). One row per licensed layout:
// name, country, grade, lap distance (km), pole side, licence expiry, reference width (m).
// Writes .cache/lapsim/osm/fia-circuits.json. This is the only source of "official length" for the acceptance check.
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
const URLS = (process.env.FIA_CIRCUITS_URLS || 'https://www.fia.com/sites/default/files/circuits_fia20260331_0.pdf,https://www.fia.com/sites/default/files/circuits_fia20251201.pdf,https://www.fia.com/sites/default/files/circuits_fia20240313.pdf').split(',');
const OUT = '.cache/lapsim/osm'; mkdirSync(OUT, {recursive: true});
const rows = [], lists = [];
for (const url of URLS) {
  try {
    const r = await fetch(url, {headers: {'user-agent': 'Mozilla/5.0 (kongboda-lapsim)'}}); if (!r.ok) throw new Error(r.status);
    const pdf = `${OUT}/fia.pdf`; writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
    const text = execFileSync('pdftotext', ['-layout', pdf, '-'], {maxBuffer: 1 << 26}).toString();
    const updated = (text.match(/UPDATED ON\s*:\s*(\d{4}-\d{2}-\d{2})/) || [])[1] || null; let n = 0;
    for (const line of text.split('\n')) {
      // NAME  COUNTRY  GRADE  LENGTH  [Left|Right]  [dd.mm.yyyy]  [width]
      const m = line.match(/^\s*(.+?)\s{2,}([A-Z]{3})\s+(\S+(?: Historic| Restricted)?)\s+(\d+(?:\.\d+)?)(?:\s+(Left|Right))?(?:\s+(\d{2}\.\d{2}\.\d{4}))?(?:\s+(\d+(?:\.\d+)?))?\s*$/);
      if (!m || +m[4] < 0.5 || +m[4] > 30) continue;
      rows.push({name: m[1].trim(), country: m[2], grade: m[3], lengthM: Math.round(+m[4] * 1000), pole: m[5] || null, expiry: m[6] || null, widthM: m[7] ? +m[7] : null, list: updated, url}); n++;
    }
    lists.push({url, updated, rows: n});
  } catch (e) { lists.push({url, error: String(e).slice(0, 160)}); }
}
writeFileSync(`${OUT}/fia-circuits.json`, JSON.stringify({source: 'FIA List of Licensed Circuits (fia.com)', lists, rows}, null, 1));
console.log(lists);
