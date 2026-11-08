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
import urllib.error

AUDIT_VERSION = 2


def source_url(value):
    """Resolve archive basename records, retaining the original URL in audit logs."""
    if not isinstance(value, str) or not value:
        return None
    if re.fullmatch(r'[a-zA-Z0-9_-]+\.json', value):
        value = 'https://s3.us-east-005.backblazeb2.com/t71-archive/' + value
    u = urllib.parse.urlsplit(value)
    if u.scheme != 'https' or u.hostname != 's3.us-east-005.backblazeb2.com' or not u.path.startswith('/t71-archive/'):
        return None
    return urllib.parse.urlunsplit((u.scheme, u.netloc, urllib.parse.quote(urllib.parse.unquote(u.path), safe='/'), u.query, ''))


def download(request):
    """Retry transient server failures only; never retry an access-policy denial."""
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                payload = response.read(20_000_001)
            if len(payload) > 20_000_000:
                raise ValueError('analysis size exceeds limit')
            return payload
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise
            retry_after = error.headers.get('Retry-After') if error.headers else None
            if retry_after and not retry_after.isdigit():
                raise  # Leave HTTP-date retry scheduling to the next run.
            delay = max(2 ** (attempt + 1), int(retry_after or 0))
            if delay > 60:
                raise  # Respect a long server delay without holding this batch open.
            error.close()
            time.sleep(delay)


def series_family(name):
    s = name.casefold()
    if re.search(r'iracing|esport|virtual|historic|classic|\bivra\b|\bneo\b|\bsco\b|\bvrs\b|\bsim\b', s):
        return None
    if re.search(r'formula\s*1\b|^f1 testing$', s):
        return 'f1'
    if re.search(r'formula\s*e\b', s):
        return 'fe'
    if re.search(r'\bwec\b|world endurance|^le mans 24 hours$', s):
        return 'wec'
    if re.search(r'imsa.*weathertech|^imsa$', s):
        return 'imsa'
    if re.search(r'\blmp2\b|24 heures du mans|24 hours of le mans|suzuka 10 hours|california 8 hours|\b1006 km\b|gt sports club|thailand supercar gtm|national gt challenge', s):
        return 'mixed_candidate'
    if re.search(r'blancpain|gt.?world|gtwc|^dtm$|\bnls\b|\bvln\b|nürburgring|nurburgring|igtc|intercontinental gt|bathurst 12|indianapolis 8|kyalami 9|macau|24.*spa|24h series|24h series|british gt|adac gt|international gt open|gt america|gt winter|gt summer|gt sprint|gt cup|gulf 12|sepang|super taikyu|supercar challenge|gt3|super touring|creventic|endurance|gt60', s):
        return 'gt_candidate'
    if re.search(r'european le mans|asian le mans|le mans cup', s):
        return 'lmgt3_candidate'
    return None


def session_type(text):
    s = text.casefold()
    if re.search(r'qualif|hyper\s?pole|super\s?pole|shoot\s?out|duel|\bq[1-3]\b', s):
        return 'qualifying'
    if re.search(r'practi[cs]e|warm.?up|test|prologue|\bfp[1-3]\b', s):
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
              'family': series_family(meta.get('series', '')), 'audit_version': AUDIT_VERSION,
              'original_source_url': meta.get('analysisFilename'),
              'resolved_source_url': source_url(meta.get('analysisFilename'))}
    try:
        if path.exists():
            payload = path.read_bytes()
        else:
            url = meta.get('analysisFilename')
            if not url:
                return {**result, 'status': 'missing_analysis_url'}
            url = source_url(url)
            if url is None:
                return {**result, 'status': 'unrecognized_source_url'}
            request = urllib.request.Request(url, headers={'User-Agent': 'Kongboda-model-validation/1.0'})
            payload = download(request)
            json.loads(payload)  # Never cache an HTML error as analysis.
            temporary = path.with_suffix('.part')
            temporary.write_bytes(payload)
            temporary.replace(path)
        result.update(audit(meta, json.loads(payload)))
        result.update(status='audited_not_fitted', sha256=hashlib.sha256(payload).hexdigest(), bytes=len(payload))
    except urllib.error.HTTPError as error:
        result.update(status='failed', error=str(error), http_status=error.code,
                      access_blocked=error.code in (401, 403))
    except Exception as error:
        result.update(status='failed', error=str(error))
    return result


def completed_records(path, raw_root=None):
    """The last complete record wins; a killed partial write is not a checkpoint."""
    records = {}
    if path.exists():
        for line in path.read_text().splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if record.get('status') == 'audited_not_fitted' and record.get('audit_version') == AUDIT_VERSION:
                if raw_root is not None:
                    ident = str(record['id'])
                    name = ident if re.fullmatch(r'[a-zA-Z0-9-]+', ident) else hashlib.sha256(ident.encode()).hexdigest()
                    raw = raw_root / (name + '.json')
                    if not raw.is_file() or hashlib.sha256(raw.read_bytes()).hexdigest() != record.get('sha256'):
                        continue
                records[record['id']] = record
    return records


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
    (root / 'selected-metadata.json').write_text(json.dumps(selected, ensure_ascii=False))
    outcomes = completed_records(root / 'audit.jsonl', root / 'raw')
    pending = [r for r in selected if r.get('id') not in outcomes]
    if args.limit:
        pending = pending[:args.limit]
    started = time.time()
    def checkpoint():
        values = list(outcomes.values())
        summary = {'catalogue_records': len(catalogue), 'selected': len(selected),
                   'processed_unique': len(values),
                   'status': dict(collections.Counter(r['status'] for r in values)),
                   'families': dict(collections.Counter(r['family'] for r in values)),
                   'lap_records': sum(r.get('counts', {}).get('lap_records', 0) for r in values),
                   'fitted_sessions': 0, 'seconds_this_run': round(time.time() - started, 1)}
        tmp = root / 'summary.part'
        tmp.write_text(json.dumps(summary, indent=2))
        tmp.replace(root / 'summary.json')
        return summary
    with (root / 'audit.jsonl').open('a') as log, concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        log.write('\n')  # Separate any truncated final line from the previous run.
        # Do not queue the entire archive: an access denial must stop new requests.
        remaining = iter(pending)
        futures = {pool.submit(collect_one, meta, root)
                   for meta in [next(remaining, None) for _ in range(4)] if meta is not None}
        blocked = False
        while futures:
            done, futures = concurrent.futures.wait(futures, return_when=concurrent.futures.FIRST_COMPLETED)
            for future in done:
                result = future.result()
                log.write(json.dumps(result, ensure_ascii=False) + '\n')
                log.flush()
                outcomes[result['id']] = result
                blocked = blocked or result.get('access_blocked', False)
                checkpoint()
                if len(outcomes) % 50 == 0:
                    print(json.dumps({'completed': len(outcomes), 'total': len(selected)}), flush=True)
            if not blocked:
                for _ in range(4 - len(futures)):
                    meta = next(remaining, None)
                    if meta is not None:
                        futures.add(pool.submit(collect_one, meta, root))
        if blocked:
            print(json.dumps({'stopped': 'source_access_denied', 'pending_not_submitted': True}), flush=True)
    print(json.dumps(checkpoint()), flush=True)


if __name__ == '__main__':
    main()
