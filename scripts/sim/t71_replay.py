"""Reconstruct Timing71 v1 replay observations; do not infer lap/sector identity.

Wire semantics checked against timing71/common 2fabd83a551a56fc719d271e7695d22016a6bb00
src/replay.js and src/diffs.js. Arrays retain holes on remove, as in the JS reader.
"""
import argparse
import collections
import copy
import hashlib
import json
from pathlib import Path
import re
import zipfile

FRAME = re.compile(r'^(\d{5,11})(i?)\.json$')


def patch(target, changes):
    dest = copy.deepcopy(target)
    for action, path, values in changes:
        nodes = list(path) if isinstance(path, list) else path.split('.') if path else []
        parent = nodes[:-1] if action == 'change' else nodes
        local = dest
        for key in parent:
            local = local[int(key)] if isinstance(local, list) else local[key]
        if action == 'change':
            if not nodes:
                raise ValueError('unsupported root replacement')
            key = int(nodes[-1]) if isinstance(local, list) else nodes[-1]
            local[key] = copy.deepcopy(values[1])
        elif action in ('add', 'remove'):
            for key, value in values:
                if isinstance(local, list):
                    key = int(key)
                    if key < 0 or key > 100000:
                        raise ValueError('invalid array index')
                    if action == 'add':
                        local.extend([None] * max(0, key + 1 - len(local)))
                        local[key] = copy.deepcopy(value)
                    elif key < len(local):
                        local[key] = None
                elif action == 'add':
                    local[key] = copy.deepcopy(value)
                else:
                    local.pop(key, None)
        else:
            raise ValueError('unknown patch action: ' + str(action))
    return dest


def frames(path):
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len({e.filename for e in entries}) != len(entries):
            raise ValueError('duplicate archive member names')
        if sum(e.file_size for e in entries) > 2_000_000_000:
            raise ValueError('replay exceeds uncompressed safety limit')
        manifest = json.loads(archive.read('manifest.json'))
        if manifest.get('version') != 1:
            raise ValueError('unsupported manifest version')
        indexed = sorted((int(m[1]), bool(m[2]), e.filename) for e in entries
                         if (m := FRAME.fullmatch(e.filename)))
        state = None
        for timestamp, incremental, name in indexed:
            frame = json.loads(archive.read(name))  # zipfile verifies each member CRC.
            if incremental:
                if state is None:
                    raise ValueError('incremental frame before first keyframe')
                state = {**state, 'cars': patch(state['cars'], frame['cars']),
                         'session': patch(state['session'], frame['session']),
                         'messages': (frame['messages'] + state.get('messages', []))[:100],
                         'highlight': frame.get('highlight') or [], 'lastUpdated': timestamp * 1000}
            else:
                state = frame
                state.setdefault('manifest', manifest)
            yield timestamp, name, state


def observations(path, counts):
    previous = {}
    source_hash = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    for timestamp, name, state in frames(path):
        counts['frames'] += 1
        counts['incremental_frames' if name.endswith('i.json') else 'keyframes'] += 1
        manifest = state['manifest']
        columns = [c[0] for c in manifest['colSpec']]
        if len(set(columns)) != len(columns):
            raise ValueError('duplicate column labels')
        session = state.get('session', {})
        weather = dict(zip(manifest.get('trackDataSpec', []), session.get('trackData', [])))
        for row in state.get('cars', []):
            if not row:
                continue
            fields = dict(zip(columns, row))
            number = str(fields.get('Num', ''))
            if not number:
                raise ValueError('car number missing')
            # Keep raw value/display pairs. CSS is not a tyre-compound definition.
            context = {'fields': fields, 'weather': weather, 'flag_state': session.get('flagState')}
            if previous.get(number) == context:
                continue
            previous[number] = copy.deepcopy(context)
            counts['observations'] += 1
            counts['car:' + number] += 1
            yield {'source_sha256': source_hash, 'source_frame': name,
                   'replay_id': manifest.get('uuid'), 'observed_at_seconds': timestamp,
                   'car_number': number, **context,
                   'fit_status': 'held', 'lap_sector_assignment_verified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('replays', nargs='+')
    parser.add_argument('--output', default='.cache/lapsim/t71/reconstructed')
    args = parser.parse_args()
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    report = []
    for source in args.replays:
        path = Path(source)
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        output = root / (digest + '.jsonl')
        temp = output.with_suffix('.part')
        counts = collections.Counter()
        try:
            with temp.open('w') as out:
                for record in observations(path, counts):
                    out.write(json.dumps(record, ensure_ascii=False) + '\n')
            temp.replace(output)
            report.append({'source': str(path), 'sha256': digest, 'status': 'reconstructed_not_fitted',
                           'frames': counts['frames'], 'keyframes': counts['keyframes'],
                           'incremental_frames': counts['incremental_frames'],
                           'observations': counts['observations'],
                           'cars': sum(k.startswith('car:') for k in counts)})
        except (ValueError, KeyError, TypeError, IndexError, zipfile.BadZipFile) as error:
            temp.unlink(missing_ok=True)
            report.append({'source': str(path), 'sha256': digest, 'status': 'failed', 'error': str(error)})
    (root / 'summary.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    main()
