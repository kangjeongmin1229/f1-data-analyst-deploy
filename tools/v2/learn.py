"""Derive what onboard video+sound can tell, per video: shifts, braking zones, corners, lap period, yaw closure (camera focal / FOV).
Measured data are not edited; every number comes from out2/<row>.json. Output: learn/<row>.json and learn_summary.json."""
import json, glob, os, sys
import numpy as np
from scipy.ndimage import median_filter
from scipy.signal import find_peaks

F0 = 217.0  # px/rad assumed by yt_extract (320 px wide)
os.makedirs('learn', exist_ok=True)


def shifts(t, r, q):
    """Upshift: rpm falls >=900 within 0.25 s from a local max; downshift: rpm rises >=600 within 0.25 s from a local min."""
    dt = t[1] - t[0]; w = max(1, int(round(0.25 / dt)))
    ok = q > np.nanpercentile(q, 20)
    up, dn = [], []
    d = r[w:] - r[:-w]
    for i in find_peaks(-d, height=900, distance=int(0.6 / dt))[0]:
        # drops to 1/2, 3/5, 2/3, 3/4, 4/5 of the rpm are harmonic-lock jumps of the comb, not shifts (15 % of raw hits)
        if ok[i] and ok[i + w] and min(abs(r[i + w] / r[i] - h) for h in (1/2, 3/5, 2/3, 3/4, 4/5)) > 0.006:
            up.append((float(t[i]), float(r[i]), float(r[i + w])))
    for i in find_peaks(d, height=600, distance=int(0.3 / dt))[0]:
        if ok[i] and ok[i + w]: dn.append((float(t[i]), float(r[i]), float(r[i + w])))
    return up, dn


def braking(dn, t, r):
    """Braking zone = >=2 downshifts within 3 s; onset = last rpm max in the 2.5 s before the first downshift (the lift)."""
    zones, i = [], 0
    while i < len(dn):
        j = i
        while j + 1 < len(dn) and dn[j + 1][0] - dn[j][0] < 3.0: j += 1
        if j > i:
            t0 = dn[i][0]; m = (t > t0 - 2.5) & (t <= t0)
            k = np.argmax(np.where(m, r, -1))
            zones.append({'onset': round(float(t[k]), 2), 'rpm_at_lift': int(r[k]), 'n_down': j - i + 1, 'end': round(dn[j][0], 2)})
        i = j + 1
    return zones


def braking2(t, r, q, fall=2000, win=2.0):
    """Braking onset = rpm peak (prominence >= fall) followed by a fall of >= fall rpm within win s (lift + brake + downshifts)."""
    dt = t[1] - t[0]; w = int(win / dt); z = []
    for i in find_peaks(r, prominence=fall, distance=int(3 / dt))[0]:
        j = min(len(r) - 1, i + w)
        if r[i] - r[i:j + 1].min() >= fall and q[i] > np.percentile(q, 20):
            z.append({'onset': round(float(t[i]), 2), 'rpm_at_lift': int(r[i]), 'drop_rpm': int(r[i] - r[i:j + 1].min())})
    return z


def corners(ty, yaw):
    dt = ty[1] - ty[0]; s = median_filter(yaw, max(3, int(0.5 / dt) | 1))
    pk = find_peaks(np.abs(s), height=0.25, distance=int(1.0 / dt), width=int(0.4 / dt))
    return [{'t': round(float(ty[i]), 2), 'dir': 'L' if s[i] > 0 else 'R', 'peak_rad_s': round(float(s[i]), 3)} for i in pk[0]], s


def lap_period(t, r):
    """Strongest rpm autocorrelation peak between 60 and 260 s (one lap), only for clips long enough."""
    dt = t[1] - t[0]
    if t[-1] < 400: return None, 0.0
    x = (r - r.mean()) / (r.std() + 1e-9); n = len(x)
    f = np.fft.rfft(x, 2 * n); ac = np.fft.irfft(f * np.conj(f))[:n] / n
    lo, hi = int(60 / dt), min(int(260 / dt), n // 3)
    if hi <= lo: return None, 0.0
    k = lo + int(np.argmax(ac[lo:hi]))
    return round(k * dt, 2), round(float(ac[k]), 3)


def closure(ty, yaw, P, qa):
    """Integrated measured yaw over each lap window; for a closed circuit the true total is 2*pi, so g = |sum|/2pi = f/217."""
    if not P: return None
    dt = ty[1] - ty[0]; n = int(P / dt); good = qa > 0.15; out = []
    for s in range(0, len(yaw) - n, n):
        m = slice(s, s + n)
        if good[m].mean() < 0.85: continue  # cuts / replays / bad tracking
        out.append(abs(float(np.sum(yaw[m]) * dt)) / (2 * np.pi))
    if len(out) < 2: return None
    g = float(np.median(out))
    return {'laps_used': len(out), 'g_median': round(g, 3), 'g_iqr': round(float(np.subtract(*np.percentile(out, [75, 25]))), 3),
            'f_px320': round(F0 * g, 1), 'hfov_deg': round(float(np.degrees(2 * np.arctan(160 / (F0 * g)))), 1)}


def one(path):
    d = json.load(open(path)); A, V = d['audio'], d['video']
    t = np.array(A['t'], float); r = median_filter(np.array(A['rpm'], float), 5); q = np.array(A['q'], float)
    R = np.array(V['rows'], float); ty = R[:, 0]; qa = R[:, 2]; yaw = np.where(R[:, 8] > 0, 0, R[:, 1]) / F0
    up, dn = shifts(t, r, q)
    zones = braking2(t, r, q, float(os.environ.get('BFALL', 2000)))
    cs, ys = corners(ty, yaw)
    P, pc = lap_period(t, r)
    cl = closure(ty, ys, P, qa) if pc > 0.3 else None
    ratio = [round(b / a, 3) for _, a, b in up if a > 0]
    res = {'row': d['meta'].get('row'), 'series': d['meta'].get('series'), 'dur_s': round(float(t[-1]), 1),
           'rpm_p95': int(np.percentile(r[q > np.percentile(q, 20)], 95)) if len(r) else None,
           'upshift_rpm_med': int(np.median([a for _, a, _ in up])) if up else None,
           'upshift_step_med': round(float(np.median(ratio)), 3) if ratio else None,
           'n_up': len(up), 'n_down': len(dn), 'n_brake': len(zones), 'n_corner': len(cs),
           'lap_period_s': P, 'lap_ac': pc, 'closure': cl,
           'upshifts': [(round(a, 2), int(b), int(c)) for a, b, c in up], 'downshifts': [(round(a, 2), int(b), int(c)) for a, b, c in dn],
           'brake_zones': zones, 'corners': cs}
    json.dump(res, open(f"learn/{os.path.basename(path)}", 'w'))
    return {k: v for k, v in res.items() if k not in ('upshifts', 'downshifts', 'brake_zones', 'corners')}


if __name__ == '__main__':
    S = []
    for p in sorted(glob.glob('out2/*.json')):
        try: S.append(one(p))
        except Exception as e: S.append({'row': os.path.basename(p), 'error': str(e)[:120]})
    json.dump(S, open('learn_summary.json', 'w'), ensure_ascii=False, indent=0)
    print(len(S), 'videos;', sum('error' in s for s in S), 'errors')
