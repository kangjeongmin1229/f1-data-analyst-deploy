// Probe (task P1e): do the SRO results pages print the drivers per car (an official classification = line-up source for rounds whose
// entry list was never published, e.g. GTWC Asia 2025 Chang)? Logs the tables and session links of a few pages; writes nothing.
const UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
const clean = t => t.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
for (const u of ['https://www.gt-world-challenge-asia.com/results/2025/chang-international-circuit', 'https://www.gt-world-challenge-asia.com/results/2025',
  'https://www.gt-world-challenge-australia.com/results/2024', 'https://www.gt-world-challenge-asia.com/results/2026/fuji-international-speedway']) {
  let t = ''; try { const r = await fetch(u, {...UA, signal: AbortSignal.timeout(60000)}); t = await r.text(); console.log('====', u, r.status, t.length); } catch (e) { console.log('====', u, e.message); continue; }
  const links = [...new Set([...t.matchAll(/href="([^"]*(?:result|session|race|qualif)[^"]*)"/gi)].map(m => m[1]))].slice(0, 40); console.log('links', links.join('\n'));
  const tables = t.match(/<table[\s\S]*?<\/table>/g) || []; console.log('tables', tables.length);
  for (const tab of tables.slice(0, 2)) console.log([...tab.matchAll(/<tr[\s\S]*?<\/tr>/g)].slice(0, 4).map(r => clean(r[0])).join('\n'));
  console.log('api', [...new Set([...t.matchAll(/["'](\/?(?:api|ajax|json)[^"']{0,120})["']/gi)].map(m => m[1]))].slice(0, 20).join('\n'));
  console.log('pdf', [...new Set([...t.matchAll(/href="([^"]+\.pdf)"/gi)].map(m => m[1]))].slice(0, 20).join('\n'));
}
