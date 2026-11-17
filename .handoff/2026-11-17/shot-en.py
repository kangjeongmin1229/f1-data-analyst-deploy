import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, locale='en-GB', extra_http_headers={'Accept-Language': 'en-GB,en'})
        await pg.goto('http://127.0.0.1:5173/simulation?track=' + sys.argv[1], wait_until='load', timeout=120000); await pg.wait_for_timeout(3500)
        el = await pg.query_selector('svg.ls-map'); await el.screenshot(path=sys.argv[2])
        await b.close()
asyncio.run(main())
