import asyncio, sys, time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, locale='ko-KR', extra_http_headers={'Accept-Language': 'ko-KR,ko'})
        for t in sys.argv[1:]:
            await pg.goto('http://127.0.0.1:5173/simulation?track=' + t, wait_until='load', timeout=120000); await pg.wait_for_timeout(2500)
            r = await pg.evaluate("""() => { const L = [...document.querySelectorAll('svg.ls-map text.ls-corner:not(.ls-straight)')];
              const sizes = new Set(L.map(l => l.style.fontSize + '/' + ([...l.querySelectorAll('tspan')][0]?.style.fontSize || '-'))); 
              return [L[0]?.dataset.kbSc, [...sizes].join(' '), L.filter(l => / (far|min)/.test(l.dataset.kbSc || '')).map(l => (l.dataset.orig || l.textContent.slice(0, 6)) + l.dataset.kbSc.replace(/^[\\d.]+/, '')).join(' '), document.querySelector('svg.ls-map').getAttribute('viewBox')]; }""")
            print(t, '|', r)
        await b.close()
asyncio.run(main())
