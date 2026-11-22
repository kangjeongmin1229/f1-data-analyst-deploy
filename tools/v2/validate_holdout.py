"""Hold-out Gate G: learn.py events on F1 practice fastest-lap onboards (laps never used for tuning) vs timing telemetry."""
import json, re, sys, os, numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, '/home/claude/ser/f1')
from ti_window import load
from validate_learn import match, SLUG
IDX = json.load(open('/home/claude/ser/yt/index_rows.json'))
CODE = {'antonelli': 'ANT', 'leclerc': 'LEC', 'norris': 'NOR', 'hamilton': 'HAM', 'russell': 'RUS', 'verstappen': 'VER', 'piastri': 'PIA',
        'alonso': 'ALO', 'sainz': 'SAI', 'perez': 'PER', 'gasly': 'GAS', 'albon': 'ALB', 'ocon': 'OCO'}
TOL, BTOL = float(os.environ.get('TOL', 0.6)), float(os.environ.get('BTOL', 0.6))
out = {}
for r in IDX:
    m = re.match(r'(\d{4}) (.+?) GP (FP\d)', r['title'])
    if not m or r['series'] != 'F1' or not os.path.exists(f"/home/claude/ser/yt/learn/{r['row']}.json"): continue
    y, name, fp = m.groups(); ev = f"{name.replace('Sao Paulo', 'São Paulo')} Grand Prix"
    drv = next((c for s, c in CODE.items() if s in r['title'].lower()), None)
    if not drv: continue
    repo = f'/home/claude/ti{y}'; base = f"{ev}/Practice {fp[2]}/{drv}"
    L = load(repo, base + '/laptimes.json')
    if not L: out[r['row']] = {'skip': 'no timing ' + base}; continue
    tm = [x if isinstance(x, (int, float)) else 1e9 for x in L['time']]; lap = L['lap'][int(np.argmin(tm))]
    T = load(repo, f'{base}/{lap}_tel.json')
    if not T: out[r['row']] = {'skip': 'no tel'}; continue
    T = T['tel']; t = np.array(T['time'], float); rpm = np.array(T['rpm'], float)
    d = json.load(open(f"/home/claude/ser/yt/out2/{r['row']}.json")); a = d['audio']; at = np.array(a['t']); ra = median_filter(np.array(a['rpm'], float), 9)
    dt = at[1] - at[0]; g = np.arange(0, t[-1], dt); ref = np.interp(g, t, rpm); n = len(g)
    if len(at) <= n: out[r['row']] = {'skip': 'clip shorter than lap'}; continue
    cs = [np.corrcoef(ra[k:k + n], ref)[0, 1] for k in range(0, len(at) - n)]; k = int(np.nanargmax(cs)); c = cs[k]; t0 = float(at[k])
    if c < 0.8: out[r['row']] = {'skip': 'sound not aligned', 'rpm_corr': round(float(c), 3)}; continue
    Lr = json.load(open(f"/home/claude/ser/yt/learn/{r['row']}.json")); lapT = t[-1]
    W = lambda xs: [x - t0 for x in xs if t0 <= x <= t0 + lapT]
    gr = np.array(T['gear'], float); b = np.array(T['brake'], float) > 0.5
    up_ti = list(t[1:][np.diff(gr) > 0]); br_ti = list(t[1:][np.diff(b.astype(int)) > 0]); br_ti = [x for i, x in enumerate(br_ti) if i == 0 or x - br_ti[i - 1] > 2]
    out[r['row']] = {'event': f'{y} {ev} {fp} {drv} L{lap}', 'rpm_corr': round(float(c), 3),
                     'up_prec_rec_bias': match(W([u[0] for u in Lr['upshifts']]), up_ti, TOL),
                     'brake_prec_rec_bias': match(W([z['onset'] for z in Lr['brake_zones']]), br_ti, BTOL)}
    print(r['row'], out[r['row']], flush=True)
json.dump(out, open('/home/claude/ser/f1/validate_holdout.json', 'w'), indent=1)
P = [v for v in out.values() if 'up_prec_rec_bias' in v]
for k in ('up_prec_rec_bias', 'brake_prec_rec_bias'):
    print(k, len(P), 'laps; median prec', np.median([p[k][0] for p in P]), 'rec', np.median([p[k][1] for p in P]))
print('skipped', {k: v.get('skip') for k, v in out.items() if 'skip' in v})
