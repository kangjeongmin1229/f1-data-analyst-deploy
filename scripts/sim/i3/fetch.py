"""I3 (claude/gate-i3-geometry-prereg-2026-11-23.md), step 1: OpenStreetMap raceway ways and the best open elevation model for the four
test tracks. Runs in GitHub Actions (the dev shell cannot reach these hosts). Writes:
  scripts/sim/data/i3/osm-<id>.json   raceway ways in UTM metres (derived from OSM, ODbL; committed with attribution)
  .cache/i3/dem-<id>.tif + .json      elevation crop and its source record (raw third-party data: not committed)
Usage policy: one Overpass query per track with a pause and a user agent; DEM tiles fetched once per run.
"""
import json, math, os, sys, time, io
import numpy as np, requests
from pyproj import Transformer

TRACKS = {  # seed, UTM EPSG, elevation sources in order of preference
  'jeddah': {'seed': [21.6319, 39.1044], 'epsg': 32637, 'radius': 3200, 'dem': ['glo30']},
  'shanghai': {'seed': [31.3389, 121.2197], 'epsg': 32651, 'radius': 2200, 'dem': ['glo30']},
  'imola': {'seed': [44.338, 11.708], 'epsg': 32632, 'radius': 2200, 'dem': ['rer5', 'glo30']},
  'suzuka': {'seed': [34.8431, 136.541], 'epsg': 32653, 'radius': 2200, 'dem': ['gsi', 'glo30']},
}
UA = {'user-agent': 'kongboda-lapsim I3 geometry (github.com/MisterKinn/f1-data-analyst)'}
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']
OUT, CACHE = 'scripts/sim/data/i3', '.cache/i3'
os.makedirs(OUT, exist_ok=True); os.makedirs(CACHE, exist_ok=True)

def overpass(q):
  for n in range(6):
    try:
      r = requests.post(OVERPASS[n % 3], data={'data': q}, headers=UA, timeout=180)
      if r.ok: return r.json(), OVERPASS[n % 3]
      print('overpass', r.status_code, file=sys.stderr)
    except Exception as e: print('overpass', e, file=sys.stderr)
    time.sleep(10 * (n + 1))
  return None, None

def osm(tid, t):
  la, lo = t['seed']; tr = Transformer.from_crs(4326, t['epsg'], always_xy=True)
  d, api = overpass(f'[out:json][timeout:120];way["highway"="raceway"](around:{t["radius"]},{la},{lo});out geom tags;')
  src = f'OpenStreetMap via Overpass ({api}), fetched {time.strftime("%Y-%m-%d")}'
  if d is None:  # same source, earlier fetch (committed), without tags
    w = json.load(open('scripts/sim/data/tracks/osm-raceways-all.json'))['tracks'][tid]['ways']
    d = {'elements': [{'type': 'way', 'id': None, 'tags': {}, 'geometry': [{'lat': p[0], 'lon': p[1]} for p in x['g']]} for x in w]}
    src = 'OpenStreetMap, committed scripts/sim/data/tracks/osm-raceways-all.json (Actions run 43863550462), no tags'
  ways = []
  for e in d['elements']:
    if e.get('type') != 'way' or not e.get('geometry'): continue
    xs, ys = tr.transform([p['lon'] for p in e['geometry']], [p['lat'] for p in e['geometry']])
    tg = e.get('tags', {})
    ways.append({'id': e.get('id'), 'tags': {k: tg[k] for k in ('name', 'raceway', 'service', 'area', 'width', 'surface', 'sport') if k in tg},
                 'xy': [[round(x, 2), round(y, 2)] for x, y in zip(xs, ys)]})
  json.dump({'source': src + '. © OpenStreetMap contributors, ODbL 1.0', 'epsg': t['epsg'], 'seed': t['seed'], 'ways': ways}, open(f'{OUT}/osm-{tid}.json', 'w'))
  print(tid, len(ways), 'ways', src)
  return ways

