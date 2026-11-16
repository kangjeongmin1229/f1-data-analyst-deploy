// Probe (task P1e): text layout of GTWC Australia / Bathurst 12 Hour result PDFs (Natsoft), and the IGTC 2019/2020 Bathurst result pages.
// Logs only, writes nothing.
import {writeFileSync, mkdtempSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const TMP = mkdtempSync(join(tmpdir(), 'pr-')), UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
for (const u of ['https://www.gt-world-challenge-australia.com/images/results/2/PHIL_13_04_2024_1300_Race_R2_GT_STD_I_1.pdf',
  'https://www.gt-world-challenge-australia.com/images/results/1/MOUN_18_02_2024_0545_Race_R7_12H_RES_F_1.pdf']) {
  try { const r = await fetch(u, {...UA, signal: AbortSignal.timeout(60000)}); const b = Buffer.from(await r.arrayBuffer()); console.log('====', u, r.status, b.length);
    const f = join(TMP, 'x.pdf'); writeFileSync(f, b); console.log(execFileSync('pdftotext', ['-layout', '-l', '2', f, '-']).toString().split('\n').slice(0, 70).map(l => l.slice(0, 200)).join('\n')); } catch (e) { console.log('====', u, e.message); }
}
for (const u of ['https://www.gt-world-challenge-australia.com/results/2023/hi-tec-oils-bathurst-6-hour', 'https://www.gt-world-challenge-australia.com/results/2023/shannons-speedseries-phillip-island',
  'https://www.intercontinentalgtchallenge.com/results/2020/liqui-moly-bathurst-12-hour', 'https://www.intercontinentalgtchallenge.com/results/2019']) {
  try { const t = await (await fetch(u, {...UA, signal: AbortSignal.timeout(60000)})).text(); console.log('====', u, t.length);
    console.log([...new Set([...t.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(h => /pdf|result|natsoft|timing/i.test(h)))].slice(0, 40).join('\n')); } catch (e) { console.log(e.message); }
}
