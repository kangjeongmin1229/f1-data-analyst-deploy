import numpy as np, json
src = open('/home/claude/ser/f1/tune_throttle.py').read(); exec(src[:src.index("def share(")])
from scipy.ndimage import median_filter, uniform_filter1d
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupKFold
from sklearn.metrics import roc_auc_score
X, Y, G = [], [], []
for gi, (key, t0, t, thr, at, r, q) in enumerate(LAPS):
    m = (at >= t0) & (at <= t0 + t[-1]); dt = at[1] - at[0]
    qs = median_filter(q, 5); ref = np.percentile(qs[m], 90); rs = median_filter(r, 5); g = np.gradient(rs) / dt
    f = [qs / ref, g, rs / np.percentile(rs[m], 95)]
    for w in (5, 13, 25): f += [uniform_filter1d(qs / ref, w), uniform_filter1d(g, w)]
    F = np.c_[tuple(f)][m]; th = np.interp(at[m] - t0, t, thr)
    X.append(F); Y.append(np.where(th >= 98, 2, np.where(th > 20, 1, 0))); G.append(np.full(len(F), gi))
X, Y, G = np.vstack(X), np.concatenate(Y), np.concatenate(G)
P = np.zeros((len(Y), 3))
for tr, te in GroupKFold(7).split(X, Y, G):
    P[te] = HistGradientBoostingClassifier(max_iter=200).fit(X[tr], Y[tr]).predict_proba(X[te])
pv = (Y >= 1); po = Y <= 1
res = {'part_vs_off_auc': round(roc_auc_score(Y[(Y <= 1)] == 1, P[Y <= 1, 1] / (P[Y <= 1, 0] + P[Y <= 1, 1])), 3),
       'full_vs_part_auc': round(roc_auc_score(Y[Y >= 1] == 2, P[Y >= 1, 2] / (P[Y >= 1, 1] + P[Y >= 1, 2])), 3),
       'acc_3class': round(float((P.argmax(1) == Y).mean()), 3), 'part_recall': round(float((P.argmax(1)[Y == 1] == 1).mean()), 3)}
# per-lap full-throttle share error with the model (lap-grouped CV), for comparison with 3.26 pp tuning error
E = [100 * ((P.argmax(1)[G == gi] == 2).mean() - (Y[G == gi] == 2).mean()) for gi in range(len(LAPS))]
res['share_median_abs_pp_cv'] = round(float(np.median(np.abs(E))), 2); res['share_p90_abs_pp_cv'] = round(float(np.percentile(np.abs(E), 90)), 2)
print(res); json.dump(res, open('/home/claude/ser/f1/diag_part2.json', 'w'), indent=1)
