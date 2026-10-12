# 样片工程 · 002《AI 这次答对了，你凭什么确定它真的变好了？》

> 对应 Issue #3（SCRIPT-P0-B v2）/ #6。制作方法：采用 [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft)（Apache-2.0）作为动效词汇库 + 审美准则 + 声音设计方法论（详见 LEDGER.md 采用记录）。状态：**待所有者人工审片，不构成发布授权**。

## 结构

- `remotion/src/index.jsx` — 全部场景（答题卡/循环环/三组样本/打回印章/六步/尺子/收尾三词）+ 20 条声明式 SFX 钉帧表 + BGM 开关（`--props='{"bgm":false}'` 渲无 BGM 版）
- `narration.py` — edge-tts 旁白（17 句，Yunxi +6%，与 001 一致）
- `LEDGER.md` — 生产账本（shotcraft 采用记录 / 成本 / 两轮视觉验收 / 许可边界）

音频资产（SFX/BGM）不入库：源自 video-shotcraft `assets/audio/`（Mixkit License 为主，个别文件商用前需按其 ATTRIBUTION.md 复核），复现时从 skill 仓库复制所需文件到 `remotion/public/audio/`（清单见 index.jsx 的 SFX 表与 Bgm 组件）。
