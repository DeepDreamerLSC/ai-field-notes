# 样片工程 · 001《客户说想做 AI Agent，我会先问他三个问题》

> 对应 Issue #2 / #6。当前制作范围为 **v3 本地审片版**，所有者已授权修改 PR 并制作；最终审片与公开发布待所有者确认。

## 工程内容

- `narration.py`：18 句旁白的权威文本；音色 `zh-CN-YunxiNeural`、语速 `+6%`，生成音频与 `timing.json`。
- `remotion/`：1920×1080、16:9、30fps；`src/index.jsx` 包含本片场景，消费生成的时间轴与音频。
- `editorial/SCRIPT-P0-A.md`：v3 逐句人工审阅稿与分镜；修改时核对它与旁白权威文本一致。
- `frames.py` / `build.py`：v1 9:16 静态基线，保留作历史成本对照；不是当前渲染入口。
- `LEDGER.md`：所有者指示、版本、实际成本、返工与审片记录。

## 复现步骤

在本目录执行；任一步失败时先修复，不继续复制旧时间轴或渲染。已验证制作环境为 macOS、Node 26、npm 11；需 Python 3、`ffmpeg` / `ffprobe` 在 PATH（当前旁白测时使用 `ffprobe`，静态基线使用 `ffmpeg`）。画面使用系统中文字体；换系统或字体后重新检查布局。TTS 和首次下载 Chrome Headless Shell 需要网络。

```bash
set -e
python3 -m venv .venv
.venv/bin/pip install edge-tts==7.2.8
.venv/bin/python test_narration.py
.venv/bin/python narration.py

cp timing.json remotion/src/timing.json
mkdir -p remotion/public
cp -R narration remotion/public/
cd remotion
npm ci
npx remotion render src/index.jsx Video ../001-customer-agent-three-questions-16x9-v3.mp4 --crf=18
```

TTS 使用外部服务，重新生成不保证音频逐字节相同。文本、音色或语速修改后重跑旁白，再复制当前时间轴与音频、重新渲染；不要只改字幕。

## 不入库的产物

成片 MP4、旁白 MP3、`node_modules/`、抽帧与中间片段不入库。公开仓库中的成片等同于公开发布，须由所有者决定。当前审片结果、输入版本与输出身份记录在 `LEDGER.md`。
