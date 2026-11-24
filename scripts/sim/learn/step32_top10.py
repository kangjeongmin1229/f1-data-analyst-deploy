# Step 32 A3.1 (docs/prereg/step32-empirical-ggv-A2A3-2026-11-25.md): top-10 drivers' fastest clean quali laps per session from
# TracingInsights at pinned commits, on the sim grid; drop rules of step 28 (f1-envelope-baseline.py one(), copied) applied per session
# and per lap; every dropped row listed. Measured data is only read: values are resampled onto the grid in memory, never edited.
# usage: python3 -I scripts/sim/learn/step32_top10.py <repo root> <out traces-top10.json> <out drops.json>
import csv, json, os, sys, subprocess, hashlib, numpy as np, requests
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import quote
ROOT, OUT, DROPS = sys.argv[1:4]
TI = {2023: '737c84d3ae14b9883a671ca248d015b69cf1cb58', 2024: 'd1543a71370d9b617b627319f8ad80b2f85dfd5e',
      2025: 'dfb3ea3f50b69857fe8e40cabe5e899743c59f6a', 2026: 'f2c7692c87817a48fa7d85749f2767743d62be70'}
SLICK, TOP, SEG_M, PROM_KPH = {'SOFT', 'MEDIUM', 'HARD'}, 10, 150.0, 10.0
LOCKED_2026 = {'Qatar Grand Prix', 'Abu Dhabi Grand Prix'}  # events starting after 2026-11-23 00:00 KST
ev = sorted({(int(r['year']), r['event'], r['track']) for r in csv.DictReader(open(f'{ROOT}/scripts/sim/data/f1-delta/zone-mapping-table.csv'))
             if 2023 <= int(r['year']) <= 2025 and r['track']})
# 2026 sessions: event names from the pole-lap sources in f1-real-telemetry-data.js (TracingInsights/2026 <event> Qualifying ...)
src = subprocess.check_output(['node', '-e', "import('./worker/lapsim/f1-real-telemetry-data.js').then(m=>{const o=[];for(const[t,v]of Object.entries(m.lapsimF1RealTel))if(v['2026'])o.push([t,v['2026'].src]);console.log(JSON.stringify(o))})"], cwd=ROOT)
wet = json.loads(subprocess.check_output(['node', '-e', "import('./worker/lapsim/f1-wet-quali-data.js').then(m=>console.log(JSON.stringify(Object.keys(m.lapsimF1WetQuali).filter(k=>m.lapsimF1WetQuali[k]['2026']))))"], cwd=ROOT))
for t, s in json.loads(src):
    name = s.split('TracingInsights/2026 ')[1].split(' Qualifying')[0]
    assert name not in LOCKED_2026
    ev.append((2026, name, t))
assert all(y >= 2023 for y, _, _ in ev)  # 2022 LOCKED: never requested
json.dump([[y, e, t] for y, e, t in ev], open('/tmp/step32-events.json', 'w'))
subprocess.check_call(['node', 'scripts/sim/learn/step32-models.mjs', '/tmp/step32-events.json', '/tmp/step32-models.json'], cwd=ROOT)
SIM = json.load(open('/tmp/step32-models.json'))
S = requests.Session(); HASH = {}
def get(y, *p):
    url = f'https://raw.githubusercontent.com/TracingInsights/{y}/{TI[y]}/' + '/'.join(quote(x) for x in p)
    for _ in range(4):
        try:
            r = S.get(url, timeout=40)
            if r.status_code == 404: return None
            if r.ok: HASH['/'.join(p) + f'@{y}'] = hashlib.sha256(r.content).hexdigest(); return r.json()
        except Exception: pass
    raise RuntimeError('fetch failed ' + url)
def lag_of(a, b, ds, lo, hi):  # copied from scripts/sim/f1-delta-offset.py (step 24 v2)
    n = len(b); best, bl = -1e9, 0
    for L in range(-int(200 / ds), int(200 / ds) + 1):
        idx = np.arange(lo, hi); x, y = a[idx], b[(idx - L) % n]; m = np.isfinite(x)
        if m.sum() < 20: continue
        c = np.corrcoef(x[m], y[m])[0, 1]
        if c > best: best, bl = c, L
    return bl * ds, best
