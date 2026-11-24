# Step 30c (report-only): measured g-g-v envelope vs the shipped model; corner gap split into grip (G) and geometry (H).
# Rules: claude/rules-step30c-ggv-2026-11-25.md (sha256 42f98b63...). No model change, no fit, 2022 never read.
# Usage: python3 -I scripts/sim/learn/step30c_ggv.py <repo root> <TUM racetrack-database dir> <out dir>
import sys, os, json, csv
import numpy as np
from scipy.signal import savgol_filter
from scipy.spatial import cKDTree
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

ROOT, TUMDIR, OUT = sys.argv[1:4]; os.makedirs(OUT, exist_ok=True)
E = json.load(open(f'{ROOT}/scripts/sim/data/step30c/export.json'))
TR = json.load(open(f'{ROOT}/scripts/sim/data/f1-envelope/traces.json'))['events']
TUM = {'austin': 'Austin', 'hungaroring': 'Budapest', 'interlagos': 'SaoPaulo', 'mexico-city': 'MexicoCity', 'montreal': 'Montreal',
       'monza': 'Monza', 'sakhir': 'Sakhir', 'shanghai': 'Shanghai', 'silverstone': 'Silverstone', 'spa-francorchamps': 'Spa',
       'spielberg': 'Spielberg', 'suzuka': 'Suzuka', 'zandvoort': 'Zandvoort', 'kuala-lumpur': 'Sepang'}
G0, SGW, SEARCH, BINW, NB, rng = 9.81, 45.0, 40.0, 20.0, 2000, np.random.default_rng(30)
BINS = np.arange(60, 321, BINW)

def resample(x, y, step=1.0):
    x, y = np.asarray(x, float), np.asarray(y, float)
    d = np.hypot(np.diff(np.r_[x, x[0]]), np.diff(np.r_[y, y[0]])); s = np.r_[0, np.cumsum(d)]; L = s[-1]
    n = int(round(L / step)); t = np.arange(n) * L / n
    return np.interp(t, s, np.r_[x, x[0]]), np.interp(t, s, np.r_[y, y[0]]), L / n

def kappa_sg(x, y, h, win=30.0):  # step 30b estimator
    w = max(5, int(round(win / h)) | 1)
    xd, yd = savgol_filter(x, w, 2, deriv=1, delta=h, mode='wrap'), savgol_filter(y, w, 2, deriv=1, delta=h, mode='wrap')
    xdd, ydd = savgol_filter(x, w, 2, deriv=2, delta=h, mode='wrap'), savgol_filter(y, w, 2, deriv=2, delta=h, mode='wrap')
    return (xd * ydd - yd * xdd) / np.power(xd ** 2 + yd ** 2, 1.5)

def fit_rigid(ax, ay, bx, by):  # copied from step30b_audit.py: ICP, rotation + optional mirror + shift, no scale
    tb = cKDTree(np.c_[bx, by]); ca = np.array([ax.mean(), ay.mean()]); cb = np.array([bx.mean(), by.mean()]); best = (np.inf, None)
    for m in (1, -1):
        U0 = np.c_[m * (ax - ca[0]), ay - ca[1]]
        for r in range(24):
            th, t = r * np.pi / 12, cb.copy()
            for _ in range(40):
                R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]]); P = U0 @ R.T + t
                d, j = tb.query(P); Q = np.c_[bx[j], by[j]]; mu, mq = U0.mean(0), Q.mean(0); A, B = U0 - mu, Q - mq
                th = np.arctan2((A[:, 0] * B[:, 1] - A[:, 1] * B[:, 0]).sum(), (A * B).sum())
                R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]]); t = mq - R @ mu
            P = U0 @ R.T + t; d, _ = tb.query(P); rms = np.sqrt(np.mean(d ** 2))
            if rms < best[0]: best = (rms, (m, th, t.copy()))
    m, th, t = best[1]; R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
    return (lambda x, y: np.c_[m * (np.asarray(x) - ca[0]), np.asarray(y) - ca[1]] @ R.T + t), best[0]

