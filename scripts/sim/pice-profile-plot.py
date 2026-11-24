"""pIce profile: tables and chart from the 14 joint fits (claude/status-2026-11-24-pice-profile.md).
Usage: python3 scripts/sim/pice-profile-plot.py <dir with */f1-joint.json> <out dir>
Losses are per season, lap-weighted means (as fitGroup), on the laps that no fit of that season dropped (same laps in every point)."""
import json, sys, glob, os
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt

src, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
fits = [json.load(open(f))['diag'] for f in sorted(glob.glob(f'{src}/*/f1-joint.json'))]
assert fits, 'no fits'
C = ['corner', 'straight', 'lap', 'sector']
key = lambda l: (l['season'], l['name'], l['pos'])
seasons = sorted({l['season'] for f in fits for l in f['laps']})
common = {s: set.intersection(*[{key(l) for l in f['laps'] if l['season'] == s and not l['dropped']} for f in fits]) for s in seasons}
rows = []
for f in fits:
    for s in seasons:
        L = [l for l in f['laps'] if key(l) in common[s]]; W = sum(l['w'] for l in L)
        m = {c: sum(l['w'] * l[c] for l in L) / W for c in C}
        poles = [l for l in L if l['pos'] == 1]
        bands = [sum(l['w'] * l['cornerBand'][k] for l in L) / W for k in range(4)] if 'cornerBand' in L[0] else None
        rows.append({'law': f['law'] + ('' if f.get('geom', 'production') == 'production' else ', geometry ' + f['geom']), 'geom': f.get('geom', 'production'), 'bands': bands, 'nBand': [sum(l['nBand'][k] for l in L) for k in range(4)] if bands else None, 'fix': f['fix'], 'season': s, 'pIceKW': f['cars'][str(s)]['pIce'] / 1e3, **m, 'total': sum(m.values()),
                     'trapBiasKph': sum(l['trapKph'] for l in poles) / len(poles), 'trapRmsKph': (sum(l['trapKph'] ** 2 for l in poles) / len(poles)) ** .5,
                     'trapLoss': sum(l['w'] * 0.5 * (l['trapKph'] / 3.6) ** 2 for l in L) / W,
                     'ftRmsKph': sum(l['ftRmsKph'] or 0 for l in poles) / len(poles), 'otherRmsKph': sum(l['otherRmsKph'] or 0 for l in poles) / len(poles),
                     'nLaps': len(L), 'car': f['cars'][str(s)],
                     'bounds': [b for b in f['bounds'] if b.get('season') == s] + ([b for b in f['bounds'] if 'track' in b] if s == seasons[0] else [])})
json.dump(rows, open(f'{out}/pice-profile.json', 'w'), indent=1)

laws = sorted({r['law'] for r in rows})
fig, ax = plt.subplots(len(laws), len(seasons), figsize=(5 * len(seasons), 4 * len(laws)), squeeze=False, sharex=True)
style = {'corner': ('C0', '-'), 'straight': ('C3', '-'), 'lap': ('C2', '-'), 'sector': ('C1', '-'), 'total': ('k', '-'), 'trapLoss': ('C4', ':')}
for i, law in enumerate(laws):
    for j, s in enumerate(seasons):
        R = sorted([r for r in rows if r['law'] == law and r['season'] == s], key=lambda r: r['fix']); a = ax[i][j]
        ref = next(r for r in R if abs(r['fix'] - 1) < 1e-9)
        for c, (col, ls) in style.items():
            a.plot([r['pIceKW'] for r in R], [r[c] - ref[c] for r in R], color=col, ls=ls, marker='o', ms=3,
                   label={'corner': '(a) limit corners', 'straight': '(b) straight ends', 'lap': '(c) lap time', 'sector': '(d) sectors',
                          'total': 'total (data only)', 'trapLoss': '(e) trap, not in fit loss'}[c])
        a.axvspan(516, 564, color='0.85', zorder=0); a.axvline(540, color='0.4', ls='--', lw=1)
        a.axhline(0, color='0.6', lw=0.6)
        a.set_title(f'{s}, ERS law {law}'); a.set_xlabel('pIce fixed (kW)'); a.set_ylabel('loss − loss at prior')
        a.set_xlim(min(r['pIceKW'] for r in rows) - 10, max(r['pIceKW'] for r in rows) + 10)
ax[0][0].legend(fontsize=7, loc='best')
fig.suptitle('F1 2023–25 joint fit: data-only loss vs fixed pIce (grey band: measured 540 ± 24 kW, law b)')
fig.tight_layout(); fig.savefig(f'{out}/pice-profile.png', dpi=130)
if rows[0]['bands']:
    fig, ax = plt.subplots(len(laws), len(seasons), figsize=(5 * len(seasons), 4 * len(laws)), squeeze=False, sharex=True)
    names = ['< 120 km/h', '120–180', '180–240', '> 240']
    for i, law in enumerate(laws):
        for j, s in enumerate(seasons):
            R = sorted([r for r in rows if r['law'] == law and r['season'] == s], key=lambda r: r['fix']); a = ax[i][j]
            ref = next(r for r in R if abs(r['fix'] - 1) < 1e-9)
            for k in range(4): a.plot([r['pIceKW'] for r in R], [r['bands'][k] - ref['bands'][k] for r in R], marker='o', ms=3, color=f'C{k}', label=f"{names[k]} ({ref['nBand'][k]} minima)")
            a.plot([r['pIceKW'] for r in R], [r['corner'] - ref['corner'] for r in R], color='k', marker='o', ms=3, label='(a) all corners')
            a.axvspan(516, 564, color='0.85', zorder=0); a.axvline(540, color='0.4', ls='--', lw=1); a.axhline(0, color='0.6', lw=0.6)
            a.set_title(f'{s}, ERS law {law}'); a.set_xlabel('pIce fixed (kW)'); a.set_ylabel('corner loss − at prior'); a.legend(fontsize=7)
    fig.suptitle('Limit-corner loss (a) by real apex speed vs fixed pIce (grey band: measured 540 ± 24 kW)')
    fig.tight_layout(); fig.savefig(f'{out}/pice-profile-bands.png', dpi=130)
print(json.dumps([{k: (round(v, 4) if isinstance(v, float) else v) for k, v in r.items() if k not in ('car', 'bounds')} for r in rows]))
