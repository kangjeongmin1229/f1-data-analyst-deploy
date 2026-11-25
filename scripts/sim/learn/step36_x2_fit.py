# Step 36 X2 (report-only): a_y envelope vs speed → μ and ClA_eff (lower bound on ClA), with a load-sensitivity variant.
#   python3 -I scripts/sim/learn/step36_x2_fit.py <samples.json> <out.json>
# Bins 80–320 km/h by 20, ≥ 50 samples. Per bin p95 / p99 of |a_y| and mean x = ρ v² / (2 m).
# Fit 1: a = μ g + (μ ClA) x (least squares). Fit 2: a = μ (1 − k ClA x / g)(g + ClA x) (nonlinear least squares).
# CI: bootstrap over tracks within a season, 2000 draws, seed 7, percentile 95 %. Variants: all samples; flat-out samples dropped.
import json, sys
import numpy as np
from scipy.optimize import least_squares

import os
G, EDGES, NMIN, B, SEED = 9.81, np.arange(80, 321, 20), 50, int(os.environ.get("X2_B", 2000)), 7
d = json.load(open(sys.argv[1]))

def bins(T, tracks, q, flat):
    v = np.concatenate([T[t]['v'] for t in tracks]); a = np.concatenate([T[t]['ay'] for t in tracks])
    x = np.concatenate([T[t]['x'] for t in tracks]); f = np.concatenate([T[t]['f'] for t in tracks])
    if not flat: v, a, x = v[f == 0], a[f == 0], x[f == 0]
    j = np.digitize(v, EDGES) - 1; out = []
    for b in range(len(EDGES) - 1):
        m = j == b
        if m.sum() >= NMIN: out.append((int(EDGES[b] + 10), int(m.sum()), float(np.percentile(a[m], q)), float(x[m].mean())))
    return out

def fit1(bs):
    x = np.array([b[3] for b in bs]); a = np.array([b[2] for b in bs])
    B1, A = np.polyfit(x, a, 1); mu = A / G
    return {'mu': mu, 'muClA': B1, 'ClA': B1 / mu}, a - (A + B1 * x)

def fit2(bs, f1):
    x = np.array([b[3] for b in bs]); a = np.array([b[2] for b in bs])
    r = least_squares(lambda p: p[0] * (1 - p[2] * p[1] * x / G) * (G + p[1] * x) - a, [f1['mu'], max(f1['ClA'], 0.5), 0.0],
                      bounds=([0.1, 0.0, -2.0], [6.0, 30.0, 2.0]))
    return {'mu': r.x[0], 'ClA': r.x[1], 'k': r.x[2]}

def ci(vals): v = np.array([x for x in vals if np.isfinite(x)]); return [round(float(np.percentile(v, 2.5)), 4), round(float(np.percentile(v, 97.5)), 4)] if len(v) else None

res = {'mass_kg': d['mass'], 'mass_note': 'assumption: 798 kg minimum with driver + ~10 kg quali fuel', 'laps': d['laps'], 'samplesKept': d['samplesKept'],
       'bootstrap': {'B': B, 'seed': SEED, 'unit': 'track within season'}, 'results': {}}
rng = np.random.default_rng(SEED)
for flat in (True, False):
    for y, T in sorted(d['seasons'].items()):
        tr = sorted(T)
        for q in (95, 99):
            bs = bins(T, tr, q, flat); f1, resid = fit1(bs); f2 = fit2(bs, f1)
            draws = {'mu1': [], 'muClA1': [], 'ClA1': [], 'mu2': [], 'ClA2': [], 'k2': []}
            for _ in range(B):
                pick = [tr[i] for i in rng.integers(0, len(tr), len(tr))]
                Tb = {f'{t}#{i}': T[t] for i, t in enumerate(pick)}
                try:
                    bb = bins(Tb, list(Tb), q, flat)
                    if len(bb) < 4: continue
                    g1, _ = fit1(bb); g2 = fit2(bb, g1)
                    for k, v in (('mu1', g1['mu']), ('muClA1', g1['muClA']), ('ClA1', g1['ClA']), ('mu2', g2['mu']), ('ClA2', g2['ClA']), ('k2', g2['k'])): draws[k].append(v)
                except Exception:
                    continue
            key = f"{'all' if flat else 'noFlatOut'}|{y}|p{q}"
            res['results'][key] = {
                'tracks': len(tr), 'bins': [{'vKph': b[0], 'n': b[1], 'ay': round(b[2], 3), 'x': round(b[3], 4), 'residFit1': round(float(r), 3)} for b, r in zip(bs, resid)],
                'fit1': {'mu': round(f1['mu'], 4), 'muClA': round(f1['muClA'], 4), 'ClA': round(f1['ClA'], 4),
                         'ci': {'mu': ci(draws['mu1']), 'muClA': ci(draws['muClA1']), 'ClA': ci(draws['ClA1'])}},
                'fit2': {'mu': round(f2['mu'], 4), 'ClA': round(f2['ClA'], 4), 'k': round(f2['k'], 4),
                         'ci': {'mu': ci(draws['mu2']), 'ClA': ci(draws['ClA2']), 'k': ci(draws['k2'])}},
                'drawsUsed': len(draws['mu1'])}
            print(key, res['results'][key]['fit1'], res['results'][key]['fit2'], flush=True)
json.dump(res, open(sys.argv[2], 'w'), indent=1)
