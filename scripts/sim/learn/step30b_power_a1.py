# Step 30b amendment 1 power check (prereg c500ba31…): selected set S = |ln(R_TUMline/R_kernel)| >= 0.10 on the 14 TUM tracks.
# Projection only (a-priori sqrt(R) law). Usage: python3 -I scripts/sim/learn/step30b_power_a1.py <step30b-audit-corners.csv>
import csv, math, sys, numpy as np
R = list(csv.DictReader(open(sys.argv[1])))
f = lambda r, k: float(r[k]) if r[k] not in ('', 'nan') else float('nan')
TR = ['austin', 'hungaroring', 'interlagos', 'mexico-city', 'montreal', 'monza', 'sakhir', 'shanghai', 'silverstone', 'spa-francorchamps',
      'spielberg', 'suzuka', 'zandvoort', 'kuala-lumpur']
S, U = {}, {}
for r in R:
    if r['track'] not in TR: continue
    x = math.log(f(r, 'R_tr') / f(r, 'R_kernel')) if not math.isnan(f(r, 'R_tr')) else float('nan')
    e0 = f(r, 'model') - f(r, 'meas')
    (S if abs(x) >= 0.10 else U).setdefault(r['track'], []).append((e0, f(r, 'model') * math.exp(0.5 * x) - f(r, 'meas') if abs(x) >= 0.10 else e0, r))
rms = lambda v, i: math.sqrt(np.mean([e[i] ** 2 for e in v]))
def boot(by, seed=1, B=10000):
    ks = sorted(by); rng = np.random.default_rng(seed); out = []
    for _ in range(B):
        v = [e for i in rng.integers(0, len(ks), len(ks)) for e in by[ks[i]]]; out.append(rms(v, 0) - rms(v, 1))
    return np.array(out)
allS = [e for v in S.values() for e in v]
g = rms(allS, 0) - rms(allS, 1); bs = boot(S); se = bs.std(); mde = 1.84 * se
print(f"S: {len(allS)} corners on {len(S)} tracks ({sum(e[2]['season'] in ('2023','2024') for e in allS)} from 2023-24); per track {dict((k, len(v)) for k, v in sorted(S.items()))}")
print(f"   sign: R_TUMline > R_kernel in {sum(math.log(f(e[2],'R_tr')/f(e[2],'R_kernel'))>0 for e in allS)}, < in {sum(math.log(f(e[2],'R_tr')/f(e[2],'R_kernel'))<0 for e in allS)}")
print(f"   base RMS {rms(allS,0):.1f} km/h, projected cand {rms(allS,1):.1f}; projected gain {g:.1f}, cluster SE {se:.1f}, MDE {mde:.1f}, 90% one-sided LB {np.percentile(bs,10):.1f}")
print(f"   judgeable (MDE <= gain and MDE <= 2.0): {mde <= g and mde <= 2.0}; n_tracks needed for MDE 2.0: {14 * (mde / 2.0) ** 2:.0f}")
for k in sorted(S):
    v = S[k]; print(f"   {k:18s} n {len(v):2d} base {rms(v,0):5.1f} cand {rms(v,1):5.1f}")
ws = {k: v for k, v in S.items() if k != 'shanghai'}; aw = [e for v in ws.values() for e in v]; bw = boot(ws)
print(f"   without shanghai: gain {rms(aw,0)-rms(aw,1):.1f}, MDE {1.84*bw.std():.1f}")
allU = [e for v in U.values() for e in v]; print(f"U: {len(allU)} corners (unchanged in the projection; guard 1 cannot be projected)")
