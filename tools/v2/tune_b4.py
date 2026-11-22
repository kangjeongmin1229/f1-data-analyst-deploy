"""Braking attempt 3 (braking4) tuning on the aligned tuning pole laps only (same laps and alignment as validate_learn.py).
Variants are written to tune_b4.json; each one counts towards m."""
import json, re, sys, os, numpy as np
from scipy.ndimage import median_filter
from scipy.signal import find_peaks
sys.path.insert(0, '/home/claude/ser/f1'); sys.path.insert(0, '/home/claude/ser/yt')
from ti_window import load
from align_audio import audio_align
from validate_learn import match, SLUG
import learn
R = json.load(open('/home/claude/ser/f1/results.json')); IDX = json.load(open('/home/claude/ser/yt/index_rows.json'))


def braking4(t, r, q, ty, yaw, drop=0.25, rfall=600, both=False, rnoup=False, qstay=0.75, minq=0.8, dist=1.5):
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


LAPS = []
for row in IDX:
    m = re.match(r'(\d{4}) (.+) GP', row['title']); vid = re.search(r'v=([\w-]{11})', row['url'])
    if not m or not vid or row['session'] != '퀄리파잉': continue
    y, name = m.groups(); key = f"{y}-{SLUG.get(name, name.lower().replace(' ', '-'))}-s"
    yj = f"/home/claude/ser/yt/out2/f_{vid.group(1)}.json"
    if key not in R or not R[key].get('drv') or not os.path.exists(yj) or any(L[0] == key for L in LAPS): continue
    k = R[key]
    try: A = audio_align(yj, int(y), k['event'], k['drv'], k['lap'])
    except Exception: continue
    if A['rpm_corr'] < 0.8: continue
    T = load(f'/home/claude/ti{y}', f"{k['event']}/Qualifying/{k['drv']}/{k['lap']}_tel.json")['tel']
    t = np.array(T['time'], float); b = np.array(T['brake'], float) > 0.5
    br = list(t[1:][np.diff(b.astype(int)) > 0]); br = [x for i, x in enumerate(br) if i == 0 or x - br[i - 1] > 2]
    d = json.load(open(yj)); Au, V = d['audio'], d['video']
    at = np.array(Au['t'], float); r = median_filter(np.array(Au['rpm'], float), 5); q = np.array(Au['q'], float)
    Rv = np.array(V['rows'], float); yaw = median_filter(np.where(Rv[:, 8] > 0, 0, Rv[:, 1]) / learn.F0, 13)
    LAPS.append((key, A['audio_lap_start'], t[-1], br, at, r, q, Rv[:, 0], yaw))
print(len(LAPS), 'aligned tuning laps')

VARS = [dict(), dict(rfall=1000), dict(rfall=1500), dict(both=True), dict(rnoup=True), dict(drop=0.35),
        dict(both=True, rfall=400), dict(rfall=1000, rnoup=True), dict(qstay=0.65), dict(dist=2.5), dict(minq=1.0)]
res = []
for v in VARS:
    P, Rc = [], []
    for key, t0, lap, br, at, r, q, ty, yaw in LAPS:
        z = [x - t0 for x in braking4(at, r, q, ty, yaw, **v) if t0 <= x <= t0 + lap]
        p, rc, _ = match(z, br, 0.6); P.append(p); Rc.append(rc)
    res.append({'variant': v, 'P': float(np.median(P)), 'R': float(np.median(Rc)), 'P_mean': round(float(np.mean(P)), 3)})
    print(res[-1], flush=True)
json.dump({'n_laps': len(LAPS), 'variants': res}, open('/home/claude/ser/f1/tune_b4.json', 'w'), indent=1)
