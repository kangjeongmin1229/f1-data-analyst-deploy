"""TUNING copy of corner_check (attempt 2): caches laps, tries video-side settings. Original docstring: Corner count and L/R order: video yaw (learn.py corners()) vs F1 telemetry x/y heading rate, same detector. Pre-registered in
Project claude/gate-video-corners-prereg-2026-11-22.md. One value per track (median over laps), 90 % bootstrap over tracks."""
import json, re, sys, os, numpy as np
from scipy.ndimage import gaussian_filter1d as gf
sys.path.insert(0, '/home/claude/ser/f1'); sys.path.insert(0, '/home/claude/ser/yt')
from ti_window import load
from validate_learn import SLUG
from learn import corners
from scipy.ndimage import median_filter
IDX = json.load(open('/home/claude/ser/yt/index_rows.json')); R = json.load(open('/home/claude/ser/f1/results.json'))
CODE = {'antonelli': 'ANT', 'leclerc': 'LEC', 'norris': 'NOR', 'hamilton': 'HAM', 'russell': 'RUS', 'verstappen': 'VER', 'piastri': 'PIA', 'alonso': 'ALO'}
TRK = [('barcelona', 'catalunya'), ('sao paulo', 'interlagos'), ('são paulo', 'interlagos'), ('emilia', 'imola'), ('united states', 'cota'), ('mexico', 'mexico'),
       ('austrian', 'spielberg'), ('british', 'silverstone'), ('hungarian', 'hungaroring'), ('italian', 'monza'), ('monaco', 'monaco'), ('canadian', 'montreal'),
       ('azerbaijan', 'baku'), ('singapore', 'singapore'), ('abu', 'yas'), ('qatar', 'losail'), ('dutch', 'zandvoort'), ('belgian', 'spa'), ('chinese', 'shanghai'),
       ('miami', 'miami'), ('saudi', 'jeddah'), ('japanese', 'suzuka'), ('australian', 'melbourne'), ('las vegas', 'vegas')]
def track(title):
    t = title.lower(); y = title[:4]
    if 'bahrain' in t: return 'sepang' if y == '2026' else 'sakhir'
    if 'spanish' in t: return 'madring' if y == '2026' else 'catalunya'
    return next((b for a, b in TRK if a in t), t)
def lev(a, b):
    d = np.arange(len(b) + 1)
    for i, ca in enumerate(a, 1):
        p, d[0] = d[0], i
        for j, cb in enumerate(b, 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (ca != cb))
    return d[-1]
def tel_of(r):
    m = re.match(r'(\d{4}) (.+?) GP', r['title']); y, name = m.groups()
    fp = re.search(r'GP (FP\d)', r['title'])
    if fp:
        ev = f"{name.replace('Sao Paulo', 'São Paulo')} Grand Prix"; drv = next((c for s, c in CODE.items() if s in r['title'].lower()), None)
        if not drv: return None
        base = f"{ev}/Practice {fp.group(1)[2]}/{drv}"; L = load(f'/home/claude/ti{y}', base + '/laptimes.json')
        if not L: return None
        tm = [x if isinstance(x, (int, float)) else 1e9 for x in L['time']]; lap = L['lap'][int(np.argmin(tm))]
        return y, base, lap, 'practice'
    key = f"{y}-{SLUG.get(name, name.lower().replace(' ', '-'))}-s"
    if key not in R or not R[key].get('drv'): return None
    return y, f"{R[key]['event']}/Qualifying/{R[key]['drv']}", R[key]['lap'], 'qualifying'
