# Rwanda (provisional): hand-ordered waypoints read from the owner's diagram (image px in a 1/3-size copy), lap order clockwise
# as drawn. The diagram is an oblique view with unknown foreshortening k (true depth = drawn depth / k), so three variants are built.
# Scaled to the stated 5.302 km. Elevation: the diagram's labels, placed at the nearest waypoint, linear in between.
import json, sys, numpy as np
from scipy.interpolate import splprep, splev
W = [(775,252,None),(835,250,None),(900,246,None),(970,242,None),(1005,248,35),(1022,262,None),(1034,274,None),(1080,285,None),(1120,303,None),(1135,322,None),(1128,347,None),(1100,372,None),
     (1070,397,20),(1040,430,None),(1010,465,None),(985,490,None),(950,515,None),(900,535,None),(862,550,None),(848,565,None),(853,580,None),(872,593,None),(895,610,None),(903,628,None),(885,642,None),
     (855,647,None),(820,640,0),(782,620,None),(757,587,None),(748,547,None),(755,510,None),(780,470,None),(820,420,None),(858,372,None),(878,345,None),(881,322,35),(870,308,None),(842,303,None),
     (805,310,None),(770,315,None),(742,307,None),(724,290,None),(705,276,None),(678,275,None),(656,288,None),(649,310,None),(652,332,None),(680,352,None),(720,369,None),(740,381,None),(735,400,None),
     (715,415,None),(680,432,None),(620,460,None),(560,485,None),(500,497,12),(440,500,None),(380,490,None),(320,466,None),(272,443,None),(243,424,None),(205,430,None),(170,428,33),(152,410,None),
     (185,405,None),(225,398,None),(258,385,None),(300,350,None),(340,322,None),(400,300,50),(470,282,None),(540,270,None),(600,263,None),(660,259,None),(720,255,None)]
# coordinates are those of the 1344-px-wide copy (trace1.png); the list starts at the start/finish line (x≈775) and runs clockwise as drawn
def build(k, L=5302.0, ds=5.0):
    x = np.array([w[0] for w in W], float); y = -np.array([w[1] for w in W], float) / k
    tck, u = splprep([np.r_[x, x[0]], np.r_[y, y[0]]], s=len(W) * 6.0, per=True)
    uu = np.linspace(0, 1, 20001); px, py = splev(uu, tck); seg = np.hypot(np.diff(px), np.diff(py)); s = np.r_[0, np.cumsum(seg)]; sc = L / s[-1]
    n = int(round(L / ds)); st = np.arange(n) * (s[-1] / n); gx = np.interp(st, s, px) * sc; gy = np.interp(st, s, py) * sc
    h = np.arctan2(np.roll(gy, -1) - np.roll(gy, 1), np.roll(gx, -1) - np.roll(gx, 1)); d = np.roll(h, -1) - np.roll(h, 1); d = (d + np.pi) % (2 * np.pi) - np.pi; kap = d / (2 * L / n)
    w = 3; kap = np.convolve(np.r_[kap[-w:], kap, kap[:w]], np.ones(2 * w + 1) / (2 * w + 1), 'valid')
    # elevation labels at their waypoints → arc position → linear, cyclic
    wu = u[:-1] if len(u) == len(W) + 1 else u; ws = np.interp(wu, uu, s) * sc
    lab = [(ws[i], W[i][2]) for i in range(len(W)) if W[i][2] is not None]; ls = np.array([a for a, _ in lab]); lz = np.array([b for _, b in lab], float)
    z = np.interp(np.arange(n) * L / n, np.r_[ls[-1] - L, ls, ls[0] + L], np.r_[lz[-1], lz, lz[0]])
    zk = 31; z = np.convolve(np.r_[z[-zk:], z, z[:zk]], np.ones(2 * zk + 1) / (2 * zk + 1), 'valid'); grade = np.arctan((np.roll(z, -1) - np.roll(z, 1)) / (2 * L / n))
    turn = float(np.sum(kap) * L / n * 180 / np.pi)
    # corners: runs where |curvature| > 1/400 m
    c = np.abs(kap) > 1 / 400; corners = int(np.sum(c & ~np.roll(c, 1)))
    return dict(k=k, ds=L / n, length=round(L), kappa=[int(round(v * 1e5)) for v in kap], grade=[int(round(v * 1e4)) for v in grade], map=dict(x=[int(round(v)) for v in gx[::max(1, n // 360)]], y=[int(round(v)) for v in gy[::max(1, n // 360)]]),
                totalTurnDeg=round(turn), cornersOver400mRadius=corners, minRadiusM=round(float(1 / np.max(np.abs(kap)))), elevRangeM=round(float(z.max() - z.min()), 1), maxGradePct=round(float(np.tan(np.max(np.abs(grade))) * 100), 1)), gx, gy
if __name__ == '__main__':
    out = {}; import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
    fig, ax = plt.subplots(1, 3, figsize=(18, 6))
    for a, k in zip(ax, [0.5, 0.7, 1.0]):
        t, gx, gy = build(k); out[f'k{k}'] = t; a.plot(gx, gy, 'b-'); a.plot(gx[0], gy[0], 'ro'); a.set_aspect('equal'); a.set_title(f'k={k}: turn {t["totalTurnDeg"]}°, corners {t["cornersOver400mRadius"]}, min R {t["minRadiusM"]} m')
        print(k, {q: t[q] for q in ['length', 'totalTurnDeg', 'cornersOver400mRadius', 'minRadiusM', 'elevRangeM', 'maxGradePct']})
    fig.savefig('rwanda_variants.png', dpi=70); json.dump(out, open('rwanda_variants.json', 'w'))
