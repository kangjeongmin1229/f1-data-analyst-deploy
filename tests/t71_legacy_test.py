import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('legacy', Path(__file__).parents[1] / 'scripts/sim/t71_legacy.py')
legacy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(legacy)


class LegacyTests(unittest.TestCase):
    def test_wire_fields_and_missing_values_are_preserved(self):
        data = {'static': {'17': ['LMP2', 'Team', 'Oreca']},
                'stint': {'17': [[1, 1700000000, 3, 1700000300, False, 0, 90, 1, 95,
                                  [[90, 1], [110, 4], [91, 99]]]]}}
        result = legacy.decode(data)
        car = result['cars']['cars']['17']
        self.assertEqual(car['raceClass'], 'LMP2')
        laps = car['stints'][0]['laps']
        self.assertEqual([x['flag'] for x in laps], ['green', 'yellow', 'unknown'])
        self.assertTrue(all(x['timestamp'] is None and x['lapNumber'] is None for x in laps))
        self.assertEqual(result['fit_status'], 'not_admitted')

    def test_bad_stint_does_not_erase_other_cars(self):
        result = legacy.decode({'static': {'1': ['GT3', 'A', 'B'], '2': ['LMP2', 'C', 'D']},
                                'stint': {'1': [['broken']], '2': []}})
        self.assertEqual(len(result['cars']['cars']), 2)
        self.assertEqual(result['issues'][0]['reason'], 'invalid_stint_row')


if __name__ == '__main__':
    unittest.main()
