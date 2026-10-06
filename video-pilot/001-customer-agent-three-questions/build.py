#!/usr/bin/env python3
"""合成：每句 = 一帧图 + 对应音频（补句间停顿）→ 逐句成片 → concat。
静态图 + 剪辑基线的"剪辑"环节：ffmpeg 直出，无渲染器依赖。"""
import json
import subprocess
import time
from pathlib import Path

BASE = Path(__file__).parent
CLIPS = BASE / "clips"
CLIPS.mkdir(exist_ok=True)
OUT = BASE / "001-customer-agent-three-questions-9x16.mp4"


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"FFMPEG FAIL: {' '.join(map(str, cmd))}\n{r.stderr[-1200:]}")


def main():
    t0 = time.time()
    meta = json.loads((BASE / "timing.json").read_text())
    durs, gap, tail = meta["durations"], meta["gap"], meta["tail"]
    ids = sorted(durs)                                  # s01..s18
    n = len(ids)
    concat_list = []

    for k, sid in enumerate(ids):
        d_audio = durs[sid]
        pad = tail if k == n - 1 else gap
        total = round(d_audio + pad, 3)
        padded = CLIPS / f"{sid}_padded.m4a"
        run(["ffmpeg", "-y", "-i", str(BASE / "narration" / f"{sid}.mp3"),
             "-af", "apad=pad_dur=" + str(pad), "-ar", "44100", "-ac", "2",
             "-c:a", "aac", "-b:a", "160k", str(padded)])

        vf = "format=yuv420p"
        af = None
        if k == 0:
            vf += ",fade=t=in:st=0:d=0.5"
        if k == n - 1:
            fo = max(total - 0.7, 0.1)
            vf += f",fade=t=out:st={fo:.3f}:d=0.7"
            af = f"afade=t=out:st={fo:.3f}:d=0.7"

        clip = CLIPS / f"{sid}.mp4"
        cmd = ["ffmpeg", "-y", "-loop", "1", "-framerate", "30", "-r", "30",
               "-i", str(BASE / "frames" / f"{sid}.png"),
               "-i", str(padded),
               "-t", str(total),
               "-vf", vf,
               "-c:v", "libx264", "-preset", "medium", "-crf", "20",
               "-tune", "stillimage",
               "-c:a", "aac", "-b:a", "160k",
               "-shortest", "-movflags", "+faststart", str(clip)]
        if af:
            cmd += ["-af", af]
        run(cmd)
        concat_list.append(f"file '{clip}'")
        print(f"{sid}: audio={d_audio:.2f}s clip={total:.2f}s")

    lst = CLIPS / "list.txt"
    lst.write_text("\n".join(concat_list) + "\n")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-c", "copy", "-movflags", "+faststart", str(OUT)])

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(OUT)], capture_output=True, text=True, check=True)
    mb = OUT.stat().st_size / 1e6
    print(f"OK {OUT.name}  duration={float(probe.stdout):.1f}s  size={mb:.1f}MB  "
          f"build={time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
