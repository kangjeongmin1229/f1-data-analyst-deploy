# Step 35 C power check (FE race energy model): units = dry events with a race-pace ratio (race median lap / pole),
# baseline = leave-one-event-out mean ratio of the same circuit and generation (else of the generation), clustered by circuit.
#   python3 -I scripts/sim/learn/fe-race-power.py [useful_pp=0.25]
import json, math, statistics as S, collections, sys
U = float(sys.argv[1]) if len(sys.argv) > 1 else 0.25
ev = [e for e in json.load(open('scripts/sim/data/learn/fe-race-w12.json'))['events'] if e['weather_class'] == 'dry' and e['race_ratio']]
def check(E):
    by = collections.defaultdict(list)
    for e in E: by[e['track_key']].append(e)
    err = []
    for e in E:
        same = [x['race_ratio'] for x in by[e['track_key']] if x is not e and x['gen'] == e['gen']]
        p = S.mean(same or [x['race_ratio'] for x in E if x is not e and x['gen'] == e['gen']])
        err.append((e['track_key'], abs(e['race_ratio'] - p) * 100, (e['race_ratio'] - p) * 100))
    g = collections.defaultdict(list)
    for t, a, _ in err: g[t].append(a)
    n, k = len(err), len(g); m = n / k; gm = S.mean(a for _, a, _ in err)
    msb = sum(len(v) * (S.mean(v) - gm) ** 2 for v in g.values()) / (k - 1)
    msw = sum((x - S.mean(v)) ** 2 for v in g.values() for x in v) / (n - k)
    icc = max(0, (msb - msw) / (msb + (m - 1) * msw)); deff = 1 + (m - 1) * icc; sd = S.stdev(a for _, a, _ in err)
    return dict(n=n, circuits=k, loeoRmsPp=round(math.sqrt(S.mean(e * e for *_, e in err)), 2), icc=round(icc, 2), deff=round(deff, 2),
                mdePp=[round(2.8 * f * sd * math.sqrt(deff / n), 2) for f in (0.5, 1)], nNeeded=[round((2.8 * f * sd / U) ** 2 * deff) for f in (0.5, 1)],
                judgeable=2.8 * 1.0 * sd * math.sqrt(deff / n) <= U)
out = {'usefulPp': U, 'gen3evo': check([e for e in ev if e['gen'] == 'Gen3 Evo']), 'gen3+evo': check(ev)}
assert out['gen3evo']['n'] > 0
print(json.dumps(out, indent=1))