rows = []; CACHE = []
for r in IDX:
    if r['series'] != 'F1' or not re.match(r'\d{4} .+? GP', r['title']) or r['kind'] not in ('폴랩 온보드', '최고기록 랩 온보드'): continue
    vid = re.search(r'v=([\w-]{11})', r['url']); f = f"/home/claude/ser/yt/out2/{'f_' + vid.group(1) if vid else r['row']}.json"
    if not os.path.exists(f): f = f"/home/claude/ser/yt/out2/{r['row']}.json"
    if not os.path.exists(f): continue
    tl = tel_of(r)
    if not tl: continue
    y, base, lap, ctx = tl
    if y not in ('2025', '2026') and ctx == 'qualifying': continue
    T = load(f'/home/claude/ti{y}', f'{base}/{lap}_tel.json')
    if not T: continue
    T = T['tel']; t = np.array(T['time'], float); rpm = np.array(T['rpm'], float)
    d = json.load(open(f)); a = d['audio']; at = np.array(a['t']); ra = median_filter(np.array(a['rpm'], float), 9)
    dt = at[1] - at[0]; g = np.arange(0, t[-1], dt); ref = np.interp(g, t, rpm); n = len(g)
    if len(at) <= n: continue
    cs = [np.corrcoef(ra[k:k + n], ref)[0, 1] for k in range(0, len(at) - n)]; k = int(np.nanargmax(cs))
    if cs[k] < 0.8: continue
    t0 = float(at[k])
    Rw = np.array(d['video']['rows'], float); ty = Rw[:, 0]; yaw = np.where(Rw[:, 8] > 0, 0, Rw[:, 1]) / 217
    m = (ty >= t0) & (ty <= t0 + t[-1])
    if m.sum() < 50: continue
    x = np.array(T['x'], float); yy = np.array(T['y'], float); tt = np.arange(0, t[-1], 1 / 15)
    X, Y = gf(np.interp(tt, t, x), 3), gf(np.interp(tt, t, yy), 3)
    hr = np.gradient(np.unwrap(np.arctan2(np.gradient(Y), np.gradient(X)))) * 15
    ct, _ = corners(tt, hr)
    st = ''.join(c['dir'] for c in ct)
    CACHE.append((track(r['title']), ty[m], yaw[m], st)); continue
    # direction convention may differ (image shift vs heading sign): take the better of the two, reported
    flip = sv.translate(str.maketrans('LR', 'RL'))
    S1, S2 = 1 - lev(sv, st) / max(len(sv), len(st), 1), 1 - lev(flip, st) / max(len(sv), len(st), 1)
    rows.append({'row': r['row'], 'track': track(r['title']), 'ctx': ctx, 'n_video': len(sv), 'n_truth': len(st), 'S': round(S1, 3), 'S_flip': round(S2, 3), 'video': sv, 'truth': st})
    print(rows[-1], flush=True)

from scipy.signal import find_peaks
def corners_v(ty, yaw, h=0.25, dist=1.0, w=0.4, win=0.5):
    dt = ty[1] - ty[0]; s = median_filter(yaw, max(3, int(win / dt) | 1))
    pk = find_peaks(np.abs(s), height=h, distance=max(1, int(dist / dt)), width=max(1, int(w / dt)))[0]
    return ''.join('L' if s[i] > 0 else 'R' for i in pk)
print(len(CACHE), 'laps')
VARS = [dict(), dict(h=0.2), dict(h=0.3), dict(dist=0.7), dict(dist=1.5), dict(w=0.3), dict(w=0.6), dict(win=0.8), dict(win=0.3),
        dict(h=0.2, dist=0.7), dict(h=0.3, w=0.6), dict(h=0.2, win=0.8)]
rng = np.random.default_rng(0); OUT = []
for v in VARS:
    per = {}
    for tr, ty, yw, st in CACHE:
        sv = corners_v(ty, yw, **v); S = 1 - lev(sv, st) / max(len(sv), len(st), 1)
        per.setdefault(tr, []).append((S, abs(len(sv) - len(st))))
    A = np.array([(np.median([a for a, _ in L]), np.median([b for _, b in L])) for L in per.values()])
    OUT.append({'variant': v, 'tracks': len(per), 'S': round(float(np.median(A[:, 0])), 3), 'count_err': float(np.median(A[:, 1]))}); print(OUT[-1], flush=True)
json.dump(OUT, open('/home/claude/ser/f1/tune_corners.json', 'w'), indent=1)
