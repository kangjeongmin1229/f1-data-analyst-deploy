import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

spec = importlib.util.spec_from_file_location('t71_replay', Path(__file__).parents[1] / 'scripts/sim/t71_replay.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReplayTest(unittest.TestCase):
    def test_array_deletion_does_not_shift_car_identity(self):
        original = [['17', 10], ['19', 11]]
        result = module.patch(original, [['remove', '', [[0, original[0]]]], ['change', [1, 1], [11, 12]]])
        self.assertEqual(result, [None, ['19', 12]])
        self.assertEqual(original, [['17', 10], ['19', 11]])

    def test_reconstruction_preserves_context_and_unknown_lap_assignment(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test.zip'
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('manifest.json', json.dumps({'version': 1, 'uuid': 'test',
                    'colSpec': [['Num'], ['Last'], ['T']], 'trackDataSpec': ['Air Temp']}))
                z.writestr('1000000000.json', json.dumps({'cars': [['17', 90, 'M']],
                    'session': {'flagState': 'green', 'trackData': [20]}, 'messages': []}))
                z.writestr('1000000001i.json', json.dumps({'cars': [['change', [0, 1], [90, 91]]],
                    'session': [['change', 'flagState', ['green', 'yellow']]], 'messages': []}))
            from collections import Counter
            rows = list(module.observations(path, Counter()))
            self.assertEqual([r['fields']['Last'] for r in rows], [90, 91])
            self.assertEqual(rows[1]['flag_state'], 'yellow')
            self.assertEqual(rows[1]['weather'], {'Air Temp': 20})
            self.assertFalse(rows[1]['lap_sector_assignment_verified'])

    def test_unsupported_version_is_not_silently_decoded(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'test.zip'
            with zipfile.ZipFile(path, 'w') as z:
                z.writestr('manifest.json', '{"version":2}')
            with self.assertRaises(ValueError):
                list(module.frames(path))


if __name__ == '__main__':
    unittest.main()
