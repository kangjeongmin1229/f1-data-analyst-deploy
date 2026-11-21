"""Gate G check of learn.py events against F1 timing telemetry (gear, brake) on the pole laps."""
import json, re, sys, numpy as np
sys.path.insert(0, '/home/claude/ser/f1')
from ti_window import load
from align_audio import audio_align, yaw_at
R = json.load(open('/home/claude/ser/f1/results.json'))
IDX = json.load(open('/home/claude/ser/yt/index_rows.json'))
SLUG = {'Sao Paulo': 'sao-paulo', 'Mexico City': 'mexico-city', 'Barcelona-Catalunya': 'barcelona', 'Emilia Romagna': 'emilia-romagna',
        'Saudi Arabian': 'saudi-arabian', 'United States': 'united-states', 'Abu Dhabi': 'abu-dhabi', 'Las Vegas': 'las-vegas'}


def match(ev, ref, tol):
    ev, ref = np.array(ev), np.array(ref)
    if not len(ev) or not len(ref): return 0.0, 0.0, None
    d = np.array([np.min(np.abs(ref - e)) for e in ev]); hit = d <= tol
    rec = np.mean([np.min(np.abs(ev - r)) <= tol for r in ref])
    return round(float(hit.mean()), 2), round(float(rec), 2), round(float(np.median((ev[hit] - np.array([ref[np.argmin(np.abs(ref - e))] for e in ev[hit]])))), 2) if hit.any() else None


import os
TOL = float(os.environ.get('TOL', 0.3)); BTOL = float(os.environ.get('BTOL', 0.6))
out = {}
for r in IDX:
    m = re.match(r'(\d{4}) (.+) GP', r['title'])
    vid = re.search(r'v=([\w-]{11})', r['url'])
    if not m or not vid or r['session'] != '퀄리파잉': continue
    y, name = m.groups(); key = f"{y}-{SLUG.get(name, name.lower().replace(' ', '-'))}-s"
    lj = f"/home/claude/ser/yt/learn/f_{vid.group(1)}.json"; yj = f"/home/claude/ser/yt/out2/f_{vid.group(1)}.json"
    if key not in R or not R[key].get('drv'):
        continue
    try:
        L = json.load(open(lj))
    except FileNotFoundError:
        continue
    k = R[key]; ev = k['event']
    try:
        A = audio_align(yj, int(y), ev, k['drv'], k['lap'])
    except Exception as e:
        out[key] = {'err': str(e)[:80]}; continue
    if A['rpm_corr'] < 0.8:
        out[key] = {'skip': 'sound not aligned', **A}; continue
    T = load(f'/home/claude/ti{y}', f"{ev}/Qualifying/{k['drv']}/{k['lap']}_tel.json")['tel']
    t = np.array(T['time'], float); g = np.array(T['gear'], float); b = np.array(T['brake'], float) > 0.5
    t0 = A['audio_lap_start']; lap = t[-1]
    W = lambda xs: [x - t0 for x in xs if t0 <= x <= t0 + lap]
    up_ti = list(t[1:][np.diff(g) > 0]); dn_ti = list(t[1:][np.diff(g) < 0])
    br_ti = list(t[1:][np.diff(b.astype(int)) > 0])
    br_ti = [x for i, x in enumerate(br_ti) if i == 0 or x - br_ti[i - 1] > 2]
    up = W([u[0] for u in L['upshifts']]); dn = W([d[0] for d in L['downshifts']]); br = W([z['onset'] for z in L['brake_zones']])
    Y = yaw_at(yj, int(y), ev, k['drv'], k['lap'], t0)
    out[key] = {'rpm_corr': A['rpm_corr'], 'yaw_corr': Y['yaw_corr'], 'yaw_gain': Y['gain'],
                'up_prec_rec_bias': match(up, up_ti, TOL), 'down_prec_rec_bias': match(dn, dn_ti, TOL),
                'brake_prec_rec_bias': match(br, br_ti, BTOL), 'n': [len(up), len(up_ti), len(dn), len(dn_ti), len(br), len(br_ti)]}
    print(key, out[key], flush=True)
json.dump(out, open('/home/claude/ser/f1/validate_learn.json', 'w'), indent=1)
