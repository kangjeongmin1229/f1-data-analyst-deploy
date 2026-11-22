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
    thr = np.array(T['throttle'], float)
    d = json.load(open(yj)); Au, V = d['audio'], d['video']
    at = np.array(Au['t'], float); r = median_filter(np.array(Au['rpm'], float), 5); q = np.array(Au['q'], float)
    Rv = np.array(V['rows'], float); yaw = median_filter(np.where(Rv[:, 8] > 0, 0, Rv[:, 1]) / learn.F0, 13)
    LAPS.append((key, A['audio_lap_start'], t, thr, at, r, q))
print('laps', len(LAPS))


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
if __name__ == '__main__':
    VARS = [dict(dmin=a, gap=g, rise=rr) for a in (0.2, 0.3, 0.5) for g in (0.5, 1.0) for rr in (True, False)]
    res = []
    for v in VARS:
        E = [(video_lifts(at, r, q, t0, t[-1], **v) - true_lifts(t, thr)) / max(1, true_lifts(t, thr)) for key, t0, t, thr, at, r, q in LAPS]
        res.append({'variant': v, 'median_abs_rel': round(float(np.median(np.abs(E))), 3), 'bias_rel': round(float(np.median(E)), 3)}); print(res[-1], flush=True)
    print('truth lifts', [true_lifts(t, thr) for key, t0, t, thr, at, r, q in LAPS])
    json.dump({'n_laps': len(LAPS), 'variants': res}, open('/home/claude/ser/f1/tune_lifts.json', 'w'), indent=1)
