# Data-limit protocol v1 (DRAFT), report-only: held-out error, floor, MDE and oracle ceilings per scoreboard row.
# Oracle ceiling = RMS of the residual left after the best in-sample correction the data allow at a given level
# (one offset per group, fitted on all rows of the group, dof-corrected). If it is still > 1.2 x floor, that level
# cannot reach the floor even in sample. Never reads 2022. Measured inputs are read-only.
#   python3 -I oracle.py lap     <pipeline-report.json>            # F1 + WEC held-out rows (shippedPct)
#   python3 -I oracle.py drs     <baseline-pooled.csv>             # F1 DRS cases
#   python3 -I oracle.py corner  <a2-traces.json> <top10.json> <normalisation.json>   # F1 apex 120-240 + straight ends
#   python3 -I oracle.py generic <rows.csv> <floor> <unit>         # columns: row,track,group,season,err
import json, sys, csv, math, random, statistics as st

B, SEED, Z = 2000, 7, 2.486  # track bootstrap draws, seed, MDE factor (one-sided alpha 0.05, power 0.8)

def rms(x): return math.sqrt(sum(v * v for v in x) / len(x)) if x else float('nan')

def oracle(rows, key):
    """Residual after one offset per group key(r); dof-corrected so a group of one row cannot score 0 for free."""
    g = {}
    for r in rows: g.setdefault(key(r), []).append(r['err'])
    mean = {k: sum(v) / len(v) for k, v in g.items()}
    res = [r['err'] - mean[key(r)] for r in rows]
    dof = len(rows) - len(g)
    return [x * math.sqrt(len(rows) / dof) for x in res] if dof > 0 else None

def boot(rows, vals, tracks):
    """90 % CI of RMS(vals) by resampling tracks (unit = track)."""
    by = {}
    for r, v in zip(rows, vals): by.setdefault(r['track'], []).append(v)
    rng, out = random.Random(SEED), []
    for _ in range(B):
        s = [v for t in rng.choices(tracks, k=len(tracks)) for v in by.get(t, [])]
        out.append(rms(s))
    out.sort(); return [round(out[int(.05 * B)], 3), round(out[int(.95 * B) - 1], 3)]

def assess(name, rows, floor, unit, levels):
    tracks = sorted({r['track'] for r in rows})
    held = rms([r['err'] for r in rows])
    per_track = [rms([r['err'] for r in rows if r['track'] == t]) for t in tracks]
    mde = Z * st.stdev(per_track) / math.sqrt(len(tracks)) if len(tracks) > 2 else float('nan')
    gap = held - 1.2 * floor
    out = {'row': name, 'unit': unit, 'n_rows': len(rows), 'n_tracks': len(tracks), 'held_rms': round(held, 3),
           'held_ci90': boot(rows, [r['err'] for r in rows], tracks), 'floor': floor, 'ratio': round(held / floor, 2),
           'gap_to_1_2_floor': round(gap, 3), 'mde': round(mde, 3), 'b_mde_gt_gap': mde > gap, 'oracles': {}}
    for lvl, key in levels.items():
        res = oracle(rows, key)
        if res is None: out['oracles'][lvl] = 'not identifiable (one row per group)'; continue
        o = rms(res)
        out['oracles'][lvl] = {'rms': round(o, 3), 'ci90': boot(rows, res, tracks), 'ratio': round(o / floor, 2),
                               'c_above_1_2_floor': o > 1.2 * floor}
    ok = [v for v in out['oracles'].values() if isinstance(v, dict)]
    out['c_all_levels_above'] = bool(ok) and all(v['c_above_1_2_floor'] for v in ok)
    return out

def lap(path):
    d = json.load(open(path)); sig = {'f1': 0.365, 'wec-lmh': 0.307, 'wec-lmdh': 0.307, 'wec-lmgt3': 0.322}  # σ_meas v2, % of lap
    rows = []
    for ser in ('f1', 'wec'):
        for r in d['diff']['harm'][ser]['rows']:
            grp, track = r['row'].split('|'); cls, season = grp.split('/')
            assert season != '2022'; rows.append({'track': track, 'cls': cls, 'season': season, 'err': r['shippedPct']})
    out = []
    for cls, f in sig.items():
        R = [r for r in rows if r['cls'] == cls]
        if R: out.append(assess(f'lap {cls}', R, f, '% of lap', {
            'per track (shared over seasons)': lambda r: r['track'], 'per season (series level)': lambda r: r['season']}))
    return out

