"""Diagnostic, tuning laps only: can sound features separate full / part / off throttle?"""
import numpy as np, json
src = open('/home/claude/ser/f1/tune_throttle.py').read(); exec(src[:src.index("def share(")])
from scipy.ndimage import median_filter
F = {'full': [], 'part': [], 'off': []}
for key, t0, t, thr, at, r, q in LAPS:
    m = (at >= t0) & (at <= t0 + t[-1]); dt = at[1] - at[0]
    qs = median_filter(q, 5); ref = np.percentile(qs[m], 90); rs = median_filter(r, 5); g = np.gradient(rs) / dt
    th = np.interp(at[m] - t0, t, thr)
    for lab, sel in (('full', th >= 98), ('part', (th > 20) & (th < 98)), ('off', th <= 20)):
        F[lab].append(np.c_[qs[m][sel] / ref, g[m][sel], rs[m][sel]])
out = {}
for lab, x in F.items():
    x = np.vstack(x); out[lab] = {'n': len(x), 'q_rel_p25_50_75': np.percentile(x[:, 0], [25, 50, 75]).round(2).tolist(),
        'rpm_slope_p25_50_75': np.percentile(x[:, 1], [25, 50, 75]).round(0).tolist(), 'rpm_p50': float(np.median(x[:, 2]).round(0))}
    print(lab, out[lab])
# best single-feature split part vs off, and part vs full (AUC)
from sklearn.metrics import roc_auc_score
P, O, U = np.vstack(F['part']), np.vstack(F['off']), np.vstack(F['full'])
for i, nm in enumerate(['q_rel', 'rpm_slope', 'rpm']):
    a1 = roc_auc_score(np.r_[np.ones(len(P)), np.zeros(len(O))], np.r_[P[:, i], O[:, i]])
    a2 = roc_auc_score(np.r_[np.ones(len(U)), np.zeros(len(P))], np.r_[U[:, i], P[:, i]])
    out[nm + '_auc'] = {'part_vs_off': round(a1, 3), 'full_vs_part': round(a2, 3)}; print(nm, out[nm + '_auc'])
json.dump(out, open('/home/claude/ser/f1/diag_part.json', 'w'), indent=1)