def bbox(tid, t, margin=250):
  w = json.load(open(f'{OUT}/osm-{tid}.json'))['ways']
  P = np.array([p for x in w for p in x['xy']]); tr = Transformer.from_crs(t['epsg'], 4326, always_xy=True)
  x0, y0 = P.min(0) - margin; x1, y1 = P.max(0) + margin
  lons, lats = tr.transform([x0, x1, x0, x1], [y0, y0, y1, y1])
  return min(lons), min(lats), max(lons), max(lats)

def save(tid, arr, transform, crs, meta):
  import rasterio
  with rasterio.open(f'{CACHE}/dem-{tid}.tif', 'w', driver='GTiff', height=arr.shape[0], width=arr.shape[1], count=1, dtype='float32',
                     crs=crs, transform=transform, nodata=np.nan) as o: o.write(arr.astype('float32'), 1)
  v = arr[np.isfinite(arr)]
  meta.update({'validShare': round(float(np.isfinite(arr).mean()), 4), 'zMin': round(float(v.min()), 2) if v.size else None, 'zMax': round(float(v.max()), 2) if v.size else None})
  json.dump(meta, open(f'{CACHE}/dem-{tid}.json', 'w'), indent=1); print(tid, meta)

def glo30(tid, t):
  import rasterio
  from rasterio.windows import from_bounds
  lon0, lat0, lon1, lat1 = bbox(tid, t)
  name = lambda la, lo: f'Copernicus_DSM_COG_10_{"N" if la >= 0 else "S"}{abs(la):02d}_00_{"E" if lo >= 0 else "W"}{abs(lo):03d}_00_DEM'
  la, lo = math.floor(lat0), math.floor(lon0)
  if math.floor(lat1) != la or math.floor(lon1) != lo: raise RuntimeError('bbox crosses a 1° tile: not handled')
  url = f'https://copernicus-dem-30m.s3.amazonaws.com/{name(la, lo)}/{name(la, lo)}.tif'
  with rasterio.open(url) as s:
    win = from_bounds(lon0, lat0, lon1, lat1, s.transform).round_offsets().round_lengths()
    a = s.read(1, window=win).astype('float64'); a[a == s.nodata] = np.nan
    save(tid, a, s.window_transform(win), s.crs, {'source': 'Copernicus DEM GLO-30 Public (DSM, 1 arc-second)', 'gridM': 30, 'kind': 'surface model (DSM: includes buildings, stands, trees)',
      'verticalDatum': 'EGM2008', 'url': url, 'licence': 'Copernicus DEM licence (free, attribution): © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved'})

