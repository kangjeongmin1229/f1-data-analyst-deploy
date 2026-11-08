"""Extract held LMP2 evidence without assuming series, generation or fit eligibility."""
import argparse
import collections
import datetime
import json
from pathlib import Path


def extract(rows, metadata, out):
    groups = {}
    count = 0
    for row in rows:
        if row.get('class_candidate') != 'lmp2':
            continue
        out.write(json.dumps(row, ensure_ascii=False) + '\n')
        count += 1
        session, car = row['record_id'][:2]
        key = (session, car)
        if key not in groups:
            meta = metadata.get(session, {})
            start = meta.get('startTime')
            try:
                year = datetime.datetime.fromtimestamp(start, datetime.timezone.utc).year
            except (ValueError, TypeError, OverflowError, OSError):
                year = None
            groups[key] = {
                'session_id': session, 'car': car, 'series': row.get('series'),
                'description': row.get('description'), 'session_kind': row.get('session_kind'),
                'recording_year': year, 'regulation_year': None,
                'source_class': row.get('source_class'), 'source_make': row.get('make'),
                'source_sha256': row['source_sha256'], 'generation': None,
                'chassis': None, 'engine': None, 'tyre': None, 'series_restrictions': None,
                'official_result': None, 'event_group': None, 'split': 'unassigned',
                'lap_records': 0, 'status_counts': collections.Counter(),
                'hold_reasons': collections.Counter(), 'fit_status': 'not_admitted'}
        group = groups[key]
        if group['source_sha256'] != row['source_sha256']:
            raise ValueError('conflicting source hashes within session/car')
        group['lap_records'] += 1
        group['status_counts'][row['status']] += 1
        group['hold_reasons'].update(set(row.get('reasons', [])))
    return list(groups.values()), count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', default='.cache/lapsim/t71')
    args = parser.parse_args()
    root = Path(args.root)
    metadata = {str(m['id']): m for m in json.loads((root / 'selected-metadata.json').read_text())}
    target = root / 'lmp2-laps.jsonl'
    with (root / 'normalized.jsonl').open() as source, target.with_suffix('.part').open('w') as out:
        groups, count = extract((json.loads(line) for line in source), metadata, out)
    target.with_suffix('.part').replace(target)
    target = root / 'lmp2-inventory.json'
    target.with_suffix('.part').write_text(json.dumps(groups, ensure_ascii=False, indent=2))
    target.with_suffix('.part').replace(target)
    report = {'lap_records': count, 'session_car_pairs': len(groups),
              'sessions': len({g['session_id'] for g in groups}),
              'series_laps': dict(collections.Counter()), 'fitted_records': 0,
              'raw_physics_error': None, 'post_correction_error': None}
    for group in groups:
        series = group['series'] or 'unknown'
        report['series_laps'][series] = report['series_laps'].get(series, 0) + group['lap_records']
    (root / 'lmp2-summary.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    main()
