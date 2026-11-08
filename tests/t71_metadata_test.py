import sys
from pathlib import Path
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts/sim"))
from t71_collect import metadata_family
from t71_coverage import inventory

class GenericFeedTests(unittest.TestCase):
    def test_generic_asian_le_mans_is_in_coverage(self):
        meta = {"id": "missing-feed", "series": "timeservice.nl feed", "description": "Asian Le Mans Series - Qualifying (LMP2 & LMP3)"}
        self.assertEqual(metadata_family(meta), "lmgt3_candidate")
        self.assertEqual(next(inventory([meta], Path("/nonexistent")))["scope_status"], "candidate")

    def test_event_name_does_not_promote_support_or_virtual_series(self):
        for series, description in [("GT4 European Series", "Asian Le Mans Series - Race"), ("iRacing", "Asian Le Mans Series - Race"), ("timeservice.nl feed", "Porsche GT3 Cup - Race")]:
            self.assertIsNone(metadata_family({"series": series, "description": description}))
