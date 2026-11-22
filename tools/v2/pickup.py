"""Full-throttle pick-up points from sound. Pre-registration claude/gate-video-pickup-prereg-2026-11-22.md."""
import numpy as np
from scipy.ndimage import median_filter
def starts(mask, dt, D, gap=0.5):
    d = np.diff(np.r_[0, mask.astype(int), 0]); a = np.where(d == 1)[0]; b = np.where(d == -1)[0]; ev = []
    for x, y in zip(a, b):
        if ev and (x - ev[-1][1]) * dt < gap: ev[-1][1] = y
        else: ev.append([x, y])
    return [x * dt for x, y in ev if (y - x) * dt >= D]
def true_pickups(t, thr, D):
    dt = float(np.median(np.diff(t))); tt = np.arange(t[0], t[-1], dt)
    return [s + t[0] for s in starts(np.interp(tt, t, thr) >= 98, dt, D)]
def video_pickups(at, r, q, t0, lap, D, rise=True, alpha=0.5, w=0.2):
    dt = at[1] - at[0]; m = (at >= t0) & (at <= t0 + lap)
    qs = median_filter(q, max(1, int(w / dt)) | 1); ref = np.percentile(qs[m], 90); on = qs >= alpha * ref
    if rise: on &= np.gradient(median_filter(r, 5)) >= -50 * dt
    return starts(on[m], dt, D)
