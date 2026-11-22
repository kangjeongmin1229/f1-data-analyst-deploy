import numpy as np, json, pickle
src = open('/home/claude/ser/f1/tune_throttle.py').read(); exec(src[:src.index("def share(")])
from lifts2 import *
D = []
for key, t0, t, thr, at, r, q in LAPS:
    X, dt = feats(at, r, q, t0, t[-1]); D.append((X, labels(at, t0, t[-1], t, thr), dt, true_lifts(t, thr)))
folds = np.arange(len(D)) % 7; res = []
P = [None] * len(D)
for k in range(7):
    M = fit(np.vstack([d[0] for i, d in enumerate(D) if folds[i] != k]), np.concatenate([d[1] for i, d in enumerate(D) if folds[i] != k]))
    for i in np.where(folds == k)[0]: P[i] = M.predict_proba(D[i][0])
for rule in ('argmax', 'p05'):
    for dmin in (0.3, 0.5):
        E = [(count(P[i], D[i][2], rule, dmin) - D[i][3]) / D[i][3] for i in range(len(D))]
        res.append({'rule': rule, 'dmin': dmin, 'median_abs_rel': round(float(np.median(np.abs(E))), 3), 'bias_rel': round(float(np.median(E)), 3), 'p90_abs_rel': round(float(np.percentile(np.abs(E), 90)), 3)}); print(res[-1])
b = min(res, key=lambda x: x['median_abs_rel']); print('frozen', b)
M = fit(np.vstack([d[0] for d in D]), np.concatenate([d[1] for d in D])); pickle.dump({'model': M, 'rule': b['rule'], 'dmin': b['dmin']}, open('/home/claude/ser/f1/lifts2_model.pkl', 'wb'))
json.dump({'n_laps': len(D), 'variants': res, 'frozen': b}, open('/home/claude/ser/f1/tune_lifts2.json', 'w'), indent=1)
