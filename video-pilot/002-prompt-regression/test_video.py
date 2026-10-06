#!/usr/bin/env python3
"""Check the synthetic decision and committed timing/narration identity."""
import json
import math
import re
import unittest
from pathlib import Path
import narration

SRC = Path(__file__).parent.parent / '001-customer-agent-three-questions/remotion/src'


class VideoContract(unittest.TestCase):
    def test_decision_and_timing(self):
        example = json.loads((SRC / 'video002-case.json').read_text())
        self.assertTrue(example['synthetic'])
        self.assertFalse(example['modelMeasured'])
        a, b = example['samples']
        for sample in (a, b):
            self.assertEqual(sample['after'], int(re.findall(r'\d+', sample['input'])[-1]))
        self.assertNotEqual(a['before'], a['expected'])
        self.assertEqual(a['after'], a['expected'])
        self.assertEqual(b['before'], b['expected'])
        self.assertNotEqual(b['after'], b['expected'])
        timing = json.loads((SRC / 'video002-timing.json').read_text())
        ids = [f's{i:02d}' for i in range(1, len(narration.SENTENCES) + 1)]
        self.assertEqual(sorted(timing['durations']), ids)
        self.assertEqual(timing['sentences'], narration.SENTENCES)
        self.assertEqual(timing['gaps'], dict(zip(ids, narration.GAPS)))
        self.assertEqual(timing['rates'], dict(zip(ids, narration.RATES)))
        self.assertEqual(timing['tail'], narration.TAIL)
        self.assertTrue(all(math.isfinite(d) and d > 0 for d in timing['durations'].values()))
        total = sum(timing['durations'].values()) + sum(narration.GAPS[:-1]) + narration.TAIL
        self.assertAlmostEqual(timing['total_seconds'], total, delta=0.005)


if __name__ == '__main__':
    unittest.main()