def heading_path(h, ds, mx, my):  # step 30b: kernel path from its own heading (the integer-metre map is noisy)
    h = np.asarray(h); x = np.cumsum(np.cos(h)) * ds; y = np.cumsum(np.sin(h)) * ds; n = len(h)
    x -= np.arange(1, n + 1) / n * x[-1]; y -= np.arange(1, n + 1) / n * y[-1]
    return x - x.mean() + np.mean(mx), y - y.mean() + np.mean(my)

# --- geometry: TUM raceline curvature on each kernel grid -------------------------------------------------------------
GEO = {}
for tid, T in E['tracks'].items():
    ds, kK = T['ds'], np.array(T['kappa'], float); n = len(kK)
    mx, my = np.array(T['mapx'], float), np.array(T['mapy'], float)
    a = np.loadtxt(f'{TUMDIR}/tracks/{TUM[tid]}.csv', delimiter=','); rl = np.loadtxt(f'{TUMDIR}/racelines/{TUM[tid]}.csv', delimiter=',')
    put, rms = fit_rigid(a[:, 0], a[:, 1], mx, my); P = put(rl[:, 0], rl[:, 1])
    rx, ry, rh = resample(P[:, 0], P[:, 1]); kr = kappa_sg(rx, ry, rh)
    hx, hy = heading_path(T['heading'], ds, mx, my)
    _, j = cKDTree(np.c_[rx, ry]).query(np.c_[hx, hy]); kT = kr[j]
    if np.corrcoef(kT, kK)[0, 1] < 0: kT = -kT  # direction of travel
    GEO[tid] = dict(ds=ds, n=n, kK=kK, kT=kT, rms=float(rms), corr=float(np.corrcoef(kT, kK)[0, 1]),
                    corners=[(c['s'], f"T{c['number']}{c.get('letter') or ''}") for c in T['corners']])

def sg_deriv(v_kph, ds):
    v = np.asarray(v_kph, float) / 3.6; m = np.isfinite(v); idx = np.arange(len(v))
    vf = np.interp(idx, idx[m], v[m], period=len(v)); w = int(round(SGW / ds)) | 1
    return vf, savgol_filter(vf, w, 2, deriv=1, delta=ds, mode='wrap'), m

# --- samples and corners per lap ---------------------------------------------------------------------------------------
SAMP = {k: [] for k in ('M', 'S', 'K', 'MK')}  # rows: track, year, v kph, a_y g, a_x g
CORN = []
for key, m in E['model'].items():
    e = TR[key]; tid, yr, sh, n = e['track'], e['year'], e['shift'], e['n']; assert yr >= 2023
    g = GEO[tid]; ds = g['ds']; assert n == g['n']
    meas = np.array([np.nan if x is None else x for x in e['a']], float)
    vm = np.roll(np.array(m['v'], float), sh); kT = np.roll(g['kT'], sh); kK = np.roll(g['kK'], sh)
    for name, v, k in (('M', meas, kT), ('S', vm, kT), ('K', vm, kK), ('MK', meas, kK)):
        vf, dv, ok = sg_deriv(v, ds); ay = vf ** 2 * np.abs(k) / G0; ax = vf * dv / G0
        SAMP[name].append(np.c_[np.full(ok.sum(), list(GEO).index(tid)), np.full(ok.sum(), yr), vf[ok] * 3.6, ay[ok], ax[ok]])
    w = int(SEARCH / ds); ap = [c[0] for c in e['corners']]; st = e['straights']
    vmf = sg_deriv(vm, ds)[0] * 3.6
    for j, i in enumerate(ap):
        idx = (i + np.arange(-w, w + 1)) % n
        vmin_m = meas[i]; vmin_s = np.nanmin(vm[idx])
        RT = 1 / np.max(np.abs(kT[idx])); RK = 1 / np.max(np.abs(kK[idx]))
        s_sim = ((i - sh) % n) * ds
        dd = [(min(abs(s - s_sim), n * ds - abs(s - s_sim)), lab) for s, lab in g['corners']]
        turn = min(dd)[1] if dd and min(dd)[0] <= 80 else ''
        # phases on the measured trace, corner window = straight end before -> straight end after
        a0, a1 = st[j], st[(j + 1) % len(st)] if len(st) > 1 else None
        ph = {}
        if a1 is not None:
            seg = np.arange(a0, a1 + (n if a1 <= a0 else 0) + 1) % n
            vv, mm = meas[seg], vm[seg]; okp = np.isfinite(vv)
            dt = np.where(okp, ds / (mm / 3.6) - ds / (np.where(okp, vv, 1) / 3.6), 0.0)
            k0 = int(np.where(seg == i)[0][0]); lo = k0; hi = k0
            while lo > 0 and np.isfinite(vv[lo - 1]) and vv[lo - 1] <= 1.05 * vmin_m: lo -= 1
            while hi < len(seg) - 1 and np.isfinite(vv[hi + 1]) and vv[hi + 1] <= 1.05 * vmin_m: hi += 1
            ph = dict(dt=float(dt.sum()), entry=float(dt[:lo].sum()), apex=float(dt[lo:hi + 1].sum()), exit=float(dt[hi + 1:].sum()))
        y = np.log(vmin_m / vmin_s); Gp = 0.5 * np.log((vmin_m ** 2 / RT) / (vmin_s ** 2 / RK)); Hp = 0.5 * np.log(RT / RK)
        CORN.append(dict(track=tid, year=yr, i=i, turn=turn, share=((i - sh) % n) / n, meas=vmin_m, model=vmin_s, RT=RT, RK=RK,
                         y=y, G=Gp, H=Hp, ay_meas=(vmin_m / 3.6) ** 2 / RT / G0, ay_model=(vmin_s / 3.6) ** 2 / RK / G0, **ph))
