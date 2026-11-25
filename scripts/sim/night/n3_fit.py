# Night N3 fit (rule docs/night/step32-n3-rule-2026-11-25.md 2e128de2…): adds the driven-line radius from FastF1 x/y (TracingInsights,
# pinned commits, read-only), then y ~ covariates + track random intercept (MixedLM), LOTO by track. Report-only.
# usage: python3 -I scripts/sim/night/n3_fit.py <rows.json> <traces-top10.json> <out.json>   (N3_TRACKS=a,b limits tracks: crash test)
import json, sys, os, numpy as np, requests, warnings
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
import statsmodels.formula.api as smf, pandas as pd
warnings.filterwarnings('ignore')
RP, TRP, OUT = sys.argv[1:4]; R = json.load(open(RP)); TR = json.load(open(TRP)); EV, TI = TR['events'], TR['ti_refs']
R = [r for r in R if 120 <= r['meas'] < 240 and abs(r['koff_m']) < 100 and not r['flat']]
if os.environ.get('N3_TRACKS'): R = [r for r in R if r['track'] in os.environ['N3_TRACKS'].split(',')]
S = requests.Session()
def num(v): return float(v) if isinstance(v, (int, float)) else np.nan
def xy(k):
    e = EV[k]; u = f"https://raw.githubusercontent.com/TracingInsights/{e['year']}/{TI[str(e['year'])]}/" + '/'.join(quote(x) for x in (e['event'], 'Qualifying', e['drv'], f"{e['lap_no']}_tel.json"))
    for _ in range(4):
        try:
            r = S.get(u, timeout=40)
            if r.ok: break
        except Exception: pass
    t = r.json()['tel']; tm = np.array([num(x) for x in t['time']]); sp = np.array([num(x) for x in t['speed']]); m = np.isfinite(tm) & np.isfinite(sp)
    x = np.array([num(v) for v in t['x']])[m] / 10; y = np.array([num(v) for v in t['y']])[m] / 10; assert len(x) == len(e['sp']), k; return k, (x, y)
XY = dict(ThreadPoolExecutor(12).map(xy, sorted({r['key'] for r in R})))
def circ(x, y): A = np.c_[2 * x, 2 * y, np.ones_like(x)]; c, *_ = np.linalg.lstsq(A, x * x + y * y, rcond=None); return float(np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2))
for r in R:
    e = EV[r['key']]; x, y = XY[r['key']]; xs = np.array(e['xs']) * e['ds']; m = (np.abs(xs - r['i'] * e['ds']) <= 50) & np.isfinite(x) & np.isfinite(y)
    r['R_xy'] = circ(x[m], y[m]) if m.sum() >= 4 else None; r['rxy_ratio'] = r['R_xy'] / r['R_geom'] if r['R_xy'] and r['R_geom'] else None
D = pd.DataFrame(R); D = D[D.rxy_ratio.notna() & np.isfinite(D.rxy_ratio)]
D['log_rxy_ratio'] = np.log(D.rxy_ratio)  # ratio enters as a log (its spread is multiplicative)
COV = ['log_rxy_ratio', 'vcurv', 'dz_entry', 'R_geom', 'complex', 'entry_kph', 'lappos']; SIGN = {'log_rxy_ratio': -1, 'vcurv': +1, 'complex': +1, 'entry_kph': +1, 'kerb': -1}
NOVAR = {c: 'no variance in the rows (the corner finder keeps no two apexes within 150 m)' if c == 'complex' else 'no variance' for c in COV + ['kerb'] if not (D[c].astype(float).std() > 0)}
COV = [c for c in COV if c not in NOVAR]
for c in COV + ['kerb']: D['z_' + c] = (D[c] - D[c].mean()) / D[c].std() if c not in NOVAR else np.nan
FALLBACK = [0]
def fit(df, xs):  # track random intercept; if the mixed model is singular, OLS (the fixed part is what LOTO predicts with); counted
    f = 'err ~ ' + (' + '.join('z_' + x for x in xs) if xs else '1')
    try: return smf.mixedlm(f, df, groups=df['track']).fit(reml=True, method='lbfgs')
    except Exception:
        FALLBACK[0] += 1; m = smf.ols(f, df).fit(); m.fe_params = m.params; return m
def loto(df, xs):
    sse = 0.0
    for t in sorted(df.track.unique()):
        tr, te = df[df.track != t], df[df.track == t]; m = fit(tr, xs); fe = m.fe_params
        pred = fe['Intercept'] + sum(fe['z_' + x] * te['z_' + x] for x in xs) if xs else np.full(len(te), fe['Intercept'])
        sse += float(((te.err - pred) ** 2).sum())
    return sse
def report(df, covs, label):
    df = df.dropna(subset=['err'] + ['z_' + c for c in covs])
    if df.track.nunique() < 3: return {'label': label, 'skipped': f'{df.track.nunique()} tracks'}
    null = loto(df, []); out = {'n_rows': len(df), 'n_tracks': int(df.track.nunique()), 'sse_null': null, 'full': {}, 'per_covariate': {}}
    full = fit(df, covs); out['full']['R2_loto'] = 1 - loto(df, covs) / null
    allm = {}
    for c in covs:
        m = fit(df, [c]); ci = m.conf_int().loc['z_' + c].tolist(); coef = float(m.fe_params['z_' + c]); sgn = SIGN.get(c)
        gain = 1 - loto(df, [c]) / null; drop = out['full']['R2_loto'] - (1 - loto(df, [x for x in covs if x != c]) / null)
        ok_sign = None if sgn is None else bool(np.sign(coef) == sgn and (ci[0] > 0 if sgn > 0 else ci[1] < 0))
        out['per_covariate'][c] = dict(coef_kph_per_sd=coef, ci95=ci, full_model_coef=float(full.fe_params['z_' + c]), expected_sign=sgn, sign_ok=ok_sign,
                                       loto_R2_gain_single=gain, loto_R2_drop_one=drop, triggers=bool(ok_sign and gain >= 0.30))
    out['label'] = label; return out
res = {'rule': 'docs/night/step32-n3-rule-2026-11-25.md sha256 2e128de2...', 'all': report(D, COV, 'all aligned non-flat 120-240 rows')}
K = D[D.kerb.notna()].copy(); K['z_kerb'] = (K.kerb - K.kerb.mean()) / K.kerb.std()
res['kerb_subset'] = report(K, COV + ['kerb'] if 'kerb' not in NOVAR else COV, 'kerb corridor tracks (step 31 corridor.json)')
res['classes'] = D.groupby('cls').err.agg(['count', 'mean']).reset_index().to_dict('records')
res['ols_fallbacks'] = FALLBACK[0]; res['not_testable'] = NOVAR
res['decision'] = 'family may open' if any(v['triggers'] for s in ('all', 'kerb_subset') for v in res[s].get('per_covariate', {}).values()) else 'data-limit protocol'
json.dump(res, open(OUT, 'w'), indent=1, default=float); print(json.dumps(res, indent=1, default=float)[:6000])
