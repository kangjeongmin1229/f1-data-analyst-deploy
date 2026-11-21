// Probe only (not for main): Super Taikyu result PDF text layout.
import {execFileSync} from 'node:child_process'; import {writeFileSync} from 'node:fs';
const UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
for (const f of ['2026/2026r7_fin.pdf', '2026/2026r7_qf.pdf', '2024/2024r1_fin.pdf']) {
  const r = await fetch('https://supertaikyu.com/race/files/result/' + f, UA); console.log('\n=====', f, r.status);
  if (!r.ok) continue; writeFileSync('/tmp/s.pdf', Buffer.from(await r.arrayBuffer()));
  const t = execFileSync('pdftotext', ['-layout', '/tmp/s.pdf', '-']).toString(); console.log(t.length); console.log(t.split('\n').slice(0, 40).join('\n'));
}
const y = await (await fetch('https://supertaikyu.com/race/result_2024.html', UA)).text();
console.log('\n2024 links:', [...new Set([...y.matchAll(/href="([^"]+\.pdf)"/g)].map(m => m[1]))].slice(0, 20).join(' '));