for k in SAMP: SAMP[k] = np.vstack(SAMP[k])
TRK = list(GEO)

# --- bootstrap helpers (track clusters) --------------------------------------------------------------------------------
def boot(per_track, stat, nb=NB):
    keys = [k for k in per_track if len(per_track[k])]
    if not keys: return np.nan, np.nan, np.nan
    full = stat(np.concatenate([per_track[k] for k in keys])); bs = []
    for _ in range(nb):
        pick = rng.choice(len(keys), len(keys)); bs.append(stat(np.concatenate([per_track[keys[p]] for p in pick])))
    lo, hi = np.nanpercentile(bs, [2.5, 97.5]); return float(full), float(lo), float(hi)

def envelope(name, years):
    S = SAMP[name]; S = S[np.isin(S[:, 1], years)]; res = []
    for b in BINS[:-1]:
        sel = S[(S[:, 2] >= b) & (S[:, 2] < b + BINW)]; trks = np.unique(sel[:, 0])
        if len(trks) < 4 or len(sel) < 200: res.append(None); continue
        pt = lambda col: {int(t): col[sel[:, 0] == t] for t in trks}
        comb = np.hypot(sel[:, 3], sel[:, 4]); brk = np.where(sel[:, 4] < 0, -sel[:, 4], np.nan)
        res.append(dict(bin=int(b), n=int(len(sel)), tracks=int(len(trks)),
                        comb=boot(pt(comb), lambda x: np.percentile(x, 95), 600),
                        ay=boot(pt(sel[:, 3]), lambda x: np.percentile(x, 95), 600),
                        brake=boot(pt(brk), lambda x: np.nanpercentile(x, 95), 600)))
    return res

SEASONS = {'2023': [2023], '2024': [2024], '2025': [2025], 'pooled': [2023, 2024, 2025]}
ENV = {s: {k: envelope(k, y) for k in ('M', 'S', 'K', 'MK')} for s, y in SEASONS.items()}

# --- corner decomposition and verdict ----------------------------------------------------------------------------------
def band(lo, hi, years=(2023, 2024, 2025)):
    return [c for c in CORN if lo <= c['meas'] < hi and c['year'] in years]
def by_track(cs, f):
    d = {}
    for c in cs: d.setdefault(c['track'], []).append(f(c))
    return {k: np.array(v) for k, v in d.items()}
