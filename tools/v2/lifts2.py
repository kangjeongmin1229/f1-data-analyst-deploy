"""Lifts attempt 2: sound features -> 3-class throttle model -> lift count. Pre-registration claude/gate-video-lifts-attempt2-prereg-2026-11-22.md."""
import numpy as np
from scipy.ndimage import median_filter, uniform_filter1d
from sklearn.ensemble import HistGradientBoostingClassifier
def feats(at, r, q, t0, lap):
    m = (at >= t0) & (at <= t0 + lap); dt = at[1] - at[0]
    qs = median_filter(q, 5); ref = np.percentile(qs[m], 90); rs = median_filter(r, 5); g = np.gradient(rs) / dt
    f = [qs / ref, g, rs / np.percentile(rs[m], 95)]
    for w in (5, 13, 25): f += [uniform_filter1d(qs / ref, w), uniform_filter1d(g, w)]
    return np.c_[tuple(f)][m], dt
def labels(at, t0, lap, t, thr):
    m = (at >= t0) & (at <= t0 + lap); th = np.interp(at[m] - t0, t, thr)
    return np.where(th >= 98, 2, np.where(th > 20, 1, 0))
def segs(mask, dt, dmin, gap=1.0):
    d = np.diff(np.r_[0, mask.astype(int), 0]); a = np.where(d == 1)[0]; b = np.where(d == -1)[0]; ev = []
    for x, y in zip(a, b):
        if ev and (x - ev[-1][1]) * dt < gap: ev[-1][1] = y
        else: ev.append([x, y])
    return sum(1 for x, y in ev if (y - x) * dt >= dmin)
def true_lifts(t, thr):
    return segs(np.asarray(thr) < 50, float(np.median(np.diff(t))), 0.3, 1.0)
def count(P, dt, rule, dmin):
    off = P.argmax(1) == 0 if rule == 'argmax' else P[:, 0] >= 0.5
    return segs(off, dt, dmin)
def fit(X, Y): return HistGradientBoostingClassifier(max_iter=200, random_state=0).fit(X, Y)
