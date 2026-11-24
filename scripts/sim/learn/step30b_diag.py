# Step 30b labelled diagnostic run (central 2026-11-25: once, report-only, attempt 1 of the TUM-line idea; amendment c500ba31…).
# DIAGNOSTIC, UNDERPOWERED (MDE 7.4 km/h). Base = corners-rematched-*.csv, candidate = corners-rematched-*-tumline.csv
# (LAPSIM_GEOM_TUMLINE=on, current grip, no refit). Join on (track, season, measured corner position). S/U from the base audit table.
# Usage: python3 -I scripts/sim/learn/step30b_diag.py <repo root>
import sys, csv, json, math, hashlib, numpy as np
ROOT = sys.argv[1]; D = f'{ROOT}/scripts/sim/data/step30b/'
TR = ['austin', 'hungaroring', 'interlagos', 'mexico-city', 'montreal', 'monza', 'sakhir', 'shanghai', 'silverstone', 'spa-francorchamps',
      'spielberg', 'suzuka', 'zandvoort', 'kuala-lumpur']
rd = lambda p: list(csv.DictReader(open(p)))
base = rd(D + 'corners-rematched-2023-2026.csv'); cand = rd(D + 'corners-rematched-2025-2026-tumline.csv') + rd(D + 'corners-rematched-2023-2024-tumline.csv')
aud = {(r['track'], r['season'], r['corner_id']): r for r in rd(D + 'posthoc2326/step30b-audit-corners.csv')}
EX = json.load(open(D + 'posthoc2326/kernel-export.json')) if False else None
G = json.load(open(D + 'geom-tumline-kappa.json'))['tracks']; HD = json.load(open(D + 'heading-export.json'))
cidx = {}
for r in cand: cidx.setdefault((r['track'], r['season']), []).append(r)
rows, lost = [], []
for b in base:
    if b['track'] not in TR: continue
    a = aud[(b['track'], b['season'], b['corner_id'])]
    c = [r for r in cidx.get((b['track'], b['season']), []) if abs(float(r['meas_share_raw']) - float(b['meas_share_raw'])) < 1e-9]
    x = math.log(float(a['R_tr']) / float(a['R_kernel'])) if a['R_tr'] not in ('', 'nan') else float('nan')
    sel = 'S' if abs(x) >= 0.10 else 'U'
    if not c: lost.append((b['track'], b['season'], a['turn'], sel)); continue
    c = c[0]; n = len(G[b['track']]['kappa']); ds = HD[b['track']]['ds']
    # R after: peak |kappa_new| (same sign as kernel) within ±40 m of the base kernel apex index
    k0 = np.array(HD[b['track']]['kappa']); s0 = float(b['lap_share']); i0 = int(round(s0 * n)) % n
    w = (i0 + np.arange(-int(40 / ds), int(40 / ds) + 1)) % n; ia = w[np.argmax(np.abs(k0[w]))]; sg = np.sign(k0[ia])
    k1 = np.array(G[b['track']]['kappa']) / 1e5; Ra = 1 / max(1e-9, (k1[w] * sg).max())
    m0, m1, ms = float(b['apex_kph_model']), float(c['apex_kph_model']), float(b['apex_kph_meas'])
    rows.append(dict(track=b['track'], season=b['season'], turn=a['turn'], set=sel, meas_kph=ms, R_before=round(float(a['R_kernel']), 2), R_after=round(Ra, 2),
                     R_TUMline=a['R_tr'], ln_R_TUMline_over_kernel=round(x, 4) if math.isfinite(x) else '', model_before=m0, model_after=m1,
                     gap_before=round(m0 - ms, 3), gap_after=round(m1 - ms, 3), meas_share_raw=b['meas_share_raw']))
cols = list(rows[0]); body = ','.join(cols) + '\n' + '\n'.join(','.join(str(r[k]) for k in cols) for r in rows) + '\n'
open(D + 'step30b-diag-corners.csv', 'w').write(body); sh = hashlib.sha256(body.encode()).hexdigest()
open(D + 'step30b-diag-corners.csv.sha256', 'w').write(sh + '  step30b-diag-corners.csv\n')
rms = lambda v, i: math.sqrt(np.mean([e[i] ** 2 for e in v]))
def boot(by, stat, B=10000, seed=1):
    ks = sorted(by); rng = np.random.default_rng(seed)
    return np.array([stat([e for i in rng.integers(0, len(ks), len(ks)) for e in by[ks[i]]]) for _ in range(B)])
