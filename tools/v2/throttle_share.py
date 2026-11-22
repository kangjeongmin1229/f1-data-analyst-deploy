"""Full-throttle share from sound, frozen 2026-11-22 (alpha 0.5, w 0.2 s, rpm not falling). Pre-registration:
Project claude/gate-video-throttle-share-prereg-2026-11-22.md."""
import numpy as np
from scipy.ndimage import median_filter
def share(at, r, q, t0, lap, alpha=0.5, w=0.2, rise=True):
    dt = at[1] - at[0]; m = (at >= t0) & (at <= t0 + lap)
    qs = median_filter(q, max(1, int(w / dt)) | 1); ref = np.percentile(qs[m], 90)
    on = qs >= alpha * ref
    if rise: on &= np.gradient(median_filter(r, 5)) >= -50 * dt
    return 100 * on[m].mean()
