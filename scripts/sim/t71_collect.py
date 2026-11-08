"""Resumable Timing71 analysis acquisition. Raw evidence is never training-ready.

python scripts/sim/t71_collect.py --catalogue PATH [--limit N]
Outputs stay under ignored .cache; model parameters are never overwritten.
"""
import argparse
import collections
import concurrent.futures
import hashlib
import json
import math
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request


def series_family(name):
    s = name.casefold()
    if re.search(r'iracing|esport|virtual|historic|classic|\bivra\b|\bneo\b|\bsco\b|\bvrs\b|\bsim\b', s):
        return None
    if re.search(r'formula\s*1\b', s):
        return 'f1'
    if re.search(r'formula\s*e\b', s):
        return 'fe'
    if re.search(r'\bwec\b|world endurance|^le mans 24 hours$', s):
        return 'wec'
    if re.search(r'imsa.*weathertech|^imsa$', s):
        return 'imsa'
    if re.search(r'blancpain|gt.?world|gtwc|^dtm$|\bnls\b|\bvln\b|nürburgring|nurburgring|igtc|intercontinental gt|bathurst 12|indianapolis 8|kyalami 9|macau|24.*spa|24h series|24h series|british gt|adac gt|international gt open|gt america|gt winter|gt summer|gt sprint|gt cup|gulf 12|sepang|super taikyu|supercar challenge|gt3|super touring|creventic|endurance|gt60', s):
        return 'gt_candidate'
    if re.search(r'european le mans|asian le mans|le mans cup', s):
        return 'lmgt3_candidate'
    return None


def session_type(text):
    s = text.casefold()
    if re.search(r'qualif|hyperpole|superpole|shootout|duel', s):
        return 'qualifying'
    if re.search(r'practi[cs]e|warm.?up|test|prologue', s):
        return 'practice_or_test'
    if re.search(r'\brace\b|\bsprint\b', s):
        return 'race'
    return 'unknown'


def finite(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)


def normalize_epoch(value, start, duration):
    """Only correct seconds when exactly one interpretation matches the recording."""
    if not all(finite(x) for x in (value, start, duration)) or duration < 0:
        return None, 'invalid_timestamp_metadata'
    lo, hi = start * 1000 - 300000, (start + duration) * 1000 + 300000
    ms_ok, s_ok = lo <= value <= hi, lo <= value * 1000 <= hi
    if ms_ok and not s_ok:
        return value, None
    if s_ok and not ms_ok:
        return value * 1000, 'epoch_seconds_to_milliseconds'
    return None, 'timestamp_unresolved'


def audit(meta, data):
    cars = data.get('cars', {}).get('cars')
    if not isinstance(cars, dict):
        if all(k in data for k in ('service', 'lap', 'stint')):
            return {'fit_status': 'not_admitted', 'schema': 'legacy',
                    'pending': ['legacy_schema_adapter', 'car_class_and_generation', 'official_session_crosscheck']}
        raise ValueError('analysis cars schema missing')
    counts = collections.Counter()
    fixes = []
    kind = session_type(meta.get('description', ''))
    for number, car in cars.items():
        for si, stint in enumerate(car.get('stints', [])):
            for field in ('startTime', 'endTime'):
                normalized, reason = normalize_epoch(stint.get(field), meta.get('startTime'), meta.get('duration'))
                if reason:
                    counts[reason] += 1
                if reason == 'epoch_seconds_to_milliseconds':
                    fixes.append({'car': number, 'stint': si, 'field': field,
                                  'original': stint[field], 'normalized_ms': normalized})
            for li, lap in enumerate(stint.get('laps', [])):
                counts['lap_records'] += 1
                # Preserve record identity even when Q phases restart lap counters.
                value = lap.get('laptime')
                if not finite(value) or value <= 0:
                    counts['invalid_laptime'] += 1
                    continue
                timestamp, reason = normalize_epoch(lap.get('timestamp'), meta.get('startTime'), meta.get('duration'))
                if timestamp is None:
                    counts['held_unresolved_timestamp'] += 1
                    continue
                if reason:
                    fixes.append({'car': number, 'stint': si, 'lap_index': li,
                                  'field': 'timestamp', 'original': lap['timestamp'], 'normalized_ms': timestamp})
                flag = str(lap.get('flag', 'unknown')).casefold()
                counts['flag:' + flag] += 1
                counts['structurally_valid_laps'] += 1
    return {'session_kind': kind, 'cars': len(cars),
            'car_inventory': [{'number': n, 'class': c.get('raceClass'), 'make': c.get('make')}
                              for n, c in cars.items()], 'counts': dict(counts),
            'corrections': fixes, 'fit_status': 'not_admitted',
            'pending': ['official_session_crosscheck', 'car_class_and_generation',
                        'pit_and_flag_context', 'weather_and_setup', 'train_holdout_split']}


