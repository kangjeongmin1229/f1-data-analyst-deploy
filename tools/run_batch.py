"""Extract every staged video/audio pair in the staging folder that has no output yet,
then delete the staged media (derived numbers only are kept)."""
import json, os, glob, subprocess, sys
U = '/mnt/user-data/uploads/kongboda-onboard/yt'
sel = {x['id']: x for x in json.load(open('selection.json'))}
for v in sorted(glob.glob(f'{U}/*.v.mp4')):
    vid = os.path.basename(v)[:-6]
    a = (glob.glob(f'{U}/{vid}.a.*') or [None])[0]
    m = sel.get(vid, {'id': vid}); out = f"out/{m.get('series','X').lower()}-{m.get('year','')}-{vid}.json"
    if a and not os.path.exists(out):
        r = subprocess.run(['python3', 'yt_extract.py', v, a, out, json.dumps(m)], capture_output=True, text=True)
        print((r.stdout or r.stderr).strip()[-200:], flush=True)
    if os.path.exists(out):
        for f in [v, a]:
            if f and os.path.exists(f): os.remove(f)
