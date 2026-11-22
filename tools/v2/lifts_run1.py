"""Lifts hold-out (Project claude/gate-video-lifts-prereg-2026-11-22.md), run once.
From the set A runner: Fresh-track Gate G run (pre-registered in Project claude/gate-video-sound-prereg-2026-11-22.md, run once).
Frozen learn.py events vs timing telemetry; same rpm cross-correlation alignment and matching as validate_holdout.py."""
import json, os, sys, numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, '/home/claude/ser/f1')
from ti_window import load
from validate_learn import match
from throttle_share import share
import importlib.util as _u
_sp=_u.spec_from_file_location('tl','/home/claude/ser/f1/tune_lifts_fn.py'); tl=_u.module_from_spec(_sp); _sp.loader.exec_module(tl)
TOL = BTOL = 0.6
Y = '/home/claude/ser/yt'
TI = {  # row: (track, year, event, session folder, driver, lap or None = fastest)
    'v5': ('Suzuka', 2025, 'Japanese Grand Prix', 'Qualifying', 'VER', 16), 'v6': ('Suzuka', 2025, 'Japanese Grand Prix', 'Qualifying', 'VER', 16),
    'f_VT8ULSU6em8': ('Suzuka', 2025, 'Japanese Grand Prix', 'Qualifying', 'VER', 16),
    'v52': ('Suzuka', 2026, 'Japanese Grand Prix', 'Qualifying', 'ANT', 11), 'v110': ('Suzuka', 2026, 'Japanese Grand Prix', 'Practice 2', 'PIA', None),
    'v2': ('Melbourne', 2025, 'Australian Grand Prix', 'Qualifying', 'NOR', 19), 'f_DwEPWRAFcn0': ('Melbourne', 2025, 'Australian Grand Prix', 'Qualifying', 'NOR', 19),
    'v48': ('Melbourne', 2026, 'Australian Grand Prix', 'Qualifying', 'RUS', 21), 'v106': ('Melbourne', 2026, 'Australian Grand Prix', 'Practice 2', 'PIA', None),
    'v43': ('Las Vegas', 2025, 'Las Vegas Grand Prix', 'Qualifying', 'NOR', 24), 'f_wtXxkGvrokA': ('Las Vegas', 2025, 'Las Vegas Grand Prix', 'Qualifying', 'NOR', 24),
    'lv24_fp2': ('Las Vegas', 2024, 'Las Vegas Grand Prix', 'Practice 2', 'HAM', None), 'lv24_q': ('Las Vegas', 2024, 'Las Vegas Grand Prix', 'Qualifying', 'RUS', None),
    'fr22_fp2': ('Paul Ricard', 2022, 'French Grand Prix', 'Practice 2', 'SAI', None), 'fr22_fp3': ('Paul Ricard', 2022, 'French Grand Prix', 'Practice 3', 'VER', None),
    'fr22_q': ('Paul Ricard', 2022, 'French Grand Prix', 'Qualifying', 'LEC', None),
    'v74': ('Sepang', 2026, 'Bahrain Grand Prix', 'Qualifying', 'VER', None), 'v104': ('Sepang', 2026, 'Bahrain Grand Prix', 'Practice 1', 'VER', None)}
FF = {}


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
    thr = np.array(T['throttle'], float); tv = tl.true_lifts(t, thr)
    v = tl.video_lifts(at, median_filter(np.array(a['rpm'], float), 5), np.array(a['q'], float), t0, t[-1], dmin=0.5, gap=1.0, rise=True)
    out[row] = {'track': track, 'event': ev, 'rpm_corr': round(float(c), 3), 'video': int(v), 'truth': int(tv), 'e_rel': round((v - tv) / max(1, tv), 3)}
    print(row, out[row], flush=True)

rng = np.random.default_rng(0)
tr = {}
for v in out.values():
    if 'e_rel' in v: tr.setdefault(v['track'], []).append(abs(v['e_rel']))
TM = {k: float(np.median(x)) for k, x in tr.items()}; A = np.array(list(TM.values()))
ci = [float(v) for v in np.percentile([np.median(rng.choice(A, len(A))) for _ in range(5000)], [5, 95])] if len(A) else None
summ = {'tracks': TM, 'n_tracks': len(TM), 'median_abs_rel': float(np.median(A)) if len(A) else None, 'ci90': ci}
print('summary', json.dumps(summ, ensure_ascii=False))
json.dump({'laps': out, 'summary': summ}, open('/home/claude/ser/f1/lifts_holdout1.json', 'w'), indent=1, ensure_ascii=False)
print('skipped', {k: v['skip'] for k, v in out.items() if 'skip' in v})
