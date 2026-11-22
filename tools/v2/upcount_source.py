"""Diagnostic (tuning laps only): upshift count error by audio source — YouTube (tuning) vs formula1.com (PC copy, and cloud mp4 when given)."""
import json, re, sys, os, numpy as np
sys.path.insert(0, '/home/claude/ser/f1'); sys.path.insert(0, '/home/claude/ser/yt')
from ti_window import load
from align_audio import audio_align
from validate_learn import SLUG
import learn
o = learn.closure
def s(*a):
    try: return o(*a)
    except ZeroDivisionError: return None
learn.closure = s
R = json.load(open('results.json')); IDX = json.load(open('/home/claude/ser/yt/index_rows.json')); T = json.load(open('tune_upcount.json'))
suffix = sys.argv[1] if len(sys.argv) > 1 else ''   # '' = PC copy; '_cl' = cloud mp4 copy in out2/<row>_cl.json
out = {}
for r in IDX:
    m = re.match(r'(\d{4}) (.+) GP', r['title'])
    if not m or r['session'] != '퀄리파잉' or 'formula1.com' not in r['url'] or r.get('sub') != 'GP 폴랩': continue
    key = f"{m.group(1)}-{SLUG.get(m.group(2), m.group(2).lower().replace(' ', '-'))}-s"; row = r['row'] + suffix
    if key not in T or key in out or not os.path.exists(f'/home/claude/ser/yt/out2/{row}.json'): continue
    k = R[key]
    try:
        A = audio_align(f'/home/claude/ser/yt/out2/{row}.json', int(m.group(1)), k['event'], k['drv'], k['lap'])
        L = learn.one(f'/home/claude/ser/yt/out2/{row}.json') if not os.path.exists(f'/home/claude/ser/yt/learn/{row}.json') else json.load(open(f'/home/claude/ser/yt/learn/{row}.json'))
    except Exception as e: out[key] = {'err': str(e)[:60]}; continue
    if A['rpm_corr'] < 0.8: out[key] = {'skip': 'not aligned'}; continue
    Tl = load(f"/home/claude/ti{m.group(1)}", f"{k['event']}/Qualifying/{k['drv']}/{k['lap']}_tel.json")['tel']
    t = np.array(Tl['time'], float); g = np.array(Tl['gear'], float); t0 = A['audio_lap_start']
    nv = sum(1 for u in L['upshifts'] if t0 <= u[0] <= t0 + t[-1]); nt = int((np.diff(g) > 0).sum())
    out[key] = {'row': row, 'video': nv, 'truth': nt, 'e_rel': round((nv - nt) / nt, 3), 'yt_e_rel': T[key]['e_rel']}
ok = [v for v in out.values() if 'e_rel' in v]
summ = {'n': len(ok), 'median_abs_rel': round(float(np.median([abs(v['e_rel']) for v in ok])), 3), 'bias': round(float(np.median([v['e_rel'] for v in ok])), 3),
        'youtube_same_laps_median_abs_rel': round(float(np.median([abs(v['yt_e_rel']) for v in ok])), 3)}
print(json.dumps(summ)); print({k: (v.get('video'), v.get('truth')) for k, v in out.items()})
json.dump({'laps': out, 'summary': summ}, open(f'/home/claude/ser/f1/upcount_source{suffix or "_pc"}.json', 'w'), indent=1)
