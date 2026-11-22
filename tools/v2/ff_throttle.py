"""Add FastF1 throttle (same lap as out2/<row>.truth.json) -> out2/<row>.thr.json. Truth only; nothing is compared here."""
import json, glob, os, fastf1
os.makedirs('ffcache', exist_ok=True); fastf1.Cache.enable_cache('ffcache')
for f in sorted(glob.glob('out2/*.truth.json')):
    row = os.path.basename(f)[:-11]; o = f'out2/{row}.thr.json'
    if os.path.exists(o): continue
    try:
        ev = json.load(open(f, encoding='utf-8'))['event'].split()
        y, d, lap = int(ev[0]), ev[-2], int(ev[-1][1:]); s = ev[-3]; name = ' '.join(ev[1:-3])
        S = fastf1.get_session(y, name, s); S.load(weather=False, messages=False)
        L = S.laps.pick_drivers(d); L = L[L.LapNumber == lap].iloc[0]; T = L.get_car_data()
        json.dump({'event': ' '.join(ev), 'time': T.Time.dt.total_seconds().round(3).tolist(), 'throttle': T.Throttle.tolist(), 'rpm': T.RPM.tolist()}, open(o, 'w'))
        print(row, 'ok', len(T), flush=True)
    except Exception as e:
        print(row, 'ERR', str(e)[:200], flush=True)
