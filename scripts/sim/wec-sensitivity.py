"""Diagnostic only: which inputs drive the Hypercar lap time, and can grip and downforce be separated?
Sobol sensitivity (SALib) around the fitted car, plus the set of samples that match the real laps and traps.
Usage: python3 scripts/sim/wec-sensitivity.py <cal.js> <cls> <year> [N]   (prints JSON)"""
import json, subprocess, sys
import numpy as np
from SALib.sample import sobol as sobol_sample
from SALib.analyze import sobol

cal, cls, year = sys.argv[1], sys.argv[2], sys.argv[3]
N = int(sys.argv[4]) if len(sys.argv) > 4 else 512
names = ['muY', 'clA', 'cdA', 'dmuDfz', 'mass', 'pIce', 'cRoll', 'etaDrive']
# fitted values: the fit bounds. Assumed inputs (layer 4): a stated plausible range.
bounds = [[1.3, 2.2], [2, 7], [0.7, 1.6], [-1.5e-4, 0], [1075, 1165], [475e3, 525e3], [0.010, 0.020], [0.92, 0.97]]
problem = {'num_vars': len(names), 'names': names, 'bounds': bounds}
X = sobol_sample.sample(problem, N, calc_second_order=False, seed=1)
run = subprocess.run(['node', 'scripts/sim/wec-sensitivity.mjs'], capture_output=True, text=True, check=True,
                     input=json.dumps({'cal': cal, 'cls': cls, 'year': year, 'samples': [dict(zip(names, r)) for r in X.tolist()] + [{}]}))  # last row: the fitted car
res = json.loads(run.stdout); T = res['tracks']; n = len(T)
Y = np.array(res['out']); fit, Y = Y[-1], Y[:-1]; lap, vmax = Y[:, :n], Y[:, n:]
real = np.array([t['realLap'] for t in T]); trap = np.array([t['trapKph'] or np.nan for t in T])
err = (lap / real - 1) * 100
def total(y):
    s = sobol.analyze(problem, y, calc_second_order=False, seed=1)
    return {k: round(float(v), 3) for k, v in zip(names, s['ST'])}
out = {'class': cls, 'year': year, 'samplesPerInput': N, 'laps': int(len(X)), 'tracks': [t['track'] for t in T],
       'totalSobol': {'meanLapErrorPct': total(err.mean(axis=1)), 'lapErrorSpreadPct': total(err.std(axis=1)),
                      'meanTopSpeedKph': total(vmax.mean(axis=1))}}
# samples that explain the data about as well as the fitted car does (lap RMS within 15 %, trap RMS within 2 km/h)
rms = lambda a: np.sqrt(np.nanmean(a ** 2, axis=-1))
fitLap, fitTrap = rms((fit[:n] / real - 1) * 100), rms(fit[n:] - trap)
ok = (rms(err) <= 1.15 * fitLap) & (rms(vmax - trap) <= fitTrap + 2)
A = X[ok]
out['matching'] = {'rule': 'lap RMS <= 1.15 x fitted car, trap RMS <= fitted car + 2 km/h', 'fittedLapRmsPct': round(float(fitLap), 3), 'fittedTrapRmsKph': round(float(fitTrap), 1), 'n': int(ok.sum())}
if ok.sum() >= 5:
    out['matching'].update({'range': {k: [round(float(A[:, i].min()), 6), round(float(A[:, i].max()), 6)] for i, k in enumerate(names)},
        'corr_muY_clA': round(float(np.corrcoef(A[:, 0], A[:, 1])[0, 1]), 3), 'corr_clA_dmuDfz': round(float(np.corrcoef(A[:, 1], A[:, 3])[0, 1]), 3),
        'nWithLD_le_4.25': int((A[:, 1] / A[:, 2] <= 4.25).sum()), 'liftToDragRange': [round(float((A[:, 1] / A[:, 2]).min()), 2), round(float((A[:, 1] / A[:, 2]).max()), 2)]})
print(json.dumps(out, indent=1))
