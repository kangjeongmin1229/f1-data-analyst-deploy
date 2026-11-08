"""Inventory the entire catalogue offline; unmatched metadata is not proof of exclusion."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import re

from t71_collect import series_family, session_type


def inventory(catalogue, root):
    for meta in catalogue:
        ident = str(meta['id'])
        name = ident if re.fullmatch(r'[a-zA-Z0-9-]+', ident) else hashlib.sha256(ident.encode()).hexdigest()
        family = series_family(meta.get('series', ''))
        yield {'id': ident, 'series': meta.get('series'), 'description': meta.get('description'),
               'family_candidate': family,
               'scope_status': 'candidate' if family else 'metadata_review_required',
               'session_kind': session_type(meta.get('description', '')),
               'raw_cached': (root / 'raw' / (name + '.json')).is_file(),
               'analysis_url_present': bool(meta.get('analysisFilename')),
               'replay_url_present': bool(meta.get('filename'))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', required=True)
    parser.add_argument('--root', default='.cache/lapsim/t71')
    args = parser.parse_args()
    root = Path(args.root)
    root.mkdir(parents=True, exist_ok=True)
    rows = list(inventory(json.loads(Path(args.catalogue).read_text()), root))
    target = root / 'coverage.jsonl'
    with target.with_suffix('.part').open('w') as out:
        for row in rows:
            out.write(json.dumps(row, ensure_ascii=False) + '\n')
    target.with_suffix('.part').replace(target)
    candidates = [r for r in rows if r['scope_status'] == 'candidate']
    report = {'catalogue_records': len(rows), 'candidate_records': len(candidates),
              'cached_candidates': sum(r['raw_cached'] for r in candidates),
              'pending_candidates': sum(not r['raw_cached'] for r in candidates),
              'unmatched_metadata_records': len(rows) - len(candidates),
              'candidate_families': dict(collections.Counter(r['family_candidate'] for r in candidates)),
              'candidate_session_kinds': dict(collections.Counter(r['session_kind'] for r in candidates)),
              'eligible_coverage_established': False, 'fitted_records': 0}
    target = root / 'coverage-summary.json'
    target.with_suffix('.part').write_text(json.dumps(report, indent=2))
    target.with_suffix('.part').replace(target)
    print(json.dumps(report))


if __name__ == '__main__':
    main()
