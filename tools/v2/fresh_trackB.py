"""Fresh-track set B Gate G run (Project claude/gate-video-sound-freshB-prereg-2026-11-22.md), run once. Braking judged with frozen braking4; upshift with frozen learn.shifts.
Based on the set A runner (pre-registered in Project claude/gate-video-sound-prereg-2026-11-22.md, run once).
Frozen learn.py events vs timing telemetry; same rpm cross-correlation alignment and matching as validate_holdout.py."""
import json, os, sys, numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, '/home/claude/ser/f1')
from ti_window import load
from validate_learn import match
sys.path.insert(0, '/home/claude/ser/yt')
import learn
from braking4 import braking4
TOL = BTOL = 0.6
Y = '/home/claude/ser/yt'
TI = {'lv24_fp2': ('Las Vegas', 2024, 'Las Vegas Grand Prix', 'Practice 2', 'HAM', None), 'lv24_q': ('Las Vegas', 2024, 'Las Vegas Grand Prix', 'Qualifying', 'RUS', None)}
FF = {'ru21_fp2': 'Sochi', 'tu20_q': 'Mugello', 'tu20_fp3': 'Mugello', 'ei20_q': 'Nürburgring', 'ei20_fp3': 'Nürburgring', 'de19_q': 'Hockenheim'}


def truth(row):
    if row in FF:
        p = f'{Y}/out2/{row}.truth.json'
        if not os.path.exists(p): return None, 'no truth file'
        d = json.load(open(p)); return d['tel'], d['event']
    tr, y, ev, ses, drv, lap = TI[row]; repo = f'/home/claude/ti{y}'; base = f'{ev}/{ses}/{drv}'
    if lap is None:
        L = load(repo, base + '/laptimes.json')
        if not L: return None, 'no timing ' + base
        tm = [x if isinstance(x, (int, float)) else 1e9 for x in L['time']]; lap = L['lap'][int(np.argmin(tm))]
    T = load(repo, f'{base}/{lap}_tel.json')
    return (T['tel'], f'{y} {ev} {ses} {drv} L{lap}') if T else (None, 'no tel')


out = {}
for row in list(TI) + list(FF):
    track = TI[row][0] if row in TI else FF[row]
    if not os.path.exists(f'{Y}/out2/{row}.json'): out[row] = {'track': track, 'skip': 'no video'}; continue
    T, ev = truth(row)
    if T is None: out[row] = {'track': track, 'skip': ev}; continue
    t = np.array(T['time'], float); rpm = np.array(T['rpm'], float)
    d = json.load(open(f'{Y}/out2/{row}.json')); a = d['audio']; at = np.array(a['t']); ra = median_filter(np.array(a['rpm'], float), 9)
    dt = at[1] - at[0]; g = np.arange(0, t[-1], dt); ref = np.interp(g, t, rpm); n = len(g)
    if len(at) <= n: out[row] = {'track': track, 'event': ev, 'skip': 'clip shorter than lap'}; continue
    cs = [np.corrcoef(ra[k:k + n], ref)[0, 1] for k in range(0, len(at) - n)]; k = int(np.nanargmax(cs)); c = cs[k]; t0 = float(at[k])
    if c < 0.8: out[row] = {'track': track, 'event': ev, 'skip': 'sound not aligned', 'rpm_corr': round(float(c), 3)}; continue
    Lr = json.load(open(f'{Y}/learn/{row}.json')); lapT = t[-1]
    A = d['audio']; aq = np.array(A['q'], float); ar = median_filter(np.array(A['rpm'], float), 5); Rv = np.array(d['video']['rows'], float)
    b4 = braking4(at, ar, aq, Rv[:, 0], median_filter(np.where(Rv[:, 8] > 0, 0, Rv[:, 1]) / learn.F0, 13))
    W = lambda xs: [x - t0 for x in xs if t0 <= x <= t0 + lapT]
    gr = np.array(T['gear'], float); b = np.array(T['brake'], float) > 0.5
    up_ti = list(t[1:][np.diff(gr) > 0]); br_ti = list(t[1:][np.diff(b.astype(int)) > 0]); br_ti = [x for i, x in enumerate(br_ti) if i == 0 or x - br_ti[i - 1] > 2]
    out[row] = {'track': track, 'event': ev, 'rpm_corr': round(float(c), 3),
                'up': match(W([u[0] for u in Lr['upshifts']]), up_ti, TOL), 'brake': match(W(b4), br_ti, BTOL), 'brake3_ref': match(W([z['onset'] for z in Lr['brake_zones']]), br_ti, BTOL)}
    print(row, out[row], flush=True)

rng = np.random.default_rng(0)
summ = {}
for key in ('brake', 'up'):
    tracks = {}
    for v in out.values():
        if key in v: tracks.setdefault(v['track'], []).append(v[key][:2])
    TP = {tr: (float(np.median([p for p, _ in L])), float(np.median([r for _, r in L]))) for tr, L in tracks.items()}
    P = np.array([p for p, _ in TP.values()]); R = np.array([r for _, r in TP.values()])
    ci = lambda x: [float(v) for v in np.percentile([np.median(rng.choice(x, len(x))) for _ in range(5000)], [5, 95])] if len(x) else None
    summ[key] = {'tracks': TP, 'n_tracks': len(TP), 'P': float(np.median(P)) if len(P) else None, 'P_ci90': ci(P),
                 'R': float(np.median(R)) if len(R) else None, 'R_ci90': ci(R)}
    print(key, json.dumps(summ[key]))
json.dump({'laps': out, 'summary': summ}, open('/home/claude/ser/f1/fresh_trackB.json', 'w'), indent=1, ensure_ascii=False)
print('skipped', {k: v['skip'] for k, v in out.items() if 'skip' in v})
