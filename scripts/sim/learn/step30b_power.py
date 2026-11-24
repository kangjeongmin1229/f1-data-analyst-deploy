# Step 30b power check (pre-reg 0ae7db0a…, central decision 2): projected apex-speed gain of the TUM-line kappa fix on the baseline rows.
# Projection only: candidate = model × (R_TUMline/R_kernel)^0.5 (a-priori √R law; nothing fitted). Rows without a TUM match keep base.
# Usage: python3 -I scripts/sim/learn/step30b_power.py <step30b-audit-corners.csv>
import csv, math, sys, numpy as np
R = list(csv.DictReader(open(sys.argv[1])))
f = lambda r, k: float(r[k]) if r[k] not in ('', 'nan') else float('nan')
TR = ['austin', 'hungaroring', 'interlagos', 'mexico-city', 'montreal', 'monza', 'sakhir', 'shanghai', 'silverstone', 'spa-francorchamps',
      'spielberg', 'suzuka', 'zandvoort', 'kuala-lumpur']
def run(rows, label):
    by = {}
    for r in rows:
        if r['track'] in TR and 120 <= f(r, 'meas') < 240:
            x = math.log(f(r, 'R_tr') / f(r, 'R_kernel')) if not math.isnan(f(r, 'R_tr')) else 0.0
            by.setdefault(r['track'], []).append((f(r, 'model') - f(r, 'meas'), f(r, 'model') * math.exp(0.5 * x) - f(r, 'meas')))
    ks = sorted(by); rms = lambda v, i: math.sqrt(np.mean([e[i] ** 2 for e in v]))
    d = np.array([rms(by[k], 0) - rms(by[k], 1) for k in ks])
    allv = [e for k in ks for e in by[k]]; pooled = rms(allv, 0) - rms(allv, 1)
    rng = np.random.default_rng(1); bs = []
    for _ in range(10000):
        pick = [by[ks[i]] for i in rng.integers(0, len(ks), len(ks))]; v = [e for p in pick for e in p]; bs.append(rms(v, 0) - rms(v, 1))
    se = float(np.std(bs)); n = len(ks)
    print(f"{label}: corners {len(allv)}, tracks {n}; pooled RMS base {rms(allv,0):.1f} cand {rms(allv,1):.1f} km/h -> projected gain {pooled:.1f}, cluster SE {se:.1f}, MDE {1.84*se:.1f}"
          f" | track RMS gains mean {d.mean():.1f} SD {d.std(ddof=1):.1f} MDE {1.84*d.std(ddof=1)/math.sqrt(n):.1f} | without shanghai pooled gain "
          f"{(lambda v: rms(v,0)-rms(v,1))([e for k in ks if k!='shanghai' for e in by[k]]):.1f}")
run(R, 'all seasons')
for yrs in (('2025', '2026'), ('2023', '2024')): run([r for r in R if r['season'] in yrs], '+'.join(yrs))