res = {'label': 'DIAGNOSTIC, UNDERPOWERED (MDE 7.4 km/h); report-only; not a pipeline run', 'cornersCsvSha256': sh, 'lostInCandidateMatch': lost}
for s in ('S', 'U'):
    by = {}
    for r in rows:
        if r['set'] == s: by.setdefault(r['track'], []).append((r['gap_before'], r['gap_after']))
    allv = [e for v in by.values() for e in v]
    g_rms = lambda v: rms(v, 0) - rms(v, 1); g_abs = lambda v: float(np.mean([abs(a) - abs(b) for a, b in v]))
    b1, b2 = boot(by, g_rms), boot(by, g_abs)
    res[s] = {'n': len(allv), 'tracks': len(by), 'rmsBefore': rms(allv, 0), 'rmsAfter': rms(allv, 1), 'rmsGain': g_rms(allv),
              'rmsGain90': [float(np.percentile(b1, 5)), float(np.percentile(b1, 95))], 'rmsGainOneSided90LB': float(np.percentile(b1, 10)),
              'harmOneSided90UB': float(-np.percentile(b1, 10)), 'meanAbsGain': g_abs(allv), 'meanAbsGain90': [float(np.percentile(b2, 5)), float(np.percentile(b2, 95))],
              'meanSignedBefore': float(np.mean([a for a, b in allv])), 'meanSignedAfter': float(np.mean([b for a, b in allv])),
              'perTrack': {k: {'n': len(v), 'rmsBefore': round(rms(v, 0), 2), 'rmsAfter': round(rms(v, 1), 2)} for k, v in sorted(by.items())}}
# guard 2: lap error with shipped calibration lap + page geometry delta (in-sample shipped grip; not LOO held-out, not a pipeline run)
cal = json.loads(open(D + 'calib-laps.json').read())
lap = []
for yrs in ('2025-2026', '2023-2024'):
    A = {(a['track'], a['season']): a for a in json.load(open(D + f'rematch-audit-{yrs}.json')) if 'lapSimS' in a}
    C = {(a['track'], a['season']): a for a in json.load(open(D + f'rematch-audit-{yrs}-tumline.json')) if 'lapSimS' in a}
    for k, a in A.items():
        t = cal.get(k[1], {}).get(k[0])
        if not t or k not in C: continue
        d = C[k]['lapSimS'] - a['lapSimS']; e0 = (t['simLap'] / t['realLap'] - 1) * 100; e1 = ((t['simLap'] + d) / t['realLap'] - 1) * 100
        lap.append(dict(track=k[0], season=k[1], dLapS=d, e0=e0, e1=e1))
dl = np.array([r['e1'] ** 2 - r['e0'] ** 2 for r in lap]); m0 = np.mean([r['e0'] ** 2 for r in lap])
ub = math.sqrt(max(0, m0 + dl.mean() + dl.std(ddof=1) / math.sqrt(len(dl)))) - math.sqrt(m0)
res['guard2'] = {'rows': len(lap), 'rmsBeforePct': math.sqrt(m0), 'rmsAfterPct': math.sqrt(np.mean([r['e1'] ** 2 for r in lap])), 'pairedUBpp': ub,
                 'pass': ub <= 0.10, 'note': 'shipped calibration simLap + page lap delta (base vs candidate), F1 pole rows 2023-2026 in the calibration; in-sample shipped grip',
                 'perTrackDeltaS': {f"{r['track']} {r['season']}": round(r['dLapS'], 3) for r in lap if abs(r['dLapS']) > 1e-6}}
json.dump(res, open(D + 'step30b-diag-result.json', 'w'), indent=1, default=float)
print(json.dumps({k: (v if k not in ('S', 'U') else {kk: vv for kk, vv in v.items() if kk != 'perTrack'}) for k, v in res.items() if k != 'guard2'}, indent=1, default=float))
print('guard2', {k: v for k, v in res['guard2'].items() if k != 'perTrackDeltaS'}); print(res['guard2']['perTrackDeltaS'])
for s in ('S', 'U'): print(s, res[s]['perTrack'])
