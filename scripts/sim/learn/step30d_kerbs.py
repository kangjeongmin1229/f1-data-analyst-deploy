# Step 30d (report-only): kerb and width effect on the apex radius + error budget of the corner-speed gap.
# Pre-registration: scripts/sim/data/step30d/prereg-step30d-kerbs-width-2026-11-25.md (sha256 818922bf…70a4). No model change, no fit,
# measured speeds never set a radius or width. Not a pipeline run.
# Usage: python3 -I scripts/sim/learn/step30d_kerbs.py <work dir> <TUM racetrack-database dir> <old corner csv> <out dir>
#   work dir: export-corr.json (step30b-export.mjs on the corrected table), heading-export.json (step 30b), line-export.json
#   (step30d-export.mjs), step30b-audit-corners.csv (step 30b post-hoc audit on the corrected table).
import sys, os, json, csv
import numpy as np
from scipy.optimize import linprog
from scipy.spatial import cKDTree

W, TUMDIR, OLD, OUT = sys.argv[1:5]
os.makedirs(OUT, exist_ok=True)
E = json.load(open(f'{W}/export-corr.json')); HD = json.load(open(f'{W}/heading-export.json')); LD = json.load(open(f'{W}/line-export.json'))
AUD = {(r['track'], r['season'], r['corner_id']): r for r in csv.DictReader(open(f'{W}/step30b-audit-corners.csv'))}
TUM = {'austin': 'Austin', 'hungaroring': 'Budapest', 'catalunya': 'Catalunya', 'melbourne': 'Melbourne', 'mexico-city': 'MexicoCity',
       'montreal': 'Montreal', 'monza': 'Monza', 'sakhir': 'Sakhir', 'interlagos': 'SaoPaulo', 'shanghai': 'Shanghai', 'silverstone': 'Silverstone',
       'spa-francorchamps': 'Spa', 'spielberg': 'Spielberg', 'suzuka': 'Suzuka', 'yas-marina-circuit': 'YasMarina', 'zandvoort': 'Zandvoort',
       'kuala-lumpur': 'Sepang'}
OLDLAYOUT = {'catalunya', 'melbourne', 'yas-marina-circuit'}
W_OFF = {'monza': 11, 'suzuka': 13, 'silverstone': 15, 'austin': 15, 'spielberg': 12, 'catalunya': 12, 'kuala-lumpur': 16,
         'shanghai': 14, 'sakhir': 14.2, 'interlagos': 13.5}   # prereg list; others: no figure -> 0
KERB_DEFAULT, CAR_HALF = 1.3, 1.0
BANDS = [(60, 120), (120, 180), (180, 240), (120, 240)]
rng = np.random.default_rng(30)


def fit_rigid(ax, ay, bx, by):  # copied from step30b_audit.py (rigid ICP, optional mirror, no scale)
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


def heading_path(h, ds, mx, my):  # copied from step30b_audit.py
    h = np.asarray(h); x = np.cumsum(np.cos(h)) * ds; y = np.cumsum(np.sin(h)) * ds; n = len(h)
    x -= np.arange(1, n + 1) / n * x[-1]; y -= np.arange(1, n + 1) / n * y[-1]
    return x - x.mean() + np.mean(mx), y - y.mean() + np.mean(my)


def formula_dR(theta, d_in, d_out):
    c = np.cos(min(theta, np.pi) / 2)
    return d_in * c / (1 - c) + d_out / (1 - c)