def gsi(tid, t, z=15):
  from PIL import Image
  from rasterio.transform import from_origin
  lon0, lat0, lon1, lat1 = bbox(tid, t)
  tx = lambda lon: (lon + 180) / 360 * 2 ** z
  ty = lambda lat: (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * 2 ** z
  X0, X1, Y0, Y1 = int(tx(lon0)), int(tx(lon1)), int(ty(lat1)), int(ty(lat0))
  a = np.full(((Y1 - Y0 + 1) * 256, (X1 - X0 + 1) * 256), np.nan); used = {}
  for layer in ['dem5a_png', 'dem5b_png', 'dem5c_png']:  # laser first, then photogrammetry; per-pixel fill
    for X in range(X0, X1 + 1):
      for Y in range(Y0, Y1 + 1):
        r = requests.get(f'https://cyberjapandata.gsi.go.jp/xyz/{layer}/{z}/{X}/{Y}.png', headers=UA, timeout=60); time.sleep(0.2)
        if r.status_code != 200: continue
        im = np.asarray(Image.open(io.BytesIO(r.content)).convert('RGB')).astype('int64')
        v = im[..., 0] * 65536 + im[..., 1] * 256 + im[..., 2]
        h = np.where(v < 2 ** 23, v * 0.01, np.where(v > 2 ** 23, (v - 2 ** 24) * 0.01, np.nan))
        blk = a[(Y - Y0) * 256:(Y - Y0 + 1) * 256, (X - X0) * 256:(X - X0 + 1) * 256]; fill = np.isnan(blk) & np.isfinite(h)
        blk[fill] = h[fill]; used[layer] = used.get(layer, 0) + int(fill.sum())
  R = 6378137.0; res = 2 * math.pi * R / 2 ** z / 256
  tf = from_origin(-math.pi * R + X0 * 256 * res, math.pi * R - Y0 * 256 * res, res, res)
  if not used: raise RuntimeError('no GSI tile')
  save(tid, a, tf, 'EPSG:3857', {'source': 'GSI elevation tiles (Fundamental Geospatial Data DEM): ' + ', '.join(f'{k} {v} px' for k, v in used.items()),
    'gridM': 5, 'kind': 'terrain model (DEM5A: airborne laser ground points; DEM5B/5C: photogrammetry)', 'tilePixelM': round(res * math.cos(math.radians((lat0 + lat1) / 2)), 2),
    'url': f'https://cyberjapandata.gsi.go.jp/xyz/dem5a_png/{z}/{{x}}/{{y}}.png', 'licence': 'GSI Website Terms of Use (compatible with CC BY 4.0); source: 国土地理院 標高タイル (基盤地図情報数値標高モデル), edited'})

def rer5(tid, t):
  import rasterio, re
  base = 'https://servizigis.regione.emilia-romagna.it/wcs/dtm10k_ed2014'
  cap = requests.get(base, params={'service': 'WCS', 'request': 'GetCapabilities', 'version': '1.0.0'}, headers=UA, timeout=90).text
  names = re.findall(r'<(?:wcs:)?name>([^<]+)</(?:wcs:)?name>', cap) or re.findall(r'<Name>([^<]+)</Name>', cap)
  open(f'{CACHE}/rer-capabilities.xml', 'w').write(cap[:20000])
  P = np.array([p for x in json.load(open(f'{OUT}/osm-{tid}.json'))['ways'] for p in x['xy']]); (x0, y0), (x1, y1) = P.min(0) - 250, P.max(0) + 250
  last = None
  for cov in names[:6]:
    for fmt in ['GeoTIFF', 'GTiff', 'image/tiff']:
      r = requests.get(base, params={'service': 'WCS', 'request': 'GetCoverage', 'version': '1.0.0', 'coverage': cov, 'crs': 'EPSG:32632', 'bbox': f'{x0},{y0},{x1},{y1}',
                       'resx': 5, 'resy': 5, 'format': fmt}, headers=UA, timeout=180)
      last = f'{cov} {fmt} {r.status_code} {r.headers.get("content-type")}'
      if r.ok and r.content[:2] in (b'II', b'MM'):
        with rasterio.MemoryFile(r.content) as m, m.open() as s:
          a = s.read(1).astype('float64')
          if s.nodata is not None: a[a == s.nodata] = np.nan
          a[a < -100] = np.nan
          save(tid, a, s.transform, s.crs, {'source': f'Regione Emilia-Romagna DTM 5x5 ed. 2014 (WCS coverage {cov})', 'gridM': 5, 'kind': 'terrain model',
            'url': base, 'licence': 'Regione Emilia-Romagna open data, CC BY 4.0 (geoportale.regione.emilia-romagna.it)'})
          return
  raise RuntimeError(f'RER WCS gave no GeoTIFF (coverages {names[:6]}, last {last})')

if __name__ == '__main__':
  only = sys.argv[1:] or list(TRACKS)
  for tid in only:
    t = TRACKS[tid]
    if os.environ.get('I3_SKIP_OSM') != '1': osm(tid, t); time.sleep(5)
    for src in t['dem']:
      try: {'glo30': glo30, 'gsi': gsi, 'rer5': rer5}[src](tid, t); break
      except Exception as e: print(tid, src, 'failed:', e, file=sys.stderr)
