#!/usr/bin/env python3
"""18 帧静态画面生成（1080×1920，9:16；安全区 y∈[288,1536]，字幕带内嵌）。
静态图 + 剪辑基线：全部用文字/框/箭头/标记表达逻辑，无生成式画面。
v2：按视觉验收修复——字幕像素级换行（拉丁词不断）、三栏头部纵排、
流程条缩字加宽、矢量图例替代缺字形字符、阶梯副标题拆行、角标避让字幕带。"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BASE = Path(__file__).parent
W, H = 1080, 1920
SAFE_TOP, SAFE_BOT = 288, 1536          # 平台 UI 避让
SUB_Y1 = 1522                           # 字幕带底线（安全区内）
BG0, BG1 = (16, 26, 48), (9, 14, 28)    # 上下渐变
INK, INK2 = (242, 246, 252), (168, 183, 206)
BLUE, GREEN, RED, AMBER = (77, 163, 255), (52, 211, 153), (248, 113, 113), (245, 184, 77)
PANEL, PBORD = (22, 35, 61), (42, 58, 92)

# ---------- 字体 ----------
def load(path, size, idx=0):
    return ImageFont.truetype(str(path), size, index=idx)

def probe_fonts():
    hir = Path("/System/Library/Fonts/Hiragino Sans GB.ttc")
    bold_idx, reg_idx = 0, 0
    try:
        for i in range(4):
            if "W6" in load(hir, 20, i).getname()[0]:
                bold_idx = i
            if "W3" in load(hir, 20, i).getname()[0]:
                reg_idx = i
    except Exception:
        pass
    return hir, bold_idx, reg_idx

HIR, BOLD_I, REG_I = probe_fonts()
F_TITLE = load(HIR, 88, BOLD_I)   # 大标题
F_H1    = load(HIR, 58, BOLD_I)   # 卡片标题
F_H2    = load(HIR, 46, BOLD_I)   # 小标题/步进
F_BODY  = load(HIR, 40, REG_I)    # 正文
F_SMALL = load(HIR, 30, REG_I)    # 注释/徽标
F_METRIC = load(HIR, 36, BOLD_I)  # 指标数字
F_BRAND = load(HIR, 28, BOLD_I)
F_TINY  = load(HIR, 26, REG_I)

# ---------- 基础件 ----------
def canvas():
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        c = tuple(round(a + (b - a) * t) for a, b in zip(BG0, BG1))
        d.line([(0, y), (W, y)], fill=c)
    return img, d

def text_w(d, t, f):
    return d.textbbox((0, 0), t, font=f)[2]

def ctext(d, cx, y, t, f, fill, anchor="mm"):
    d.text((cx, y), t, font=f, fill=fill, anchor=anchor)

def tracked(d, cx, y, t, f, fill, gap):
    total = sum(text_w(d, ch, f) + gap for ch in t) - gap
    x = cx - total / 2
    for ch in t:
        d.text((x, y), ch, font=f, fill=fill, anchor="lm")
        x += text_w(d, ch, f) + gap

def overlay(img, fn):
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    fn(ImageDraw.Draw(ov))
    return Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")

def rrect(d, box, r, fill=None, outline=None, width=2):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)

def chip(d, cx, y, t, f, fg, border, pad=14, fill=None):
    w = text_w(d, t, f)
    box = [cx - w / 2 - pad, y - f.size / 2 - 8, cx + w / 2 + pad, y + f.size / 2 + 8]
    rrect(d, box, 12, fill=fill, outline=border, width=2)
    ctext(d, cx, y, t, f, fg)
    return box

def arrow_h(d, x1, x2, y, color, w=4, head=12):
    d.line([(x1, y), (x2 - head * 0.9, y)], fill=color, width=w)
    d.polygon([(x2, y), (x2 - head, y - head * 0.6), (x2 - head, y + head * 0.6)], fill=color)

def arrow_v(d, x, y1, y2, color, w=4):
    d.line([(x, y1), (x, y2 - 12)], fill=color, width=w)
    d.polygon([(x, y2), (x - 9, y2 - 16), (x + 9, y2 - 16)], fill=color)

def check(d, cx, cy, s, color, w=5):
    d.line([(cx - s, cy), (cx - s * .25, cy + s * .7), (cx + s, cy - s * .7)], fill=color, width=w)

def cross(d, cx, cy, s, color, w=5):
    d.line([(cx - s, cy - s), (cx + s, cy + s)], fill=color, width=w)
    d.line([(cx - s, cy + s), (cx + s, cy - s)], fill=color, width=w)

def brand(d):
    tracked(d, W / 2, 344, "AI FIELD NOTES", F_BRAND, (124, 141, 166), 10)
    ctext(d, W / 2, 386, "企业 AI 落地 · 第 01 条", F_TINY, (96, 112, 138))

def corner_tag(d, t):
    w = text_w(d, t, F_SMALL)
    box = [W - 56 - w - 24, 352, W - 56, 352 + 44]
    rrect(d, box, 10, outline=AMBER, width=2)
    ctext(d, (box[0] + box[2]) / 2, 374, t, F_SMALL, AMBER)

# ---------- 字幕：像素级换行 + 标点禁则 + 孤行回收 ----------
NO_LEAD = "。，？！；：、）】》”"

def _wrap_px(t, f, maxw, d):
    lines, cur = [], ""
    for ch in t:
        trial = cur + ch
        if text_w(d, trial, f) > maxw and cur:
            if ch.isascii() and not ch.isspace():
                cut = len(cur)
                for j in range(len(cur) - 1, 0, -1):
                    if cur[j].isspace() or not cur[j].isascii():
                        cut = j + 1
                        break
                lines.append(cur[:cut])
                cur = cur[cut:] + ch
            else:
                lines.append(cur)
                cur = ch
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines

def _pull_unit(s):
    """从行尾摘出一个不可分单元：整个拉丁词（含可选前导空格）或单个 CJK 字符。"""
    if not s:
        return s, ""
    j = len(s)
    while j > 0 and s[j - 1].isascii() and not s[j - 1].isspace():
        j -= 1
    if j < len(s):                       # 行尾是拉丁词
        if j > 0 and s[j - 1].isspace():
            j -= 1
        return s[:j], s[j:]
    return s[:-1], s[-1]

def _fix_rules(lines, d, f, maxw):
    # 行首标点禁则：标点悬行首时，把前一行的行尾单元拉下来陪它
    for i in range(len(lines) - 1):
        while lines[i + 1] and lines[i + 1][0] in NO_LEAD and lines[i]:
            head, unit = _pull_unit(lines[i])
            lines[i] = head
            lines[i + 1] = unit + lines[i + 1]
    # 末行孤行回收：末行不足 4 字符时，从上一行行尾搬单元下来
    if len(lines) >= 2 and 0 < len(lines[-1]) < 4:
        last = lines[-1]
        while len(last) < 4 and lines[-2]:
            head, unit = _pull_unit(lines[-2])
            lines[-2] = head
            last = unit + last
        lines[-1] = last.lstrip()
    return [ln for ln in lines if ln]

def subtitle(img, t):
    for size in (50, 46, 42, 38):
        f = load(HIR, size, BOLD_I)
        lines = _fix_rules(_wrap_px(t, f, 830, ImageDraw.Draw(img)),
                           ImageDraw.Draw(img), f, 830)
        if len(lines) <= 2 and all(text_w(ImageDraw.Draw(img), ln, f) <= 840 for ln in lines):
            break
    lh = int(f.size * 1.5)
    h = len(lines) * lh
    y0 = SUB_Y1 - h - 30
    box = [96, y0 - 20, W - 96, y0 + h + 20]
    img2 = overlay(img, lambda od: od.rounded_rectangle(box, 22, fill=(7, 11, 20, 200)))
    d2 = ImageDraw.Draw(img2)
    for k, ln in enumerate(lines):
        ctext(d2, W / 2, y0 + k * lh + lh / 2, ln, f, INK)
    return img2

# ---------- 场景 ----------
def s01(d):
    ctext(d, W / 2, 640, "想做 AI Agent？", F_TITLE, INK)
    ctext(d, W / 2, 790, "先确认三件事", F_TITLE, BLUE)
    d.line([(W / 2 - 220, 900), (W / 2 + 220, 900)], fill=BLUE, width=4)

def slots(d, hint=False):
    for k, lab in enumerate(["①", "②", "③"]):
        x = 150 + k * 320
        rrect(d, [x, 980, x + 260, 1180], 20, outline=PBORD, width=3)
        ctext(d, x + 130, 1080, lab, F_H1, INK2)
    if hint:
        ctext(d, W / 2, 1262, "他要的，可能根本不是 Agent", F_H2, AMBER)

def path_row(d, last_red=False):
    labs = ["选模型", "搭知识库", "上框架", "demo 惊艳", "上线失控"]
    bw, gap, y, h = 182, 14, 620, 150
    x0 = (W - (bw * 5 + gap * 4)) / 2
    for k, t in enumerate(labs):
        x = x0 + k * (bw + gap)
        red = last_red and k == 4
        fill = (74, 26, 32) if red else PANEL
        ol = RED if red else (PBORD if k < 4 else (110, 126, 152))
        rrect(d, [x, y, x + bw, y + h], 16, fill=fill, outline=ol, width=3)
        ctext(d, x + bw / 2, y + h / 2, t, F_BODY, INK)
        if k < 4:
            arrow_h(d, x + bw + 1, x + bw + gap - 1, y + h / 2, INK2, w=3, head=9)
    ctext(d, W / 2, 830, "每一步都在回答“怎么做”", F_BODY, INK2)
    return x0

def q_band(d, big=False):
    if big:
        ctext(d, W / 2, 970, "但没人回答：", F_H1, INK)
        ctext(d, W / 2, 1090, "“做什么？算成功？”", F_H1, AMBER)
    else:
        ctext(d, W / 2, 970, "“做什么？算成功？”", F_H1, AMBER)

def fails(d):
    for k, t in enumerate(["数据没对上", "权限没想清楚", "效果没法衡量"]):
        chip(d, W / 2, 1000 + k * 104, t, F_H2, RED, RED)

COLS = [56, 56 + 330, 56 + 660]      # 三栏 x；栏宽 306
COLY, COLH = 560, 640

def col_card(d, i, num, title, lit):
    x = COLS[i]
    rrect(d, [x, COLY, x + 306, COLY + COLH], 22, fill=PANEL, outline=BLUE if lit else PBORD, width=3 if lit else 2)
    chip(d, x + 153, COLY + 56, f"问{num}", F_SMALL, INK, BLUE if lit else PBORD, fill=(20, 34, 60))
    ctext(d, x + 153, COLY + 116, title, F_H2, INK)
    d.line([(x + 24, COLY + 152), (x + 282, COLY + 152)], fill=PBORD, width=2)

def q1_body(d):
    x = COLS[0]
    steps = ["接需求", "录入", "核对", "交付"]
    for k, t in enumerate(steps):
        y = COLY + 174 + k * 104
        rrect(d, [x + 60, y, x + 246, y + 60], 12, outline=BLUE, width=2)
        ctext(d, x + 153, y + 30, t, F_BODY, INK)
        if k < 3:
            arrow_v(d, x + 153, y + 62, y + 102, BLUE)
    ctext(d, x + 153, COLY + 588, "一步步画出来", F_SMALL, INK2)

def q2_body(d, risk=False, badges=False):
    x = COLS[1]
    rows = [("订单记录", True), ("商品目录", True), ("关键反馈", False)]
    for k, (t, ok) in enumerate(rows):
        y = COLY + 176 + k * 76
        (check if ok else cross)(d, x + 52, y, 12, GREEN if ok else RED)
        ctext(d, x + 78, y, t, F_BODY, INK, anchor="lm")
        if not ok:
            ctext(d, x + 78, y + 36, "（拿不到）", F_SMALL, RED, anchor="lm")
    if risk:
        chip(d, x + 153, COLY + 448, "答不了 / 只能猜", F_SMALL, AMBER, AMBER)
    if badges:
        check(d, x + 64, COLY + 502, 10, GREEN)
        ctext(d, x + 86, COLY + 502, "可自动", F_BODY, INK, anchor="lm")
        rrect(d, [x + 52, COLY + 537, x + 74, COLY + 559], 4, outline=AMBER, width=3)
        ctext(d, x + 86, COLY + 548, "需人工", F_BODY, INK, anchor="lm")
        ctext(d, x + 153, COLY + 600, "异常 → 人工兜底", F_SMALL, AMBER)

def q3_body(d):
    x = COLS[2]
    y = COLY + 176
    rrect(d, [x + 24, y, x + 282, y + 150], 16, outline=AMBER, width=3)
    ctext(d, x + 153, y + 44, "交付时长", F_BODY, INK2)
    ctext(d, x + 153, y + 104, "3.2天 → 2.5天", F_METRIC, INK)
    ctext(d, x + 153, y + 186, "（示例）", F_SMALL, INK2)
    ctext(d, x + 153, COLY + 452, "哪个数字变了？", F_BODY, BLUE)
    ctext(d, x + 153, COLY + 516, "说不清指标", F_SMALL, INK2)
    ctext(d, x + 153, COLY + 556, "= 没法验证", F_SMALL, INK2)

def concl(d, lit=False):
    c = BLUE if lit else INK2
    rrect(d, [56, 1256, W - 56, 1256 + 70], 18, outline=PBORD, width=2)
    ctext(d, W / 2, 1291, "结论：要不要 Agent —— 看图说话", F_BODY, c)

def ladder(d, lit=(0, 0, 0), tag=False):
    steps = [
        (70, 1070, 300, 150, "普通自动化", ("规则写得死",), GREEN),
        (410, 930, 300, 150, "+ 模型组件", ("局部要理解语义",), BLUE),
        (750, 790, 300, 190, "Agent", ("多步规划", "自主用工具"), AMBER),
    ]
    for k, (x, y, w, h, t, subs, col) in enumerate(steps):
        on = lit[k]
        rrect(d, [x, y, x + w, y + h], 18, fill=PANEL, outline=col if on else PBORD, width=4 if on else 2)
        if k == 2:
            ctext(d, x + w / 2, y + 36, t, F_H2, INK if on else INK2)
            ctext(d, x + w / 2, y + 90, subs[0], F_SMALL, col if on else INK2)
            ctext(d, x + w / 2, y + 126, subs[1], F_SMALL, col if on else INK2)
            ctext(d, x + w / 2, y + h - 26, "（典型场景）", F_TINY, INK2)
        else:
            ctext(d, x + w / 2, y + h / 2 - 22, t, F_H2, INK if on else INK2)
            ctext(d, x + w / 2, y + h / 2 + 28, subs[0], F_SMALL, col if on else INK2)
    if tag:
        chip(d, W / 2, 1262, "图里没有这类需求 → 停在前两格", F_H2, AMBER, AMBER)

def quote(d, nxt=False):
    ctext(d, W / 2, 700, "Agent 是最后一格，", F_TITLE, INK)
    ctext(d, W / 2, 850, "不是第一格。", F_TITLE, BLUE)
    d.line([(W / 2 - 260, 980), (W / 2 + 260, 980)], fill=PBORD, width=3)
    if nxt:
        ctext(d, W / 2, 1090, "下期", F_SMALL, INK2)
        ctext(d, W / 2, 1170, "怎么切出第一段", F_H2, INK2)
        ctext(d, W / 2, 1240, "最小、可验证的工作负载", F_H2, INK2)

# ---------- 帧表 ----------
FRAMES = [
    ("s01", s01, None),
    ("s02", lambda d: (s01(d), slots(d)), None),
    ("s03", lambda d: (s01(d), slots(d, hint=True)), None),
    ("s04", lambda d: path_row(d), "示意"),
    ("s05", lambda d: (path_row(d), q_band(d)), "示意"),
    ("s06", lambda d: (path_row(d, last_red=True), fails(d)), "示意"),
    ("s07", lambda d: (col_card(d, 0, "一", "流程", False), col_card(d, 1, "二", "数据与边界", False), col_card(d, 2, "三", "验收", False), concl(d)), "方法示意"),
    ("s08", lambda d: (col_card(d, 0, "一", "流程", True), col_card(d, 1, "二", "数据与边界", False), col_card(d, 2, "三", "验收", False), q1_body(d), concl(d)), "方法示意"),
    ("s09", lambda d: (col_card(d, 0, "一", "流程", True), col_card(d, 1, "二", "数据与边界", True), col_card(d, 2, "三", "验收", False), q1_body(d), q2_body(d), concl(d)), "方法示意"),
    ("s10", lambda d: (col_card(d, 0, "一", "流程", True), col_card(d, 1, "二", "数据与边界", True), col_card(d, 2, "三", "验收", False), q1_body(d), q2_body(d, risk=True), concl(d)), "方法示意"),
    ("s11", lambda d: (col_card(d, 0, "一", "流程", True), col_card(d, 1, "二", "数据与边界", True), col_card(d, 2, "三", "验收", False), q1_body(d), q2_body(d, risk=True, badges=True), concl(d)), "方法示意"),
    ("s12", lambda d: (col_card(d, 0, "一", "流程", True), col_card(d, 1, "二", "数据与边界", True), col_card(d, 2, "三", "验收", True), q1_body(d), q2_body(d, risk=True, badges=True), q3_body(d), concl(d)), "方法示意"),
    ("s13", lambda d: ladder(d, lit=(1, 0, 0)), None),
    ("s14", lambda d: ladder(d, lit=(1, 1, 0)), None),
    ("s15", lambda d: ladder(d, lit=(1, 1, 1)), None),
    ("s16", lambda d: ladder(d, lit=(1, 1, 0), tag=True), None),
    ("s17", lambda d: quote(d), None),
    ("s18", lambda d: quote(d, nxt=True), None),
]

def main():
    meta = json.loads((BASE / "timing.json").read_text())
    sents = meta["sentences"]
    out = BASE / "frames"
    out.mkdir(exist_ok=True)
    for k, (fid, fn, tag) in enumerate(FRAMES):
        img, d = canvas()
        brand(d)
        fn(d)
        if tag:
            corner_tag(d, tag)
        img = subtitle(img, sents[k])
        img.save(out / f"{fid}.png")
        print(fid, "ok")
    print("frames:", len(FRAMES))

if __name__ == "__main__":
    main()