def collect_one(meta, root):
    ident = str(meta.get('id', ''))
    filename = ident if re.fullmatch(r'[a-zA-Z0-9-]+', ident) else hashlib.sha256(ident.encode()).hexdigest()
    path = root / 'raw' / (filename + '.json')
    result = {'id': ident, 'series': meta.get('series'), 'description': meta.get('description'),
              'family': series_family(meta.get('series', ''))}
    try:
        if path.exists():
            payload = path.read_bytes()
        else:
            url = meta.get('analysisFilename')
            if not url:
                return {**result, 'status': 'missing_analysis_url'}
            u = urllib.parse.urlsplit(url)
            if u.scheme != 'https' or u.hostname != 's3.us-east-005.backblazeb2.com' or not u.path.startswith('/t71-archive/'):
                return {**result, 'status': 'unrecognized_source_url'}
            url = urllib.parse.urlunsplit((u.scheme, u.netloc, urllib.parse.quote(urllib.parse.unquote(u.path), safe='/'), u.query, ''))
            request = urllib.request.Request(url, headers={'User-Agent': 'Kongboda-model-validation/1.0'})
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = response.read(20_000_001)
            if len(payload) > 20_000_000:
                raise ValueError('analysis size exceeds limit')
            json.loads(payload)  # Never cache an HTML error as analysis.
            temporary = path.with_suffix('.part')
            temporary.write_bytes(payload)
            temporary.replace(path)
        result.update(audit(meta, json.loads(payload)))
        result.update(status='audited_not_fitted', sha256=hashlib.sha256(payload).hexdigest(), bytes=len(payload))
    except Exception as error:
        result.update(status='failed', error=str(error))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', required=True)
    parser.add_argument('--output', default='.cache/lapsim/t71')
    parser.add_argument('--limit', type=int, default=0)
    args = parser.parse_args()
    root = Path(args.output)
    (root / 'raw').mkdir(parents=True, exist_ok=True)
    catalogue = json.loads(Path(args.catalogue).read_text())
    selected = [r for r in catalogue if series_family(r.get('series', ''))]
    if args.limit:
        selected = selected[:args.limit]
    (root / 'selected-metadata.json').write_text(json.dumps(selected, ensure_ascii=False))
    outcomes = []
    started = time.time()
    with (root / 'audit.jsonl').open('w') as log, concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for result in pool.map(lambda m: collect_one(m, root), selected):
            log.write(json.dumps(result, ensure_ascii=False) + '\n')
            log.flush()
            outcomes.append(result)
            if len(outcomes) % 50 == 0:
                print(json.dumps({'completed': len(outcomes), 'total': len(selected)}), flush=True)
    summary = {'catalogue_records': len(catalogue), 'selected': len(selected),
               'status': dict(collections.Counter(r['status'] for r in outcomes)),
               'families': dict(collections.Counter(r['family'] for r in outcomes)),
               'lap_records': sum(r.get('counts', {}).get('lap_records', 0) for r in outcomes),
               'fitted_sessions': 0, 'seconds': round(time.time() - started, 1)}
    (root / 'summary.json').write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
