"""Extract every staged idx pair (<row>.v.*, <row>.a.*, <row>.meta.json) with yt_extract v2, then delete the staged media."""
import json, os, glob, subprocess, re
U = '/mnt/user-data/uploads/kongboda-onboard/yt/idx'
rows = {r['row']: r for r in json.load(open('index_rows.json'))}
sel = {x['id']: x for x in json.load(open('selection.json'))}
os.makedirs('out2', exist_ok=True)
K, N = map(int, os.environ.get('SHARD', '0/1').split('/'))
for j, v in enumerate(sorted(glob.glob(f'{U}/*.v.*'))):
    if j % N != K: continue
    row = os.path.basename(v).split('.v.')[0]
    a = (glob.glob(f'{U}/{row}.a.*') or [None])[0]
    if not a: continue
    meta = {}
    mf = f'{U}/{row}.meta.json'
    if os.path.exists(mf): meta.update(json.load(open(mf, encoding='utf-8')))
    if row in rows: meta.update({k: rows[row][k] for k in ('series', 'session', 'sub', 'title', 'kind', 'url')})
    if row.startswith('y_') and row[2:] in sel: meta.update(sel[row[2:]])
    out = f'out2/{row}.json'
    if not os.path.exists(out):
        r = subprocess.run(['python3', 'yt_extract.py', v, a, out, json.dumps(meta, ensure_ascii=False)], capture_output=True, text=True)
        print((r.stdout or r.stderr).strip()[-160:], flush=True)
    if os.path.exists(out):
        for f in (v, a, mf):
            if os.path.exists(f): os.remove(f)