def drs(path):
    rows, sig = [], []
    for r in csv.DictReader(open(path, newline='')):
        assert r['year'] != '2022'
        rows.append({'track': r['track'], 'zone': r['zone'], 'season': r['year'], 'err': float(r['pred_delta_s']) - float(r['meas_delta_s'])})
        sig.append(float(r['sigma_meas_s']))
    return [assess('F1 DRS (pooled cases)', rows, round(rms(sig), 4), 's per zone', {
        'per zone (shared over seasons)': lambda r: (r['track'], r['zone']), 'per track': lambda r: r['track'],
        'one global scale-free offset': lambda r: 0})]

def corner(a2p, t10p, normp):
    a2, t10, norm = json.load(open(a2p))['events'], json.load(open(t10p))['events'], json.load(open(normp))
    apex, strt = [], []
    for s, m in a2.items():
        assert m['year'] != 2022
        laps = [(k, e) for k, e in t10.items() if e['session'] == s and k in norm.get(s, {}).get('used', {})]
        if not laps: continue
        used, n = norm[s]['used'], min(len(m['v']), *(len(e['a']) for _, e in laps))
        meas = [[v * used[k] for v in e['a'][:n]] for k, e in laps]
        pole = next(e for _, e in laps if e['rank'] == min(x['rank'] for _, x in laps))
        w = 8  # ±40 m
        for i, vmin in pole['corners']:
            if not (120 <= vmin < 240) or i < w or i + w >= n: continue
            mm = st.mean(min(v[i - w:i + w + 1]) for v in meas)
            apex.append({'track': m['track'], 'season': m['year'], 'cid': round(200 * i / n), 'band': int(vmin // 30),
                         'err': min(m['v'][i - w:i + w + 1]) - mm})
        for i in pole['straights']:
            if i < w or i + w >= n: continue
            mm = st.mean(max(v[i - w:i + w + 1]) for v in meas)
            strt.append({'track': m['track'], 'season': m['year'], 'cid': round(200 * i / n), 'err': max(m['v'][i - w:i + w + 1]) - mm})
    lv = {'per corner (shared over seasons)': lambda r: (r['track'], r['cid']),
          'per track x 30 km/h band': lambda r: (r['track'], r.get('band')), 'per track': lambda r: r['track']}
    return [assess('F1 apex 120-240 (A2 baseline)', apex, 2.0, 'km/h', lv),
            assess('F1 straight-end speed (A2 baseline)', strt, 2.1, 'km/h',
                   {'per straight (shared over seasons)': lambda r: (r['track'], r['cid']), 'per track': lambda r: r['track']})]

def generic(path, floor, unit):
    rows = [{'track': r['track'], 'group': r['group'], 'season': r['season'], 'err': float(r['err'])} for r in csv.DictReader(open(path, newline=''))]
    assert all(r['season'] != '2022' for r in rows)
    return [assess(path, rows, float(floor), unit, {'per group (shared over seasons)': lambda r: (r['track'], r['group']),
                                                    'per track': lambda r: r['track']})]

def _selftest():
    rows = [{'track': t, 'season': s, 'err': e} for t, s, e in [('a', 1, 2.0), ('a', 2, 2.0), ('b', 1, -1.0), ('b', 2, -1.0), ('c', 1, 0.5), ('c', 2, 0.5)]]
    o = assess('t', rows, 0.1, 'x', {'per track': lambda r: r['track']})
    assert o['oracles']['per track']['rms'] == 0.0 and not o['c_all_levels_above'] and o['ratio'] > 1.2

if __name__ == '__main__':
    _selftest()
    mode, args = sys.argv[1], sys.argv[2:]
    print(json.dumps({'lap': lap, 'drs': drs, 'corner': corner, 'generic': generic}[mode](*args), indent=1))
