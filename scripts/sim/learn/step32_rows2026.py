# Step 32 A1 (docs/prereg/step32-empirical-ggv-A1-2026-11-25.md): 2026 baseline rows and their own spread, before the run.
# Measured 2026 pole laps on the sim grid, frame lag, corner and straight-end segments: copied from f1-envelope-baseline.py one()
# (step 28: distance scaled to the sim length, lag ±200 m, drop corr < 0.93, 150 m segments, 10 km/h prominence).
# usage: python3 -I scripts/sim/learn/step32_rows2026.py <stage26.json> <traces2026.json> <rows2026.json>
import json, math, statistics as st, sys, numpy as np
SEG_M, PROM_KPH, BIN = 150.0, 10.0, (120.0, 240.0)
stage, tr_out, rows_out = sys.argv[1:4]
S = json.load(open(stage))
assert not {'lusail', 'yas-marina-circuit'} & set(S['tracks'])  # locked set: events after 2026-11-23 00:00 KST

def lag_of(a, b, ds, lo, hi):  # copied from scripts/sim/f1-delta-offset.py (step 24 v2)
    n = len(b); best, bl = -1e9, 0
    for L in range(-int(200 / ds), int(200 / ds) + 1):
        idx = np.arange(lo, hi); x, y = a[idx], b[(idx - L) % n]; m = np.isfinite(x)
        if m.sum() < 20: continue
        c = np.corrcoef(x[m], y[m])[0, 1]
        if c > best: best, bl = c, L
    return bl * ds, best

def segments(a, vm, n, w):
    segs = []
    for k in range(n):
        if not np.isfinite(a[k]): continue
        win = a[np.arange(k - w, k + w + 1) % n]
        if a[k] == np.nanmin(win) and np.nanmax(win) - a[k] >= PROM_KPH and not (segs and k - segs[-1]['i'] < w):
            idx = np.arange(k - w, k + w + 1) % n; d = (vm[idx] - a[idx])[np.isfinite(a[idx])]
            segs.append({'i': k, 'apex_meas': round(float(a[k]), 1), 'apex_model': round(float(vm[k]), 1), 'pts': int(len(d))})
    return segs

traces, rows = {}, []
for id_, e in S['events'].items():
    vs = np.array(e['v_model']); ds = e['ds']; n = len(vs); L = n * ds; grid = np.arange(n) * ds
    x = np.array(e['x']) * L / e['len']; sp = np.array(e['speed'], float)
    a = np.interp(grid, x, sp, left=np.nan, right=np.nan)
    gap = np.interp(grid, x[1:], np.diff(x)) > 3 * np.median(np.diff(x))  # telemetry gaps removed by cleanTel: no interpolation across them
    a[gap] = np.nan
    lag, corr = lag_of(a, vs, ds, 0, n)
    if corr < 0.93: rows.append({'track': id_, 'drop': f'corr {corr:.3f}'}); continue
    sh = int(round(lag / ds)); vm = np.roll(vs, sh); w = int(SEG_M / ds)
    segs = segments(a, vm, n, w)
    ap = [g['i'] for g in segs]
    st_i = [int((ap[j - 1] + np.nanargmax(a[np.arange(ap[j - 1], ap[j] + (n if ap[j] <= ap[j - 1] else 0)) % n])) % n) for j in range(len(ap))] if len(ap) > 1 else []
    traces[f'2026|{id_}'] = {'year': 2026, 'event': id_, 'track': id_, 'lap_meas_s': e['lap_meas_s'], 'n': n, 'ds': ds, 'shift': sh, 'w': w,
                             'a': [None if not np.isfinite(v) else round(float(v), 2) for v in a], 'corners': [[g['i'], g['apex_meas']] for g in segs],
                             'straights': st_i, 'zones': []}
    # apex error as step 31's score: model v_min within ±40 m of each measured speed minimum
    k40 = int(round(40 / ds)); err = []
    for g in segs:
        if BIN[0] <= g['apex_meas'] < BIN[1]:
            idx = np.arange(g['i'] - k40, g['i'] + k40 + 1) % n; err.append(float(np.min(vm[idx]) - g['apex_meas']))
    rms = math.sqrt(sum(x * x for x in err) / len(err)) if err else None
    half = lambda h: math.sqrt(sum(x * x for x in h) / len(h))
    split = (half(err[0::2]) - half(err[1::2])) / math.sqrt(2) if len(err) >= 2 else None
    rows.append({'track': id_, 'corr': round(float(corr), 3), 'lag_m': lag, 'grip': e['grip'], 'n_apex': len(err), 'apex_rms': rms, 'split_term': split,
                 'lap_err': 100 * (e['lap_model_s'] - e['lap_meas_s']) / e['lap_meas_s']})
kept = [r for r in rows if r.get('apex_rms') is not None]
terms = [r['split_term'] for r in kept if r['split_term'] is not None]
sd = st.stdev(terms); n26 = len(kept); mde = 2.80 * sd / math.sqrt(n26)
power = {'n_2026': n26, 'sd_own_split_half': sd, 'n_sd_terms': len(terms), 'mde_2026': mde, 'judged': bool(n26 >= 16 and mde <= 3.0),
         'baseline_median_apex_rms': st.median(r['apex_rms'] for r in kept), 'rule': 'A1 b4b89126…: judged iff n >= 16 and MDE <= 3 km/h'}
json.dump({'events': traces}, open(tr_out, 'w'))
json.dump({'power': power, 'rows': rows}, open(rows_out, 'w'), indent=1)
for r in rows: print(r['track'], r.get('drop') or f"corr {r['corr']} n_apex {r['n_apex']} rms {r['apex_rms'] if r['apex_rms'] is None else round(r['apex_rms'], 2)} lap {r['lap_err']:+.2f} %")
print(json.dumps(power))