# ---------- per track geometry ----------
TR = {}
for key, T in E['tracks'].items():
    tid = T['id']
    if tid in TR or tid not in TUM: continue
    mx, my = np.array(T['map']['x'], float), np.array(T['map']['y'], float)
    hx, hy = heading_path(HD[tid]['heading'], T['ds'], mx, my)
    a = np.loadtxt(f'{TUMDIR}/tracks/{TUM[tid]}.csv', delimiter=',')
    put, rms = fit_rigid(a[:, 0], a[:, 1], mx, my)
    tx, ty = np.gradient(a[:, 0]), np.gradient(a[:, 1]); nl = np.hypot(tx, ty); nx, ny = -ty / nl, tx / nl
    eA = put(a[:, 0] - nx * a[:, 2], a[:, 1] - ny * a[:, 2]); eB = put(a[:, 0] + nx * a[:, 3], a[:, 1] + ny * a[:, 3])
    L = LD[tid]; mid = np.array(L['mid']); nrm = np.array(L['nrm'])
    st = np.r_[0, np.cumsum(np.hypot(*np.diff(np.r_[mid, mid[:1]], axis=0).T))][:-1]
    TR[tid] = dict(mx=mx, my=my, hx=hx, hy=hy, eA=eA, eB=eB, tA=cKDTree(eA), tB=cKDTree(eB), rms=rms, wmed=float(np.median(a[:, 2] + a[:, 3])),
                   mid=mid, nrm=nrm, st=st, Lmid=st[-1] + np.hypot(*(mid[0] - mid[-1])), tmid=cKDTree(mid),
                   kL=np.array(L['kerbL']) if L['kerbL'] else None, kR=np.array(L['kerbR']) if L['kerbR'] else None)


def theta_at(kap, ia, ds):
    n = len(kap); sgn = np.sign(kap[ia]); i0 = i1 = ia
    while sgn * kap[(i0 - 1) % n] >= 1e-3 and ia - i0 < n // 4: i0 -= 1
    while sgn * kap[(i1 + 1) % n] >= 1e-3 and i1 - ia < n // 4: i1 += 1
    return abs(sum(kap[i % n] for i in range(i0, i1 + 1)) * ds)


def mid_index_window(P, j, a, b):
    """indices of midline points whose arc distance from point j is in [a, b] m (b > a, signed)."""
    d = (P['st'] - P['st'][j] + P['Lmid'] / 2) % P['Lmid'] - P['Lmid'] / 2
    return np.where((d >= a) & (d <= b))[0]


def kerb_delta(P, j, inside_left):
    if P['kL'] is None: return KERB_DEFAULT, KERB_DEFAULT, 'default 1.3'
    kin, kout = (P['kL'], P['kR']) if inside_left else (P['kR'], P['kL'])
    din = kin[mid_index_window(P, j, -40, 40)].max()
    dout = 0.5 * (kout[mid_index_window(P, j, -150, -20)].max() + kout[mid_index_window(P, j, 20, 150)].max())
    return float(din), float(dout), 'iRacing'


# ---------- per corner ----------
rows = []
for c in E['corners']:
    tid = c['track']
    if tid not in TR: continue
    a = AUD[(tid, str(c['season']), str(c['corner_id']))]
    if a['R_tc'] in ('', 'nan'): continue   # TUM centreline not within 6 m of the apex
    P = TR[tid]; T = E['tracks'][tid + str(c['season'])]; kap = np.array(T['kappa']); ia = c['ia']
    th = theta_at(kap, ia, T['ds'])
    px, py = P['mx'][ia], P['my'][ia]; dmid, j = P['tmid'].query([px, py]); n = len(P['mid'])
    p0, pm, p1 = P['mid'][(j - 3) % n], P['mid'][j], P['mid'][(j + 3) % n]
    cross = (pm[0] - p0[0]) * (p1[1] - pm[1]) - (pm[1] - p0[1]) * (p1[0] - pm[0])   # >0: turning toward +nrm (left of travel)
    ki, ko, ksrc = kerb_delta(P, j, cross > 0)
    wd = max(0.0, (W_OFF[tid] - P['wmed']) / 2) if tid in W_OFF else 0.0
    R = c['Rref']; Rtr = float(a['R_tr']) if a['R_tr'] not in ('', 'nan') else np.nan
    row = dict(track=tid, season=c['season'], corner_id=c['corner_id'], turn=c['turn'], meas=c['meas'], model=c['model'], ia=ia,
               theta_deg=np.degrees(th), R=R, R_tumline=Rtr, d_mid=dmid, kerb_in=ki, kerb_out=ko, kerb_src=ksrc, width_d=wd,
               old_layout=int(tid in OLDLAYOUT))
    for case, (di, do) in {'kerb': (ki, ko), 'width': (wd, wd), 'both': (ki + wd, ko + wd)}.items():
        dR = formula_dR(th, di, do); row['dR_' + case] = dR
        row['gain_pct_' + case] = 100 * 0.5 * np.log((R + dR) / R); row['gain_kmh_' + case] = c['model'] * (np.sqrt((R + dR) / R) - 1)
    rows.append(row)

