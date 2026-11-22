"""Upshifts per lap: frozen learn.py upshifts vs telemetry gear increases, tuning pole laps only (no variants, m = 1)."""
import json, re, sys, numpy as np
sys.path.insert(0, '/home/claude/ser/f1'); sys.path.insert(0, '/home/claude/ser/yt')
from ti_window import load
from align_audio import audio_align
from validate_learn import SLUG
R = json.load(open('/home/claude/ser/f1/results.json')); IDX = json.load(open('/home/claude/ser/yt/index_rows.json'))
out = {}
for row in IDX:
    m = re.match(r'(\d{4}) (.+) GP', row['title']); vid = re.search(r'v=([\w-]{11})', row['url'])
    if not m or not vid or row['session'] != '퀄리파잉': continue
    y, name = m.groups(); key = f"{y}-{SLUG.get(name, name.lower().replace(' ', '-'))}-s"
    if key in out or key not in R or not R[key].get('drv'): continue
    try:
        L = json.load(open(f"/home/claude/ser/yt/learn/f_{vid.group(1)}.json")); k = R[key]
        A = audio_align(f"/home/claude/ser/yt/out2/f_{vid.group(1)}.json", int(y), k['event'], k['drv'], k['lap'])
    except Exception: continue
    if A['rpm_corr'] < 0.8: continue
    T = load(f'/home/claude/ti{y}', f"{k['event']}/Qualifying/{k['drv']}/{k['lap']}_tel.json")['tel']
    t = np.array(T['time'], float); g = np.array(T['gear'], float); t0 = A['audio_lap_start']
    nv = sum(1 for u in L['upshifts'] if t0 <= u[0] <= t0 + t[-1]); nt = int((np.diff(g) > 0).sum())
    out[key] = {'video': nv, 'truth': nt, 'e_rel': round((nv - nt) / nt, 3)}
E=[abs(v['e_rel']) for v in out.values()]
print(len(out), 'median |e|', round(float(np.median(E)),3), 'bias', round(float(np.median([v['e_rel'] for v in out.values()])),3))
print({k:(v['video'],v['truth']) for k,v in out.items()})
json.dump(out, open('/home/claude/ser/f1/tune_upcount.json','w'), indent=1)
