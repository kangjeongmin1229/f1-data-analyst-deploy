# Circuit map label audit: every track x zone option; counts labels that overlap each other, the track band, the pit lane,
# zone bands / zone labels, the finish flag, or leave the picture. python3 map-audit.py [tracks...]
import sys, json, asyncio
from playwright.async_api import async_playwright
JS = open('/home/claude/work/audit/measure.js').read()
CONF = [('2025', {'drs': '1'}), ('2025', {'drs': '0'}), ('2026', {'sm': 'normal', 'ot': '1'}), ('2026', {'sm': 'alt', 'ot': '1'}), ('2026', {'sm': 'off', 'ot': '1'}), ('2026', {'sm': 'normal', 'ot': '0'}), ('wec-lmh', {})]
async def main():
    tracks = sys.argv[1:]
    out = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, locale='ko-KR', extra_http_headers={'Accept-Language': 'ko-KR,ko'})
        for t in tracks:
            last = None
            for car, opt in CONF:
                if car != last:
                    await pg.goto(f'http://127.0.0.1:5173/simulation?track={t}&car={car}', wait_until='load', timeout=120000); await pg.wait_for_timeout(1200); last = car
                for k, v in opt.items():
                    await pg.evaluate("([k, v]) => { const e = document.querySelector('[data-ls=\"' + k + '\"]'); if (e && !e.closest('[hidden]')) { e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); } }", [k, v])
                if opt: await pg.wait_for_timeout(900)
                r = await pg.evaluate(JS)
                out[f'{t} {car} {json.dumps(opt)}'] = r
                bad = {k: v for k, v in r['count'].items() if v}
                print(t, car, json.dumps(opt), 'OK' if not bad else bad, ('| ' + '; '.join(r['examples'][:4])) if bad else '', flush=True)
        await b.close()
    json.dump(out, open('/home/claude/work/audit/last.json', 'w'), ensure_ascii=False)
asyncio.run(main())