# ---------- solver (sequential LP on the lateral offset, exact 3-point curvature) ----------
H, HALF, CORE, ARM = 2.0, 200, 60, 2   # spacing m, window half-length m, objective core +-m, curvature arm in points (+-4 m)


def solver_setup(r):
    P = TR[r['track']]; hx, hy = P['hx'], P['hy']; n = len(hx); ds = E['tracks'][r['track'] + str(r['season'])]['ds']
    s = np.r_[0, np.cumsum(np.hypot(np.diff(np.r_[hx, hx[:1]]), np.diff(np.r_[hy, hy[:1]])))]; Lh = s[-1]
    s0 = s[r['ia']]; q = s0 + np.arange(-HALF, HALF + H / 2, H)
    X = np.interp(q % Lh, s, np.r_[hx, hx[:1]]); Y = np.interp(q % Lh, s, np.r_[hy, hy[:1]])
    tx, ty = np.gradient(X), np.gradient(Y); tl = np.hypot(tx, ty); N = np.c_[-ty / tl, tx / tl]; C = np.c_[X, Y]
    lims = []
    for e, tr in ((P['eA'], P['tA']), (P['eB'], P['tB'])):
        _, jj = tr.query(C); lims.append(((e[jj] - C) * N).sum(1))
    lims = np.array(lims); up = lims.max(0); lo = lims.min(0)       # signed distance to the +N edge and the -N edge
    # kerbs per station, mapped by nearest midline point; side by sign of the midline normal along N
    _, jm = P['tmid'].query(C); same = (P['nrm'][jm] * N).sum(1) > 0
    if P['kL'] is None: kp = km = np.full(len(q), KERB_DEFAULT)
    else:
        kp = np.where(same, P['kL'][jm], P['kR'][jm]); km = np.where(same, P['kR'][jm], P['kL'][jm])
    return C, N, up, lo, kp, km, q - s0


def curv(Pts):
    a = Pts[ARM:-ARM] - Pts[:-2 * ARM]; b = Pts[2 * ARM:] - Pts[ARM:-ARM]
    cr = a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0]
    return 2 * cr / (np.hypot(*a.T) * np.hypot(*b.T) * np.hypot(*(a + b).T))


