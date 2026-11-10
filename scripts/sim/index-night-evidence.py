"""Verify saved result manifests and write the small review-branch evidence index."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RESULTS = ROOT / 'scripts/sim/results'
BRANCH = 'https://github.com/kangjeongmin1229/f1-data-analyst-deploy/tree/exp/lapsim-physics-night-2026-11-10'


def sha(data):
    return hashlib.sha256(data).hexdigest()


lines = [
    '# Experiment evidence index — 2026-11-10', '',
    f'The [experiment branch]({BRANCH}) keeps full runners, input manifests and result files. '
    'This core review PR keeps hashes and summaries. No production values changed.', '',
    '| Result folder | Files | Stored bytes | Manifest | Manifest SHA-256 |',
    '|---|---:|---:|---|---|',
]
checked = 0
for manifest in sorted(list(RESULTS.rglob('sha256.json')) + list(RESULTS.rglob('checksums.json'))):
    folder = manifest.parent
    spec = json.loads(manifest.read_text())
    entries = spec.get('files', spec)
    for name, expected in entries.items():
        path = folder / name
        # Older tolerance manifests record both the original and compressed hash.
        data = (path.read_bytes() if path.exists() else
                gzip.decompress((folder / (name + '.gz')).read_bytes()))
        digest = expected if isinstance(expected, str) else expected['sha256']
        assert sha(data) == digest, f'Archive hash mismatch: {folder / name}'
        if isinstance(expected, dict):
            assert len(data) == expected['bytes'], name
            original = gzip.decompress(data) if name.endswith('.gz') else data
            assert sha(original) == expected['sourceSha256'], f'Source hash mismatch: {name}'
        checked += 1
    files = [p for p in folder.rglob('*') if p.is_file()]
    link = BRANCH.replace('/tree/', '/blob/') + '/' + manifest.relative_to(ROOT).as_posix()
    lines.append(f'| {folder.relative_to(RESULTS)} | {len(files)} | '
                 f'{sum(p.stat().st_size for p in files)} | [manifest]({link}) | `{sha(manifest.read_bytes())}` |')
for worktree in [ROOT, ROOT.parent / 'lapsim-core']:
    (worktree / 'docs/archive/lapsim-experiment-index-2026-11-10.md').write_text('\n'.join(lines) + '\n')
print(json.dumps({'verifiedArchivedFiles': checked, 'manifests': len(lines) - 6}))
