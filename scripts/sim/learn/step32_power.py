# Step 32 A3.1 / A1 / A3.3: baseline rows, power check and noise floor on the top-10 data, before any candidate number.
# Scores copied from step31_power.py (apex = model v_min within ±40 m of each measured speed minimum; entry/exit phase Δt; lap error).
# Rows: per lap → per session (mean over its kept laps) → per track; power = step31_power.py method (within-track between-season SD).
# usage: python3 -I scripts/sim/learn/step32_power.py <traces-top10.json> <models.json> <out.json>
import json, math, sys, statistics as st
from collections import defaultdict
import numpy as np
from scipy.stats import norm
TRP, MOD, OUT = sys.argv[1:4]
TR = json.load(open(TRP))['events']; M = json.load(open(MOD))
Z = norm.ppf(1 - 0.05 / 3) + norm.ppf(0.8);  # C3: m = 3 (one-sided α 0.0167, power 0.8)
BANDS = {'60-120': (60, 120), '120-180': (120, 180), '180-240': (180, 240), '120-240': (120, 240)}
SIG_SAMP = 1.5

def lap_score(e, v_model):
    n, ds, sh = e['n'], e['ds'], e['shift']; meas = np.array([np.nan if x is None else x for x in e['a']], float); vm = np.roll(np.array(v_model, float), sh)
    w = int(40.0 / ds); st_ = e['straights']; apex, ent, ext = [], [], []
    for j, (i, _) in enumerate(e['corners']):
        idx = (i + np.arange(-w, w + 1)) % n; apex.append((meas[i], float(np.nanmin(vm[idx]) - meas[i])))
        if len(st_) < 2: continue
        a0, a1 = st_[j], st_[(j + 1) % len(st_)]; seg = np.arange(a0, a1 + (n if a1 <= a0 else 0) + 1) % n
        vv, mm = meas[seg], vm[seg]; ok = np.isfinite(vv); dt = np.where(ok, ds / (mm / 3.6) - ds / (np.where(ok, vv, 1) / 3.6), 0.0)
        k0 = int(np.where(seg == i)[0][0]); lo = hi = k0
        while lo > 0 and np.isfinite(vv[lo - 1]) and vv[lo - 1] <= 1.05 * meas[i]: lo -= 1
        while hi < len(seg) - 1 and np.isfinite(vv[hi + 1]) and vv[hi + 1] <= 1.05 * meas[i]: hi += 1
        ent.append(float(dt[:lo].sum())); ext.append(float(dt[hi + 1:].sum()))
    rms = lambda x: math.sqrt(sum(y * y for y in x) / len(x)) if x else None
    out = {f'apex_{b}': rms([d for m, d in apex if lo_ <= m < hi_]) for b, (lo_, hi_) in BANDS.items()}
    return {**out, 'apex_errs_120_240': [d for m, d in apex if 120 <= m < 240], 'entry': rms(ent), 'exit': rms(ext)}

laps = defaultdict(list)
for k, e in TR.items():
    assert e['year'] >= 2023, '2022 is locked'
    m = M[e['session']]; s = lap_score(e, m['v']); s['lap_err'] = 100 * (m['lap'] - e['lap_meas_s']) / e['lap_meas_s']; s['rank'] = e['rank']
    laps[e['session']].append((e, s))
def mean_or_none(x): x = [y for y in x if y is not None]; return st.mean(x) if x else None
sess = []
for key, L in laps.items():
    e0 = L[0][0]; r = {'session': key, 'track': e0['track'], 'year': e0['year'], 'n_laps': len(L)}
    for f in [f'apex_{b}' for b in BANDS] + ['entry', 'exit', 'lap_err']: r[f] = mean_or_none([s[f] for _, s in L])
    fast = min(L, key=lambda x: x[1]['rank'])[1]; r['fastest_apex_120-240'] = fast['apex_120-240']
    sess.append(r)

