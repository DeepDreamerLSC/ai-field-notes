#!/usr/bin/env python3
"""Check the synthetic decision and committed timing/narration identity."""
import hashlib
import json
import math
import re
import unittest
from pathlib import Path
import narration

SRC = Path(__file__).parent.parent / '001-customer-agent-three-questions/remotion/src'


class VideoContract(unittest.TestCase):
    def test_decision_and_timing(self):
        # The scene boundaries are intentionally specific to this 20-line story.
        self.assertEqual(len(narration.SENTENCES), 20)
        script = (SRC.parents[3] / 'editorial/SCRIPT-P0-B.md').read_text()
        storyboard = re.findall(r'^\| (s\d{2}) \| ([^|]+) \|', script, re.M)
        self.assertEqual(storyboard, [(f's{i:02d}', text) for i, text in enumerate(narration.SENTENCES, 1)])
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
        self.assertEqual(sorted(timing['words']), ids)
        self.assertEqual(sorted(timing['clip_sha256']), ids)
        clean = lambda text: re.sub(r'[^\w]', '', text)
        for id, text in zip(ids, narration.SENTENCES):
            words = timing['words'][id]
            self.assertEqual(clean(''.join(w['text'] for w in words)), clean(text))
            self.assertTrue(all(math.isfinite(w['start']) and math.isfinite(w['end']) and 0 <= w['start'] < w['end'] for w in words))
            self.assertTrue(all(b['start'] >= a['end']-0.001 for a,b in zip(words, words[1:])))
            self.assertLessEqual(words[-1]['end'], timing['durations'][id]+0.1)
            clip = SRC.parent/'public/narration002'/f'{id}.mp3'
            # Audio is deliberately kept outside Git. Verify its identity when present.
            if clip.exists():
                self.assertEqual(hashlib.sha256(clip.read_bytes()).hexdigest(), timing['clip_sha256'][id])
        anchors = re.findall(r"at\((\d+), '([^']+)'\)", (SRC/'video002.jsx').read_text())
        self.assertTrue(anchors)
        for idx, phrase in anchors:
            self.assertIn(clean(phrase), clean(narration.SENTENCES[int(idx)]))
        self.assertTrue(all(math.isfinite(d) and d > 0 for d in timing['durations'].values()))
        total = sum(timing['durations'].values()) + sum(narration.GAPS[:-1]) + narration.TAIL
        self.assertAlmostEqual(timing['total_seconds'], total, delta=0.005)


if __name__ == '__main__':
    unittest.main()
