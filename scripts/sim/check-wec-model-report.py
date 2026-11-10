"""Independent arithmetic and fold-inventory checks; never fits or selects settings."""
import json
import math
import sys
from pathlib import Path

out = Path(sys.argv[1] if len(sys.argv) > 1 else '.cache/night-session/models-resume')
raw = json.loads((out / 'input/.cache/lapsim/wec.json').read_text())
wet = json.loads((out / 'input/scripts/sim/data/wet-sessions.json').read_text())['wec']
identities = json.loads((out / 'input/scripts/sim/data/wec-model-identities.json').read_text())['rows']
identity = {(r['year'], r['track'], str(r['entry'])): r['model'] for r in identities}
rms = lambda values: math.sqrt(sum(x*x for x in values) / len(values))
groups = {}
for name in ['lmh-2025', 'lmh-2026', 'lmdh-2025', 'lmdh-2026', 'lmgt3-2025', 'lmgt3-2026']:
    file = out / name / 'result.json'
    if not file.exists():
        continue
    result = json.loads(file.read_text())
    if not result['complete']:
        groups[name] = {'complete': False, 'foldsSaved': len(result['folds'])}
        continue
    cls, year = name.split('-')
    year = int(year)
    sessions = [w for w in raw if w['cls'] == cls and w['year'] == year
                and f"{year} {w['track']}" not in wet and not (w.get('weather') or {}).get('rain')]
    rows = []
    for session in sessions:
        for i, car in enumerate(session['cars']):
            rows.append({'track': session['track'], 'model': identity[year, session['track'], str(car['car'])],
                         'entry': car['car'], 'realSec': car['lap'], 'classBest': i == 0})
    assert len(rows) == result['nCars'] and len(sessions) == result['nTracks'], name
    expected_folds = {(kind, row['track' if kind == 'track' else 'model'])
                      for kind in ['track', 'model'] for row in rows}
    assert {(f['kind'], f['hidden']) for f in result['folds']} == expected_folds
    assert len(result['folds']) == len(expected_folds)
    clusters = []
    class_base, class_model = [], []
    model_base, model_candidate = [], []
    for fold in result['folds']:
        assert fold['pass'] and all(not e['capHit'] for e in fold['convergence'].values())
        key = 'track' if fold['kind'] == 'track' else 'model'
        train = [r for r in rows if r[key] != fold['hidden']]
        test = [r for r in rows if r[key] == fold['hidden']]
        assert len(train) == fold['trainRows']
        assert set(fold['trainModels']) == {r['model'] for r in train}
        if key == 'model':
            assert fold['hidden'] not in fold['trainModels']
        best = {}
        for r in test:
            best.setdefault((r['track'], r['model']), r)
        assert len(best) == len(fold['errors'])
        for pair in fold['errors']:
            observed = best[pair['base']['track'], pair['base']['model']]
            for arm in ['base', 'models']:
                e = pair[arm]
                assert all(e[k] == v for k, v in observed.items())
                assert abs(e['pct'] - 100*(e['simSec']/e['realSec']-1)) < 1e-10
            if key == 'track' and observed['classBest']:
                class_base.append(pair['base']['pct'])
                class_model.append(pair['models']['pct'])
        if key == 'track':
            clusters.append((rms([p['base']['pct'] for p in fold['errors']]),
                             rms([p['models']['pct'] for p in fold['errors']])))
        else:
            model_base += [p['base']['pct'] for p in fold['errors']]
            model_candidate += [p['models']['pct'] for p in fold['errors']]
    groups[name] = {'complete': True, 'cars': len(rows), 'n': len(clusters), 'folds': len(expected_folds),
                    'baseRmsPct': rms([x for x, y in clusters]), 'candidateRmsPct': rms([y for x, y in clusters]),
                    'classBestBaseRmsPct': rms(class_base), 'classBestCandidateRmsPct': rms(class_model),
                    'hiddenModelBaseRmsPct': rms(model_base), 'hiddenModelCandidateRmsPct': rms(model_candidate)}
report = out / 'results.json'
if report.exists():
    reported = json.loads(report.read_text())
    for name, checked in groups.items():
        if checked['complete']:
            values = reported['groups'][name]
            assert values['trackTest']['n'] == checked['n']
            assert abs(values['trackTest']['baseRmsPct'] - checked['baseRmsPct']) < 1e-10
            assert abs(values['trackTest']['modelsRmsPct'] - checked['candidateRmsPct']) < 1e-10
            assert abs(values['hiddenModelTest']['baseRmsPct'] - checked['hiddenModelBaseRmsPct']) < 1e-10
            assert abs(values['hiddenModelTest']['modelsRmsPct'] - checked['hiddenModelCandidateRmsPct']) < 1e-10
result = {'pass': True, 'fitOrSettingChanges': False, 'groups': groups}
(out / 'independent-report-check.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