def num(v): return float(v) if isinstance(v, (int, float)) else np.nan
def session(e):
    y, name, tid = e; key = f'{y}|{name}'; drops = []
    if y == 2026 and tid in wet: return [], [{'session': key, 'drop': 'wet quali (lapsimF1WetQuali)'}]
    lt = get(y, name, 'Qualifying', 'session_laptimes.json')
    if not lt: return [], [{'session': key, 'drop': 'no laptimes'}]
    if any(c in ('INTERMEDIATE', 'WET') for c in lt.get('compound') or []): return [], [{'session': key, 'drop': 'mixed session (inter/wet laps)'}]
    t = np.array([num(x) for x in lt['time']]); best = {}
    for i, d in enumerate(lt['drv']):
        if not np.isfinite(t[i]): continue
        if lt.get('del') and lt['del'][i] is True: continue  # deleted lap: not clean (A3.1 "clean")
        if d not in best or t[i] < t[best[d]]: best[d] = i
    rank = sorted(best.values(), key=lambda i: t[i])[:TOP]
    sim = SIM[key]; ds = sim['ds']; vs = np.array(sim['v']); n = len(vs); L = n * ds; grid = np.arange(n) * ds
    laps = []
    for r_, i in enumerate(rank):
        tag = {'session': key, 'drv': lt['drv'][i], 'lap': lt['lap'][i], 'rank': r_ + 1}
        comp = lt['compound'][i]
        if comp not in SLICK: drops.append({**tag, 'drop': f'compound {comp}'}); continue
        tel = get(y, name, 'Qualifying', lt['drv'][i], f"{lt['lap'][i]}_tel.json")
        if not tel: drops.append({**tag, 'drop': 'no tel'}); continue
        tt = tel['tel']; tm = np.array([num(x) for x in tt['time']]); sp = np.array([num(x) for x in tt['speed']])
        m = np.isfinite(tm) & np.isfinite(sp); tm, sp = tm[m], sp[m]
        if len(sp) < 300 or np.any(np.diff(tm) <= 0) or np.max(np.diff(tm)) > 1.0: drops.append({**tag, 'drop': 'telemetry gap'}); continue
        s = np.concatenate([[0], np.cumsum(np.diff(tm) * (sp[1:] + sp[:-1]) / 2 / 3.6)])
        a = np.interp(grid, s * L / s[-1], sp, left=np.nan, right=np.nan)
        lag, corr = lag_of(a, vs, ds, 0, n)
        if corr < 0.93: drops.append({**tag, 'drop': f'corr {corr:.3f}'}); continue
        vm = np.roll(vs, int(round(lag / ds))); w = int(SEG_M / ds); segs = []
        for k in range(n):
            if not np.isfinite(a[k]): continue
            win = a[np.arange(k - w, k + w + 1) % n]
            if a[k] == np.nanmin(win) and np.nanmax(win) - a[k] >= PROM_KPH and not (segs and k - segs[-1] < w): segs.append(k)
        st_i = [int((segs[j - 1] + np.nanargmax(a[np.arange(segs[j - 1], segs[j] + (n if segs[j] <= segs[j - 1] else 0)) % n])) % n) for j in range(len(segs))] if len(segs) > 1 else []
        laps.append({'year': y, 'event': name, 'track': tid, 'session': key, 'drv': lt['drv'][i], 'lap_no': lt['lap'][i], 'rank': r_ + 1,
                     'lap_meas_s': float(t[i]), 'n': n, 'ds': ds, 'shift': int(round(lag / ds)), 'w': w, 'corr': round(float(corr), 3),
                     'a': [None if not np.isfinite(x) else round(float(x), 2) for x in a], 'corners': [[k, round(float(a[k]), 1)] for k in segs],
                     'straights': st_i, 'zones': sim['zones']})
    return laps, drops
res = list(ThreadPoolExecutor(12).map(session, ev))
laps = [l for r in res for l in r[0]]; drops = [d for r in res for d in r[1]]
json.dump({'ti_refs': {str(k): v for k, v in TI.items()}, 'events': {f"{l['session']}|{l['drv']}": l for l in laps}}, open(OUT, 'w'))
json.dump({'drops': drops, 'source_sha256': HASH}, open(DROPS, 'w'), indent=1)
by = {}
for l in laps: by.setdefault(l['year'], set()).add(l['session'])
print('laps', len(laps), 'sessions per year', {k: len(v) for k, v in sorted(by.items())}, 'drops', len(drops))
