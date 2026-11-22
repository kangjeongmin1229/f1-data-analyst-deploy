"""Qatar 2026 locked-set run, ONE run on or after 2026-11-30 KST.
Pre-registrations: claude/gate-video-sound-locked-qatar-prereg-2026-11-22.md (braking4 + upshift timing, P/R)
                   claude/gate-video-upcount-prereg-2026-11-22.md (upshifts per lap).
Rows: qatar_rows.json = {row: [session folder, driver, lap or null]}, video in yt/out2/<row>.json, learn in yt/learn/<row>.json.
--dry ROW YEAR EVENT SESSION DRV LAP: test the pipeline on a TUNING lap only (result not a gate)."""
import json, os, sys, datetime, numpy as np
from scipy.ndimage import median_filter
sys.path.insert(0, '/home/claude/ser/f1'); sys.path.insert(0, '/home/claude/ser/yt')
from ti_window import load
from validate_learn import match
import learn
from braking4 import braking4
Y = '/home/claude/ser/yt'; TOL = 0.6
dry = sys.argv[1:2] == ['--dry']
if dry:
    row, y, ev, ses, drv, lap = sys.argv[2:8]; ROWS = {row: (int(y), ev, ses, drv, None if lap == 'none' else int(lap))}
else:
    if datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9))) < datetime.datetime(2026, 11, 30, tzinfo=datetime.timezone(datetime.timedelta(hours=9))):
        sys.exit('locked set: not before 2026-11-30 KST')
    if os.path.exists('/home/claude/ser/f1/qatar_locked.json'): sys.exit('already run once: qatar_locked.json exists')
    ROWS = {k: (2026, 'Qatar Grand Prix', *v) for k, v in json.load(open('/home/claude/ser/f1/qatar_rows.json')).items()}
def truth(y, ev, ses, drv, lap):
    repo = f'/home/claude/ti{y}'; base = f'{ev}/{ses}/{drv}'
    if lap is None:
        L = load(repo, base + '/laptimes.json')
        if not L: return None, 'no timing ' + base
        tm = [x if isinstance(x, (int, float)) else 1e9 for x in L['time']]; lap = L['lap'][int(np.argmin(tm))]
    T = load(repo, f'{base}/{lap}_tel.json'); return (T['tel'], f'{y} {ev} {ses} {drv} L{lap}') if T else (None, 'no tel')
out = {}
for row, spec in ROWS.items():
    if not os.path.exists(f'{Y}/out2/{row}.json') or not os.path.exists(f'{Y}/learn/{row}.json'): out[row] = {'skip': 'no video'}; continue
    T, ev = truth(*spec)
    if T is None: out[row] = {'skip': ev}; continue
    t = np.array(T['time'], float); rpm = np.array(T['rpm'], float)
    d = json.load(open(f'{Y}/out2/{row}.json')); A = d['audio']; at = np.array(A['t']); ra = median_filter(np.array(A['rpm'], float), 9)
    dt = at[1] - at[0]; g = np.arange(0, t[-1], dt); ref = np.interp(g, t, rpm); n = len(g)
    if len(at) <= n: out[row] = {'event': ev, 'skip': 'clip shorter than lap'}; continue
    cs = [np.corrcoef(ra[k:k + n], ref)[0, 1] for k in range(0, len(at) - n)]; k = int(np.nanargmax(cs)); c = cs[k]; t0 = float(at[k])
    if c < 0.8: out[row] = {'event': ev, 'skip': 'sound not aligned', 'rpm_corr': round(float(c), 3)}; continue
    Lr = json.load(open(f'{Y}/learn/{row}.json')); lapT = t[-1]
    aq = np.array(A['q'], float); ar = median_filter(np.array(A['rpm'], float), 5); Rv = np.array(d['video']['rows'], float)
    b4 = braking4(at, ar, aq, Rv[:, 0], median_filter(np.where(Rv[:, 8] > 0, 0, Rv[:, 1]) / learn.F0, 13))
    W = lambda xs: [x - t0 for x in xs if t0 <= x <= t0 + lapT]
    gr = np.array(T['gear'], float); b = np.array(T['brake'], float) > 0.5
    up_ti = list(t[1:][np.diff(gr) > 0]); br_ti = list(t[1:][np.diff(b.astype(int)) > 0]); br_ti = [x for i, x in enumerate(br_ti) if i == 0 or x - br_ti[i - 1] > 2]
    up_v = W([u[0] for u in Lr['upshifts']])
    out[row] = {'event': ev, 'rpm_corr': round(float(c), 3), 'brake': match(W(b4), br_ti, TOL), 'up': match(up_v, up_ti, TOL),
                'upcount': [len(up_v), len(up_ti), round((len(up_v) - len(up_ti)) / len(up_ti), 3)]}
    print(row, out[row], flush=True)
rng = np.random.default_rng(0); ok = [v for v in out.values() if 'brake' in v]
ci = lambda x: [float(v) for v in np.percentile([np.median(rng.choice(x, len(x))) for _ in range(5000)], [5, 95])] if len(x) else None
summ = {'n_laps': len(ok)}
for key in ('brake', 'up'):
    P = np.array([v[key][0] for v in ok]); R = np.array([v[key][1] for v in ok])
    summ[key] = {'P': float(np.median(P)) if len(P) else None, 'P_ci90': ci(P), 'R': float(np.median(R)) if len(R) else None, 'R_ci90': ci(R),
                 'verdict': 'not enough data' if len(ok) < 3 else ('pass' if np.median(P) >= 0.7 and np.median(R) >= 0.7 else 'fail')}
E_ = np.array([abs(v['upcount'][2]) for v in ok]); bnd = ci(E_)
summ['upcount'] = {'median_abs_rel': float(np.median(E_)) if len(E_) else None, 'ci90': bnd, 'rms_rel': float(np.sqrt(np.mean([v['upcount'][2] ** 2 for v in ok]))) if ok else None,
                   'verdict': 'not enough data' if len(ok) < 3 else ('pass (provisional only, 1 track)' if np.median(E_) <= 0.10 and bnd[1] <= 0.20 else 'fail')}
print('summary', json.dumps(summ))
print('skipped', {k: v['skip'] for k, v in out.items() if 'skip' in v})
json.dump({'laps': out, 'summary': summ}, open('/home/claude/ser/f1/' + ('qatar_dry.json' if dry else 'qatar_locked.json'), 'w'), indent=1)
