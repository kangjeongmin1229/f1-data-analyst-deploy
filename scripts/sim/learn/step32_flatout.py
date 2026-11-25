# Step 32 C3 (central decision claude/decision-central-32-c3-2026-11-25.md item 4): flat-out flags of the top-10 laps, read-only metadata like xs.
# Throttle and brake from TracingInsights at the pinned commits (traces-top10.json ti_refs), same samples as the stored speeds (asserted).
# Flat out = throttle >= 99 and brake off. One character per raw sample of the lap ('1' flat out, '0' not); 2023–25 laps (2026 is not fitted).
# usage: python3 -I scripts/sim/learn/step32_flatout.py <traces-top10.json> <out.json>
import json, sys, numpy as np, requests
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
TRP, OUT = sys.argv[1:3]
TR = json.load(open(TRP)); EV, TI = TR['events'], {int(k): v for k, v in TR['ti_refs'].items()}
S = requests.Session()
def num(v): return float(v) if isinstance(v, (int, float)) else np.nan
def one(item):
    k, e = item
    if e['year'] > 2025: return k, None
    url = f"https://raw.githubusercontent.com/TracingInsights/{e['year']}/{TI[e['year']]}/" + '/'.join(quote(x) for x in (e['event'], 'Qualifying', e['drv'], f"{e['lap_no']}_tel.json"))
    for _ in range(4):
        try:
            r = S.get(url, timeout=40)
            if r.ok: break
        except Exception: pass
    r.raise_for_status(); tel = r.json()['tel']
    tm = np.array([num(x) for x in tel['time']]); sp = np.array([num(x) for x in tel['speed']]); m = np.isfinite(tm) & np.isfinite(sp)
    thr = np.array([num(x) for x in tel['throttle']])[m]; brk = np.array([bool(x) for x in tel['brake']])[m]
    assert len(thr) == len(e['sp']) and np.allclose(sp[m], e['sp']), k  # same samples as the stored (measured) lap
    return k, ''.join('1' if f else '0' for f in (thr >= 99) & ~brk)
laps = {k: v for k, v in ThreadPoolExecutor(12).map(one, sorted(EV.items())) if v is not None}
json.dump({'rule': 'flat out = throttle >= 99 and brake off; one char per raw sample (xs order); TracingInsights at ti_refs', 'ti_refs': TR['ti_refs'], 'laps': laps}, open(OUT, 'w'), sort_keys=True, separators=(',', ':'))
print(len(laps), 'laps', sum(v.count('1') for v in laps.values()) / sum(len(v) for v in laps.values()))