DEC = {}
for lo, hi in ((60, 120), (120, 180), (180, 240), (120, 240)):
    cs = band(lo, hi); vmod = np.median([c['model'] for c in cs])
    r = {p: boot(by_track(cs, lambda c, p=p: c[p]), np.mean) for p in ('y', 'G', 'H')}
    r.update(n=len(cs), tracks=len({c['track'] for c in cs}), vmod_med=float(vmod),
             kph={p: float(vmod * (np.exp(r[p][0]) - 1)) for p in ('y', 'G', 'H')})
    ph = [c for c in cs if 'dt' in c and abs(c['dt']) >= 0.02]
    r['phase_share'] = {p: boot(by_track(ph, lambda c, p=p: c[p] / c['dt']), np.mean) for p in ('entry', 'apex', 'exit')}
    r['phase_dt'] = {p: boot(by_track(ph, lambda c, p=p: c[p]), np.mean) for p in ('entry', 'apex', 'exit', 'dt')}
    DEC[f'{lo}-{hi}'] = r

def verdict(r):
    G, H = r['G'], r['H']; tot = abs(G[0] + H[0]); ex = lambda x: x[1] > 0 or x[2] < 0
    big = lambda x: abs(x[0]) >= 0.25 * tot
    if ex(G) and ex(H) and big(G) and big(H): return 'both'
    if ex(G) and (not ex(H) or not big(H)): return 'grip'
    if ex(H) and (not ex(G) or not big(G)): return 'geometry/matching'
    return 'inconclusive'

# --- realtel 2025/2026: alignment (step 24 lag), speed-min corners, lap-share agreement, season check ------------------
def lag_of(a, b, ds):  # copied from scripts/sim/f1-delta-offset.py (step 24 v2)
    n = len(b); best, bl = -1e9, 0
    for L in range(-int(200 / ds), int(200 / ds) + 1):
        idx = np.arange(n); x, y = a[idx], b[(idx - L) % n]; m = np.isfinite(x)
        if m.sum() < 20: continue
        c = np.corrcoef(x[m], y[m])[0, 1]
        if c > best: best, bl = c, L
    return bl * ds, best

def speedmins(a, ds, prom=10.0, half=150.0):
    w = int(half / ds); n = len(a); out = []
    for k in range(n):
        if not np.isfinite(a[k]): continue
        win = a[np.arange(k - w, k + w + 1) % n]
        if a[k] == np.nanmin(win) and np.nanmax(win) - a[k] >= prom and not (out and k - out[-1] < w): out.append(k)
    return out

RT, DROP = {}, {}
for key, r in E['realtel'].items():
    if not r['modelOk']: continue
    tid, yr = key.split('|'); L = r['mx'][-1] + (r['mx'][1] - r['mx'][0]); ds = 5.0; n = int(round(L / ds)); grid = np.arange(n) * L / n
    x = np.array(r['x']) * L / r['len']; v = np.array(r['v'], float)
    a = np.interp(grid, x, v, left=np.nan, right=np.nan)
    for g0, g1 in r['gaps']: a[(grid >= g0 * L / r['len']) & (grid < g1 * L / r['len'])] = np.nan
    mv = np.interp(grid, r['mx'], r['mv'], period=L); lag, corr = lag_of(a, mv, L / n)
    sh = int(round(lag / (L / n))); vm = np.roll(mv, sh); hw = int(SEARCH / (L / n))
    if corr < 0.93: DROP[key] = dict(lag=lag, corr=float(corr)); continue  # amendment A1: baseline drop rule (step 24 v2, corr < 0.93)
    cs = []
    for i in speedmins(a, L / n):
        idx = (i + np.arange(-hw, hw + 1)) % n; cs.append(dict(i=i, s_model=((i - sh) % n) * L / n, meas=float(a[i]), model=float(np.nanmin(vm[idx]))))
    RT[key] = dict(track=tid, year=int(yr), L=L, n=n, lag=lag, corr=float(corr), corners=cs, share=r['share'], lenr=r['len'])

