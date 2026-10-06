#!/usr/bin/env python3
"""第二条样片旁白：复用首条生成器，逐句指定语速与停顿。"""
import asyncio
import importlib.util
from pathlib import Path

BASE = Path(__file__).parent
spec = importlib.util.spec_from_file_location(
    "video001_narration", BASE.parent / "001-customer-agent-three-questions" / "narration.py")
shared = importlib.util.module_from_spec(spec)
spec.loader.exec_module(shared)

SENTENCES = [
    "同一次改动，老错误修好了，原本正确的却错了。",
    "这样的优化，能通过吗？",
    "看一个合成的金额提取例子，结果只是演示。",
    "第一条，应付一百元，旧版却提取了一百二十。",
    "于是把提示词改成：取最后一个数字。",
    "这条对了。可另一条写着实付八十元，订单尾号二零二四。",
    "新版把尾号当金额，原本正确的八十元，变成了二零二四。",
    "一个旧错误消失，一个新错误出现。这版先退回。",
    "我把看起来更好，改成三个具体检查。",
    "第一组，保留这次要修的旧错误，确认它真的修好了。",
    "第二组，把原本正确的任务锁进清单，改完也要跑。",
    "第三组，留几条没用于调提示词的题，最后才检查。",
    "根据结果再改过，就补一组新的留出题。",
    "即使三组都过，也只说明在这些样本上过关。",
    "偶发错误要多跑几次，关键任务还要扩大覆盖。",
    "不用先建平台。一张表，写清输入、预期输出和通过条件。",
    "每次只改一个变量，同一批题，前后各跑一遍。",
    "发现新失败，就把它变成下次的保护样本。",
    "下一次说变好了，先拿出：修复了什么，没弄坏什么，什么还没验证。",
    "这张检查清单，你可以直接留给下一次改动。"
]

GAPS = [0.2, 0.85, 0.25, 0.35, 0.2, 0.25, 0.7, 0.75, 0.25, 0.35, 0.35, 0.3, 0.45, 0.55, 0.4, 0.25, 0.3, 0.45, 0.65, 0.0]
RATES = ['+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+0%', '+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+6%', '+0%', '+6%']
TAIL = 2.6


async def main() -> None:
    await shared.generate(BASE, SENTENCES, gaps=GAPS, rates=RATES, tail=TAIL)


if __name__ == "__main__":
    asyncio.run(main())
