// Probe only (not for main): Super Taikyu result page links.
const UA = {headers: {'user-agent': 'Mozilla/5.0 (kongboda-motorsports lap simulator)'}};
for (const u of ['https://supertaikyu.com/race/result.html', 'https://supertaikyu.com/race/round_07.html']) {
  const t = await (await fetch(u, UA)).text();
  const links = [...new Set([...t.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(h => /pdf|result|lap|timing/i.test(h)))];
  console.log('\n=====', u, t.length); console.log(links.slice(0, 60).join('\n'));
}
