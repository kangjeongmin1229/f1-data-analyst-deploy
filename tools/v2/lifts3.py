"""Lifts attempt 3 (event level). Pre-registration claude/gate-video-lifts-attempt3-prereg-2026-11-22.md."""
import numpy as np
from scipy.ndimage import median_filter
from braking4 import braking4
def segs_list(mask, dt, gap=1.0):
    d = np.diff(np.r_[0, mask.astype(int), 0]); a = np.where(d == 1)[0]; b = np.where(d == -1)[0]; ev = []
    for x, y in zip(a, b):
        if ev and (x - ev[-1][1]) * dt < gap: ev[-1][1] = y
        else: ev.append([x, y])
    return [(x * dt, (y - x) * dt) for x, y in ev]
def true_lifts(t, thr, dmin=0.5):
    dt = float(np.median(np.diff(t))); return sum(1 for s, L in segs_list(np.asarray(thr) < 50, dt) if L >= dmin)
def video_lifts(at, r, q, ty, yaw, t0, lap, d=None, alpha=0.5, w=0.2):
    on_b = [x - t0 for x in braking4(at, r, q, ty, yaw) if t0 <= x <= t0 + lap]
    if d is None: return len(on_b)
    dt = at[1] - at[0]; m = (at >= t0) & (at <= t0 + lap)
    qs = median_filter(q, max(1, int(w / dt)) | 1); ref = np.percentile(qs[m], 90)
    on = (qs >= alpha * ref) & (np.gradient(median_filter(r, 5)) >= -50 * dt)
    extra = [s for s, L in segs_list(~on[m], dt) if L >= d and not any(b - 0.5 <= s <= b + 3 for b in on_b)]
    return len(on_b) + len(extra)
