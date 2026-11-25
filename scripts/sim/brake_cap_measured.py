# Braking limit from measurement (pre-reg docs/prereg/brake-limit-measured-DRAFT-2026-11-25.md b7840989… + A1): per season, measured
# p95 deceleration per 20 km/h bin 80–280 km/h (≥ 200 samples) of the step 32 top-10 qualifying laps (read-only), forward-processed as
# the step 32 verdict (45 m Savitzky–Golay, order 2, wrap), then weighted least squares a0 + a2·v² (v = bin centre in m/s, a in m/s²).
# Bins ≥ 280 km/h excluded (brake-pressure build-up, decided before results). Third value: the highest bin p95 (m/s²), used as the
# constant cap brakeDecelMax, so the limit is min(a0 + a2·v², max p95): the measured curve rises and then flattens (220–280 km/h).
# 'all' = every track; 'loto' = without that track.
# usage: python3 -I scripts/sim/brake_cap_measured.py <traces-top10.json> <out.json>
import json, sys, hashlib, numpy as np
from collections import defaultdict
from scipy.signal import savgol_filter
TRP, OUT = sys.argv[1:3]; TR = json.load(open(TRP))['events']
def dec(a, ds):
    v = np.array([np.nan if x is None else x for x in a], float) / 3.6; m = np.isfinite(v); idx = np.arange(len(v))
    vf = np.interp(idx, idx[m], v[m], period=len(v)); w = int(round(45.0 / ds)) | 1; dv = savgol_filter(vf, w, 2, deriv=1, delta=ds, mode='wrap')
    return vf[m] * 3.6, -(vf * dv)[m]
BINS = list(range(80, 280, 20))
S = defaultdict(lambda: defaultdict(lambda: defaultdict(list)))  # year → track → bin → decel samples (m/s²)
for e in TR.values():
    v, a = dec(e['a'], e['ds']); s = a > 0
    for lo in BINS: S[e['year']][e['track']][lo] += a[s & (v >= lo) & (v < lo + 20)].tolist()
def fit(year, skip=None):
    xs, ys, ws = [], [], []
    for lo in BINS:
        x = [q for t, d in S[year].items() if t != skip for q in d[lo]]
        if len(x) >= 200: xs.append(((lo + 10) / 3.6) ** 2); ys.append(float(np.percentile(x, 95))); ws.append(len(x))
    W = np.sqrt(np.array(ws, float)); A = np.c_[np.ones(len(xs)), xs] * W[:, None]; c, *_ = np.linalg.lstsq(A, np.array(ys) * W, rcond=None)
    return [round(float(c[0]), 4), round(float(c[1]), 7), round(max(ys), 4)], dict(bins_kph=[b for b, _ in zip(BINS, xs)], p95_ms2=[round(y, 3) for y in ys], n=ws)
out = {'method': 'measured p95 deceleration 80-280 km/h, a0 + a2*v^2 (m/s^2, v in m/s); label: achieved braking (includes driver margin)',
       'traces_sha256': hashlib.sha256(open(TRP, 'rb').read()).hexdigest(), 'seasons': {}}
for y in sorted(S):
    c, info = fit(y); out['seasons'][str(y)] = {'all': c, 'fit': info, 'loto': {t: fit(y, t)[0] for t in sorted(S[y])},
      # per track, per bin: decel histogram at 0.05 m/s² (sparse {slot: count}) so a cap for any excluded track set can be rebuilt
      # (per-fold report of central 18:10; calibrate.mjs capExcluding)
      'hist': {t: {str(lo): {str(k): int(n) for k, n in zip(*np.unique(np.floor(np.array(d[lo]) / 0.05).astype(int), return_counts=True))} for lo in BINS if d[lo]} for t, d in sorted(S[y].items())}}
    print(y, 'a0 %.2f a2 %.6f max %.2f m/s2; limit g at 100/200/280:' % tuple(c), [round(min(c[0] + c[1] * (v / 3.6) ** 2, c[2]) / 9.81, 2) for v in (100, 200, 280)])
json.dump(out, open(OUT, 'w'), indent=1, sort_keys=True)
