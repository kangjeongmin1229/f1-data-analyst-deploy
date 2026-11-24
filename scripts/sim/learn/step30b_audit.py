# Step 30b audit (report-only): apex radius of the driven (kernel) path vs independent geometry.
# Sources: (a) TUM racetrack-database centreline + widths, (b) TUM published minimum-curvature raceline and our stored
# least-curvature line (inside the TUM corridor on TUM tracks), (c) iRacing: no driven lines are stored in the repo (only kerb offsets).
# One radius estimator for every path: Savitzky-Golay (quadratic, window W m) on x(s), y(s) at 1 m; R = 1 / peak |kappa| within
# +-40 m of the kernel apex. Measured speeds are NOT used to set anything; lateral g = v_meas^2 / (R g) is printed as a plausibility check only.
# Usage: python3 -I scripts/sim/learn/step30b_audit.py <repo root> <TUM racetrack-database dir> <out dir>
import sys, json, hashlib, csv, os
import numpy as np
from scipy.signal import savgol_filter
from scipy.spatial import cKDTree

ROOT, TUMDIR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(OUT, exist_ok=True)
E = json.load(open(f'{ROOT}/scripts/sim/data/step30b/kernel-export.json'))
HD = json.load(open(f'{ROOT}/scripts/sim/data/step30b/heading-export.json'))
TUM = {'austin': 'Austin', 'hungaroring': 'Budapest', 'catalunya': 'Catalunya', 'melbourne': 'Melbourne', 'mexico-city': 'MexicoCity',
       'montreal': 'Montreal', 'monza': 'Monza', 'sakhir': 'Sakhir', 'interlagos': 'SaoPaulo', 'shanghai': 'Shanghai', 'silverstone': 'Silverstone',
       'spa-francorchamps': 'Spa', 'spielberg': 'Spielberg', 'suzuka': 'Suzuka', 'yas-marina-circuit': 'YasMarina', 'zandvoort': 'Zandvoort',
       'kuala-lumpur': 'Sepang'}
WIN, SEARCH, MATCH_MAX = float(os.environ.get("STEP30B_WIN", 30)), 40, 6.0   # estimator window (m), apex search half-width (m), max apex distance to accept a source (m)


def resample(x, y, step=1.0):
    x, y = np.asarray(x, float), np.asarray(y, float)
    d = np.hypot(np.diff(np.r_[x, x[0]]), np.diff(np.r_[y, y[0]])); s = np.r_[0, np.cumsum(d)]; L = s[-1]
    n = int(round(L / step)); t = np.arange(n) * L / n
    return np.interp(t, s, np.r_[x, x[0]]), np.interp(t, s, np.r_[y, y[0]]), L / n


def kappa_sg(x, y, h, win=WIN):
    w = max(5, int(round(win / h)) | 1)
    xd, yd = savgol_filter(x, w, 2, deriv=1, delta=h, mode='wrap'), savgol_filter(y, w, 2, deriv=1, delta=h, mode='wrap')
    xdd, ydd = savgol_filter(x, w, 2, deriv=2, delta=h, mode='wrap'), savgol_filter(y, w, 2, deriv=2, delta=h, mode='wrap')
    return (xd * ydd - yd * xdd) / np.power(xd ** 2 + yd ** 2, 1.5)


def heading_path(h, ds, mx, my):
    h = np.asarray(h); x = np.cumsum(np.cos(h)) * ds; y = np.cumsum(np.sin(h)) * ds
    n = len(h); x -= np.arange(1, n + 1) / n * x[-1]; y -= np.arange(1, n + 1) / n * y[-1]   # close the loop
    return x - x.mean() + np.mean(mx), y - y.mean() + np.mean(my)


