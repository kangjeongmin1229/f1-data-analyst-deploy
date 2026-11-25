# Step 32 verdict (v2 + A1–A6) from the fold files and the guard outputs. Unit = track for every test and CI (A6.2). No 2022 data.
# Laps → session mean → track mean. Sign-flip and bootstrap code copied from step31_verdict.py (seed 32 here).
# A7: forward-model folds (fits[s].params/z/checks/stage1; processed held-out traction for G-TR).
# usage: python3 -I scripts/sim/learn/step32_verdict.py <folds dir> <folds26 dir> <traces-top10.json> <power-top10.json> <precheck.json>
#        <mesh.json> <series-isolation.txt> <compute-time.json> <measured-check.txt> <out.json>
import json, sys, os, math
from collections import defaultdict
import numpy as np
from scipy.signal import savgol_filter
from scipy.stats import t as tdist
FD, FD26, TRP, POWP, PREP, MESHP, ISOP, CTP, MEAP, OUT = sys.argv[1:11]
F = [json.load(open(os.path.join(FD, f))) for f in sorted(os.listdir(FD)) if f.endswith('.json')]
if len(F) != 24: sys.exit(f'INCOMPLETE: {len(F)} of 24 folds; no verdict')
F26 = [json.load(open(os.path.join(FD26, f))) for f in sorted(os.listdir(FD26)) if f.endswith('.json')] if os.path.isdir(FD26) else []
TR = json.load(open(TRP))['events']; POW = json.load(open(POWP)); PRE = json.load(open(PREP)) if os.path.exists(PREP) else None
rng = np.random.default_rng(32); ALPHA = 0.05 / 2; USEFUL = 3.0; BANDS = ['60_120', '120_180', '180_240', '120_240']

def flip_p(x):  # copied from step31_verdict.py
    x = np.asarray(x, float); n = len(x); obs = x.mean(); a = np.abs(x)
    S = np.array([[1 if (i >> j) & 1 else -1 for j in range(n)] for i in range(2 ** n)]) if n <= 16 else rng.choice([-1, 1], (200000, n))
    return float(((S * a).mean(1) >= obs - 1e-12).mean())
def boot(x, q=(0.025, 0.975)):
    x = np.asarray(x, float); m = x[rng.integers(0, len(x), (10000, len(x)))].mean(1); return [float(np.quantile(m, q[0])), float(np.quantile(m, q[1]))]
def track_val(f, key, which, sel=lambda h: True):  # lap → session mean → track mean
    by = defaultdict(list)
    for h in f['heldScores']:
        if sel(h) and h[which].get(key) is not None: by[h['session']].append(h[which][key])
    return float(np.mean([np.mean(v) for v in by.values()])) if by else None
def paired(key, sign=+1, sel=lambda h: True, folds=F):
    out = {}
    for f in folds:
        b, c = track_val(f, key, 'base', sel), track_val(f, key, 'cand', sel)
        if b is not None and c is not None: out[f['held']] = sign * (b - c)
    return out
def ok(meas, pred): return pred is not None and abs(pred - meas) <= max(0.25 * abs(meas), 0.05) and (meas == 0 or pred * meas > 0)

g = paired('apex120_240'); x = np.array(list(g.values())); p = flip_p(x)
primary = dict(n_tracks=len(x), mean_gain_kph=float(x.mean()), ci95=boot(x), ci90=boot(x, (0.05, 0.95)), p_signflip_one_sided=p, alpha=ALPHA,
               useful_kph=USEFUL, pass_=bool(len(x) >= 5 and p < ALPHA and x.mean() >= USEFUL))
gf = paired('apex120_240', sel=lambda h: h['rank'] == 1); xf = np.array(list(gf.values()))
report = {'fastest_lap_only_120_240': dict(n_tracks=len(xf), mean_gain_kph=float(xf.mean()), ci95=boot(xf), p=flip_p(xf))}
for b in ('120_180', '60_120', '180_240'):
    gb = np.array(list(paired('apex' + b).values())); report['apex' + b] = dict(n_tracks=len(gb), mean_gain_kph=float(gb.mean()), ci95=boot(gb))
