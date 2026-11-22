import numpy as np
from scipy.ndimage import median_filter
from throttle_share import share
def segs(mask, dt, dmin, gap):
    d = np.diff(np.r_[0, mask.astype(int), 0]); a = np.where(d == 1)[0]; b = np.where(d == -1)[0]
    ev = []
    for x, y in zip(a, b):
        if ev and (x - ev[-1][1]) * dt < gap: ev[-1][1] = y
        else: ev.append([x, y])
    return sum(1 for x, y in ev if (y - x) * dt >= dmin)
def off_mask(at, r, q, t0, lap, rise=True, alpha=0.5, w=0.2):
    dt = at[1]-at[0]; m = (at >= t0) & (at <= t0 + lap)
    qs = median_filter(q, max(1, int(w / dt)) | 1); ref = np.percentile(qs[m], 90); on = qs >= alpha * ref
    if rise: on &= np.gradient(median_filter(r, 5)) >= -50 * dt
    return ~on[m], dt
def video_lifts(at, r, q, t0, lap, dmin=0.3, gap=1.0, rise=True):
    off, dt = off_mask(at, r, q, t0, lap, rise); return segs(off, dt, dmin, gap)
def true_lifts(t, thr):
    dt = float(np.median(np.diff(t))); return segs(thr < 50, dt, 0.3, 1.0)