def fit_rigid(ax, ay, bx, by):
    """ICP rigid fit (rotation, optional mirror, shift; no scale) of A onto B. Returns transform and RMS."""
    tb = cKDTree(np.c_[bx, by]); ca = np.array([ax.mean(), ay.mean()]); cb = np.array([bx.mean(), by.mean()])
    best = (np.inf, None)
    for m in (1, -1):
        U0 = np.c_[m * (ax - ca[0]), ay - ca[1]]
        for r in range(24):
            th, t = r * np.pi / 12, cb.copy()
            for _ in range(40):
                R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]]); P = U0 @ R.T + t
                d, j = tb.query(P); Q = np.c_[bx[j], by[j]]
                mu, mq = U0.mean(0), Q.mean(0); A, B = U0 - mu, Q - mq
                th = np.arctan2((A[:, 0] * B[:, 1] - A[:, 1] * B[:, 0]).sum(), (A * B).sum())
                R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]]); t = mq - R @ mu
            P = U0 @ R.T + t; d, _ = tb.query(P); rms = np.sqrt(np.mean(d ** 2))
            if rms < best[0]: best = (rms, (m, th, t.copy()))
    m, th, t = best[1]; R = np.array([[np.cos(th), -np.sin(th)], [np.sin(th), np.cos(th)]])
    put = lambda x, y: (np.c_[m * (np.asarray(x) - ca[0]), np.asarray(y) - ca[1]] @ R.T + t)
    return put, best[0], m


def peak_R(x, y, k, px, py, sign, tree=None):
    """Nearest point to (px,py), then R = 1/peak |kappa| (same sign) within +-SEARCH m of arc. Returns R, distance, index."""
    tree = tree or cKDTree(np.c_[x, y]); d, j = tree.query([px, py]); n = len(x); h = np.hypot(x[1] - x[0], y[1] - y[0])
    idx = (j + np.arange(-int(SEARCH / h), int(SEARCH / h) + 1)) % n; kk = k[idx] * sign
    i = idx[np.argmax(kk)]; return (1 / kk.max() if kk.max() > 0 else np.inf), d, i


rows, per_track = [], {}
for key, T in E['tracks'].items():
    tid = T['id']
    if tid in per_track: continue
    mx, my = np.array(T['map']['x'], float), np.array(T['map']['y'], float); ds = T['ds']
    hx, hy = heading_path(HD[tid]['heading'], ds, mx, my)
    hx1, hy1, hh = resample(hx, hy); kh = kappa_sg(hx1, hy1, hh)          # kernel path (from its own heading), same estimator
    mx1, my1, mh = resample(mx, my); km = kappa_sg(mx1, my1, mh)          # kernel path (integer-metre map), same estimator
    kraw = np.diff(np.unwrap(np.r_[HD[tid]['heading'], HD[tid]['heading'][0]]))  # per-step heading change (unsmoothed curvature * ds)
    src = {'kh': (hx1, hy1, kh, cKDTree(np.c_[hx1, hy1])), 'km': (mx1, my1, km, cKDTree(np.c_[mx1, my1]))}
    info = {'headingPathVsMapRms': float(np.sqrt(np.mean(cKDTree(np.c_[mx, my]).query(np.c_[hx, hy])[0] ** 2)))}
    if tid in TUM:
        a = np.loadtxt(f'{TUMDIR}/tracks/{TUM[tid]}.csv', delimiter=','); r = np.loadtxt(f'{TUMDIR}/racelines/{TUM[tid]}.csv', delimiter=',')
        put, rms, mirror = fit_rigid(a[:, 0], a[:, 1], mx, my)
        C = put(a[:, 0], a[:, 1]); Rl = put(r[:, 0], r[:, 1])
        # edges: normals of the TUM centreline (in TUM frame, mirrored if needed); w_tr_right / w_tr_left as published
        tx, ty = np.gradient(a[:, 0]), np.gradient(a[:, 1]); nl = np.hypot(tx, ty); nx, ny = -ty / nl, tx / nl
        right = put(a[:, 0] - nx * a[:, 2], a[:, 1] - ny * a[:, 2]); left = put(a[:, 0] + nx * a[:, 3], a[:, 1] + ny * a[:, 3])
        cx, cy, ch = resample(C[:, 0], C[:, 1]); rx, ry, rh = resample(Rl[:, 0], Rl[:, 1])
        src['tc'] = (cx, cy, kappa_sg(cx, cy, ch), cKDTree(np.c_[cx, cy])); src['tr'] = (rx, ry, kappa_sg(rx, ry, rh), cKDTree(np.c_[rx, ry]))
        info.update(tumFitRms=float(rms), tumMirror=int(mirror), tumWidthMed=float(np.median(a[:, 2] + a[:, 3])))
        per_track[tid] = {'info': info, 'left': left, 'right': right, 'C': C, 'Rl': Rl}
    else:
        per_track[tid] = {'info': info}
    L = E['racingLines'].get(tid)
    if L:
        lx, ly, lh = resample([p[0] for p in L['line']], [p[1] for p in L['line']]); src['ml'] = (lx, ly, kappa_sg(lx, ly, lh), cKDTree(np.c_[lx, ly]))
        info['lineEdges'] = L['edges']
    per_track[tid].update(src=src, mx=mx, my=my, kraw=kraw, ds=ds, hx=hx, hy=hy)

