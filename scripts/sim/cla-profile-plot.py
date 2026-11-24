"""ClA profile: data-only loss per season vs fixed 2023-25 ClA (gate B settings). Usage: <dir with */f1-joint.json> <out dir>"""
import json, sys, glob, os
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
fits = sorted([json.load(open(f))['diag'] for f in glob.glob(f'{src}/*/f1-joint.json')], key=lambda d: d['claFix'])
C = ['corner', 'straight', 'lap', 'sector']
key = lambda l: (l['season'], l['name'], l['pos'])
seasons = [s for s in sorted({l['season'] for f in fits for l in f['laps']}) if s <= 2025]
common = {s: set.intersection(*[{key(l) for l in f['laps'] if l['season'] == s and not l['dropped']} for f in fits]) for s in seasons}
rows = []
for f in fits:
    for s in seasons:
        L = [l for l in f['laps'] if key(l) in common[s]]; W = sum(l['w'] for l in L)
        m = {c: sum(l['w'] * l[c] for l in L) / W for c in C}
        c = f['cars'][str(s)]
        rows.append({'clA': f['claFix'], 'season': s, **m, 'total': sum(m.values()), 'nLaps': len(L), 'muY': c['muY'], 'cdA': c['cdA'], 'pIceKW': c['pIce'] / 1e3,
                     'bounds': [(b['key'], b['bound']) for b in f['bounds'] if b.get('season') == s], 'trackBounds': len([b for b in f['bounds'] if 'track' in b]), 'score': f['score']})
fig, ax = plt.subplots(1, len(seasons), figsize=(5 * len(seasons), 4), squeeze=False)
for j, s in enumerate(seasons):
    R = [r for r in rows if r['season'] == s]; a = ax[0][j]; xs = [r['clA'] for r in R]
    for c, col in [('total', 'k'), ('corner', 'C0'), ('straight', 'C3'), ('lap', 'C2'), ('sector', 'C1')]:
        a.plot(xs, [r[c] for r in R], marker='o', ms=3, color=col, label=c)
    a.axvline(8.0, color='0.5', ls='--', lw=1); a.set_title(f'{s}: data-only loss vs fixed ClA'); a.set_xlabel('ClA fixed (m²), bound 8.0'); a.set_ylabel('loss')
    if j == 0: a.legend(fontsize=7)
fig.tight_layout(); fig.savefig(f'{out}/cla-profile.png', dpi=130)
json.dump(rows, open(f'{out}/cla-profile.json', 'w'), indent=1)
print(json.dumps([{k: v for k, v in r.items() if k != 'bounds'} for r in rows]))
