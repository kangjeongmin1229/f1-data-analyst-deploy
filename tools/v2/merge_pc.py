"""Copy PC-extracted outputs from the staging folder into out2/, skipping ones whose video track stops early (printed as TRUNC)."""
import json, glob, os, shutil
S = '/mnt/user-data/uploads/kongboda-onboard/yt/idx/out2'
new, bad = [], []
for p in glob.glob(f'{S}/*.json'):
    b = os.path.basename(p)
    try:
        d = json.load(open(p)); R = d['video']['rows']; A = d['audio']['t']
    except Exception:
        continue  # still being written
    if not R or R[-1][0] < 0.9 * A[-1]:
        bad.append(b[:-5]); continue
    if not os.path.exists(f'out2/{b}') or os.path.getsize(f'out2/{b}') != os.path.getsize(p):
        shutil.copy(p, f'out2/{b}'); new.append(b[:-5])
print('new', len(new), 'TRUNC', bad, 'out2 total', len(os.listdir('out2')))