sec = {}
for k in ('entry', 'exit'):
    y = np.array(list(paired(k, -1).values())); ph = flip_p(y); sec[k] = dict(n_tracks=len(y), mean_harm_s=float(y.mean()), ci95=boot(y), p_harm_one_sided=ph, pass_=bool(ph >= 0.05))
absl = lambda f: {'heldScores': [{**h, 'cand': {'a': abs(h['cand']['lapErr'])}, 'base': {'a': abs(h['base']['lapErr'])}} for h in f['heldScores']]}
lh = np.array([track_val(absl(f), 'a', 'cand') - track_val(absl(f), 'a', 'base') for f in F])  # |lap err| harm per track (lap → session → track)
ub = float(lh.mean() + tdist.ppf(0.95, len(lh) - 1) * lh.std(ddof=1) / math.sqrt(len(lh)))
lap = dict(n_tracks=len(lh), mean_harm_pp=float(lh.mean()), upper95_one_sided_pp=ub, ci95=boot(lh), pass_=bool(ub <= 0.10))
cases = [dict(c, track=f['held']) for f in F for c in f['drs']]; N = len(cases)
pc = sum(ok(c['meas'], c['cand']) for c in cases); pb = sum(ok(c['meas'], c['base']) for c in cases)
trk = sorted({c['track'] for c in cases}); bys = {t: [c for c in cases if c['track'] == t] for t in trk}
def drs_boot(fn):
    v = []
    for _ in range(2000):
        s = [c for t in rng.choice(trk, len(trk)) for c in bys[t]]; v.append(fn(s))
    return [float(np.quantile(v, 0.025)), float(np.quantile(v, 0.975))]
rate = lambda s, k: sum(ok(c['meas'], c[k]) for c in s) / len(s)
bias = lambda s, k: float(np.mean([c[k] - c['meas'] for c in s if c[k] is not None]))
drs = dict(n_cases=N, pass_rate_cand=pc / N, pass_rate_base=pb / N, pass_=bool(pc >= pb), ci95_rate_cand=drs_boot(lambda s: rate(s, 'cand')),
           bias_cand_s=bias(cases, 'cand'), ci95_bias_cand=drs_boot(lambda s: bias(s, 'cand')), bias_base_s=bias(cases, 'base'))
# braking guard + traction report: pooled held-out laps, 30c estimator, per 20 km/h bin
def deriv(v_kph, ds):
    v = np.asarray(v_kph, float) / 3.6; m = np.isfinite(v); idx = np.arange(len(v))
    vf = np.interp(idx, idx[m], v[m], period=len(v)); w = int(round(45.0 / ds)) | 1
    return vf, savgol_filter(vf, w, 2, deriv=1, delta=ds, mode='wrap'), m
S = {'M': [], 'C': [], 'B': []}; X = {'M': [], 'C': [], 'B': []}
for f in F:
    for h in f['heldScores']:
        e = TR[h['key']]; assert 2023 <= e['year'] <= 2025; n, ds, sh = e['n'], e['ds'], e['shift']; sv = f['sessV'][h['session']]
        ex = np.zeros(n, bool); st_ = e['straights']; meas = np.array([np.nan if a is None else a for a in e['a']], float)
        for j, (i, vmin) in enumerate(e['corners']):
            if len(st_) < 2: continue
            a0, a1 = st_[j], st_[(j + 1) % len(st_)]; seg = np.arange(a0, a1 + (n if a1 <= a0 else 0) + 1) % n; k0 = int(np.where(seg == i)[0][0]); hi = k0
            while hi < len(seg) - 1 and np.isfinite(meas[seg[hi + 1]]) and meas[seg[hi + 1]] <= 1.05 * vmin: hi += 1
            ex[seg[hi + 1:]] = True
        for nm, v in (('M', meas), ('C', np.roll(sv['cand'], sh)), ('B', np.roll(sv['base'], sh))):
            vf, dv, okm = deriv(v, ds); ax = vf * dv / 9.81
            S[nm].append(np.c_[vf[okm] * 3.6, -ax[okm]]); X[nm].append(np.c_[vf[okm & ex] * 3.6, ax[okm & ex]])
