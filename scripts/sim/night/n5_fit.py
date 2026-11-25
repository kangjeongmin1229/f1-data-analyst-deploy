# N5 (rule docs/night/step32-n5-sharpness-rule-2026-11-26.md, sha256 a7c900d5…): curvature-peak sharpness vs corner error. Report-only.
# usage: python3 -I n5_fit.py <n3-rows.json> <geom.json> <traces-top10.json> <n3-result.json or -> <out.json>
import json, sys, warnings, numpy as np, pandas as pd, statsmodels.formula.api as smf
warnings.filterwarnings('ignore')
RP, GP, TP, N3P, OUT = sys.argv[1:6]; R = json.load(open(RP)); G = json.load(open(GP)); EVT = json.load(open(TP))['events']
G6 = 6 * 9.80665
def sg0(k, ds, W=90):
    w = int(round(W / ds)) | 1; h = (w - 1) // 2; P = np.linalg.pinv(np.vander(np.arange(-h, h + 1), 3, increasing=True)); kk = np.concatenate([k[-h:], k, k[:h]]); return np.convolve(kk, P[0][::-1], 'valid')
K90 = {t: sg0(np.array(g['kappa'], float), g['ds']) for t, g in G.items()}
for r in R:
    g = G[r['track']]; k = np.array(g['kappa'], float); n = len(k); sh = int(EVT[r['key']]['shift']); mi = (r['i'] - sh) % n; h = int(50 / g['ds'])
    idx = [(mi + q) % n for q in range(-h, h + 1)]; kr = np.max(np.abs(k[idx])); k9 = np.max(np.abs(K90[r['track']][idx]))
    r['sharp'] = kr / k9 if k9 > 0 else np.nan; r['ay_raw'] = (r['meas'] / 3.6) ** 2 * kr; r['over6g'] = bool(r['ay_raw'] > G6)
    s = mi * g['ds']; L = n * g['ds']; cs = [(min(abs(c[1] - s), L - abs(c[1] - s)), c[0]) for c in g['corners']]; d, num = min(cs) if cs else (1e9, None); r['corner'] = num if d <= 150 else None
A = [r for r in R if r['track'] != 'las-vegas']
over = {}
for r in A:
    if r['over6g']: over.setdefault(r['track'], []).append(r)
over6 = sorted([{'track': t, 'max_ay_g': max(x['ay_raw'] for x in rs) / 9.80665, 'corners': sorted({f"{x['corner']}" for x in rs}), 'n_laps_corners': len(rs),
  'worst': max(rs, key=lambda x: x['ay_raw'])['corner'], 'worst_vmin': max(rs, key=lambda x: x['ay_raw'])['meas']} for t, rs in over.items()], key=lambda x: -x['max_ay_g'])
D = pd.DataFrame([r for r in A if 120 <= r['meas'] < 240 and abs(r['koff_m']) < 100 and not r['flat'] and np.isfinite(r['sharp'])])
D['ln_sharp'] = np.log(D.sharp)
FB = [0]
def fit(df, xs):
    f = 'err ~ ' + (' + '.join('z_' + x for x in xs) if xs else '1')
    try: return smf.mixedlm(f, df, groups=df['track']).fit(reml=True, method='lbfgs')
    except Exception: FB[0] += 1; m = smf.ols(f, df).fit(); m.fe_params = m.params; return m
def loto(df, xs):
    sse = 0.0
    for t in sorted(df.track.unique()):
        tr, te = df[df.track != t], df[df.track == t]; fe = fit(tr, xs).fe_params
        pred = fe['Intercept'] + sum(fe['z_' + x] * te['z_' + x] for x in xs) if xs else np.full(len(te), fe['Intercept'])
        sse += float(((te.err - pred) ** 2).sum())
    return sse
def z(df, c): df['z_' + c] = (df[c] - df[c].mean()) / df[c].std()
for c in ('sharp', 'ln_sharp'): z(D, c)
null = loto(D, [])
def one(c):
    m = fit(D, [c]); ci = m.conf_int().loc['z_' + c].tolist(); coef = float(m.fe_params['z_' + c]); gain = 1 - loto(D, [c]) / null
    return dict(coef_kph_per_sd=coef, ci95=ci, loto_R2_gain_single=gain, sign_ok=bool(coef < 0 and ci[1] < 0))
res = {'rule': 'docs/night/step32-n5-sharpness-rule-2026-11-26.md sha256 a7c900d5...', 'n_rows': len(D), 'n_tracks': int(D.track.nunique()), 'skipped': 'las-vegas',
       'sharpness_summary': {q: float(D.sharp.quantile(q)) for q in (0.1, 0.5, 0.9, 0.99)}, 'sharp': one('sharp'), 'ln_sharp_report_only': one('ln_sharp')}
res['decision'] = 'central may open a geometry-smoothing family' if (res['sharp']['loto_R2_gain_single'] >= 0.30 and res['sharp']['sign_ok']) else 'stop'
# report-only: sharpness on top of N3's covariates (same definitions as n3_fit.py, without the x/y ratio which needs downloads)
N3C = ['vcurv', 'dz_entry', 'R_geom', 'entry_kph', 'lappos']
for c in N3C: z(D, c)
f0 = 1 - loto(D, N3C) / null; f1 = 1 - loto(D, N3C + ['sharp']) / null
res['report_only_over_n3_set'] = {'covariates': N3C, 'R2_loto_without': f0, 'R2_loto_with_sharp': f1, 'gain': f1 - f0}
res['rows_over_6g_in_band'] = int((D.ay_raw > G6).sum()); res['ay_raw_band'] = {q: float(D.ay_raw.quantile(q)) for q in (0.5, 0.9, 0.99)}
res['ols_fallbacks'] = FB[0]; res['tracks_any_apex_over_6g'] = over6
json.dump(res, open(OUT, 'w'), indent=1, default=float); print(json.dumps(res, indent=1, default=float)[:5000])
