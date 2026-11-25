# Brake-limit A1 verdict: per-track braking RMS (40 km/h bins 100–340, ≥ 50 samples each side, ≥ 2 bins) of model p95 − measured p95,
# 2023–25 judged (2026 report-only); paired base − cand; pass: cut ≥ 50 % of base mean, one-sided sign-flip p < 0.01, n ≥ 5, pooled cand
# row ≤ measured + 0.3 g at 100–260; lap guard: pairedHarm f1 ub95Pp ≤ 0.10. usage: python3 -I brake_cap_verdict.py base.json cand.json harm.json out.json RUNB RUNC
import json, sys, numpy as np
from collections import defaultdict
from scipy.signal import savgol_filter
B, C, H = (json.load(open(p)) for p in sys.argv[1:4]); OUT, RUNB, RUNC = sys.argv[4:7]; ALPHA = 0.01; rng = np.random.default_rng(5)
def dec(a, ds):
    v = np.array([np.nan if x is None else x for x in a], float) / 3.6; m = np.isfinite(v); idx = np.arange(len(v))
    vf = np.interp(idx, idx[m], v[m], period=len(v)); w = int(round(45.0 / ds)) | 1; dv = savgol_filter(vf, w, 2, deriv=1, delta=ds, mode='wrap')
    return vf[m] * 3.6, -(vf * dv)[m] / 9.81
BINS = list(range(100, 340, 40))
def collect(R):
    P = defaultdict(lambda: defaultdict(lambda: {'M': [], 'X': []})); pool = defaultdict(lambda: defaultdict(lambda: {'M': [], 'X': []}))
    for o in R['laps']:
        g = 'judged' if o['year'] <= 2025 else '2026'
        for k, nm in (('meas', 'M'), ('model', 'X')):
            v, a = dec(o[k], o['ds']); s = a > 0
            for lo in BINS: x = a[s & (v >= lo) & (v < lo + 40)].tolist(); P[(g, o['track'])][lo][nm] += x; pool[g][lo][nm] += x
    return P, pool
PB, poolB = collect(B); PC, poolC = collect(C)
def trk(P, g):
    out = {}
    for (gg, t), d in P.items():
        if gg != g: continue
        e = [np.percentile(b['X'], 95) - np.percentile(b['M'], 95) for lo, b in d.items() if len(b['M']) >= 50 and len(b['X']) >= 50]
        if len(e) >= 2: out[t] = float(np.sqrt(np.mean(np.square(e))))
    return out
def flip_p(x):
    x = np.asarray(x, float); n = len(x); obs = x.mean(); a = np.abs(x)
    S = np.array([[1 if (i >> j) & 1 else -1 for j in range(n)] for i in range(2 ** n)]) if n <= 16 else rng.choice([-1, 1], (200000, n))
    return float(((S * a).mean(1) >= obs - 1e-12).mean())
def boot(x): x = np.asarray(x, float); m = x[rng.integers(0, len(x), (10000, len(x)))].mean(1); return [float(np.quantile(m, 0.025)), float(np.quantile(m, 0.975))]
res = {'runs': {'baseline': RUNB, 'candidate': RUNC}}
for g in ('judged', '2026'):
    tb, tc = trk(PB, g), trk(PC, g); ks = sorted(set(tb) & set(tc)); d = np.array([tb[k] - tc[k] for k in ks]); bm = float(np.mean([tb[k] for k in ks]))
    rows = [dict(bin=lo, meas=float(np.percentile(poolB[g][lo]['M'], 95)), base=float(np.percentile(poolB[g][lo]['X'], 95)), cand=float(np.percentile(poolC[g][lo]['X'], 95))) for lo in BINS if poolB[g][lo]['M']]
    for r in rows: r['ok'] = bool(r['bin'] >= 260 or r['cand'] <= r['meas'] + 0.3)
    p = flip_p(d) if len(d) else None
    res[g] = dict(n_tracks=len(ks), base_mean_g=bm, cand_mean_g=float(np.mean([tc[k] for k in ks])), mean_cut_g=float(d.mean()), cut_share=float(d.mean()) / bm, ci95=boot(d), p_signflip_one_sided=p,
                  need_g=0.5 * bm, pooled_row=rows, per_track={k: dict(base=tb[k], cand=tc[k]) for k in ks},
                  pass_=bool(len(d) >= 5 and p < ALPHA and d.mean() >= 0.5 * bm and all(r['ok'] for r in rows)) if g == 'judged' else None)
f1 = H['harm']['f1']; res['lap_guard'] = dict(n=f1['n'], meanPp=f1.get('meanPp'), ub95Pp=f1.get('ub95Pp'), maxPp=f1.get('maxPp'), overRowLimit=f1.get('overRowLimit'), pass_=bool(f1.get('ub95Pp') is not None and f1['ub95Pp'] <= 0.10))
res['other_series_identical'] = {s: H['harm'].get(s, {}).get('meanPp') for s in ('wec', 'fe')}
res['cars'] = {'baseline': B['cars'], 'candidate': C['cars'], 'clA_at_bound_8': {y: {'baseline': B['cars'][y]['clA'] >= 8 - 1e-6, 'candidate': C['cars'][y]['clA'] >= 8 - 1e-6} for y in B['cars'] if y in C['cars'] and y != '2026'}}
res['changedCarParams'] = H.get('changedCarParams')
res['verdict'] = 'PASS' if res['judged']['pass_'] and res['lap_guard']['pass_'] else 'FAIL'
json.dump(res, open(OUT, 'w'), indent=1); print(json.dumps({k: v for k, v in res.items() if k not in ('cars',)}, indent=1)[:15000]); print('cars', json.dumps(res['cars']))