# lap-share table agreement (2025 rows, and 2026 rows, on the 14 tracks)
rows = [r for r in csv.DictReader(open(f'{ROOT}/scripts/sim/data/f1-pedal-gap-corners-2025-2026.csv')) if r['track'] in GEO]
AGREE = []
for r in rows:
    R = RT.get(r['track'] + '|' + r['season']);
    if not R: continue
    pos = float(r['lap_share']) * R['L']; Lr = R['L']
    d = [(min(abs(c['i'] * Lr / R['n'] - pos), Lr - abs(c['i'] * Lr / R['n'] - pos)), c) for c in R['corners']]
    dm, cm = min(d, key=lambda t: t[0]) if d else (np.inf, None)
    AGREE.append(dict(track=r['track'], season=int(r['season']), meas_ls=float(r['apex_kph_meas']), model_ls=float(r['apex_kph_model']),
                      dist=float(dm), agree=dm <= 50, meas_sm=cm['meas'] if cm else np.nan, model_sm=cm['model'] if cm else np.nan))

def mband(rs, lo, hi, which):
    return [r for r in rs if lo <= r[which] < hi]
M = {}
for yr in (2025, 2026):
    ls = [r for r in AGREE if r['season'] == yr]
    sm = [dict(track=R['track'], meas=c['meas'], model=c['model']) for R in RT.values() if R['year'] == yr for c in R['corners']]
    a = by_track(mband(ls, 120, 240, 'meas_ls'), lambda r: np.log(r['meas_ls'] / r['model_ls']))
    b = by_track(mband(sm, 120, 240, 'meas'), lambda r: np.log(r['meas'] / r['model']))
    common = sorted(set(a) & set(b)); diffs = {k: np.array([a[k].mean() - b[k].mean()]) for k in common}
    M[yr] = dict(n_ls=len(ls), agree=int(sum(r['agree'] for r in ls)), tracks=len(common),
                 y_ls=boot({k: a[k] for k in common}, np.mean), y_sm=boot({k: b[k] for k in common}, np.mean), M=boot(diffs, np.mean),
                 bad=[dict(track=r['track'], meas_ls=r['meas_ls'], dist=round(r['dist'], 1), meas_sm=r['meas_sm']) for r in ls if not r['agree']])

# 2025 vs 2026 same corner (model frame, +-60 m)
SEAS = []
for tid in GEO:
    A, B = RT.get(tid + '|2025'), RT.get(tid + '|2026')
    if not (A and B): continue
    for c in A['corners']:
        d = [(min(abs(o['s_model'] - c['s_model']), A['L'] - abs(o['s_model'] - c['s_model'])), o) for o in B['corners']]
        if not d: continue
        dm, o = min(d, key=lambda t: t[0])
        if dm > 60: continue
        dd = [(min(abs(s - c['s_model']), A['L'] - abs(s - c['s_model'])), lab) for s, lab in GEO[tid]['corners']]
        SEAS.append(dict(track=tid, turn=min(dd)[1] if min(dd)[0] <= 80 else '', s=c['s_model'], m25=c['meas'], m26=o['meas'], p25=c['model'], p26=o['model'],
                         rm=o['meas'] / c['meas'], rp=o['model'] / c['model']))
for tid in {s['track'] for s in SEAS}:
    med = np.median([s['rm'] for s in SEAS if s['track'] == tid])
    for s in SEAS:
        if s['track'] == tid: s['flag'] = abs(s['rm'] / med - 1) > 0.15

