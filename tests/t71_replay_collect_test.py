import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import urllib.error
import zipfile

spec = importlib.util.spec_from_file_location('replay_collect', Path(__file__).parents[1] / 'scripts/sim/t71_replay_collect.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
META = {'id': 'example', 'filename': 'https://s3.us-east-005.backblazeb2.com/t71-archive/example.zip'}


class DownloadTests(unittest.TestCase):
    def test_access_denial_stops_batch_without_retry(self):
        denied = urllib.error.HTTPError(META['filename'], 403, 'Denied', {}, None)
        with tempfile.TemporaryDirectory() as folder, patch.object(module.urllib.request, 'urlopen', side_effect=denied) as call:
            result = module.acquire(META, Path(folder))
            self.assertTrue(result['stop'])
            self.assertEqual(call.call_count, 1)
            self.assertEqual(list(Path(folder).iterdir()), [])

    def test_html_and_oversize_response_are_never_cached(self):
        for payload, limit in [(b'<html>Error</html>', 1000), (b'x' * 100, 10)]:
            with tempfile.TemporaryDirectory() as folder, patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(payload)), patch.object(module, 'MAX_FILE_BYTES', limit):
                self.assertEqual(module.acquire(META, Path(folder))['status'], 'failed')
                self.assertEqual(list(Path(folder).iterdir()), [])

    def test_valid_archive_is_reused(self):
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as z:
            z.writestr('manifest.json', json.dumps({'version': 1}))
        with tempfile.TemporaryDirectory() as folder, patch.object(module.urllib.request, 'urlopen', return_value=io.BytesIO(buffer.getvalue())) as call:
            first = module.acquire(META, Path(folder))
            second = module.acquire(META, Path(folder))
            self.assertEqual(first['status'], 'downloaded_crc_checked')
            self.assertEqual(first['sha256'], second['sha256'])
            self.assertEqual(call.call_count, 1)


if __name__ == '__main__':
    unittest.main()
