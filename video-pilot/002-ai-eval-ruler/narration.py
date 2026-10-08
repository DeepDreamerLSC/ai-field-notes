#!/usr/bin/env python3
"""002《AI 这次答对了，你凭什么确定它真的变好了？》旁白生成（复用 001 管线）"""
import asyncio, json, subprocess, time
from pathlib import Path

import edge_tts

VOICE = "zh-CN-YunxiNeural"   # 与 001 一致（所有者选定）
RATE = "+6%"                  # 与 001 一致
GAP = 0.35
TAIL = 0.90

SENTENCES = [
    "你修改了一个提示词，测试的时候，AI 答对了。",
    "你觉得优化成功了——但很可能，另外十道题里，有三道反而答错了。",
    "这不是抬杠，是所有 Agent 迭代都躲不开的坑：单次答对，只是抽样。",
    "改一版、跑几条、看着不错就上线，过几天老问题换个样子回来。",
    "不是改得不够勤，是没有一把固定的尺子，分不清真进步和碰运气。",
    "我们的做法很朴素：一次改动，三组样本，前后各跑一遍。",
    "第一组，修复样本——这次要修的老失败，改完应该全过。",
    "第二组，回归保护样本——之前一直正常的任务，改完也必须全过。",
    "挂了，就是修好了 A、伤了 B，这版直接打回。",
    "第三组，留出样本——迭代过程中从没看过的题，最后再跑，防止你把答案“背”进了提示词。",
    "注意：三组都过，也只是这一版过关——不等于整体变好了。",
    "展开说是六步：失败记录、行为定义、区分性样本、可重复测量、对照、受控改动。",
    "浓缩成一句：固定样本、固定判据、一次只动一个变量。",
    "这不等于要建评测平台。",
    "低风险的一次性任务，可以从很少几条固定样本起步；",
    "但样本够不够，取决于风险和覆盖——任务越关键，尺子就要越长。",
    "下次想说“它真的变好了”，先看三组结果：修掉的，没伤到的，和没见过的。",
]

BASE = Path(__file__).parent


def probe(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


async def main() -> None:
    t0 = time.time()
    aud = BASE / "narration"
    aud.mkdir(exist_ok=True)
    for i, text in enumerate(SENTENCES, 1):
        out = aud / f"s{i:02d}.mp3"
        if not out.exists():
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(out))
    durations = {f"s{i:02d}": probe(aud / f"s{i:02d}.mp3") for i in range(1, len(SENTENCES) + 1)}
    total = sum(durations.values()) + GAP * (len(SENTENCES) - 1) + TAIL
    chars = sum(len(s) for s in SENTENCES)
    meta = {
        "voice": VOICE, "rate": RATE, "gap": GAP, "tail": TAIL,
        "sentences": SENTENCES, "durations": durations, "chars": chars,
        "speech_seconds": round(sum(durations.values()), 2),
        "total_seconds": round(total, 2),
        "gen_seconds": round(time.time() - t0, 1),
    }
    (BASE / "timing.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"chars={chars} speech={meta['speech_seconds']}s total≈{meta['total_seconds']}s")


if __name__ == "__main__":
    asyncio.run(main())