def solve(C, N, ub, lb, rel, Rcap, iters=60):
    m = len(C); n = np.zeros(m); core = np.abs(rel[ARM:-ARM]) <= CORE
    k0 = curv(C); cap = np.maximum(np.abs(k0), 1 / Rcap)            # outside the core: no tighter than now or than the current apex
    free = np.ones(m, bool); free[:3] = free[-3:] = False           # n = n' = 0 at the window ends
    def obj(nn):
        k = curv(C + nn[:, None] * N); return np.abs(k[core]).max(), np.all(np.abs(k[~core]) <= cap[~core] + 1e-6), k
    best, ok, _ = obj(n); tr = 1.0
    if not (np.all(n <= ub) and np.all(n >= lb)): return np.nan, n     # current path outside the corridor bounds: cannot start
    for _ in range(iters):
        k = curv(C + n[:, None] * N); mk = len(k); eps = 1e-3
        G = np.zeros((mk, m)); ii = np.arange(mk)
        for par in range(3):                                         # stations 3 apart never share a stencil {i, i+ARM, i+2ARM}
            nn = n.copy(); nn[par::3] += eps; dk = (curv(C + nn[:, None] * N) - k) / eps
            for p in (0, ARM, 2 * ARM):
                jv = ii + p; mk_ = jv % 3 == par; G[ii[mk_], jv[mk_]] = dk[mk_]
        fi = np.where(free)[0]; nv = len(fi)
        # variables: dn (free stations), t ; minimise t
        cvec = np.r_[np.zeros(nv), 1.0]; A, b = [], []
        Gf = G[:, fi]
        for i in range(mk):
            if core[i]:
                A.append(np.r_[Gf[i], -1.0]); b.append(-k[i]); A.append(np.r_[-Gf[i], -1.0]); b.append(k[i])
            else:
                A.append(np.r_[Gf[i], 0.0]); b.append(cap[i] - k[i]); A.append(np.r_[-Gf[i], 0.0]); b.append(cap[i] + k[i])
        bounds = [(max(lb[i] - n[i], -tr), min(ub[i] - n[i], tr)) for i in fi] + [(0, None)]
        res = linprog(cvec, A_ub=np.array(A), b_ub=np.array(b), bounds=bounds, method='highs')
        if res.status != 0: tr *= 0.5; continue
        nn = n.copy(); nn[fi] += res.x[:nv]; v, okk, _ = obj(nn)
        if okk and v < best - 1e-7: n, best = nn, v; tr = min(tr * 1.5, 3.0)
        else: tr *= 0.5
        if tr < 0.01: break
    return 1 / best, n


def run_solver(r, cases=('base', 'kerb', 'width', 'both')):
    C, N, up, lo, kp, km, rel = solver_setup(r); out = {}; paths = {}
    for case in cases:
        dp = {'base': 0, 'kerb': kp, 'width': r['width_d'], 'both': kp + r['width_d']}[case]
        dm = {'base': 0, 'kerb': km, 'width': r['width_d'], 'both': km + r['width_d']}[case]
        ub = up - CAR_HALF + dp; lb = lo + CAR_HALF - dm
        ub = np.maximum(ub, 0); lb = np.minimum(lb, 0)               # the current path is kept feasible where it sits outside (snapped path)
        Rs, n = solve(C, N, ub, lb, rel, r['R'])
        out[case] = Rs; paths[case] = C + n[:, None] * N
    return out, dict(C=C, N=N, up=up, lo=lo, kp=kp, km=km, rel=rel, paths=paths)


# check corners by rule: current-layout TUM tracks with kerb data; theta closest to 180, 90, 45 deg
cand = sorted([r for r in rows if not r['old_layout'] and TR[r['track']]['kL'] is not None], key=lambda r: (r['track'], r['season'], r['corner_id']))
check = []
for tgt in (180, 90, 45):
    r = min(cand, key=lambda r: abs(r['theta_deg'] - tgt)); check.append(r)
CHECK = {}
for r in check:
    out, geo = run_solver(r); CHECK[(r['track'], r['season'], r['corner_id'])] = (out, geo)
    r['solver'] = out

# secondary: solver on every corner (base + kerb + both)
ONLY_CHECK = os.environ.get('STEP30D_ONLY_CHECK') == '1'
for r in rows:
    if 'solver' not in r and not ONLY_CHECK:
        try: r['solver'], _ = run_solver(r, ('base', 'kerb', 'width', 'both'))
        except Exception as ex: r['solver'] = {'error': str(ex)}
    s = r.get('solver', {})
    for case in ('kerb', 'width', 'both'):
        ok = all(np.isfinite(s.get(k, np.nan)) for k in ('base', case))
        r['solverR_base'] = s.get('base', np.nan); r['solverR_' + case] = s.get(case, np.nan)
        r['solver_dR_' + case] = s.get(case, np.nan) - s.get('base', np.nan) if ok else np.nan
        r['solver_gain_pct_' + case] = 100 * 0.5 * np.log(s[case] / s['base']) if ok else np.nan
        r['solver_gain_kmh_' + case] = r['model'] * (np.sqrt(s[case] / s['base']) - 1) if ok else np.nan

