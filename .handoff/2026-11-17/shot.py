# python3 shot.py <track> <out.png> [lang] [extra-query]
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    tr, out = sys.argv[1], sys.argv[2]; lang = sys.argv[3] if len(sys.argv) > 3 else 'ko'; extra = sys.argv[4] if len(sys.argv) > 4 else ''
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, device_scale_factor=1.5, locale='ko-KR' if lang == 'ko' else 'en-US', extra_http_headers={'Accept-Language': 'ko-KR,ko' if lang == 'ko' else 'en-US,en'})
        url = f'http://127.0.0.1:5173/{"en/" if lang == "en" else ""}simulation?track={tr}{extra}'
        await pg.goto(url, wait_until='load', timeout=90000); await pg.wait_for_timeout(4000)
        print(url, await pg.evaluate('document.documentElement.lang'))
        print(await pg.evaluate("[...document.querySelectorAll('svg.ls-map .ls-straight')].map(t => [t.textContent, t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('transform'), t.dataset.kbY, t.closest('svg').getAttribute('viewBox'), document.querySelectorAll('svg.ls-map').length])")); el = await pg.query_selector('svg.ls-map'); await el.screenshot(path=out)
        await b.close()
asyncio.run(main())
