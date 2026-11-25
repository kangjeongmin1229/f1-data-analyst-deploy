# Step 35b geometry audit: each Formula E map centre line (official FIA map, scaled to the printed length; fe-centrelines.mjs) fitted
# to the OpenStreetMap raceway ways of the venue by a similarity ICP (rotation, scale, shift; grid of start rotations), same method as
# fe-osm-lines.py. Reports per circuit: scale s (map metres -> OSM metres; s != 1 = printed length and drawn shape disagree), median and
# p95 distance map -> OSM after the fit, and the share of the map line within 15 m of an OSM way. Report only: nothing is written.
#   node scripts/sim/tracks/fe-centrelines.mjs > /tmp/fe-centre.json && python3 -I scripts/sim/tracks/fe-geometry-audit.py /tmp/fe-centre.json
import json, sys, numpy as np
from scipy.spatial import cKDTree
C = json.load(open(sys.argv[1])); osm = json.load(open('scripts/sim/data/tracks/osm-raceways-all.json'))['tracks']
def dense(a, step):
    out = []
    for p, q in zip(a[:-1], a[1:]):
        n = max(1, int(np.linalg.norm(q - p) / step)); out += [p + (q - p) * t for t in np.arange(n) / n]
    out.append(a[-1]); return np.array(out)
res = {}
for tid, c in C.items():
    if tid not in osm: res[tid] = {'osm': False}; continue
    T = osm[tid]; lat0, lon0 = T['seed']
    O = np.vstack([dense(np.c_[(np.array(w['g'])[:, 1] - lon0) * 111320 * np.cos(np.radians(lat0)), (np.array(w['g'])[:, 0] - lat0) * 110540], 2.0) for w in T['ways'] if len(w['g']) > 1])
    X = np.c_[c['x'], c['y']]; X = X - X.mean(0); KD = cKDTree(O); best = None
    for rot in np.radians(np.arange(0, 360, 10)):
        R = np.array([[np.cos(rot), -np.sin(rot)], [np.sin(rot), np.cos(rot)]]); sR = R; tt = O.mean(0)
        for it in range(60):  # rigid first (scale 1: the map is already at the printed length), then similarity
            Y = O[KD.query(X @ sR.T + tt)[1]]; mx, my = X.mean(0), Y.mean(0)
            U, S, Vt = np.linalg.svd((Y - my).T @ (X - mx)); D = np.eye(2)
            if np.linalg.det(U @ Vt) < 0: D[1, 1] = -1
            Rr = U @ D @ Vt; sR = (1.0 if it < 30 else (S * np.diag(D)).sum() / ((X - mx) ** 2).sum()) * Rr; tt = my - mx @ sR.T
        d = KD.query(X @ sR.T + tt)[0]; e = np.median(d); sc = np.sqrt(abs(np.linalg.det(sR)))
        if 0.8 < sc < 1.25 and (best is None or e < best[0]): best = (e, sR, d)  # a collapse onto a few ways is not a fit
    if best is None: res[tid] = {'osm': True, 'fit': 'no fit with scale 0.8-1.25'}; print(tid, res[tid]); continue
    e, sR, d = best; s = float(np.sqrt(abs(np.linalg.det(sR))))
    res[tid] = {'osm': True, 'ways': len(T['ways']), 'scale': round(s, 4), 'medianM': round(float(e), 1), 'p95M': round(float(np.percentile(d, 95)), 1), 'within15m': round(float((d < 15).mean()), 3), 'map': c['map']}
    print(tid, res[tid])
json.dump(res, open(sys.argv[2] if len(sys.argv) > 2 else '/tmp/fe-geometry-audit.json', 'w'), indent=1)