S = {k: np.vstack(v) for k, v in S.items()}; X = {k: np.vstack(v) for k, v in X.items()}
brk, trc = [], []
for lo in range(80, 280, 20):
    sel = {k: v[(v[:, 0] >= lo) & (v[:, 0] < lo + 20) & (v[:, 1] > 0), 1] for k, v in S.items()}
    if min(len(s) for s in sel.values()) >= 200:
        r = {k: float(np.percentile(s, 95)) for k, s in sel.items()}; brk.append(dict(bin=lo, meas=r['M'], cand=r['C'], base=r['B'], ok=bool(r['C'] <= r['M'] + 0.3)))
for lo in range(60, 240, 20):
    sel = {k: v[(v[:, 0] >= lo) & (v[:, 0] < lo + 20) & (v[:, 1] > 0), 1] for k, v in X.items()}
    if min(len(s) for s in sel.values()) >= 50: trc.append(dict(bin=lo, **{k: float(np.percentile(s, 95)) for k, s in zip(('meas', 'cand', 'base'), (sel['M'], sel['C'], sel['B']))}))
braking = dict(bins=brk, pass_=all(b['ok'] for b in brk))
# A5 guards
sb = {f['held']: track_val(f, 'strEndBias', 'cand') for f in F}; sbb = {f['held']: track_val(f, 'strEndBias', 'base') for f in F}
v = np.array([x for x in sb.values() if x is not None]); ci = boot(v)
g_sb = dict(mean_kph=float(v.mean()), ci95=ci, base_mean_kph=float(np.mean([x for x in sbb.values() if x is not None])), base_ci95=boot([x for x in sbb.values() if x is not None]), pass_=bool(-2 <= ci[0] and ci[1] <= 2))
def proc_bins(which):  # held-out processed exit traction (a_x > 0, exit) per track → {track: [(v, ax)]}
    out = defaultdict(list)
    for f in F:
        for h in f['heldScores']:
            for v_, ax, ex, st_ in h[which]:
                if ex and ax > 0 and not st_: out[f['held']].append((v_, ax))
    return out
PM, PC, PB = proc_bins('procMeas'), proc_bins('procCand'), proc_bins('procBase'); tr_rows = []; trk_h = sorted(PM)
def p95bin(D, tracks, lo):
    x = [a for t in tracks for v_, a in D.get(t, []) if lo <= v_ < lo + 20]; return (float(np.percentile(x, 95)) / 9.81, len(x)) if len(x) >= 200 else (None, len(x))
for lo in range(60, 240, 20):
    m, nm = p95bin(PM, trk_h, lo); c, nc = p95bin(PC, trk_h, lo); bb, _ = p95bin(PB, trk_h, lo)
    if m is None or c is None: continue
    bs = [p95bin(PM, list(rng.choice(trk_h, len(trk_h))), lo)[0] for _ in range(1000)]; bs = [x for x in bs if x is not None]
    lo95, hi95 = float(np.quantile(bs, 0.025)), float(np.quantile(bs, 0.975))
    tr_rows.append(dict(bin=lo, meas_g=m, meas_ci95=[lo95, hi95], cand_g=c, base_g=bb, ok=bool(lo95 <= c <= hi95)))
g_tr = dict(bins=tr_rows, pass_=bool(tr_rows) and all(r['ok'] for r in tr_rows))
# physics guards per fold (A2.5)
phys = []
for f in F:
    for s, fit in f['fits'].items(): phys.append(dict(held=f['held'], season=s, **fit['checks']))  # A7.6 P1, P2, P4 + G-BT (A7.5)
    for h in f['heldScores']:
        c = h['checks']; phys.append(dict(held=f['held'], lap=h['key'], P3a=bool(c['power']['ok']), P4=bool(c['lowR']['ok']) if c['lowR'] else True, E=bool(c['energyCand'] and c['energyBase'])))
phys_fail = [r for r in phys if not all(v for k, v in r.items() if k not in ('held', 'season', 'lap'))]
MESH = json.load(open(MESHP)); ISO = open(ISOP).read(); CT = json.load(open(CTP)); MEA = open(MEAP).read()
guards = dict(G_P=dict(n_checks=len(phys), fails=phys_fail[:50], n_fails=len(phys_fail), pass_=not phys_fail), G_mesh=dict(pass_=MESH['pass']),
              G_S=dict(pass_='G-S PASS' in ISO), G_T=dict(**CT, pass_=CT['pass']), G_M0=dict(pass_='# fail 0' in MEA and '# pass' in MEA), G_SB=g_sb, G_TR=g_tr)
