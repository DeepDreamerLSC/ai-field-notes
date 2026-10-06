"""Run without network or audio tools: python3 test_narration.py."""
import asyncio
import importlib.util
import json
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch


class NarrationTest(unittest.TestCase):
    def test_per_clip_settings_validation_and_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            calls = []

            class Communicate:
                def __init__(self, text, voice, rate):
                    self.text = text
                    self.payload = [text, voice, rate]
                    calls.append(self.payload)

                async def save(self, path):
                    assert not (base / "timing.json").exists()
                    Path(path).write_text(json.dumps(self.payload))
                    if self.text == "fail":
                        raise RuntimeError("synthesis failed")

            spec = importlib.util.spec_from_file_location(
                "narration002", Path(__file__).with_name("narration.py"))
            module = importlib.util.module_from_spec(spec)
            with patch.dict("sys.modules", {"edge_tts": types.SimpleNamespace(Communicate=Communicate)}):
                spec.loader.exec_module(module)
            module.BASE = base
            module.shared.probe = lambda path: 1.0
            module.GAPS[-1] = 99  # Last clip uses TAIL, regardless of its gap entry.
            asyncio.run(module.main())
            timing = base / "timing.json"
            meta = json.loads(timing.read_text())
            self.assertEqual(len(calls), 20)
            self.assertEqual(meta["sentences"], module.SENTENCES)
            self.assertEqual(meta["gaps"], dict(zip(meta["durations"], module.GAPS)))
            self.assertEqual(meta["rates"], dict(zip(meta["durations"], module.RATES)))
            self.assertEqual(meta["total_seconds"], round(20 + sum(module.GAPS[:-1]) + module.TAIL, 2))
            self.assertEqual((meta["gap"], meta["rate"], meta["tail"]), (0.35, "+6%", 2.6))
            self.assertEqual([i for i, rate in enumerate(module.RATES) if rate == "+0%"], [7, 18])
            for i, payload in enumerate(calls):
                self.assertEqual(payload, [module.SENTENCES[i], module.shared.VOICE, module.RATES[i]])
                self.assertEqual(json.loads((base / "narration" / f"s{i+1:02d}.mp3").read_text()), payload)

            previous_timing = timing.read_bytes()
            for options in [{"gaps": [0]}, {"rates": ["+6%"]}, {"tail": float("nan")},
                            {"tail": -1}, {"gaps": [float("inf")] * 20}, {"gaps": [-0.1] * 20}]:
                with self.subTest(options=options), self.assertRaises(ValueError):
                    asyncio.run(module.shared.generate(base, module.SENTENCES, **options))
                self.assertEqual(timing.read_bytes(), previous_timing)
                self.assertEqual(len(calls), 20)
            with self.assertRaises(ValueError):
                asyncio.run(module.shared.generate(base, []))
            self.assertEqual(timing.read_bytes(), previous_timing)

            second = base / "narration" / "s02.mp3"
            previous_second = second.read_bytes()
            module.SENTENCES[1] = "fail"
            with self.assertRaisesRegex(RuntimeError, "synthesis failed"):
                asyncio.run(module.main())
            self.assertFalse(timing.exists())
            self.assertEqual(second.read_bytes(), previous_second)
            self.assertEqual(list((base / "narration").glob("*.tmp.mp3")), [])


if __name__ == "__main__":
    unittest.main()
