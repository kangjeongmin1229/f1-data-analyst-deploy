// IMSA WeatherTech Balance of Performance bulletins (GTP, GTD PRO/GTD, LMP2), 2024-2026, as text (pdftotext -layout) for
// scripts/sim/learn/parse-imsa-bop.mjs. Owner 2026-11-16: BoP simulator gets IMSA. Links: the technical-bulletin index pages when they
// answer, plus the bulletin URLs found by search (imsa.com/wp-content). Runs in the lapsim-learn workflow (the shell cannot reach imsa.com).
import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const OUT = 'scripts/sim/data/learn/imsa-bop-docs/', UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', Accept: '*/*'};
const W = 'https://www.imsa.com/wp-content/uploads/sites/32/';
const SEED = ['2026/01/08/TB-IWSC-26-12-Daytona-ROAR-and-ROLEX-24-BoP-01082026.pdf', '2026/03/13/TB-IWSC-26-28-Sebring-12-Hour-BoP-03132026.pdf',
  '2026/04/08/TB-IWSC-26-30-Long-Beach-BoP-04082026.pdf', '2026/04/23/TB-IWSC-26-34-Laguna-Seca-Event-BoP-04232026.pdf', '2026/05/22/TB-IWSC-26-37c1-Detroit-BoP-05222026.pdf',
  '2026/07/22/TB-IWSC-26-49-Road-America-Event-BoP-07222026.pdf', '2026/08/12/TB-IWSC-26-53-VIR-Event-BoP-08122026.pdf', '2026/09/10/TB-IWSC-26-56-Indianapolis-Event-BoP-09102026.pdf',
  '2025/01/09/TB-IWSC-25-18-Daytona-ROAR-BoP-01092025.pdf', '2025/01/22/TB-IWSC-25-25-Daytona-Rolex-24-BoP-01222025.pdf', '2025/03/06/TB-IWSC-25-36-Sebring-12hr-BoP-03062025.pdf',
  '2025/04/03/TB_IWSC_25-42_Long_Beach_BoP_04032025.pdf', '2025/05/22/TB-IWSC-25-50-Detroit-BoP-05222025.pdf', '2025/06/11/TB-IWSC-25-52-Watkins-Glen-BoP-06112025.pdf',
  '2025/07/03/TB_IWSC_25-62_CTMP_BoP_07032025.pdf', '2025/07/24/TB-IWSC-25-66-Road-America-BoP-07242025.pdf', '2025/08/14/TB-IWSC-25-70-VIR-BoP-08142025.pdf',
  '2025/09/15/TB-IWSC-25-75-Indianapolis-BoP-09152025.pdf', '2025/10/01/TB-IWSC-25-80-Petit-Le-Mans-BoP-10012025.pdf',
  '2024/01/17/TB-IWSC-24-18r1-Daytona-ROAR-BoP-01162024.pdf', '2024/01/24/TB-IWSC-24-29-Daytona-Rolex-24-LMP2-BoP-01242024.pdf', '2024/03/07/TB-IWSC-24-34-Sebring-12hr-BoP-03072024.pdf',
  '2024/05/01/TB-IWSC-24-40-Laguna-GT-BoP-05012024.pdf', '2024/05/02/TB-IWSC-24-42-Laguna-GTP-BoP-05022024.pdf', '2024/05/22/2024_TB_IWSC_Detroit_BoP_05222024.pdf',
  '2024/06/12/TB-IWSC-24-49-Watkins-Glen-BoP-06122024.pdf', '2024/07/03/TB-IWSC-24-55-CTMP-Event-BoP-07032024.pdf', '2024/07/25/TB-IWSC-24-57-Road-America-BoP-07252024.pdf',
  '2024/08/14/TB-IWSC-24-62-VIR-BoP-08142024.pdf', '2024/09/11/TB-IWSC-24-66-Indianapolis-BoP-09112024.pdf', '2024/10/01/TB-IWSC-24-70-MRRA-BoP-10012024.pdf'].map(p => W + p);
const found = new Set(SEED), log = [];
for (const y of [2024, 2025, 2026]) {
  try { const r = await fetch(`https://www.imsa.com/competitors/${y}-technical-bulletins/`, {headers: UA}); const h = await r.text(); log.push({index: y, status: r.status});
    for (const m of h.matchAll(/href="([^"]+\.pdf)"/gi)) if (/IWSC/i.test(m[1]) && /bop/i.test(m[1]) && !/IMPC|VPRC|correction/i.test(m[1])) found.add(new URL(m[1], 'https://www.imsa.com').href); }
  catch (e) { log.push({index: y, error: e.message}); }
}
mkdirSync(OUT, {recursive: true});
const docs = [];
for (const url of found) {
  const name = url.split('/').pop().replace(/\.pdf$/i, ''), txt = OUT + name + '.txt';
  if (existsSync(txt)) { docs.push({url, file: name + '.txt', ok: true, cached: true}); continue; }
  try { const r = await fetch(url, {headers: UA}); if (!r.ok) { docs.push({url, status: r.status}); continue; }
    const pdf = '/tmp/' + name + '.pdf'; writeFileSync(pdf, Buffer.from(await r.arrayBuffer()));
    writeFileSync(txt, execFileSync('pdftotext', ['-layout', pdf, '-'], {maxBuffer: 1 << 26}).toString()); docs.push({url, file: name + '.txt', ok: true}); }
  catch (e) { docs.push({url, error: e.message}); }
}
writeFileSync(OUT + 'index.json', JSON.stringify({fetchedAt: new Date().toISOString(), log, docs}, null, 1));
console.log(docs.filter(d => d.ok).length, 'of', docs.length, 'bulletins as text', JSON.stringify(log));
