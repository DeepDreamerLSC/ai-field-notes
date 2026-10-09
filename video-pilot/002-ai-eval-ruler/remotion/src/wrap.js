/* 字幕换行（纯函数，可被 node 直接测试）：
   宽度保守估算（宁短勿溢出，杜绝浏览器二次换行）+ 语义断点 +
   行首标点禁则 + 末行孤行回收，保证 ≤2 行。 */
const NO_LEAD = '。，？！；：、）】》”—';
const PUNCT = '，。；：？！、';

// CJK/全角/弯引号/破折号按全宽 58 估，ASCII 按 34，空格 18（56px 字号的保守上界）
const wOf = (ch) =>
  /[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F\u2010-\u2027]/.test(ch) ? 58
    : ch === ' ' ? 18 : 34;
const width = (s) => [...s].reduce((a, c) => a + wOf(c), 0);
const MAXW = 1400;

export const textWidth = width;

export function wrapSub(t) {
  const lines = [];
  let cur = '';
  for (const ch of t) {
    const trial = cur + ch;
    if (width(trial) > MAXW && cur) {
      let cut = -1;                              // 行尾 40% 内最近的句读/破折号之后断（语义断点）
      for (let j = cur.length - 1; j >= Math.floor(cur.length * 0.6); j--) {
        if (PUNCT.includes(cur[j])) { cut = j + 1; break; }
        if (cur[j] === '—' && cur[j - 1] === '—') { cut = j + 1; break; }   // —— 成对后可断
      }
      if (cut > 0) {
        lines.push(cur.slice(0, cut));
        cur = cur.slice(cut) + ch;
      } else {
        lines.push(cur);
        cur = ch;
      }
    } else {
      cur = trial;
    }
  }
  if (cur) lines.push(cur);

  for (let i = 1; i < lines.length; i++) {       // 行首标点禁则
    while (lines[i][0] && NO_LEAD.includes(lines[i][0]) && lines[i - 1].length) {
      lines[i] = lines[i - 1].slice(-1) + lines[i];
      lines[i - 1] = lines[i - 1].slice(0, -1);
    }
  }
  if (lines.length >= 2 && lines[lines.length - 1].length < 4) {   // 孤行回收
    let last = lines.pop();
    let prev = lines.pop();
    while (last.length < 4 && prev.length) {
      last = prev.slice(-1) + last;
      prev = prev.slice(0, -1);
    }
    lines.push(prev, last);
  }
  return lines.slice(0, 2);
}

export const subtitleMeta = (t) => {
  const lines = wrapSub(t);
  return { lines, widths: lines.map(width), overflow: lines.some((l) => width(l) > MAXW) };
};
