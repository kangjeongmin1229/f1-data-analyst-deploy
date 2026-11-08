import hashlib
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts/sim'))
from t71_coverage import inventory


class CoverageTests(unittest.TestCase):
    def test_all_catalogue_entries_accounted_for_without_assumed_exclusion(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'raw').mkdir()
            (root / 'raw' / (hashlib.sha256(b'id:1').hexdigest() + '.json')).write_text('{}')
            rows = list(inventory([
                {'id': 'id:1', 'series': 'Suzuka 10 Hours', 'description': 'FP1'},
                {'id': 'unknown', 'series': 'Circuit name', 'description': 'Race 2'}
            ], root))
        self.assertEqual(len(rows), 2)
        self.assertTrue(rows[0]['raw_cached'])
        self.assertEqual(rows[0]['session_kind'], 'practice_or_test')
        self.assertEqual(rows[1]['scope_status'], 'metadata_review_required')
        self.assertFalse(rows[1]['raw_cached'])


if __name__ == '__main__':
    unittest.main()
