# Step 33 scoreboard (report-only): python3 -I score.py rows.json floors.json > scoreboard.md
# Row score = w * min(1, 1.2 / ratio) for open rows with a ratio; floor / limit / nj rows score full; open rows without a ratio score half.
# Rule A (central 05:50, claude/decision-central-0550-scoring-rules-2026-11-26.md): a row whose shipped car (row 'cars') has any fitted
# parameter at a bound (rows.json 'boundHits', 0.5 % rule) scores at most half its weight. 'points_c1' keeps the C1-only score.
import json, sys, math

def score(rows, floors, hits=None):
    hits, out = hits or {}, []
    for r in rows:
        r = dict(r)
        if 'floor_from' in r:
            a, b = r['floor_from'].split('.'); f = floors[a][b]
            r['best'] = round(math.hypot(f, r.get('sampling_kph', 0)), 2); r['parts'] = [[r['held'], r['best']]]
        if 'parts' in r:
            r['ratio'] = sum(h / f for h, f in r['parts']) / len(r['parts'])
            r['status'] = 'floor' if r['ratio'] <= 1.2 else 'open'
        s = 1 if r['status'] in ('floor', 'limit', 'nj') else min(1, 1.2 / r['ratio']) if 'ratio' in r else 0.5
        r['points_c1'] = r['w'] * s
        r['capped'] = [c for c in r.get('cars', []) if hits.get(c)]
        if r['capped']: s = min(s, 0.5)
        r['points'], r['lost'] = r['w'] * s, r['w'] * (1 - s)
        out.append(r)
    return out

def md(out):
    L = ['| Series | Use | Held-out / best possible | Ratio | Status | C1 pts | C1 + A pts | Lost | Owner | Run id |', '|---|---|---|---|---|---|---|---|---|---|']
    for r in out:
        hb = '; '.join(f'{h} / {f}' for h, f in r['parts']) + f" {r['unit']}" if 'parts' in r else r.get('note', '–')
        a = f"{r['points']:.1f} (A: {', '.join(r['capped'])})" if r['capped'] else f"{r['points']:.1f}"
        L.append(f"| {r['series']} | {r['use']} | {hb} | {r['ratio']:.2f} | {r['status']} | {r['points_c1']:.1f} | {a} | {r['lost']:.1f} | {r['owner']} | {r['run']} |" if 'ratio' in r
                 else f"| {r['series']} | {r['use']} | {hb} | – | {r['status']} | {r['points_c1']:.1f} | {a} | {r['lost']:.1f} | {r['owner']} | {r['run']} |")
    top = sorted(out, key=lambda r: -r['lost'])[:3]
    L += ['', f"**Total C1 only {sum(r['points_c1'] for r in out):.1f} / 100; C1 + A {sum(r['points'] for r in out):.1f} / 100.** Top 3 lost (C1 + A): " + '; '.join(f"{r['series']} {r['use']} {r['lost']:.1f}" for r in top)]
    return '\n'.join(L)

def _selftest():
    o = score([{'w': 60, 'parts': [[2.4, 1]]}, {'w': 40, 'status': 'limit'}], {})
    assert abs(sum(r['points'] for r in o) - 70) < 1e-9 and o[0]['status'] == 'open'
    o = score([{'w': 60, 'parts': [[1, 1]], 'cars': ['x']}, {'w': 40, 'parts': [[4.8, 1]], 'cars': ['x', 'y']}], {}, {'x': ['clA max'], 'y': []})
    assert [r['points'] for r in o] == [30, 10] and [r['points_c1'] for r in o] == [60, 10] and o[1]['capped'] == ['x']

if __name__ == '__main__':
    _selftest()
    d = json.load(open(sys.argv[1])); rows = d['rows']; assert sum(r['w'] for r in rows) == 100, 'weights must sum to 100'
    hits = {k: v['hits'] for k, v in d.get('boundHits', {}).items() if k[0] != '_'}; assert all(c in hits for r in rows for c in r.get('cars', [])), 'unknown car'
    print(md(score(rows, json.load(open(sys.argv[2])), hits)))
