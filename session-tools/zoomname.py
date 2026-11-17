import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    t, lab, out = sys.argv[1:4]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, device_scale_factor=2, locale='ko-KR', extra_http_headers={'Accept-Language': 'ko-KR,ko'})
        await pg.goto(f'http://127.0.0.1:5173/simulation?track={t}', wait_until='load', timeout=120000); await pg.wait_for_timeout(2500)
        r = await pg.evaluate('''(lab) => { const t = [...document.querySelectorAll('svg.ls-map text')].find(e => e.textContent.includes(lab)); const r = t.getBoundingClientRect(); return [r.left + scrollX, r.top + scrollY]; }''', lab)
        await pg.screenshot(path=out, full_page=True, clip={'x': r[0] - 120, 'y': r[1] - 100, 'width': 260, 'height': 220})
        await b.close()
asyncio.run(main())
