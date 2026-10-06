# 样片工程 · 001《客户说想做 AI Agent，我会先问他三个问题》

> 对应 Issue #2（脚本）/ #6（生产试点）。当前状态：**v2.2，待所有者人工审片；不构成发布授权**。

## 工程内容

- `remotion/` — Remotion 4.x 工程（16:9，1920×1080，30fps）：`src/index.jsx` 单文件含全部场景组件与动效，`src/timing.json` 为分句时间轴（由 narration.py 生成）
- `narration.py` — edge-tts 分句旁白生成器（音色 `zh-CN-YunxiNeural`，语速 `+6%`，所有者 2026-10-06 试听选定；18 句文本内嵌于脚本）
- `frames.py` / `build.py` — v1 静态图 + ffmpeg 基线管线（已被 Remotion 版替代，保留作 #6 要求的"渲染器 vs 简单剪辑"成本对照证据）
- `LEDGER.md` — 生产账本：所有者裁定记录、两版成本与返工、视觉验收三轮记录

## 复现步骤

```bash
# 1. 旁白（需网络，edge-tts）
python3 -m venv .venv && .venv/bin/pip install pillow edge-tts
.venv/bin/python narration.py                       # 生成 narration/*.mp3 + timing.json

# 2. 渲染（首次会下载 Chrome Headless Shell）
cp timing.json remotion/src/
mkdir -p remotion/public && cp -r narration remotion/public/
cd remotion && npm install && npx remotion render src/index.jsx Video ../out.mp4
```

## 刻意不入库的文件

- **成片 MP4 / 旁白 MP3**：可再生成产物；且成片放入公开仓库等同于发布，发布权归所有者
- `node_modules/`、抽帧 `stills/`、中间 `clips/`：构建产物