# --- secondary numbers -------------------------------------------------------------------------------------------------
def env_ratio(a, b, lo, hi, years=(2023, 2024, 2025), nb=NB):
    A, B = SAMP[a], SAMP[b]; A = A[np.isin(A[:, 1], years) & (A[:, 2] >= lo) & (A[:, 2] < hi)]; B = B[np.isin(B[:, 1], years) & (B[:, 2] >= lo) & (B[:, 2] < hi)]
    tk = sorted(set(A[:, 0]) & set(B[:, 0])); f = lambda X, ks: np.percentile(np.concatenate([X[X[:, 0] == k, 3] for k in ks]), 95)
    full = f(A, tk) / f(B, tk); bs = []
    for _ in range(nb // 4):
        ks = [tk[i] for i in rng.choice(len(tk), len(tk))]; bs.append(f(A, ks) / f(B, ks))
    return [float(full), *map(float, np.percentile(bs, [2.5, 97.5]))]
SEC = {'ay_env_ratio_M_over_K': {f'{lo}-{hi}': env_ratio('M', 'K', lo, hi) for lo, hi in ((120, 180), (180, 240), (120, 240))},
       'ay_env_ratio_MK_over_K': {f'{lo}-{hi}': env_ratio('MK', 'K', lo, hi) for lo, hi in ((120, 180), (180, 240), (120, 240))}}
for lo, hi in ((120, 240), (180, 240)):
    cs = band(lo, hi)
    SEC[f'radius_{lo}-{hi}'] = dict(needed_lnR=boot(by_track(cs, lambda c: 2 * c['y']), np.mean), observed_lnR=boot(by_track(cs, lambda c: 2 * c['H']), np.mean),
                                     ay_apex_ratio_ln=boot(by_track(cs, lambda c: np.log(c['ay_meas'] / c['ay_model'])), np.mean))
for lo, hi in ((60, 120), (120, 240), (240, 400)):
    ss = [x for x in SEAS if lo <= x['m25'] < hi]
    SEC[f'season_{lo}-{hi}'] = dict(n=len(ss), meas=boot(by_track(ss, lambda x: np.log(x['rm'])), np.mean), model=boot(by_track(ss, lambda x: np.log(x['rp'])), np.mean),
                                    model_minus_meas=boot(by_track(ss, lambda x: np.log(x['rp'] / x['rm'])), np.mean))
# post-hoc sensitivity (labelled, does not decide): model speed sampled at 4 Hz in time, linear back to the grid, same estimators
SENS = dict(vmin=[], brake=[], brake4=[])
for key, m in E['model'].items():
    e = TR[key]; g = GEO[e['track']]; ds = g['ds']; n = e['n']; v = np.roll(np.array(m['v'], float), e['shift'])
    s = np.arange(n) * ds; t = np.concatenate([[0], np.cumsum(ds / (v[:-1] / 3.6))]); tk = np.arange(0.1, t[-1], 0.25)
    v4 = np.interp(s, np.interp(tk, t, s), np.interp(tk, t, v), period=n * ds)
    for i, _ in e['corners']:
        idx = (i + np.arange(-8, 9)) % n
        if 120 <= v[idx].min() < 240: SENS['vmin'].append(v4[idx].min() - v[idx].min())
    for vv, k in ((v, 'brake'), (v4, 'brake4')):
        vf, dv, _ = sg_deriv(vv, ds); ax_ = vf * dv / G0; sel = (vf * 3.6 >= 180) & (vf * 3.6 < 260) & (ax_ < 0); SENS[k].append(-ax_[sel])
SEC['sampling_4hz'] = dict(vmin_bias_kph_120_240=[float(np.mean(SENS['vmin'])), float(np.percentile(SENS['vmin'], 90))],
                           brake_p95_180_260=[float(np.percentile(np.concatenate(SENS['brake']), 95)), float(np.percentile(np.concatenate(SENS['brake4']), 95))])

# --- plots --------------------------------------------------------------------------------------------------------------
COL = {'M': '#1f4e9c', 'S': '#d98c1f', 'K': '#c0392b', 'MK': '#7f8c8d'}
LAB = {'M': 'measured, TUM line', 'S': 'model, TUM line', 'K': 'model, own path', 'MK': 'measured, model path'}
def draw(ax, res, key, name, ls='-'):
    xs = [r['bin'] + BINW / 2 for r in res if r]; y = [r[key][0] for r in res if r]; lo = [r[key][1] for r in res if r]; hi = [r[key][2] for r in res if r]
    ax.plot(xs, y, ls, color=COL[name], label=LAB[name], lw=1.8); ax.fill_between(xs, lo, hi, color=COL[name], alpha=0.15, lw=0)
fig, axs = plt.subplots(3, 1, figsize=(8, 10), sharex=True)
for ax, key, t in zip(axs, ('ay', 'brake', 'comb'), ('lateral |a_y| p95 (g)', 'braking −a_x p95 (g)', 'combined g p95')):
    for nm in ('M', 'S', 'K'): draw(ax, ENV['pooled'][nm], key, nm)
    draw(ax, ENV['pooled']['MK'], key, 'MK', '--'); ax.set_ylabel(t); ax.grid(alpha=0.3)
axs[0].legend(fontsize=8); axs[-1].set_xlabel('speed (km/h), 20 km/h bins'); axs[-1].set_xlim(60, 320)
fig.suptitle('Step 30c g-g-v envelope, 2023–2025 quali laps, 13 TUM tracks (95 % CI over tracks)', fontsize=10); fig.tight_layout()
fig.savefig(f'{OUT}/step30c-ggv-pooled.png', dpi=130); plt.close(fig)

fig, axs = plt.subplots(2, 3, figsize=(13, 7), sharex=True, sharey='row')
for j, s in enumerate(('2023', '2024', '2025')):
    for i, key in enumerate(('ay', 'brake')):
        for nm in ('M', 'K'): draw(axs[i, j], ENV[s][nm], key, nm)
        axs[i, j].grid(alpha=0.3)
    axs[0, j].set_title(s); axs[1, j].set_xlabel('speed (km/h)')
axs[0, 0].set_ylabel('|a_y| p95 (g)'); axs[1, 0].set_ylabel('braking p95 (g)'); axs[0, 0].legend(fontsize=8); axs[0, 0].set_xlim(60, 320)
fig.suptitle('Measured (TUM line) vs model (own path), per season', fontsize=10); fig.tight_layout()
fig.savefig(f'{OUT}/step30c-ggv-seasons.png', dpi=130); plt.close(fig)

# per-corner phase split, latest season per track, stacked panels share the lap-share axis
latest = {}
for c in CORN: latest[c['track']] = max(latest.get(c['track'], 0), c['year'])
tl = sorted(latest); fig, axs = plt.subplots(len(tl), 1, figsize=(11, 1.55 * len(tl)), sharex=True)
for ax, tid in zip(axs, tl):
    cs = [c for c in CORN if c['track'] == tid and c['year'] == latest[tid] and 'dt' in c]
    x = np.array([c['share'] for c in cs]); bot = np.zeros(len(cs)); botn = np.zeros(len(cs))
    for p, col in (('entry', '#c0392b'), ('apex', '#d98c1f'), ('exit', '#1f4e9c')):
        v = np.array([c[p] for c in cs]); pos = np.clip(v, 0, None); neg = np.clip(v, None, 0)
        ax.bar(x, pos, 0.008, bottom=bot, color=col, label=p if tid == tl[0] else None); ax.bar(x, neg, 0.008, bottom=botn, color=col)
        bot += pos; botn += neg
    for c, b in zip(cs, bot): ax.text(c['share'], b + 0.005, c['turn'] or '·', ha='center', va='bottom', fontsize=6)
    ax.axhline(0, color='k', lw=0.5); ax.set_ylabel(f'{tid}\n{latest[tid]}', fontsize=7); ax.tick_params(labelsize=7); ax.grid(alpha=0.25, axis='y')
axs[0].legend(ncol=3, fontsize=7, loc='upper right'); axs[-1].set_xlabel('lap share (measured frame)'); axs[-1].set_xlim(0, 1)
fig.suptitle('Corner time lost by the model (s, + = model slower): entry / apex (≤1.05 v_min) / exit', fontsize=9); fig.tight_layout()
fig.savefig(f'{OUT}/step30c-corner-phases.png', dpi=130); plt.close(fig)

# radius needed vs radius observed (120-240)
cs = band(120, 240); fig, ax = plt.subplots(figsize=(7, 6))
xo = np.array([np.log(c['RT'] / c['RK']) for c in cs]); yn = np.array([2 * c['y'] for c in cs])
ax.scatter(xo, yn, s=14, c=['#c0392b' if c['meas'] >= 180 else '#1f4e9c' for c in cs])
for c, a_, b_ in zip(cs, xo, yn):
    if abs(b_) > 0.6 or abs(a_) > 0.3: ax.annotate(f"{c['track'][:6]} {c['turn']} {c['year']}", (a_, b_), fontsize=6)
lim = [-0.6, 1.4]; ax.plot(lim, lim, 'k--', lw=0.8, label='geometry explains all'); ax.axhline(0, color='k', lw=0.4); ax.axvline(0, color='k', lw=0.4)
ax.set_xlabel('observed ln(R_TUM line / R_model path)'); ax.set_ylabel('needed ln(R) at model grip = 2 ln(v_meas / v_model)')
ax.set_title('120–240 km/h corners (red ≥ 180): radius the gap needs vs radius TUM gives', fontsize=9); ax.legend(fontsize=8); ax.grid(alpha=0.3)
fig.tight_layout(); fig.savefig(f'{OUT}/step30c-radius-needed.png', dpi=130); plt.close(fig)

# 2025 vs 2026
fig, ax = plt.subplots(figsize=(7, 6))
for s in SEAS:
    ax.scatter(s['rm'], s['rp'], s=14, color='#c0392b' if s['flag'] else '#1f4e9c')
    if s['flag']: ax.annotate(f"{s['track'][:8]} {s['turn']} {s['m25']:.0f}→{s['m26']:.0f}", (s['rm'], s['rp']), fontsize=6)
ax.axvline(1, color='k', lw=0.4); ax.axhline(1, color='k', lw=0.4); ax.plot([0.7, 1.3], [0.7, 1.3], 'k--', lw=0.8)
ax.set_xlabel('measured apex 2026 / 2025'); ax.set_ylabel('model apex 2026 / 2025'); ax.grid(alpha=0.3)
ax.set_title('Same corner, 2025 vs 2026 pole laps (red: >15 % off track median)', fontsize=9)
fig.tight_layout(); fig.savefig(f'{OUT}/step30c-2025-vs-2026.png', dpi=130); plt.close(fig)

# --- outputs ------------------------------------------------------------------------------------------------------------
with open(f'{OUT}/step30c-corners.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(CORN[0].keys()) + [k for k in ('dt', 'entry', 'apex', 'exit') if k not in CORN[0]]); w.writeheader(); w.writerows(CORN)
with open(f'{OUT}/step30c-seasons.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(SEAS[0].keys())); w.writeheader(); w.writerows(SEAS)
summary = dict(rules_sha256='42f98b636b8db5212f80fd5df610eebad5bb8e3c8f09641d2e28c86dc89a05c6',
               geometry={k: dict(icp_rms=v['rms'], kappa_corr=v['corr']) for k, v in GEO.items()},
               laps={s: len({k for k, e in TR.items() if e['track'] in GEO and e['year'] in y}) for s, y in SEASONS.items()},
               envelope=ENV, decomposition=DEC, verdict={b: verdict(r) for b, r in DEC.items()}, matching=M,
               realtel={k: dict(lag=v['lag'], corr=v['corr'], n_corners=len(v['corners'])) for k, v in RT.items()},
               season_flags=[s for s in SEAS if s['flag']], realtel_dropped=DROP, secondary=SEC,
               season_track_median={t: dict(meas=float(np.median([s['rm'] for s in SEAS if s['track'] == t])), model=float(np.median([s['rp'] for s in SEAS if s['track'] == t]))) for t in sorted({s['track'] for s in SEAS})})
json.dump(summary, open(f'{OUT}/step30c-summary.json', 'w'), indent=1, default=float)
print(json.dumps({b: dict(n=r['n'], tracks=r['tracks'], y=r['y'], G=r['G'], H=r['H'], kph=r['kph'], v=verdict(r)) for b, r in DEC.items()}, indent=1))
print('SEC', json.dumps(SEC, indent=1)); print('DROP', DROP); print('matching', json.dumps({y: {k: v for k, v in m.items() if k != 'bad'} for y, m in M.items()}, indent=1))