chk = []
for r in check:
    f, sv = r['dR_kerb'], r['solver_dR_kerb']
    chk.append(dict(corner=f"{r['track']} {r['season']} T{r['turn']}", theta=round(r['theta_deg'], 1), R=round(r['R'], 1),
                    kerb_in=r['kerb_in'], kerb_out=round(r['kerb_out'], 2), dR_formula=round(f, 2), solverR_base=round(r['solverR_base'], 1),
                    solverR_kerb=round(r['solverR_kerb'], 1), dR_solver=round(sv, 2), rel_err=round((f - sv) / sv, 3) if sv else None))
check_pass = all(c['rel_err'] is not None and abs(c['rel_err']) <= 0.25 for c in chk)
use = 'formula' if check_pass else 'solver'
if ONLY_CHECK: print(json.dumps(chk, indent=1), check_pass); np.save(f'{W}/check-geo.npy', CHECK, allow_pickle=True); sys.exit()


# ---------- statistics ----------
def boot(rs, f, B=10000):
    tr = sorted({r['track'] for r in rs}); by = {t: [r for r in rs if r['track'] == t] for t in tr}
    est = f(rs); bs = []
    for _ in range(B):
        pick = rng.choice(len(tr), len(tr)); bs.append(f([r for i in pick for r in by[tr[i]]]))
    bs = np.array(bs); bs = bs[np.isfinite(bs)]
    if not len(bs): return [None, None, None], len(rs), len(tr)
    return [round(float(est), 3), round(float(np.percentile(bs, 2.5)), 3), round(float(np.percentile(bs, 97.5)), 3)], len(rs), len(tr)


mean = lambda k: (lambda rs: np.nanmean([r[k] for r in rs]) if rs else np.nan)
prim = [r for r in rows if not r['old_layout']]
summary = {'check': chk, 'check_pass': check_pass, 'budget_uses': use, 'bands': {}, 'bands_old_layout': {}, 'per_track': {}}
for lo_, hi_ in BANDS:
    for setname, S in (('bands', prim), ('bands_old_layout', [r for r in rows if r['old_layout']])):
        b = [r for r in S if lo_ <= r['meas'] < hi_]
        if not b: continue
        d = {}
        for case in ('kerb', 'width', 'both'):
            for pre in ('', 'solver_'):
                for unit in ('pct', 'kmh'):
                    k = f'{pre}gain_{unit}_{case}'; d[k] = boot(b, mean(k), 10000 if setname == 'bands' else 2000)[0]
        d['n'], d['tracks'] = len(b), len({r['track'] for r in b})
        d['theta_med'] = round(float(np.median([r['theta_deg'] for r in b])), 1); d['R_med'] = round(float(np.median([r['R'] for r in b])), 1)
        d['model_kmh_med'] = round(float(np.median([r['model'] for r in b])), 1)
        summary[setname][f'{lo_}-{hi_}'] = d
for t in sorted({r['track'] for r in rows}):
    b = [r for r in rows if r['track'] == t and 120 <= r['meas'] < 240]; a_ = [r for r in rows if r['track'] == t]
    summary['per_track'][t] = dict(n_all=len(a_), n_120_240=len(b), kerb_src=a_[0]['kerb_src'], width_d=round(a_[0]['width_d'], 2),
        tum_w_med=round(TR[t]['wmed'], 1), w_official=W_OFF.get(t), old_layout=a_[0]['old_layout'],
        kerb_in_med=round(float(np.median([r['kerb_in'] for r in a_])), 2), kerb_out_med=round(float(np.median([r['kerb_out'] for r in a_])), 2),
        **{f'{k}_120_240': (round(float(np.nanmean([r[k] for r in b])), 2) if b else None) for k in
           ('gain_pct_kerb', 'gain_pct_width', 'gain_pct_both', 'gain_kmh_both', 'solver_gain_pct_both')})

