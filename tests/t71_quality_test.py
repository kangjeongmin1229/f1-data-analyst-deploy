import importlib.util
from pathlib import Path
import unittest
import tempfile
import json
from unittest.mock import patch
import io
import urllib.error

spec = importlib.util.spec_from_file_location('t71', Path(__file__).parents[1] / 'scripts/sim/t71_collect.py')
t71 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(t71)


class QualityTests(unittest.TestCase):
    def test_tunnel_denial_stops_but_timeout_does_not(self):
        for message, denied in [('Tunnel connection failed: 403 Forbidden', True),
                                ('Network access was blocked by policy', True),
                                ('timed out', False)]:
            with tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                (root / 'raw').mkdir()
                with patch.object(t71, 'download', side_effect=urllib.error.URLError(message)) as call:
                    r = t71.collect_one({'id': 'a', 'series': 'F1 Testing', 'analysisFilename': 'a.json'}, root)
                self.assertEqual(r['access_blocked'], denied)
                self.assertEqual(call.call_count, 1)

    def test_partial_legacy_and_snapshot_remain_held(self):
        self.assertEqual(t71.audit({}, {'service': {}, 'stint': {}})['schema'], 'legacy')
        r = t71.audit({}, {'service': {}, 'state': {}})
        self.assertEqual(r['fit_status'], 'not_admitted')
        self.assertIn('replay_required', r['pending'])
        with self.assertRaises(ValueError):
            t71.audit({}, {})

    def test_bounded_batch_interleaves_new_work_and_fair_retries(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'audit.jsonl'
            path.write_text('\n'.join(json.dumps({'id': ident}) for ident in
                                      ['stuck', 'stuck', 'retry', 'done']) + '\n{"id":')
            selected = [{'id': ident} for ident in ['stuck', 'retry', 'done', 'new1', 'new2']]
            queue = t71.pending_records(selected, {'done': {}}, path)
            self.assertEqual([r['id'] for r in queue], ['new1', 'retry', 'new2', 'stuck'])
            self.assertEqual(len({r['id'] for r in queue}), 4)

    def test_restored_log_cannot_skip_missing_or_changed_evidence(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            raw = root / 'raw'
            raw.mkdir()
            payload = b'{}'
            (raw / 'good.json').write_bytes(payload)
            (raw / 'changed.json').write_bytes(b'[]')
            records = [{'id': ident, 'status': 'audited_not_fitted', 'audit_version': t71.AUDIT_VERSION,
                        'sha256': t71.hashlib.sha256(payload).hexdigest()} for ident in ['good', 'missing', 'changed']]
            log = root / 'audit.jsonl'
            log.write_text('\n'.join(map(json.dumps, records)))
            self.assertEqual(list(t71.completed_records(log, raw)), ['good'])

    def test_relative_source_is_scoped_and_url_encoding_preserved(self):
        base = 'https://s3.us-east-005.backblazeb2.com/t71-archive/'
        self.assertEqual(t71.source_url('abc_1.json'), base + 'abc_1.json')
        self.assertEqual(t71.source_url(base + '2026 race.json'), base + '2026%20race.json')
        for url in ('../abc.json', 'https://example.com/abc.json', '//example.com/abc.json'):
            self.assertIsNone(t71.source_url(url))

    def test_transient_failure_retried_but_policy_denial_not_retried(self):
        failure = urllib.error.HTTPError('https://example.test', 503, 'Unavailable', {}, None)
        with patch.object(t71.urllib.request, 'urlopen', side_effect=[failure, io.BytesIO(b'{}')]) as get, patch.object(t71.time, 'sleep') as sleep:
            self.assertEqual(t71.download('https://example.test'), b'{}')
            self.assertEqual(get.call_count, 2)
            sleep.assert_called_once_with(2)
        denied = urllib.error.HTTPError('https://example.test', 403, 'Blocked by policy', {}, None)
        with patch.object(t71.urllib.request, 'urlopen', side_effect=denied) as get, patch.object(t71.time, 'sleep') as sleep:
            with self.assertRaises(urllib.error.HTTPError):
                t71.download('https://example.test')
            self.assertEqual(get.call_count, 1)
            sleep.assert_not_called()

    def test_long_retry_after_does_not_trigger_immediate_retry(self):
        error = urllib.error.HTTPError('https://example.test', 429, 'Limit', {'Retry-After': '120'}, None)
        with patch.object(t71.urllib.request, 'urlopen', side_effect=error) as get, patch.object(t71.time, 'sleep') as sleep:
            with self.assertRaises(urllib.error.HTTPError):
                t71.download('https://example.test')
            self.assertEqual(get.call_count, 1)
            sleep.assert_not_called()

    def test_resume_ignores_failures_old_audits_and_partial_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'audit.jsonl'
            records = [
                {'id': 'good', 'status': 'audited_not_fitted', 'audit_version': t71.AUDIT_VERSION},
                {'id': 'retry', 'status': 'failed', 'audit_version': t71.AUDIT_VERSION},
                {'id': 'old', 'status': 'audited_not_fitted', 'audit_version': 1},
            ]
            path.write_text('\n'.join(map(json.dumps, records)) + '\n{"id":')
            self.assertEqual(list(t71.completed_records(path)), ['good'])

    def test_scope_includes_mixed_gt_events(self):
        for label in ('International GT Open', 'ADAC GT Masters', '24H Series',
                      'Super Taikyu', 'Le Mans Cup', 'GTWorldChEu pwrd by AWS Endurance Cup',
                      'Suzuka 10 Hours', 'California 8 Hours', '1006 km', 'LMP2',
                      'Official Test - 87º Edition des 24 Heures du Mans'):
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
