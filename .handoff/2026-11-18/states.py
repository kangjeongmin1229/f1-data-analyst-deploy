# python3 states.py <outdir> <tracks...> : map screenshots in every option state, dark (default) and light, ko and en
import sys, asyncio, os
from playwright.async_api import async_playwright
CONF = [('f1-25-drs', '2025', {'drs': '1'}), ('f1-26-sm-ot', '2026', {'sm': 'normal', 'ot': '1'}), ('f1-26-alt', '2026', {'sm': 'alt', 'ot': '1'}), ('f1-26-off', '2026', {'sm': 'off', 'ot': '0'}), ('wec', 'wec-lmh', {})]
async def main():
    out, tracks = sys.argv[1].split(':')[0], sys.argv[2:]; os.makedirs(out, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for lang in (sys.argv[1].split(':')[1].split(',') if ':' in sys.argv[1] else ['ko', 'en']):
            pg = await b.new_page(viewport={'width': 1100, 'height': 1000}, device_scale_factor=1, locale='ko-KR' if lang == 'ko' else 'en-US', timezone_id='Asia/Seoul' if lang == 'ko' else 'Europe/London', extra_http_headers={'Accept-Language': 'ko-KR,ko' if lang == 'ko' else 'en-US,en'})
            for t in tracks:
                for name, car, opt in CONF:
                    if lang == 'en' and name not in ('f1-26-sm-ot', 'wec'): continue
                    await pg.goto(f'http://127.0.0.1:5173/simulation?track={t}&car={car}', wait_until='load', timeout=120000); await pg.wait_for_timeout(1200)
                    for k, v in opt.items():
                        await pg.evaluate("([k, v]) => { const e = document.querySelector('[data-ls=\"' + k + '\"]'); if (e && !e.closest('[hidden]')) { e.value = v; e.dispatchEvent(new Event('change', {bubbles: true})); } }", [k, v])
                    await pg.wait_for_timeout(1000)
                    for theme in (['dark', 'light'] if name == 'f1-26-sm-ot' else ['dark']):
                        await pg.emulate_media(color_scheme=theme)
                        await pg.wait_for_timeout(300)
                        el = await pg.query_selector('svg.ls-map')
                        if el: await el.screenshot(path=f'{out}/{t}-{name}-{lang}-{theme}.png')
                        print(t, name, lang, theme, await pg.evaluate("document.documentElement.lang + ' ' + (document.querySelector('.kb-corner-name')||{}).textContent"), flush=True)
            await pg.close()
        await b.close()
asyncio.run(main())
