import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('t71', Path(__file__).parents[1] / 'scripts/sim/t71_collect.py')
t71 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t71)


class QualityTests(unittest.TestCase):
    def test_scope_includes_mixed_gt_events(self):
        for label in ('International GT Open', 'ADAC GT Masters', '24H Series',
                      'Super Taikyu', 'Le Mans Cup', 'GTWorldChEu pwrd by AWS Endurance Cup'):
            self.assertIsNotNone(t71.series_family(label), label)
        self.assertIsNone(t71.series_family('IMSA iRacing Pro Series'))

    def test_seconds_corrected_only_with_recording_evidence(self):
        self.assertEqual(t71.normalize_epoch(1700000010, 1700000000, 100),
                         (1700000010000, 'epoch_seconds_to_milliseconds'))
        self.assertEqual(t71.normalize_epoch(1700000010000, 1700000000, 100),
                         (1700000010000, None))
        self.assertIsNone(t71.normalize_epoch(12, 1700000000, 100)[0])

    def test_slow_laps_and_repeated_qualifying_numbers_not_deleted(self):
        meta = {'description': '6 Hours - Qualifying', 'startTime': 1700000000, 'duration': 3600}
        laps = [{'lapNumber': 1, 'laptime': v, 'timestamp': 1700000100000, 'flag': 'green'}
                for v in (90, 200, -1)]
        data = {'cars': {'cars': {'17': {'stints': [{'laps': laps}]}}}}
        result = t71.audit(meta, data)
        self.assertEqual(result['session_kind'], 'qualifying')
        self.assertEqual(result['counts']['structurally_valid_laps'], 2)
        self.assertEqual(result['counts']['invalid_laptime'], 1)
        self.assertEqual(result['fit_status'], 'not_admitted')

    def test_legacy_is_held_not_called_corrupt(self):
        result = t71.audit({}, {'service': {}, 'lap': {}, 'stint': {}})
        self.assertIn('legacy_schema_adapter', result['pending'])


if __name__ == '__main__':
    unittest.main()
