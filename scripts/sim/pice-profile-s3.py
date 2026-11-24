"""pIce profile section 3: (1) apex sampling bias vs model-measured apex gap per band (production fit, law b, pIce at prior);
(2) profile with the corner term off (LAPSIM_CORNER_W=0): fitted loss and CdA vs pIce. Usage: <dir with */f1-joint.json> <out dir>"""
import json, sys, glob, os
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
fits = [json.load(open(f))['diag'] for f in sorted(glob.glob(f'{src}/*/f1-joint.json'))]
NAMES = ['< 120', '120–180', '180–240', '> 240']
res = {}

# (1) sampling bias, from the full-weight fit (cornerW 1)
base = next(f for f in fits if f['cornerW'] == 1)
seasons = sorted({l['season'] for l in base['laps']})
samp = []
for s in seasons + ['all']:
    L = [l for l in base['laps'] if s == 'all' or l['season'] == s]
    n = [sum(l['nBand'][k] for l in L) for k in range(4)]
    bias = [sum(l['sampBiasSum'][k] for l in L) / max(1, n[k]) * 3.6 for k in range(4)]
    gap = [sum(l['apexGapSum'][k] for l in L) / max(1, n[k]) * 3.6 for k in range(4)]
    samp.append({'season': s, 'n': n, 'biasKph': bias, 'gapKph': gap, 'dtRealMedian': sorted(l['dtReal'] for l in L)[len(L) // 2]})
res['sampling'] = samp
fig, ax = plt.subplots(1, len(samp), figsize=(4.2 * len(samp), 3.8), sharey=True)
for a, r in zip(ax, samp):
    x = range(4)
    a.bar([i - 0.2 for i in x], r['biasKph'], 0.4, label='sampling bias: sampled − true model minimum')
    a.bar([i + 0.2 for i in x], [-g for g in r['gapKph']], 0.4, label='measured − model minimum (apex gap)')
    a.axhline(0, color='0.5', lw=0.6); a.set_xticks(list(x)); a.set_xticklabels([f'{NAMES[k]}\n(n={r["n"][k]})' for k in range(4)], fontsize=8)
    a.set_title(f'{r["season"]} (real Δt ≈ {r["dtRealMedian"]:.2f} s)'); a.set_xlabel('real apex speed (km/h)')
ax[0].set_ylabel('km/h'); ax[0].legend(fontsize=7)
fig.suptitle('Apex speeds: bias from sampling the model trace at the real rate (100 random phases) vs the model–measured gap (law b, pIce 540 kW)')
fig.tight_layout(); fig.savefig(f'{out}/pice-s3-sampling.png', dpi=130)

# (2) corner term off: fitted loss (lap + sectors + straight ends) and CdA vs pIce
P = sorted([f for f in fits if f['cornerW'] == 0], key=lambda f: f['fix'])
prof = []
for f in P:
    for s in seasons:
        L = [l for l in f['laps'] if l['season'] == s and not l['dropped']]; W = sum(l['w'] for l in L)
        m = {c: sum(l['w'] * l[c] for l in L) / W for c in ['straight', 'lap', 'sector', 'cornerRaw']}
        poles = [l for l in L if l['pos'] == 1]
        prof.append({'fix': f['fix'], 'season': s, 'pIceKW': f['cars'][str(s)]['pIce'] / 1e3, **m, 'fitted': m['straight'] + m['lap'] + m['sector'],
                     'trapBiasKph': sum(l['trapKph'] for l in poles) / len(poles), 'cdA': f['cars'][str(s)]['cdA'], 'clA': f['cars'][str(s)]['clA'],
                     'muY': f['cars'][str(s)]['muY'], 'nLaps': len(L), 'bounds': [b for b in f['bounds'] if b.get('season') == s]})
res['cornerOff'] = prof
fig, ax = plt.subplots(1, len(seasons), figsize=(5 * len(seasons), 4), squeeze=False)
for j, s in enumerate(seasons):
    R = [r for r in prof if r['season'] == s]; a = ax[0][j]; xs = [r['pIceKW'] for r in R]
    for c, col, lab in [('fitted', 'k', 'fitted loss (b)+(c)+(d)'), ('straight', 'C3', '(b) straight ends'), ('lap', 'C2', '(c) lap time'), ('sector', 'C1', '(d) sectors')]:
        a.plot(xs, [r[c] for r in R], color=col, marker='o', ms=3, label=lab)
    a.axvspan(516, 564, color='0.85', zorder=0); a.axvline(540, color='0.4', ls='--', lw=1)
    a.set_xlabel('pIce fixed (kW)'); a.set_ylabel('loss'); a.set_title(f'{s}, law b, corner term off')
    b = a.twinx(); b.plot(xs, [r['cdA'] for r in R], color='C0', ls=':', marker='s', ms=3, label='CdA (right)'); b.set_ylabel('CdA (m²)', color='C0')
    if j == 0: a.legend(fontsize=7, loc='upper left'); b.legend(fontsize=7, loc='lower right')
fig.suptitle('Profile without the corner term (grey band: measured 540 ± 24 kW)')
fig.tight_layout(); fig.savefig(f'{out}/pice-s3-cornerless.png', dpi=130)
json.dump(res, open(f'{out}/pice-s3.json', 'w'), indent=1)
print(json.dumps(res)[:4000])
