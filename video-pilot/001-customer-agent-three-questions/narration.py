#!/usr/bin/env python3
"""旁白生成：18 句 edge-tts + 时长测量 → timing.json（静态图+剪辑基线的音频轨）"""
import asyncio, json, subprocess, time
from pathlib import Path

import edge_tts

VOICE = "zh-CN-YunxiNeural"   # 男声，知识区口吻；校对记录进 LEDGER
RATE = "+6%"                  # 所有者选定（2026-10-06，试听样张"语速_快6"）
GAP = 0.35                    # 句间停顿（秒）
TAIL = 0.90                   # 末句收尾保留

SENTENCES = [
    "客户说，想给公司做一个 AI Agent。",
    "我先问：流程怎么走，数据和权限够不够，怎样算成功？",
    "三问答完，再选工具。",
    "demo 惊艳，不代表能上线。",
    "做什么、谁批准、怎样验收，才是起点。",
    "拿订单核对举个虚构例子。",
    "第一问，流程。没有 AI 时，人是怎么做的？",
    "接单、查库存、核对、确认，先画出来。",
    "第二问，数据与边界。信息拿得到吗？哪些动作要人批准？",
    "缺库存信息，就停下或转人工，不让模型猜。",
    "自动核对可以；改单、承诺交期，要人批准；异常转人工。",
    "第三问，验收。先记核对耗时，再设试点目标；差错不能增加。",
    "三问答完再选型：固定规则，用普通自动化。",
    "局部需要理解文字，加一个模型组件。",
    "需要边执行边决定下一步、调用什么工具，再考虑 Agent。",
    "没有这类需求，就停在前两格。",
    "先把业务问清楚，再决定要不要 Agent。",
    "下一期：AI 这次答对了，怎样确认它真的变好了？",
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
    timing_path = BASE / "timing.json"
    timing_path.unlink(missing_ok=True)
    aud = BASE / "narration"
    aud.mkdir(exist_ok=True)
    for i, text in enumerate(SENTENCES, 1):
        out = aud / f"s{i:02d}.mp3"
        tmp = out.with_suffix(".tmp.mp3")
        try:
            await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(tmp))
            tmp.replace(out)
        finally:
            tmp.unlink(missing_ok=True)
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
    timing_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(f"chars={chars} speech={meta['speech_seconds']}s total≈{meta['total_seconds']}s "
          f"(rate≈{chars / sum(durations.values()):.1f}字/秒)")


if __name__ == "__main__":
    asyncio.run(main())
