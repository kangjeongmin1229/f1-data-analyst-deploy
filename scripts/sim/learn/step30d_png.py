# Step 30d PNG: the 3 solver-check corners (white lines, kerb edge, current path, solver lines, formula arc; official turn numbers).
# Usage: python3 -I scripts/sim/learn/step30d_png.py <work dir> <out dir>   (needs check-geo.npy from step30d_kerbs.py)
import sys, json, csv
import numpy as np
import matplotlib; matplotlib.use('Agg')
import matplotlib.pyplot as plt

W, OUT = sys.argv[1:3]
CH = np.load(f'{W}/check-geo.npy', allow_pickle=True).item(); E = json.load(open(f'{W}/export-corr.json'))
rows = {(r['track'], int(r['season']), int(r['corner_id'])): r for r in csv.DictReader(open(f'{OUT}/step30d-corners.csv'))}
fig, axs = plt.subplots(1, 3, figsize=(19, 9.5))
for ax, ((tid, season, cid), (out, g)) in zip(axs, CH.items()):
    r = rows[(tid, int(season), int(cid))]; C, N, up, lo, kp, km, rel = (g[k] for k in ('C', 'N', 'up', 'lo', 'kp', 'km', 'rel'))
    keep = np.abs(rel) <= 120; ia_, ib_ = np.where(keep)[0][[0, -1]]; ch = C[ib_] - C[ia_]; ang = -np.arctan2(ch[1], ch[0])
    Rm = np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]]); o = C[np.argmin(np.abs(rel))].copy()
    rot = lambda P: (P - o) @ Rm.T
    C, N = rot(C), N @ Rm.T; g = dict(g, paths={k: rot(v) for k, v in g['paths'].items()})
    C, N, up, lo, kp, km, rel = C[keep], N[keep], up[keep], lo[keep], kp[keep], km[keep], rel[keep]; g['paths'] = {k: v[keep] for k, v in g['paths'].items()}
    i0 = int(np.argmin(np.abs(rel))); a, b = C[i0 - 2] - C[i0 - 4], C[i0] - C[i0 - 2]; left = a[0] * b[1] - a[1] * b[0] > 0
    ax.plot(*(C + up[:, None] * N).T, color='0.35', lw=1.2, label='white lines (TUM edges)'); ax.plot(*(C + lo[:, None] * N).T, color='0.35', lw=1.2)
    ax.plot(*(C + (up + kp)[:, None] * N).T, color='#d62728', lw=1, ls='--', label='kerb edge (edge + iRacing kerb use)')
    ax.plot(*(C + (lo - km)[:, None] * N).T, color='#d62728', lw=1, ls='--')
    ax.plot(*C.T, color='#ff7f0e', lw=2, label=f"current path (kernel), R = {float(r['R']):.0f} m")
    ax.plot(*g['paths']['base'].T, color='#1f77b4', lw=1.5, label=f"solver, white lines: R = {out['base']:.0f} m")
    ax.plot(*g['paths']['kerb'].T, color='#2ca02c', lw=1.5, label=f"solver, with kerbs: R = {out['kerb']:.0f} m")
    # formula arc: radius R + dR (kerb case), touching the inside kerb edge at the apex, spanning theta
    Rn = float(r['R']) + float(r['dR_kerb']); th = np.radians(float(r['theta_deg'])); s = 1 if left else -1
    edge_in = up[i0] + kp[i0] if left else lo[i0] - km[i0]; apex = C[i0] + edge_in * N[i0]; cen = apex + s * Rn * N[i0]
    ang0 = np.arctan2(*(apex - cen)[::-1]); t = ang0 + np.linspace(-th / 2, th / 2, 100)
    ax.plot(cen[0] + Rn * np.cos(t), cen[1] + Rn * np.sin(t), color='purple', lw=1.2, ls=':', label=f"formula arc R + ΔR = {Rn:.0f} m")
    T = E['tracks'][tid + str(season)]; s0 = int(r['ia']) * T['ds']; L = len(T['kappa']) * T['ds']
    for q in T['corners']:
        d = (q['s'] - s0 + L / 2) % L - L / 2
        if abs(d) <= rel.max():
            j = int(np.argmin(np.abs(rel - d))); p = C[j] - (12 if left else -12) * N[j]
            ax.text(*p, f"T{q['number']}{q.get('letter') or ''}", ha='center', va='center', fontsize=10, weight='bold')
    ax.set_aspect('equal'); ax.set_xticks([]); ax.set_yticks([])
    ax.set_title(f"{tid} {season} T{r['turn']}: θ {float(r['theta_deg']):.0f}°, measured {float(r['meas']):.0f} / model {float(r['model']):.0f} km/h\n"
                 f"kerbs in/out {float(r['kerb_in']):.1f} / {float(r['kerb_out']):.2f} m; ΔR formula {float(r['dR_kerb']):.1f} m vs solver {out['kerb'] - out['base']:.1f} m",
                 fontsize=9.5)
    ax.legend(fontsize=7.5, loc='upper center', bbox_to_anchor=(0.5, -0.02), ncol=2, frameon=False)
fig.suptitle('Step 30d: kerb use and apex radius — 3 check corners (hairpin, 90°, shallow), ±120 m around the apex. Report only, not a pipeline run.', fontsize=12)
fig.tight_layout(rect=(0, 0.07, 1, 0.95)); fig.savefig(f'{OUT}/step30d-check-corners.png', dpi=130)
print('ok')
