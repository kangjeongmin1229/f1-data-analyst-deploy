import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts/sim'))
from t71_prepare import explicit_class, records


class PrepareTests(unittest.TestCase):
    def test_cup_and_ambiguous_classes_are_not_assumed_gt3(self):
        for value in ('GT3 Cup Pro-Am', 'GT3C', 'PRO', 'GTP', 'LMP3', 'DPi'):
            self.assertIsNone(explicit_class(value))
        self.assertEqual(explicit_class('LMP2 P/A'), 'lmp2')
        self.assertEqual(explicit_class('Hypercar H'), 'hypercar')

    def test_duplicate_lap_numbers_remain_distinct_and_missing_times_are_held(self):
        lap = {'lapNumber': 1, 'laptime': 90, 'flag': 'green'}
        data = {'cars': {'cars': {'17': {'raceClass': 'LMP2', 'stints': [{'laps': [lap, lap]}]}}}}
        rows = list(records({'id': 'session', 'description': 'Qualifying'}, data, 'hash'))
        self.assertNotEqual(rows[0]['record_id'], rows[1]['record_id'])
        self.assertTrue(all(r['status'] == 'held' and r['timestamp_ms'] is None for r in rows))


if __name__ == '__main__':
    unittest.main()