g0 = 9.81
for c in E['corners']:
    P = per_track[c['track']]; T = E['tracks'][c['track'] + c['season']]; ia = c['ia']; kap = np.array(T['kappa']); ds = T['ds']
    sign = np.sign(kap[ia]); px, py = P['mx'][ia], P['my'][ia]
    row = dict(track=c['track'], season=c['season'], corner_id=c['corner_id'], turn=c['turn'], meas=c['meas'], model=c['model'],
               y=np.log(c['meas'] / c['model']), R_kernel=c['Rref'])
    # unsmoothed heading-step curvature at the apex (max over +-10 m) -> spike check of the kernel processing
    n = len(kap); idx = (ia + np.arange(-2, 3)) % n
    row['R_raw'] = 1 / max(1e-9, (P['kraw'][idx] * sign).max() / ds)
    # spike index: kernel |kappa| at apex / mean kernel |kappa| over +-15 m
    w15 = (ia + np.arange(-3, 4)) % n; row['spike'] = abs(kap[ia]) / np.mean(np.abs(kap[w15]))
    for s, (x, y, k, tr) in P['src'].items():
        R, d, j = peak_R(x, y, k, px, py, sign, tr)
        ok = d <= (MATCH_MAX if s in ('tc', 'tr', 'ml') else 3.0) if s != 'tr' else True
        if s == 'tr':  # raceline may sit up to a half width off the path: accept when the TUM centreline matched
            ok = 'tc' in P['src'] and peak_R(*P['src']['tc'][:3], px, py, sign, P['src']['tc'][3])[1] <= MATCH_MAX
        row['R_' + s] = R if ok else np.nan; row['d_' + s] = d
    for s in ('kernel', 'kh', 'tc', 'tr', 'ml'):
        R = row.get('R_' + s, np.nan); row['g_' + s] = (c['meas'] / 3.6) ** 2 / R / g0 if R and np.isfinite(R) else np.nan
    rows.append(row)

