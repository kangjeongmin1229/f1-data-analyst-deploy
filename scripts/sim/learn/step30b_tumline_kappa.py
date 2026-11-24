# Step 30b candidate (pre-reg 0ae7db0a… + A1 c500ba31…): driven kappa from the TUM min-curvature raceline on the 14 tracks with
# centreline fit RMS <= 5 m. Rigid fit of the TUM centreline onto the kernel map (same fit_rigid as step30b_audit.py), raceline kappa
# by Savitzky-Golay quadratic 30 m at 1 m, each kernel point takes the kappa of its nearest raceline point (<= 15 m, else unchanged).
# No speed data is read. Out: scripts/sim/data/step30b/geom-tumline-kappa.json (kappa x1e5 integers, as tracks-data.js).
# Usage: python3 -I scripts/sim/learn/step30b_tumline_kappa.py <repo root> <TUM racetrack-database dir>
import sys, json, importlib.util, numpy as np
from scipy.spatial import cKDTree
ROOT, TUMDIR = sys.argv[1:3]
src = open(f'{ROOT}/scripts/sim/learn/step30b_audit.py').read().split('\nrows, per_track = [], {}')[0]  # helper functions only
ns = {'__name__': 'helpers'}; sys.argv = ['x', ROOT, TUMDIR, '/tmp']; exec(src, ns)
resample, kappa_sg, fit_rigid, HD = ns['resample'], ns['kappa_sg'], ns['fit_rigid'], ns['HD']
E = ns['E']; TUM = ns['TUM']
TRACKS = ['austin', 'hungaroring', 'interlagos', 'mexico-city', 'montreal', 'monza', 'sakhir', 'shanghai', 'silverstone',
          'spa-francorchamps', 'spielberg', 'suzuka', 'zandvoort', 'kuala-lumpur']
maps = {}
for k, T in E['tracks'].items(): maps.setdefault(T['id'], T)
out = {'source': 'TUMFTM/racetrack-database@e59595d1f3573b30d1ded6a08984935b957688e0 racelines (LGPL-3.0)', 'estimator': 'SG quadratic 30 m at 1 m', 'tracks': {}}
for tid in TRACKS:
    T = maps[tid]; mx, my = np.array(T['map']['x'], float), np.array(T['map']['y'], float); k0 = np.array(HD[tid]['kappa'])
    a = np.loadtxt(f'{TUMDIR}/tracks/{TUM[tid]}.csv', delimiter=','); r = np.loadtxt(f'{TUMDIR}/racelines/{TUM[tid]}.csv', delimiter=',')
    put, rms, mirror = fit_rigid(a[:, 0], a[:, 1], mx, my)
    if rms > 5.0: raise SystemExit(f'{tid}: fit RMS {rms:.1f} > 5 m (pre-reg track rule)')
    Rl = put(r[:, 0], r[:, 1]); rx, ry, h = resample(Rl[:, 0], Rl[:, 1]); kl = kappa_sg(rx, ry, h)
    d, j = cKDTree(np.c_[rx, ry]).query(np.c_[mx, my]); k1 = np.where(d <= 15, kl[j], k0)
    corr = float(np.corrcoef(k0, k1)[0, 1])
    if corr < 0.5: raise SystemExit(f'{tid}: kappa sign/placement check failed (r {corr:.2f})')
    out['tracks'][tid] = {'kappa': [int(round(v * 1e5)) for v in k1], 'n': len(k1), 'fitRmsM': round(float(rms), 2), 'replacedShare': round(float((d <= 15).mean()), 3),
                          'corrWithKernel': round(corr, 3), 'lenTumLineM': round(float(len(rx) * h), 1), 'lenKernelM': round(len(k0) * HD[tid]['ds'], 1)}
    print(tid, {k: v for k, v in out['tracks'][tid].items() if k != 'kappa'})
json.dump(out, open(f'{ROOT}/scripts/sim/data/step30b/geom-tumline-kappa.json', 'w'))
