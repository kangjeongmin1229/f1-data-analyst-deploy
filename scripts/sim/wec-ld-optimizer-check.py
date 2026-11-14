"""Independent optimizer check (diagnostic only). Under downforce/drag <= ldMax, can a global optimizer
(SciPy differential evolution) find a Hypercar that matches the fitted laps better than the Nelder-Mead fit?
Objective: lap RMS error (%) on the fitted tracks; penalty when trap RMS is more than 2 km/h worse than the
unconstrained fitted car. Usage: python3 scripts/sim/wec-ld-optimizer-check.py <cal.js> <cls> <year> <ldMax>"""
import json, subprocess, sys
import numpy as np
from scipy.optimize import differential_evolution
cal, cls, year, ld = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4])
names = ['muY', 'clA', 'cdA']
def sim(X):
    r = json.loads(subprocess.run(['node', 'scripts/sim/wec-sensitivity.mjs'], capture_output=True, text=True, check=True,
        input=json.dumps({'cal': cal, 'cls': cls, 'year': year, 'samples': [dict(zip(names, x)) for x in X]})).stdout)
    n = len(r['tracks']); Y = np.array(r['out']); real = np.array([t['realLap'] for t in r['tracks']])
    trap = np.array([t['trapKph'] or np.nan for t in r['tracks']])
    return np.sqrt((((Y[:, :n] / real - 1) * 100) ** 2).mean(axis=1)), np.sqrt(np.nanmean((Y[:, n:] - trap) ** 2, axis=1))
fitLap, fitTrap = (v[0] for v in sim([[]]))
def cost(XT):
    X = XT.T.copy(); X[:, 1] = np.minimum(X[:, 1], ld * X[:, 2])  # project onto the ratio limit
    lap, trap = sim(X.tolist())
    return lap + 0.2 * np.maximum(0, trap - (fitTrap + 2))
res = differential_evolution(cost, [(1.3, 2.2), (2, 7), (0.7, 1.6)], vectorized=True, updating='deferred', popsize=20, maxiter=40, seed=1, tol=1e-4, polish=False)
x = res.x.copy(); x[1] = min(x[1], ld * x[2]); lap, trap = (v[0] for v in sim([x.tolist()]))
print(json.dumps({'class': cls, 'year': year, 'ldMax': ld, 'fittedNoLimit': {'lapRmsPct': round(float(fitLap), 3), 'trapRmsKph': round(float(fitTrap), 1)},
    'bestWithLimit': {'lapRmsPct': round(float(lap), 3), 'trapRmsKph': round(float(trap), 1), 'muY': round(x[0], 3), 'clA': round(x[1], 2), 'cdA': round(x[2], 3)}, 'evaluations': int(res.nfev)}))
