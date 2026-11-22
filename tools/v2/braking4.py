"""Braking attempt 3, frozen 2026-11-22: braking3 with QSTAY 0.65 (note must stay below 65 % of its pre-lift level).
Chosen on the 28 tuning pole laps: highest mean precision with median recall >= 0.75 (m = 43 incl. earlier 30)."""
import numpy as np
from scipy.ndimage import median_filter
from scipy.signal import find_peaks


def braking4(t, r, q, ty, yaw, drop=0.25, rfall=600, both=False, rnoup=False, qstay=0.65, minq=0.8, dist=1.5):
    dt = t[1] - t[0]; n = max(1, int(0.4 / dt)); qs = median_filter(q, 3); d = qs[:-n] - qs[n:]; z = []
    for i in find_peaks(d, height=drop, distance=int(dist / dt))[0]:
        if qs[i] < minq: continue
        a, b = i + int(0.3 / dt), i + int(1.2 / dt); c = min(len(r) - 1, i + int(2.0 / dt))
        if b >= len(qs): continue
        pre = qs[max(0, i - int(1.0 / dt)):i + 1].mean()
        if qs[a:b].mean() > qstay * pre: continue
        m0 = (ty > t[i] - 1.0) & (ty < t[i]); m1 = (ty > t[i] + 0.5) & (ty < t[i] + 2.0)
        turn = bool(m0.any() and m1.any() and np.abs(yaw[m1]).mean() - np.abs(yaw[m0]).mean() > 0.05)
        fall = r[i] - r[c] >= rfall
        if (both and not (fall and turn)) or (not both and not (fall or turn)): continue
        if rnoup and r[min(len(r) - 1, i + int(1.0 / dt))] > r[i] + 200: continue
        z.append(round(float(t[i + n // 2]) + 0.13, 2))
    return z
