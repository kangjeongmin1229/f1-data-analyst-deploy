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



from pickup import video_pickups, true_pickups
res = []
for D in (0.5, 1.0):
    for rise in (True, False):
        PR = [match(video_pickups(at, r, q, t0, t[-1], D, rise), true_pickups(t, thr, D), 0.6) for key, t0, t, thr, at, r, q in LAPS]
        P = [x[0] for x in PR]; R = [x[1] for x in PR]
        res.append({'D': D, 'rise': rise, 'P_median': round(float(np.median(P)), 3), 'R_median': round(float(np.median(R)), 3), 'bias_median_s': round(float(np.median([x[2] for x in PR if x[2] is not None])), 3), 'n_pick_video_truth': [int(np.median([len(video_pickups(at, r, q, t0, t[-1], D, rise)) for key, t0, t, thr, at, r, q in LAPS])), int(np.median([len(true_pickups(t, thr, D)) for key, t0, t, thr, at, r, q in LAPS]))]}); print(res[-1], flush=True)
json.dump({'n_laps': len(LAPS), 'variants': res}, open('/home/claude/ser/f1/tune_pickup.json', 'w'), indent=1)