# ---------- error budget (120-240, primary tracks) ----------
old = [dict(track=x['track'], meas=float(x['apex_kph_meas']), model=float(x['apex_kph_model'])) for x in csv.DictReader(open(OLD))
       if x['track'] in TR and x['track'] not in OLDLAYOUT and float(x['apex_kph_meas']) > 0 and float(x['apex_kph_model']) > 0]
oldb = [r for r in old if 120 <= r['meas'] < 240]
newb = [dict(track=c['track'], meas=c['meas'], model=c['model']) for c in E['corners'] if c['track'] in TR and c['track'] not in OLDLAYOUT and 120 <= c['meas'] < 240]
bud = [r for r in prim if 120 <= r['meas'] < 240]
for r in bud:
    Rg = r['R_tumline'] if np.isfinite(r['R_tumline']) else r['R']; r['geo'] = r['model'] * (np.sqrt(Rg / r['R']) - 1)
    r['geo_tail'] = r['geo'] if np.isfinite(r['R_tumline']) and np.log(r['R_tumline'] / r['R']) > 0.25 else 0.0
    for case in ('kerb', 'width', 'both'):
        if use == 'formula': ratio = (Rg + r['dR_' + case]) / Rg
        else: ratio = r['solverR_' + case] / r['solverR_base']
        r['kw_' + case] = r['model'] * np.sqrt(Rg / r['R']) * (np.sqrt(ratio) - 1)
    r['gap'] = r['meas'] - r['model']
tracks = sorted({r['track'] for r in bud} | {r['track'] for r in oldb})
Bo = {t: [r for r in oldb if r['track'] == t] for t in tracks}; Bn = {t: [r for r in newb if r['track'] == t] for t in tracks}
Bb = {t: [r for r in bud if r['track'] == t] for t in tracks}


def budget(ts):
    o = [r for t in ts for r in Bo[t]]; nn = [r for t in ts for r in Bn[t]]; b = [r for t in ts for r in Bb[t]]
    tot_old = np.mean([r['meas'] - r['model'] for r in o]); tot_new = np.mean([r['meas'] - r['model'] for r in nn])
    gap_b = np.mean([r['gap'] for r in b]); geo = np.mean([r['geo'] for r in b]); tail = np.mean([r['geo_tail'] for r in b])
    kw = {c: np.mean([r['kw_' + c] for r in b]) for c in ('kerb', 'width', 'both')}
    return dict(total_old=tot_old, matching=tot_old - tot_new, total_corrected=tot_new, gap_tum_set=gap_b, geometry=geo, geometry_tail=tail,
                kerb_only=kw['kerb'], width_only=kw['width'], kerb_width=kw['both'], remainder=gap_b - geo - kw['both'],
                model_mean=np.mean([r['model'] for r in b]))


est = budget(tracks); BS = []
for _ in range(10000): BS.append(budget([tracks[i] for i in rng.choice(len(tracks), len(tracks))]))
summary['budget_120_240'] = {k: [round(float(v), 2), round(float(np.percentile([b[k] for b in BS], 2.5)), 2), round(float(np.percentile([b[k] for b in BS], 97.5)), 2)]
                             for k, v in est.items()}
summary['budget_n'] = dict(old=len(oldb), corrected=len(newb), tum_matched=len(bud), tracks=len(tracks))

cols = [k for k in rows[0] if k != 'solver']
with open(f'{OUT}/step30d-corners.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, cols, extrasaction='ignore'); w.writeheader()
    for r in rows: w.writerow({k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items() if k in cols})
json.dump(summary, open(f'{OUT}/step30d-summary.json', 'w'), indent=1, default=float)
np.save(f'{W}/check-geo.npy', {k: v for k, v in CHECK.items()}, allow_pickle=True)
print(json.dumps({k: summary[k] for k in ('check', 'check_pass', 'budget_uses')}, indent=1))
