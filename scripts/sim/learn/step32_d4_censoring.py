# Step 32 diagnostic D4 (docs/prereg/step32-diagnostics-rules-2026-11-25.md f718796d…): high-speed censoring by flat-out samples.
# Throttle/brake of the same top-10 laps from TracingInsights at the pinned commits (read-only, not a model input). Flat out = throttle ≥ 99
# and brake off. Per track and season: samples at 180–260 km/h (measured, regridded as A7.3), flat-out share; in the A7 lateral bins
# 180–260 (state 0, envelope laps), share of samples at or above the season's bin p95 that are flat out.
# usage: python3 -I scripts/sim/learn/step32_d4_censoring.py <repo root> <out.json>
import json, sys, numpy as np, requests
from urllib.parse import quote
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
ROOT, OUT = sys.argv[1:3]
TR = json.load(open(f'{ROOT}/scripts/sim/data/step32/traces-top10.json')); EV, TI = TR['events'], {int(k): v for k, v in TR['ti_refs'].items()}
KJ = json.load(open(f'{ROOT}/scripts/sim/data/step32/kappa.json')); NORM = json.load(open(f'{ROOT}/scripts/sim/data/step32/normalisation.json'))
USED = {k: v for s in NORM.values() for k, v in s['used'].items()}
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
    tel = r.json()['tel']; tm = np.array([num(x) for x in tel['time']]); sp = np.array([num(x) for x in tel['speed']])
    m = np.isfinite(tm) & np.isfinite(sp); thr = np.array([num(x) for x in tel['throttle']])[m]; brk = np.array([bool(x) for x in tel['brake']])[m]
    assert len(thr) == len(e['sp']) and np.allclose(sp[m], e['sp']), k  # same samples as the stored lap
    n = e['n']; g = np.arange(n); xs = np.array(e['xs'])
    flat = (thr >= 99) & ~brk; idx = np.clip(np.searchsorted(xs, g), 0, len(xs) - 1)  # grid point → next raw sample (nearest-after)
    v = np.interp(g, xs, np.array(e['sp']) * USED.get(k, 1.0), left=np.nan, right=np.nan); mi = (g - e['shift']) % n
    ay = (v / 3.6) ** 2 * np.abs(np.array(KJ['kappa'][e['track']])[mi]) / 9.81; st = np.array(KJ['low'][e['session']])[mi] > 0
    ok = np.isfinite(v)
    return k, dict(track=e['track'], year=e['year'], used=k in USED, v=v[ok].tolist(), ay=ay[ok].tolist(), flat=flat[idx][ok].astype(int).tolist(), low=st[ok].astype(int).tolist())
R = dict(ThreadPoolExecutor(12).map(one, EV.items())); R = {k: v for k, v in R.items() if v}
out = {'rule': 'flat out = throttle >= 99 and brake off; bins 180-260 km/h', 'per_track': {}, 'lateral_bins': {}}
for yr in (2023, 2024, 2025):  # season p95 of a_y per lateral bin (envelope laps, state 0), and flat-out share of the samples above it
    L = [x for x in R.values() if x['year'] == yr and x['used']]
    for lo in range(180, 260, 20):
        pts = [(x['track'], a, f) for x in L for v, a, f, s in zip(x['v'], x['ay'], x['flat'], x['low']) if lo <= v < lo + 20 and not s]
        if len(pts) < 200: continue
        p95 = float(np.percentile([a for _, a, _ in pts], 95)); top = [(t, f) for t, a, f in pts if a >= p95]
        bt = defaultdict(lambda: [0, 0])
        for t, f in top: bt[t][0] += 1; bt[t][1] += f
        out['lateral_bins'][f'{yr}|{lo}'] = dict(n=len(pts), p95_g=p95, top_n=len(top), top_flat_share=sum(f for _, f in top) / len(top), top_by_track={t: dict(n=c[0], flat=c[1]) for t, c in bt.items()})
acc = defaultdict(lambda: [0, 0])
for x in R.values():
    for v, f in zip(x['v'], x['flat']):
        if 180 <= v < 260: a = acc[(x['track'], x['year'])]; a[0] += 1; a[1] += f
for (t, y), (n, f) in sorted(acc.items()): out['per_track'].setdefault(t, {})[y] = dict(samples_180_260=n, flat_share=f / n)
json.dump(out, open(OUT, 'w'), indent=1)
tot = {t: (sum(v['samples_180_260'] for v in d.values()), sum(v['samples_180_260'] * v['flat_share'] for v in d.values())) for t, d in out['per_track'].items()}
for t, (n, f) in sorted(tot.items(), key=lambda kv: -kv[1][1] / kv[1][0]): print(t, n, round(f / n, 3))
for k, b in out['lateral_bins'].items(): print(k, b['n'], round(b['p95_g'], 2), b['top_n'], round(b['top_flat_share'], 3))
