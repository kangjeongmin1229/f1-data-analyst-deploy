# Step 32 (v2 §2–3, A2.6, A6): measured samples for the tables, on the driven line, tagged by aero state, normalised to the pole car.
# Per measured sample: v (km/h), a_x (g; Savitzky–Golay 45 m periodic, the 30c / step 31 estimator, copied from step31_power.py),
# a_y = v²·|κ_driven| (g) with κ_driven = the κ the model lap uses, read at the model index k − shift; exit-phase flag (30c phases);
# low = the model's low-drag state there (A6.3). A6.1: per session, team scale k_team = median v_P / v_lap over aligned points (team's best
# kept lap; pole team k = 1); per-lap check k ∈ [0.97, 1.03] and RMS(k·v − v_P) ≤ 5 km/h; the session is normalised if ≥ 80 % of its
# non-pole-team laps pass (failing laps dropped), else pole team only. Scaling acts on in-memory copies (v·k, a·k²); measured files unchanged.
# usage: python3 -I scripts/sim/learn/step32_samples.py <traces-top10.json> <kappa.json> <out samples.json> <out normalisation.json>
import json, sys
import numpy as np
from collections import defaultdict
from scipy.signal import savgol_filter
TRP, KAP, OUT, NORM = sys.argv[1:5]
TR = json.load(open(TRP))['events']; KJ = json.load(open(KAP)); KD, LOW = KJ['kappa'], KJ['low']
G0, SGW = 9.81, 45.0

def deriv(v_kph, ds):  # copied from step31_power.py
    v = np.asarray(v_kph, float) / 3.6; m = np.isfinite(v); idx = np.arange(len(v))
    vf = np.interp(idx, idx[m], v[m], period=len(v)); w = int(round(SGW / ds)) | 1
    return vf, savgol_filter(vf, w, 2, deriv=1, delta=ds, mode='wrap'), m
def model_frame(e):  # measured speed re-indexed to the model frame (index k − shift); a copy
    a = np.array([np.nan if x is None else x for x in e['a']], float); return np.roll(a, -e['shift'])

sess = defaultdict(list)
for k, e in TR.items(): assert 2023 <= int(e['year']) <= 2026, '2022 is locked'; sess[e['session']].append((k, e))
out, norm = {}, {}
for s, L in sess.items():
    P = min(L, key=lambda x: x[1]['rank'])[1]; vP = model_frame(P); pole_team = P['team']
    best = {}
    for k, e in L:
        if e['team'] not in best or e['rank'] < best[e['team']]['rank']: best[e['team']] = e
    kt = {}
    for t, e in best.items():
        v = model_frame(e); m = np.isfinite(v) & np.isfinite(vP) & (v > 30)
        kt[t] = 1.0 if t == pole_team else float(np.median(vP[m] / v[m]))
    passed, failed = [], []
    for k, e in L:
        if e['team'] == pole_team: continue
        v = model_frame(e); m = np.isfinite(v) & np.isfinite(vP); kk = kt[e['team']]
        rms = float(np.sqrt(np.mean((kk * v[m] - vP[m]) ** 2)))
        (passed if 0.97 <= kk <= 1.03 and rms <= 5.0 else failed).append({'lap': k, 'team': e['team'], 'k': kk, 'rms_kph': rms})
    others = len(passed) + len(failed); use_norm = others > 0 and len(passed) / others >= 0.8
    keep = {k for k, e in L if e['team'] == pole_team} | ({p['lap'] for p in passed} if use_norm else set())
    norm[s] = {'choice': 'normalised' if use_norm else 'pole team only', 'pole_team': pole_team, 'k_team': kt, 'passed': len(passed), 'failed': failed, 'n_used': len(keep)}
    for k, e in L:
        if k not in keep: continue
        n, ds, sh = e['n'], e['ds'], e['shift']; kap = np.array(KD[e['track']], float); low = np.array(LOW[s], float); assert len(kap) == n == len(low)
        meas = np.array([np.nan if x is None else x for x in e['a']], float); kk = kt[e['team']]
        vf, dv, ok = deriv(meas, ds); ax = vf * dv / G0; mi = (np.arange(n) - sh) % n
        ay = vf ** 2 * np.abs(kap[mi]) / G0
        ex = np.zeros(n, bool); st_ = e['straights']
        for j, (i, vmin) in enumerate(e['corners']):  # exit phase: end of the ≤ 1.05·v_min stretch → next straight end (step31_power.py)
            if len(st_) < 2: continue
            a0, a1 = st_[j], st_[(j + 1) % len(st_)]; seg = np.arange(a0, a1 + (n if a1 <= a0 else 0) + 1) % n
            k0 = int(np.where(seg == i)[0][0]); hi = k0; vv = meas[seg]
            while hi < len(seg) - 1 and np.isfinite(vv[hi + 1]) and vv[hi + 1] <= 1.05 * vmin: hi += 1
            ex[seg[hi + 1:]] = True
        out[k] = {'track': e['track'], 'year': int(e['year']), 'session': s, 'team': e['team'], 'k': kk,
                  'v': np.round(vf[ok] * 3.6 * kk, 2).tolist(), 'ax': np.round(ax[ok] * kk ** 2, 4).tolist(), 'ay': np.round(ay[ok] * kk ** 2, 4).tolist(),
                  'exit': ex[ok].astype(int).tolist(), 'low': np.round(low[mi][ok], 3).tolist()}
json.dump(out, open(OUT, 'w')); json.dump(norm, open(NORM, 'w'), indent=1)
ch = [v['choice'] for v in norm.values()]
print(len(out), 'laps used,', sum(len(o['v']) for o in out.values()), 'samples;', {c: ch.count(c) for c in set(ch)})
