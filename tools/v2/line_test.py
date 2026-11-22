"""Racing-line shape from onboard video: heading = integral of video yaw rate (gain-corrected), speed from timing telemetry.
Compared with the telemetry x/y after a best-fit rotation + translation. Reports RMS position error and closure error per lap."""
import json, re, sys, numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, '/home/claude/ser/f1')
from ti_window import load
from align_audio import audio_align
from validate_learn import SLUG
R = json.load(open('/home/claude/ser/f1/results.json')); V = json.load(open('/home/claude/ser/f1/validate_learn.json'))
IDX = json.load(open('/home/claude/ser/yt/index_rows.json'))
GAIN = 0.784  # median video yaw gain on clean F1 laps (Gate G)
res = {}
for r in IDX:
    m = re.match(r'(\d{4}) (.+) GP', r['title']); vid = re.search(r'v=([\w-]{11})', r['url'])
    if not m or not vid or r['session'] != '퀄리파잉': continue
    y, name = m.groups(); key = f"{y}-{SLUG.get(name, name.lower().replace(' ', '-'))}-s"
    if key not in V or V[key].get('yaw_corr', 0) < 0.8: continue
    k = R[key]; yj = f"/home/claude/ser/yt/out2/f_{vid.group(1)}.json"
    A = audio_align(yj, int(y), k['event'], k['drv'], k['lap']); t0 = A['audio_lap_start'] + V[key].get('yaw_shift', 0) * 0
    T = load(f'/home/claude/ti{y}', f"{k['event']}/Qualifying/{k['drv']}/{k['lap']}_tel.json")['tel']
    t = np.array(T['time'], float); x = np.array(T['x'], float) / 10; yy = np.array(T['y'], float) / 10  # dm -> m
    sp = np.array(T['speed'], float) / 3.6
    d = json.load(open(yj)); Rw = np.array(d['video']['rows'], float)
    tv = Rw[:, 0] - t0; yaw = np.where(Rw[:, 8] > 0, np.nan, Rw[:, 1]) / 217 / GAIN
    g = np.arange(0, t[-1], 0.04)
    w = np.interp(g, tv[~np.isnan(yaw)], median_filter(yaw[~np.isnan(yaw)], 5))
    v = np.interp(g, t, sp); h = np.cumsum(w) * 0.04
    px, py = np.cumsum(v * np.cos(h)) * 0.04, np.cumsum(v * np.sin(h)) * 0.04
    X, Y = np.interp(g, t, x), np.interp(g, t, yy)
    # best-fit rotation + translation (Procrustes, no scaling)
    P = np.c_[px - px.mean(), py - py.mean()]; Q = np.c_[X - X.mean(), Y - Y.mean()]
    U, _, Vt = np.linalg.svd(P.T @ Q); Rm = U @ Vt
    if np.linalg.det(Rm) < 0: continue  # mirror = sign error, skip
    E = P @ Rm - Q; err = np.hypot(E[:, 0], E[:, 1])
    L = float(np.sum(v) * 0.04)
    res[key] = {'lap_m': round(L), 'heading_total_deg': round(float(np.degrees(h[-1])), 1),
                'rms_m': round(float(np.sqrt((err ** 2).mean())), 1), 'p95_m': round(float(np.percentile(err, 95)), 1),
                'closure_m': round(float(np.hypot(px[-1] - px[0], py[-1] - py[0])), 1), 'yaw_corr': V[key]['yaw_corr']}
    print(key, res[key], flush=True)
json.dump(res, open('/home/claude/ser/f1/line_test.json', 'w'), indent=1)
a = np.array([[v['rms_m'], v['closure_m'], v['heading_total_deg']] for v in res.values()])
print(len(a), 'laps; median RMS', np.median(a[:, 0]), 'm; median closure', np.median(a[:, 1]), 'm; median total heading', np.median(a[:, 2]), 'deg (true +-360)')
