"""Offline normalization of cached evidence. No record is admitted to fitting here."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re

from t71_collect import finite, normalize_epoch, session_type
from t71_legacy import decode


def explicit_class(label):
    """Conservative label recognition, not proof of year-specific homologation."""
    s = str(label or '').strip().upper()
    if re.fullmatch(r'LMP2(?:\s+(?:P/A|PRO/AM|AM))?', s):
        return 'lmp2'
    if s in ('HYPERCAR', 'HYPERCAR H', 'LMH', 'LMDH'):
        return 'hypercar'
    if s == 'LMGT3':
        return 'lmgt3'
    if s in ('GT3', 'GT3-P/A', 'GT3-AM'):
        return 'gt3'
    return None


def records(meta, data, digest, issues=None):
    if issues is None:
        issues = []
    legacy = 'service' in data and 'stint' in data
    if legacy:
        data = decode(data)
        issues.extend(data['issues'])
    elif 'service' in data and 'state' in data and 'cars' not in data:
        issues.append({'reason': 'snapshot_without_lap_history'})
        return
    cars = data.get('cars', {}).get('cars')
    if not isinstance(cars, dict):
        raise ValueError('unrecognized analysis schema')
    for number, car in cars.items():
        for si, stint in enumerate(car.get('stints', [])):
            start, _ = normalize_epoch(stint.get('startTime'), meta.get('startTime'), meta.get('duration'))
            end, _ = normalize_epoch(stint.get('endTime'), meta.get('startTime'), meta.get('duration'))
            # Archives can carry earlier sessions' stints; never label these by the file title alone.
            interval_verified = start is not None and end is not None and start <= end
            for li, lap in enumerate(stint.get('laps', [])):
                source_si = stint.get('source_stint_index', si)
                source_li = lap.get('source_lap_index', li)
                group = explicit_class(car.get('raceClass'))
                reasons = ['official_result_unverified', 'conditions_unverified', 'generation_unverified']
                if not interval_verified:
                    reasons.append('stint_session_interval_unverified')
                if group is None:
                    reasons.append('class_unresolved')
                value = lap.get('laptime')
                valid_time = finite(value) and value > 0
                timestamp, correction = normalize_epoch(lap.get('timestamp'), meta.get('startTime'), meta.get('duration'))
                if timestamp is None:
                    reasons.append('timestamp_absent_in_format' if legacy else 'timestamp_unresolved')
                if lap.get('flag') != 'green':
                    reasons.append('not_confirmed_green')
                if li == 0 or li == len(stint.get('laps', [])) - 1:
                    reasons.append('stint_boundary_needs_replay')
                if not valid_time:
                    reasons.append('invalid_laptime')
                yield {'record_id': [meta['id'], str(number), source_si, source_li],
                       'source_sha256': digest, 'source_schema': 'legacy' if legacy else 'current',
                       'series': meta.get('series'), 'description': meta.get('description'),
                       'session_kind': session_type(meta.get('description', '')),
                       'session_assignment_verified': False,
                       'source_class': car.get('raceClass'), 'class_candidate': group,
                       'make': car.get('make'), 'lap_seconds': value if valid_time else None,
                       'source_lap_number': lap.get('lapNumber'), 'timestamp_ms': timestamp,
                       'source_timestamp': lap.get('timestamp'),
                       'timestamp_correction': correction if timestamp is not None else None,
                       'flag': lap.get('flag'), 'status': 'held' if valid_time else 'rejected_numeric',
                       'reasons': reasons}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--root', default='.cache/lapsim/t71')
    args = p.parse_args()
    root = Path(args.root)
    counts = collections.Counter()
    classes = collections.Counter()
    errors = []
    issues = []
    target = root / 'normalized.jsonl'
    with target.with_suffix('.part').open('w') as out:
        for meta in json.loads((root / 'selected-metadata.json').read_text()):
            ident = str(meta['id'])
            name = ident if re.fullmatch(r'[a-zA-Z0-9-]+', ident) else hashlib.sha256(ident.encode()).hexdigest()
            raw = root / 'raw' / (name + '.json')
            if not raw.exists():
                continue
            payload = raw.read_bytes()
            try:
                session_issues = []
                # Validate the whole session before committing any of its rows/counts.
                rows = list(records(meta, json.loads(payload), hashlib.sha256(payload).hexdigest(), session_issues))
                for row in rows:
                    out.write(json.dumps(row, ensure_ascii=False) + '\n')
                    counts[row['status']] += 1
                    classes[row['class_candidate'] or 'unresolved'] += 1
                counts['sessions'] += 1
                if not rows:
                    counts['sessions_without_laps'] += 1
                issues.extend({'session': ident, **issue} for issue in session_issues)
            except (TypeError, ValueError, AttributeError) as error:
                errors.append({'session': ident, 'error': str(error)})
    target.with_suffix('.part').replace(target)
    report = {'counts': dict(counts), 'class_candidate_laps': dict(classes),
              'errors': errors, 'issues': issues, 'fitted_records': 0}
    (root / 'normalized-summary.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    main()
