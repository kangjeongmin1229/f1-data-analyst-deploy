"""I3 step 3: bilinear elevation at the line stations written by build.mjs (.cache/i3/stations-<id>.json, UTM metres).
Writes .cache/i3/z-<id>.json: {line: [...], left: [...], right: [...]} in metres (null where the model has no value)."""
import json, sys, numpy as np, rasterio
from pyproj import Transformer

def bilinear(src, a, xs, ys):
  inv = ~src.transform; out = []
  for x, y in zip(xs, ys):
    c, r = inv * (x, y); c -= 0.5; r -= 0.5; i, j = int(np.floor(r)), int(np.floor(c)); u, v = r - i, c - j
    if i < 0 or j < 0 or i + 1 >= a.shape[0] or j + 1 >= a.shape[1]: out.append(None); continue
    q = a[i, j] * (1 - u) * (1 - v) + a[i, j + 1] * (1 - u) * v + a[i + 1, j] * u * (1 - v) + a[i + 1, j + 1] * u * v
    out.append(None if not np.isfinite(q) else round(float(q), 3))
  return out

for tid in sys.argv[1:]:
  st = json.load(open(f'.cache/i3/stations-{tid}.json'))
  with rasterio.open(f'.cache/i3/dem-{tid}.tif') as s:
    a = s.read(1).astype('float64'); tr = Transformer.from_crs(st['epsg'], s.crs, always_xy=True)
    res = {}
    for k in ('line', 'left', 'right'):
      xs, ys = tr.transform([p[0] for p in st[k]], [p[1] for p in st[k]]); res[k] = bilinear(s, a, xs, ys)
  json.dump(res, open(f'.cache/i3/z-{tid}.json', 'w')); print(tid, {k: sum(v is None for v in res[k]) for k in res}, 'missing')