def power(rows, f, useful):
    by = defaultdict(dict)
    for r in rows:
        if r[f] is not None: by[r['track']][r['year']] = r[f]
    lv = [st.mean(v.values()) for v in by.values()]; n = len(lv)
    dif = [b - a for v in by.values() for a, b in zip([v[y] for y in sorted(v)], [v[y] for y in sorted(v)][1:])]
    sdw = st.stdev(dif) / math.sqrt(2) if len(dif) > 2 else None
    return dict(n_tracks=n, baseline_median=st.median(lv), sd_within_season=sdw, n_pairs=len(dif), mde=None if sdw is None else Z * sdw / math.sqrt(n),
                useful=useful, judgeable=None if sdw is None or useful is None else bool(Z * sdw / math.sqrt(n) <= useful))
old = [r for r in sess if r['year'] <= 2025]
POW = {'apex_120-240': power(old, 'apex_120-240', 3.0), 'apex_120-240_fastest_lap_only': power(old, 'fastest_apex_120-240', 3.0),
       'entry': power(old, 'entry', None), 'exit': power(old, 'exit', None)}
lapabs = defaultdict(dict)
for r in old: lapabs[r['track']][r['year']] = abs(r['lap_err'])
difl = [b - a for v in lapabs.values() for a, b in zip([v[y] for y in sorted(v)], [v[y] for y in sorted(v)][1:])]
sdl = st.stdev(difl) / math.sqrt(2); POW['lap_guard'] = dict(n_tracks=len(lapabs), sd_within_season=sdl, ub_halfwidth_pp=norm.ppf(0.95) * sdl / math.sqrt(len(lapabs)), limit_pp=0.10)
# 2026 (A1 rule on the top-10 data): per track, the 120–240 apex errors in lap order, split alternately
terms, n26 = [], 0
for key, L in laps.items():
    if L[0][0]['year'] != 2026: continue
    errs = [d for _, s in sorted(L, key=lambda x: x[1]['rank']) for d in s['apex_errs_120_240']]
    if not errs: continue
    n26 += 1
    if len(errs) >= 2:
        h = lambda x: math.sqrt(sum(y * y for y in x) / len(x)); terms.append((h(errs[0::2]) - h(errs[1::2])) / math.sqrt(2))
sd26 = st.stdev(terms) if len(terms) > 1 else None; mde26 = None if sd26 is None else Z * sd26 / math.sqrt(n26)
POW['apex_120-240_2026'] = dict(n_tracks=n26, sd_own_split_half=sd26, mde=mde26, judged=bool(mde26 is not None and n26 >= 16 and mde26 <= 3.0))
# noise floor (A3.3): apex speed spread between drivers' laps in the same session and corner (frame: model index = k − shift)
pool = defaultdict(lambda: [0.0, 0])
for key, L in laps.items():
    e0 = min(L, key=lambda x: x[1]['rank'])[0]; n = e0['n']; w = int(40.0 / e0['ds'])
    for i, vmin in e0['corners']:
        vals = []
        for e, _ in L:
            a = np.array([np.nan if x is None else x for x in e['a']], float); c = (i - e0['shift'] + e['shift']) % n
            seg = a[(c + np.arange(-w, w + 1)) % n]
            if np.isfinite(seg).any(): vals.append(float(np.nanmin(seg)))
        if len(vals) < 5: continue
        for b, (lo, hi) in BANDS.items():
            if lo <= vmin < hi: p = pool[b]; p[0] += float(np.var(vals, ddof=1)) * (len(vals) - 1); p[1] += len(vals) - 1
NOISE = {b: dict(sigma_between=math.sqrt(p[0] / p[1]), dof=p[1], sigma_samp=SIG_SAMP, sigma_meas=math.sqrt(p[0] / p[1] + SIG_SAMP ** 2)) for b, p in pool.items()}
json.dump({'z': Z, 'power': POW, 'noise_floor': NOISE, 'sessions': sess}, open(OUT, 'w'), indent=1)
print(json.dumps({'power': POW, 'noise_floor': NOISE}, indent=1))
print('sessions', len(sess), 'laps', sum(r['n_laps'] for r in sess))
