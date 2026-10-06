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
    def test_regeneration_and_failed_generation(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)

            class Communicate:
                def __init__(self, text, voice, rate):
                    self.text = text
                    self.payload = json.dumps([text, voice, rate])

                async def save(self, path):
                    self_test.assertFalse((base / "timing.json").exists())
                    Path(path).write_text(self.payload)
                    if self.text == "fail":
                        raise RuntimeError("synthesis failed after partial output")

            self_test = self
            spec = importlib.util.spec_from_file_location(
                "narration", Path(__file__).with_name("narration.py"))
            module = importlib.util.module_from_spec(spec)
            with patch.dict("sys.modules", {"edge_tts": types.SimpleNamespace(Communicate=Communicate)}):
                spec.loader.exec_module(module)
            module.BASE = base
            module.probe = lambda path: 1.0
            module.SENTENCES = ["original", "second"]
            asyncio.run(module.main())

            module.SENTENCES[0] = "changed"
            module.RATE = "+20%"
            module.VOICE = "other voice"
            asyncio.run(module.main())
            audio = base / "narration" / "s01.mp3"
            self.assertEqual(json.loads(audio.read_text()), ["changed", "other voice", "+20%"])
            meta = json.loads((base / "timing.json").read_text())
            self.assertEqual(meta["sentences"], module.SENTENCES)
            self.assertEqual((meta["voice"], meta["rate"]), (module.VOICE, module.RATE))
            self.assertEqual(meta["gaps"], {"s01": module.GAP, "s02": module.GAP})
            self.assertEqual(meta["rates"], {"s01": module.RATE, "s02": module.RATE})
            self.assertEqual(meta["total_seconds"], round(2 + module.GAP + module.TAIL, 2))

            second = base / "narration" / "s02.mp3"
            previous_second = second.read_bytes()
            module.SENTENCES = ["new first", "fail"]
            with self.assertRaisesRegex(RuntimeError, "synthesis failed"):
                asyncio.run(module.main())
            self.assertEqual(json.loads(audio.read_text())[0], "new first")
            self.assertEqual(second.read_bytes(), previous_second)
            self.assertFalse((base / "timing.json").exists())
            self.assertEqual(list((base / "narration").glob("*.tmp.mp3")), [])


if __name__ == "__main__":
    unittest.main()