# parameters vs priors (A3.4, A7.2): every fitted parameter per season over folds; > 2σ or physics range = model error
params = {}
for s in ('2023', '2024', '2025'):
    for k in F[0]['fits'][s]['params']:
        vals = np.array([f['fits'][s]['params'][k] for f in F]); zs = np.array([f['fits'][s]['z'][k] for f in F])
        params[f'{s}.{k}'] = dict(median=float(np.median(vals)), fold90=[float(np.quantile(vals, 0.05)), float(np.quantile(vals, 0.95))], prior=F[0]['fits'][s]['prior'][k],
                                  z_median=float(np.median(zs)), z_maxabs=float(np.abs(zs).max()), model_error=bool(np.median(np.abs(zs)) > 2))
    params[f'{s}.muY_range_over_loads'] = [float(min(f['fits'][s]['muYRange'][0] for f in F)), float(max(f['fits'][s]['muYRange'][1] for f in F))]
    params[f'{s}.muX_over_muY'] = [float(np.quantile([f['fits'][s]['params']['muX'] / f['fits'][s]['params']['muY'] for f in F], q)) for q in (0.05, 0.5, 0.95)]
    params[f'{s}.stage1'] = dict(muX=float(np.median([f['fits'][s]['stage1']['muX'] for f in F])), muXTrac=float(np.median([f['fits'][s]['stage1']['muXTrac'] for f in F])))
    params[f'{s}.env_chi2_dof'] = [float(np.quantile([f['fits'][s]['envChi2Dof'] for f in F], q)) for q in (0.05, 0.5, 0.95)]
# noise floor ratios (A3.3)
NF = POW['noise_floor']; noise = {}
for b in BANDS:
    bb = b.replace('_', '-'); cand = [x for x in (track_val(f, 'apex' + b, 'cand') for f in F) if x is not None]; base = [x for x in (track_val(f, 'apex' + b, 'base') for f in F) if x is not None]
    noise[b] = dict(sigma_meas=NF[bb]['sigma_meas'], cand_rms_mean=float(np.mean(cand)), base_rms_mean=float(np.mean(base)), ratio_cand=float(np.mean(cand)) / NF[bb]['sigma_meas'],
                    ratio_base=float(np.mean(base)) / NF[bb]['sigma_meas'], at_data_limit=bool(float(np.mean(cand)) / NF[bb]['sigma_meas'] <= 1.2))
per = {f['held']: dict(corridor=f['corridor'], apex120_240_gain=g.get(f['held']), entry_harm=paired('entry', -1).get(f['held']), exit_harm=paired('exit', -1).get(f['held']),
                       exit_mean_s_cand=track_val(f, 'exitMean', 'cand'), exit_mean_s_base=track_val(f, 'exitMean', 'base'),
                       lap_err_cand=track_val(f, 'lapErr', 'cand'), lap_err_base=track_val(f, 'lapErr', 'base'), str_end_bias_cand=sb[f['held']], str_end_bias_base=sbb[f['held']]) for f in F}
g26 = paired('apex120_240', folds=F26) if F26 else {}
r26 = dict(n_tracks=len(g26), mean_gain_kph=float(np.mean(list(g26.values()))) if g26 else None, ci95=boot(list(g26.values())) if len(g26) > 1 else None, judged=False,
           note='report-only (A1 own MDE 4.28 km/h > 3)', drag=[dict(held=f['held'], **f['drag']) for f in F26])
verdict = 'PASS' if primary['pass_'] and all(s_['pass_'] for s_ in sec.values()) and lap['pass_'] and drs['pass_'] and braking['pass_'] and all(gd['pass_'] for gd in guards.values()) else 'FAIL'
res = dict(verdict=verdict, folds=len(F), primary_apex_120_240=primary, report=report, secondary_guards=sec, guard_lap=lap, guard_drs=drs, guard_braking=braking,
           traction_by_bin=trc, guards=guards, params=params, noise_floor=noise, group_2026=r26, per_track=per)
json.dump(res, open(OUT, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ('per_track', 'params', 'traction_by_bin')}, indent=1, default=str)[:20000])
for k, v_ in params.items(): print('param', k, json.dumps(v_))
print('per_track', json.dumps(per))
