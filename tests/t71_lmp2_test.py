import io
import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts/sim'))
from t71_lmp2 import extract


class Lmp2Tests(unittest.TestCase):
    def row(self, group='lmp2', lap=0):
        return {'class_candidate': group, 'record_id': ['mixed', '22', 0, lap],
                'source_sha256': 'hash', 'series': 'European Le Mans Series',
                'status': 'held', 'lap_seconds': 5000, 'reasons': ['conditions_unverified']}

    def test_mixed_series_and_large_residual_are_preserved(self):
        out = io.StringIO()
        groups, count = extract([self.row(), self.row(lap=1), self.row('lmp3'),
                                 self.row('hypercar'), self.row(None)], {}, out)
        self.assertEqual(count, 2)
        self.assertEqual(len(out.getvalue().splitlines()), 2)
        self.assertEqual(groups[0]['lap_records'], 2)
        self.assertEqual(groups[0]['split'], 'unassigned')
        self.assertIsNone(groups[0]['regulation_year'])
        self.assertIsNone(groups[0]['chassis'])
        self.assertEqual(groups[0]['fit_status'], 'not_admitted')

    def test_recording_year_does_not_assert_regulation_year(self):
        groups, _ = extract([self.row()], {'mixed': {'startTime': 1700000000}}, io.StringIO())
        self.assertEqual(groups[0]['recording_year'], 2023)
        self.assertIsNone(groups[0]['regulation_year'])

    def test_conflicting_provenance_fails(self):
        other = {**self.row(lap=1), 'source_sha256': 'different'}
        with self.assertRaises(ValueError):
            extract([self.row(), other], {}, io.StringIO())


if __name__ == '__main__':
    unittest.main()