cols = list(rows[0].keys())
with open(f'{OUT}/step30b-audit-corners.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, cols); w.writeheader()
    for r in rows: w.writerow({k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items()})


def med(a):
    a = np.array([v for v in a if np.isfinite(v)]); return (float(np.median(a)), len(a)) if len(a) else (np.nan, 0)


def boot_mean(rs, f, B=4000, seed=1):
    """track-cluster bootstrap 90 % interval of the mean of f(row)."""
    by = {}
    for r in rs:
        v = f(r)
        if np.isfinite(v): by.setdefault(r['track'], []).append(v)
    ks = list(by); rng = np.random.default_rng(seed)
    if len(ks) < 3: return (np.nan, np.nan, np.nan, 0, len(ks))
    allv = np.concatenate([by[k] for k in ks]); bs = []
    for _ in range(B):
        pick = rng.integers(0, len(ks), len(ks)); bs.append(np.mean(np.concatenate([by[ks[i]] for i in pick])))
    return (float(allv.mean()), float(np.percentile(bs, 5)), float(np.percentile(bs, 95)), len(allv), len(ks))


lr = lambda a, b: (lambda r: np.log(r[a] / r[b]) if np.isfinite(r.get(a, np.nan)) and np.isfinite(r.get(b, np.nan)) else np.nan)
summary = {'estimator': f'Savitzky-Golay quadratic, window {WIN} m at 1 m; peak within +-{SEARCH} m; source accepted within {MATCH_MAX} m',
           'tracks': {k: v['info'] for k, v in per_track.items()}, 'bands': {}}
for lo, hi in [(0, 120), (120, 180), (180, 240), (240, 999), (120, 240), (0, 999)]:
    b = [r for r in rows if lo <= r['meas'] < hi]
    summary['bands'][f'{lo}-{hi}'] = {
        'n': len(b),
        'R_med': {s: med([r.get('R_' + s, np.nan) for r in b]) for s in ('kernel', 'raw', 'kh', 'km', 'tc', 'tr', 'ml')},
        'g_med': {s: med([r.get('g_' + s, np.nan) for r in b]) for s in ('kernel', 'kh', 'tc', 'tr', 'ml')},
        # ln ratios (mean, 90 % cluster-bootstrap interval, n rows, n tracks)
        'ln_kh_over_kernel (processing: same path, kernel kappa vs common estimator)': boot_mean(b, lr('R_kh', 'R_kernel')),
        'ln_raw_over_kernel (spacing smoothing)': boot_mean(b, lr('R_raw', 'R_kernel')),
        'ln_tc_over_kh (path vs TUM centreline, same estimator)': boot_mean(b, lr('R_tc', 'R_kh')),
        'ln_tr_over_kh (TUM raceline vs kernel path)': boot_mean(b, lr('R_tr', 'R_kh')),
        'ln_tr_over_kernel (TUM raceline vs driven kappa)': boot_mean(b, lr('R_tr', 'R_kernel')),
        'ln_ml_over_kernel (our least-curvature line vs driven kappa)': boot_mean(b, lr('R_ml', 'R_kernel')),
        'ln_tr_over_tc (line gain inside TUM corridor)': boot_mean(b, lr('R_tr', 'R_tc')),
    }
json.dump(summary, open(f'{OUT}/step30b-audit-summary.json', 'w'), indent=1, default=float)

print(json.dumps(summary['bands'], indent=1, default=float)[:6000])
print({k: v['info'] for k, v in per_track.items()})

# ---- 5 worst corners (largest ln(R_TUM raceline / R_kernel), one per track+turn), PNG: path vs sources, official turn numbers ----
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
cand = sorted([r for r in rows if np.isfinite(r.get('R_tr', np.nan))], key=lambda r: -np.log(r['R_tr'] / r['R_kernel']))
seen, worst = set(), []
for r in cand:
    if (r['track'], r['turn']) in seen: continue
    seen.add((r['track'], r['turn'])); worst.append(r)
    if len(worst) == 5: break
LAYOUT_CHANGED = {'catalunya', 'melbourne', 'yas-marina-circuit'}
for k, r in enumerate(worst, 1):
    P = per_track[r['track']]; T = E['tracks'][r['track'] + r['season']]; c = next(c for c in E['corners'] if c['track'] == r['track'] and c['season'] == r['season'] and c['corner_id'] == r['corner_id'])
    ia, ds = c['ia'], T['ds']; px, py = P['mx'][ia], P['my'][ia]; kap = np.array(T['kappa']); n = len(kap)
    fig, (ax, bx) = plt.subplots(1, 2, figsize=(13, 6), gridspec_kw={'width_ratios': [1.1, 1]})
    Z = 130
    ax.plot(*P['left'].T, color='0.55', lw=1, label='TUM edges (white lines)'); ax.plot(*P['right'].T, color='0.55', lw=1)
    ax.plot(*P['C'].T, color='0.3', lw=1, ls=':', label='(a) TUM centreline')
    ax.plot(*P['Rl'].T, color='#1f77b4', lw=2, label='(b) TUM min-curvature raceline')
    if 'ml' in P['src']: ax.plot(P['src']['ml'][0], P['src']['ml'][1], color='#2ca02c', lw=1.4, ls='--', label='(b) our least-curvature line')
    ax.plot(P['mx'], P['my'], '.-', color='#d62728', lw=1.4, ms=3, label='kernel path (OpenF1 reference, 5 m points)')
    ax.plot(px, py, 'o', mfc='none', mec='k', ms=12)
    for q in T['corners']:
        i = int(round(q['s'] / ds)) % n; qx, qy = P['mx'][i], P['my'][i]
        if abs(qx - px) < Z and abs(qy - py) < Z:
            ax.annotate(f"T{q['number']}{q.get('letter', '')}", (qx, qy), xytext=(8, 8), textcoords='offset points', fontsize=11, weight='bold',
                        bbox=dict(boxstyle='round,pad=0.2', fc='#ffd', ec='0.4'))
    ax.set_xlim(px - Z, px + Z); ax.set_ylim(py - Z, py + Z); ax.set_aspect('equal'); ax.legend(fontsize=7.5, loc='lower left'); ax.grid(alpha=.3)
    ax.set_title(f"{r['track']} {r['season']} T{r['turn']} (official no.)" + (' — TUM layout older than 2025' if r['track'] in LAYOUT_CHANGED else ''), fontsize=10)
    s_k = (np.arange(-40, 41) * ds)
    bx.plot(s_k, np.abs(kap[(ia + np.arange(-40, 41)) % n]) * 1000, color='#d62728', lw=2, label=f"kernel kappa (driven): R {r['R_kernel']:.0f} m")
    for key, col, lab in (('kh', '#ff7f0e', 'kernel path, common estimator'), ('tc', '0.3', '(a) TUM centreline'), ('tr', '#1f77b4', '(b) TUM raceline'), ('ml', '#2ca02c', '(b) our least-curvature line')):
        if key not in P['src']: continue
        x, y, kk, tr = P['src'][key]; d, j = tr.query([px, py]); m = len(x); idx = (j + np.arange(-200, 201)) % m
        bx.plot(np.arange(-200, 201) * np.hypot(x[1] - x[0], y[1] - y[0]), np.abs(kk[idx]) * 1000, color=col, lw=1.2, label=f"{lab}: R {r.get('R_' + key, np.nan):.0f} m")
    bx.set_xlabel('distance from kernel apex (m, approx.)'); bx.set_ylabel('|curvature| (1/km)'); bx.set_xlim(-200, 200); bx.grid(alpha=.3); bx.legend(fontsize=7.5)
    bx.set_title(f"measured {r['meas']:.0f} km/h, model {r['model']:.0f} — lateral g on R (check only): kernel {r['g_kernel']:.1f}, TUM line {r['g_tr']:.1f}", fontsize=9)
    fig.suptitle(f"Step 30b worst #{k}: ln(R_TUMline / R_kernel) = {np.log(r['R_tr'] / r['R_kernel']):+.2f}  (estimator SG {WIN:.0f} m; not a pipeline run)", fontsize=11)
    fig.tight_layout(); fig.savefig(f"{OUT}/step30b-worst{k}-{r['track']}-T{r['turn']}.png", dpi=110); plt.close(fig)
print('worst', [(r['track'], r['turn']) for r in worst])
