import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    t, car, lab, out = sys.argv[1:5]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, device_scale_factor=2, locale='ko-KR', extra_http_headers={'Accept-Language': 'ko-KR,ko'})
        await pg.goto(f'http://127.0.0.1:5173/simulation?track={t}&car={car}', wait_until='load', timeout=120000); await pg.wait_for_timeout(2500)
        r = await pg.evaluate('''(lab) => { const t = [...document.querySelectorAll('svg.ls-map text.ls-corner')].find(e => e.textContent.trim().startsWith(lab)); const r = t.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY, r.width, r.height, t.dataset.kbX, t.dataset.kbY, t.getAttribute('x'), t.getAttribute('y')]; }''', lab)
        print(r)
        await pg.screenshot(path=out, full_page=True, clip={'x': r[0] - 120, 'y': r[1] - 100, 'width': 260, 'height': 220})
        await b.close()
asyncio.run(main())
