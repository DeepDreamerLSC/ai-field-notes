#!/usr/bin/env python3
"""旁白生成：18 句 edge-tts + 时长测量 → timing.json（静态图+剪辑基线的音频轨）"""
import asyncio, json, subprocess, sys, time
from pathlib import Path

import edge_tts

VOICE = "zh-CN-YunxiNeural"   # 男声，知识区口吻；校对记录进 LEDGER
RATE = "+6%"                  # 所有者选定（2026-10-06，试听样张"语速_快6"）
GAP = 0.35                    # 句间停顿（秒）
TAIL = 0.90                   # 末句收尾保留

SENTENCES = [
    "如果客户找到我，说想给公司做一个 AI Agent，",
    "我通常不会先讨论模型。我会先确认三件事，",
    "因为他需要的，可能根本不是 Agent。",
    "一个常见的开局是这样的：选模型、搭知识库、上框架，demo 做出来很惊艳。",
    "但每一步都在回答“怎么做”，没有人回答“做什么、算成功”。",
    "等到上线，才发现数据没对上、权限没想清楚、效果没法衡量。",
    "所以我先带他过一张诊断图，三个问题。",
    "第一问，流程：这段业务今天没有 AI，人是怎么做的？一步一步画出来。",
    "第二问，数据与边界：每一步要用的信息，拿得到吗、质量够吗？",
    "拿不到的部分，系统要么答不了，要么只能猜，猜错了算谁的？",
    "顺手把权限也定下来：哪些动作允许它自己做，哪些必须留给人；出了异常，谁兜底。",
    "第三问，验收：做完之后，哪个数字变了？说不清指标，就没法验证。",
    "三问答完，选型反而是最简单的一步：规则写得死的，普通自动化就够了；",
    "局部几步要理解语义的，加大模型组件。",
    "至于 Agent，当任务需要多步规划、边执行边决定用什么工具时，才值得考虑。",
    "要不要走到这一格，看图说话：图里没有这类需求，就停在前两格。",
    "Agent 是自动化的最后一格，不是第一格。",
    "下一期讲：怎么切出第一段最小、可验证的工作负载。",
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
        print(f"s{i:02d} ok")
    durations = {f"s{i:02d}": probe(aud / f"s{i:02d}.mp3") for i in range(1, len(SENTENCES) + 1)}
    total = sum(durations.values()) + GAP * (len(SENTENCES) - 1) + TAIL
    chars = sum(len(s) for s in SENTENCES)
    meta = {
        "voice": VOICE, "rate": RATE, "gap": GAP, "tail": TAIL,
        "sentences": SENTENCES, "durations": durations,
        "chars": chars,
        "speech_seconds": round(sum(durations.values()), 2),
        "total_seconds": round(total, 2),
        "gen_seconds": round(time.time() - t0, 1),
    }
    (BASE / "timing.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"chars={chars} speech={meta['speech_seconds']}s total≈{meta['total_seconds']}s "
          f"(rate≈{chars / sum(durations.values()):.1f}字/秒)")


if __name__ == "__main__":
    asyncio.run(main())
