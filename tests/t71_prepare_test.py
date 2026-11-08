import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).parents[1] / 'scripts/sim'))
from t71_prepare import explicit_class, records
from t71_collect import session_type


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

    def test_missing_static_preserves_laps_and_surfaces_issues(self):
        data = {'service': {}, 'stint': {'17': [
            [1, 1700000000, 2, 1700000200, False, 0, 90, 0, 90, [[90, 1], ['broken']]]
        ]}}
        issues = []
        rows = list(records({'id': 'test', 'description': 'Super Pole'}, data, 'hash', issues))
        self.assertEqual(len(rows), 1)
        self.assertIsNone(rows[0]['class_candidate'])
        self.assertEqual(rows[0]['session_kind'], 'qualifying')
        self.assertEqual({i['reason'] for i in issues}, {'invalid_static_row', 'invalid_lap_row'})

    def test_inherited_stint_is_held_and_timestamp_correction_keeps_source(self):
        data = {'cars': {'cars': {'17': {'raceClass': 'LMP2', 'stints': [{
            'startTime': 1699990000, 'endTime': 1699991000,
            'laps': [{'laptime': 90, 'timestamp': 1700000090, 'flag': 'green'}]
        }]}}}}
        row = list(records({'id': 'test', 'startTime': 1700000000, 'duration': 600}, data, 'hash'))[0]
        self.assertIn('stint_session_interval_unverified', row['reasons'])
        self.assertFalse(row['session_assignment_verified'])
        self.assertEqual(row['source_timestamp'], 1700000090)
        self.assertEqual(row['timestamp_ms'], 1700000090000)

    def test_snapshot_is_not_fabricated_into_lap_history(self):
        issues = []
        self.assertEqual(list(records({'id': 'test'}, {'service': {}, 'state': {}}, 'hash', issues)), [])
        self.assertEqual(issues, [{'reason': 'snapshot_without_lap_history'}])

    def test_qualifying_and_practice_labels_override_series_sprint_name(self):
        for label in ('Sprint Cup - Super Pole', 'Q1', 'Hyper Pole'):
            self.assertEqual(session_type(label), 'qualifying')
        for label in ('Sprint Cup - FP1', 'Free Practice 2'):
            self.assertEqual(session_type(label), 'practice_or_test')


if __name__ == '__main__':
    unittest.main()
