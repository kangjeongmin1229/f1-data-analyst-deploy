// Probe only (not for main): Super Taikyu official site robots and results pages.
const UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
for (const u of ['https://supertaikyu.com/robots.txt', 'https://supertaikyu.com/', 'https://supertaikyu.com/result/', 'https://supertaikyu.com/results/', 'https://www.supertaikyu.com/']) {
  try { const r = await fetch(u, UA); const t = await r.text(); const links = [...new Set([...t.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(h => /result|pdf|race|lap/i.test(h)))];
    console.log('\n=====', u, r.status, t.length); console.log(u.endsWith('robots.txt') ? t.slice(0, 400) : links.slice(0, 40).join('\n')); } catch (e) { console.log(u, 'ERR', e.message); }
}
