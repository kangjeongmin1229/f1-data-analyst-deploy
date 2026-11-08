"""Download replay ZIP evidence in resumable batches; never fit from downloads.

Run separately from analysis acquisition; acquire replay-collection.lock in the caller.
Default batch: 10 missing replays. Use --limit 0 to attempt the whole candidate queue.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import urllib.error
import urllib.parse
import urllib.request
import zipfile

MAX_FILE_BYTES = 512 * 1024 * 1024
MIN_FREE_BYTES = 2 * 1024 * 1024 * 1024


def acquire(meta, root):
    ident = str(meta['id'])
    result = {'id': ident, 'series': meta.get('series'), 'description': meta.get('description'),
              'fit_status': 'not_fitted'}
    target = root / (hashlib.sha256(ident.encode()).hexdigest() + '.zip')
    temp = target.with_suffix('.part')
    try:
        if not target.exists():
            url = meta.get('filename')
            if not url:
                return {**result, 'status': 'missing_replay_url'}
            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme != 'https' or parsed.hostname != 's3.us-east-005.backblazeb2.com' or not parsed.path.startswith('/t71-archive/'):
                return {**result, 'status': 'unrecognized_source_url'}
            url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc,
                urllib.parse.quote(urllib.parse.unquote(parsed.path), safe='/'), parsed.query, ''))
            if shutil.disk_usage(root).free < MIN_FREE_BYTES + MAX_FILE_BYTES:
                return {**result, 'status': 'disk_limit', 'stop': True}
            req = urllib.request.Request(url, headers={'User-Agent': 'Kongboda-model-validation/1.0'})
            count = 0
            with urllib.request.urlopen(req, timeout=60) as response, temp.open('wb') as out:
                while chunk := response.read(1024 * 1024):
                    count += len(chunk)
                    if count > MAX_FILE_BYTES:
                        raise ValueError('replay exceeds 512 MiB per-file limit')
                    out.write(chunk)
            validate(temp)
            temp.replace(target)
        else:
            validate(target)
        h = hashlib.sha256()
        with target.open('rb') as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b''):
                h.update(chunk)
        return {**result, 'status': 'downloaded_crc_checked', 'path': str(target),
                'sha256': h.hexdigest(), 'bytes': target.stat().st_size}
    except urllib.error.HTTPError as error:
        return {**result, 'status': 'failed', 'error': str(error), 'http_status': error.code,
                'stop': error.code in (401, 403, 429)}
    except (OSError, ValueError, KeyError, zipfile.BadZipFile) as error:
        return {**result, 'status': 'failed', 'error': str(error)}
    finally:
        temp.unlink(missing_ok=True)


def validate(path):
    with zipfile.ZipFile(path) as archive:
        entries = archive.infolist()
        if len({e.filename for e in entries}) != len(entries):
            raise ValueError('duplicate ZIP members')
        if sum(e.file_size for e in entries) > 2_000_000_000:
            raise ValueError('uncompressed replay exceeds 2 GB limit')
        if archive.testzip() is not None:
            raise ValueError('ZIP CRC failed')
        if json.loads(archive.read('manifest.json')).get('version') != 1:
            raise ValueError('unsupported replay manifest version')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--metadata', default='.cache/lapsim/t71/selected-metadata.json')
    parser.add_argument('--output', default='.cache/lapsim/t71/replays')
    parser.add_argument('--limit', type=int, default=10)
    args = parser.parse_args()
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    metadata = json.loads(Path(args.metadata).read_text())
    # Latest conditions first; no timestamp is treated as proof of regulation era.
    metadata.sort(key=lambda m: m.get('startTime', 0), reverse=True)
    completed = set()
    log_path = root / 'downloads.jsonl'
    if log_path.exists():
        for line in log_path.read_text().splitlines():
            try:
                record = json.loads(line)
                path = Path(record.get('path', ''))
                if record.get('status') == 'downloaded_crc_checked' and path.is_file():
                    completed.add(record['id'])
            except ValueError:
                pass
    pending = [m for m in metadata if m['id'] not in completed]
    if args.limit:
        pending = pending[:args.limit]
    with log_path.open('a') as log:
        log.write('\n')
        for meta in pending:
            result = acquire(meta, root)
            log.write(json.dumps(result, ensure_ascii=False) + '\n')
            log.flush()
            print(json.dumps(result), flush=True)
            if result.get('stop'):
                break


if __name__ == '__main__':
    main()
