import {
  AbsoluteFill, Audio, Composition, Easing, Sequence,
  interpolate, registerRoot, spring, staticFile, useCurrentFrame,
} from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import timing from './timing.json';

/* ---------- 时间轴（17 句） ---------- */
const FPS = 30;
const ids = Object.keys(timing.durations).sort();
let acc = 0;
const SEGS = ids.map((id, i) => {
  const audio = timing.durations[id];
  const pad = i === ids.length - 1 ? timing.tail : timing.gap;
  const from = Math.round(acc * FPS);
  const frames = Math.round((audio + pad) * FPS);
  acc += audio + pad;
  return { id, sentence: timing.sentences[i], from, frames, idx: i };
});
const TOTAL = SEGS[SEGS.length - 1].from + SEGS[SEGS.length - 1].frames + 18;
const at = (segIdx, offset) => SEGS[segIdx].from + offset;

/* ---------- 设计令牌（频道一致） ---------- */
const C = {
  ink: '#F2F6FC', ink2: '#9FB0C9', ink3: '#64789A',
  blue: '#4DA3FF', cyan: '#67E8F9', green: '#34D399', red: '#F87171', amber: '#FBBF24',
};
const FONT = `"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif`;
const CARD = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 22,
  boxShadow: '0 18px 50px rgba(2,6,16,0.45)',
};
const GRAD = {
  background: 'linear-gradient(92deg,#4DA3FF,#67E8F9)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
};
const clamp = { extrapolateLeft: 'stop', extrapolateRight: 'clamp' };
const ease = (f, delay = 0, dur = 9) =>
  interpolate(f, [delay, delay + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const pop = (f, delay = 0, damping = 13) =>
  spring({ frame: Math.max(0, f - delay), fps: FPS, config: { damping, mass: 0.9 } });
const fade = (v) => Math.max(0, Math.min(1, v));
const shake = (f, t0, amp = 10, tau = 1.8) => {
  const t = f - t0;
  if (t < 0 || t > 12) return { x: 0, y: 0 };
  const env = amp * Math.exp(-t / tau);
  return { x: Math.sin(t * 2.7) * env, y: Math.cos(t * 3.3) * env * 0.7 };
};

/* ---------- 基础件 ---------- */
const Background = ({ f }) => (
  <AbsoluteFill style={{ background: 'linear-gradient(160deg,#0B1220,#0D1830)', overflow: 'hidden' }}>
    <AbsoluteFill style={{
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.026) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.026) 1px,transparent 1px)',
      backgroundSize: '64px 64px',
      WebkitMaskImage: 'radial-gradient(ellipse 78% 72% at 50% 46%, transparent 26%, black 88%)',
      maskImage: 'radial-gradient(ellipse 78% 72% at 50% 46%, transparent 26%, black 88%)',
    }} />
    <div style={{
      position: 'absolute', width: 940, height: 940, borderRadius: '50%',
      background: 'radial-gradient(circle,rgba(77,163,255,0.16),transparent 65%)',
      left: -220 + Math.sin(f / 420) * 60, top: -260 + Math.cos(f / 380) * 40, filter: 'blur(6px)',
    }} />
    <div style={{
      position: 'absolute', width: 820, height: 820, borderRadius: '50%',
      background: 'radial-gradient(circle,rgba(103,232,249,0.10),transparent 65%)',
      right: -200 + Math.cos(f / 460) * 50, bottom: -240 + Math.sin(f / 400) * 36, filter: 'blur(6px)',
    }} />
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at center,transparent 52%,rgba(4,8,16,0.55) 100%)' }} />
  </AbsoluteFill>
);

const CornerTag = ({ f, text }) => {
  const e = ease(f, 4, 8);
  return (
    <div style={{
      position: 'absolute', right: 52, top: 44, opacity: e, transform: `translateY(${(1 - e) * -10}px)`,
      padding: '8px 20px', borderRadius: 999, border: `1.5px solid ${C.amber}66`,
      color: C.amber, fontFamily: FONT, fontSize: 21, fontWeight: 600, background: 'rgba(251,191,36,0.08)',
    }}>{text}</div>
  );
};

/* 字幕：Q11 有效字高 ≥56px；26 字/行、标点禁则、孤行回收，全部句子 ≤2 行不截断 */
const NO_LEAD = '。，？！；：、）】》”—';
function wrapSub(t, per = 26) {
  let lines = [];
  for (let i = 0; i < t.length; i += per) lines.push(t.slice(i, i + per));
  for (let i = 1; i < lines.length; i++) {
    while (lines[i][0] && NO_LEAD.includes(lines[i][0]) && lines[i - 1].length) {
      lines[i] = lines[i - 1].slice(-1) + lines[i];
      lines[i - 1] = lines[i - 1].slice(0, -1);
    }
  }
  if (lines.length >= 2 && lines[lines.length - 1].length < 4) {
    const last0 = lines.pop();
    let prev = lines.pop();
    let last = last0;
    while (last.length < 4 && prev.length) {
      last = prev.slice(-1) + last;
      prev = prev.slice(0, -1);
    }
    lines.push(prev, last);
  }
  return lines.slice(0, 2);
}
const Subtitle = ({ lf, text }) => {
  const lines = wrapSub(text);
  const e = ease(lf, 0, 6);
  const lh = 78;
  const h = lines.length * lh;
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 44, opacity: e, maxWidth: 1560,
      transform: `translateX(-50%) translateY(${(1 - e) * 18}px)`,
      padding: '12px 36px', borderRadius: 18, background: 'rgba(6,10,20,0.86)',
      border: '1px solid rgba(255,255,255,0.09)',
      fontFamily: FONT, fontSize: 56, fontWeight: 700, color: C.ink,
      lineHeight: `${lh}px`, textAlign: 'center', whiteSpace: 'pre-wrap',
    }}>{lines.join('\n')}</div>
  );
};

const ProgressBar = ({ f }) => (
  <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${(f / TOTAL) * 100}%`, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)', opacity: 0.75, boxShadow: '0 0 12px rgba(77,163,255,0.7)' }} />
);

const Appear = ({ f, delay = 0, y = 26, damping = 13, style, children }) => {
  const s = pop(f, delay, damping);
  return <div style={{ ...style, opacity: fade(s), transform: `translateY(${(1 - s) * y}px)` }}>{children}</div>;
};
const Check = ({ s = 44, color = C.green, w = 5 }) => (
  <svg width={s} height={s} viewBox="0 0 44 44">
    <path d="M8 23 L18 34 L37 11" stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const Cross = ({ s = 44, color = C.red, w = 5 }) => (
  <svg width={s} height={s} viewBox="0 0 44 44">
    <path d="M12 12 L32 32 M12 32 L32 12" stroke={color} strokeWidth={w} strokeLinecap="round" />
  </svg>
);
const DrawArrow = ({ p, len = 64, color = C.ink3, w = 3.4 }) => (
  <svg width={len} height={26} style={{ overflow: 'visible', flexShrink: 0 }}>
    <line x1={2} y1={13} x2={2 + (len - 16) * p} y2={13} stroke={color} strokeWidth={w} strokeLinecap="round" />
    <polygon points={`${2 + (len - 2) * p},13 ${2 + (len - 2) * p - 13},5 ${2 + (len - 2) * p - 13},21`} fill={color} opacity={p > 0.65 ? 1 : 0} />
  </svg>
);

/* ---------- 场景 1：答题卡 ---------- */
const SHEET = { cols: 5, rows: 2, cw: 168, ch: 116, gap: 16 };
SHEET.w = SHEET.cols * SHEET.cw + (SHEET.cols - 1) * SHEET.gap;
SHEET.h = SHEET.rows * SHEET.ch + (SHEET.rows - 1) * SHEET.gap;
SHEET.x = (1920 - SHEET.w) / 2; SHEET.y = 300;
const zoomK = (fs, t0) => interpolate(fs, [t0, t0 + 6, t0 + 11], [1, 1.9, 1.8], { ...clamp, easing: Easing.bezier(0.55, 0, 0.7, 1) });

const Sheet = ({ fs, segIdx }) => {
  const build = [0, 4, 7, 10, 12, 14, 16, 17, 18, 19];
  const reds = segIdx >= 1 ? [2, 5, 8] : [];
  return (
    <div style={{ position: 'absolute', left: SHEET.x, top: SHEET.y, width: SHEET.w, height: SHEET.h }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const r = Math.floor(i / 5), c = i % 5;
        const s = pop(fs, build[i], 12);
        const green = i === 0 && fs > 44;
        const red = reds.includes(i) && fs > 28 + reds.indexOf(i) * 3;
        return (
          <div key={i} style={{
            position: 'absolute', left: c * (SHEET.cw + SHEET.gap), top: r * (SHEET.ch + SHEET.gap),
            width: SHEET.cw, height: SHEET.ch, borderRadius: 16,
            background: green ? 'rgba(52,211,153,0.16)' : red ? 'rgba(248,113,113,0.16)' : 'rgba(255,255,255,0.045)',
            border: `1.5px solid ${green ? C.green : red ? C.red : 'rgba(255,255,255,0.12)'}`,
            boxShadow: green ? '0 0 26px rgba(52,211,153,0.25)' : red ? '0 0 26px rgba(248,113,113,0.28)' : 'none',
            opacity: fade(s), transform: `scale(${0.9 + s * 0.1})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {green && <Check />}
            {red && <Cross />}
          </div>
        );
      })}
    </div>
  );
};

const SceneAnswer = ({ fs, segIdx }) => {
  const t0 = 22;
  const z = segIdx >= 1 ? zoomK(fs, t0) : 1;
  const cx = SHEET.x + SHEET.w / 2, cy = SHEET.y + SHEET.h / 2;
  const ccx = interpolate(fs, [t0, t0 + 6], [960, cx], { ...clamp, easing: Easing.in(Easing.quad) });
  const ccy = interpolate(fs, [t0, t0 + 6], [540, cy], { ...clamp, easing: Easing.in(Easing.quad) });
  const sh = segIdx >= 1 ? shake(fs, t0 + 8, 8) : { x: 0, y: 0 };
  const sheetEl = (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${960 - ccx * z + sh.x}px, ${540 - ccy * z + sh.y}px) scale(${z})` }}>
      <Sheet fs={fs} segIdx={segIdx} />
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {segIdx === 0 ? (
        <>
          <Appear f={fs} delay={2} style={{ position: 'absolute', width: '100%', top: 170, textAlign: 'center' }}>
            <span style={{ fontSize: 34, color: C.ink2 }}>测试：10 道题（示例）</span>
          </Appear>
          <Appear f={fs} delay={52} style={{ position: 'absolute', width: '100%', top: 700, textAlign: 'center' }}>
            <span style={{ fontSize: 62, fontWeight: 900, color: C.ink }}>答对 <b style={{ color: C.green }}>1</b> 题</span>
          </Appear>
        </>
      ) : (
        <Appear f={fs} delay={38} y={18} style={{ position: 'absolute', width: '100%', top: 170, textAlign: 'center' }}>
          <span style={{ fontSize: 54, fontWeight: 900, color: C.amber }}>另外 10 题里，错了 3 道 —— ≠ 变好了</span>
        </Appear>
      )}
      {segIdx >= 1 && fs >= t0 && fs <= t0 + 7 ? (
        <CameraMotionBlur shutterAngle={200} samples={20}>{sheetEl}</CameraMotionBlur>
      ) : sheetEl}
    </div>
  );
};

/* ---------- 场景 2：抽样 → 循环 → 尺子 ---------- */
const LOOP_NODES = ['改一版', '跑几条', '感觉不错', '上线', '翻车'];
const EL = { cx: 960, cy: 450, rx: 300, ry: 200 };
const nodePos = (i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return { x: EL.cx + Math.cos(a) * EL.rx, y: EL.cy + Math.sin(a) * EL.ry };
};
const SceneLoop = ({ fs, segIdx }) => {
  const ringOn = segIdx === 3;
  const ringOpacity = segIdx < 3 ? 0 : segIdx === 3 ? 1 : 0;   // s5 完全退场，不残留
  const trackP = ringOn ? ease(fs, 40, 24) : 0;
  const travelerA = ringOn && fs > 46 ? -Math.PI / 2 + ((fs - 46) / 26) * (Math.PI * 2 / 5) : -Math.PI / 2;
  const rulerP = ease(fs, segIdx === 4 ? 14 : 1e9, 20);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {segIdx === 2 && (
        <>
          <Appear f={fs} delay={2} y={34} style={{ position: 'absolute', width: '100%', top: 340, textAlign: 'center' }}>
            <span style={{ fontSize: 76, fontWeight: 900, color: C.ink }}>单次答对，只是<span style={{ color: C.amber }}>抽样</span></span>
          </Appear>
          <Appear f={fs} delay={16} style={{ position: 'absolute', width: '100%', top: 520, textAlign: 'center' }}>
            <span style={{ fontSize: 36, color: C.ink2 }}>一次过关 ≠ 稳定表现</span>
          </Appear>
        </>
      )}
      {segIdx >= 3 && (
        <div style={{ position: 'absolute', inset: 0, opacity: ringOpacity, transition: 'opacity 0.5s' }}>
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
            <ellipse
              cx={EL.cx} cy={EL.cy} rx={EL.rx} ry={EL.ry}
              fill="none" stroke="rgba(159,176,201,0.4)" strokeWidth={3}
              strokeDasharray="14 10" opacity={trackP}
            />
          </svg>
          {LOOP_NODES.map((t, i) => {
            const { x, y } = nodePos(i);
            const s = pop(fs, 6 + i * 7, 12);
            const red = i === 4;
            const traveler = Math.floor((fs - 46) / 26);
            const active = ringOn && fs > 46 && traveler % 5 === i;
            return (
              <div key={t} style={{
                position: 'absolute', left: x - 95, top: y - 40, width: 190, height: 80, borderRadius: 16,
                background: red ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${red ? C.red : active ? C.blue : 'rgba(255,255,255,0.14)'}`,
                boxShadow: active ? '0 0 30px rgba(77,163,255,0.3)' : 'none',
                opacity: fade(s), transform: `scale(${0.9 + s * 0.1})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: red ? C.red : C.ink,
              }}>{t}</div>
            );
          })}
          {ringOn && fs > 46 && (
            <div style={{
              position: 'absolute', left: EL.cx + Math.cos(travelerA) * EL.rx - 11,
              top: EL.cy + Math.sin(travelerA) * EL.ry - 11, width: 22, height: 22, borderRadius: '50%',
              background: C.blue, boxShadow: '0 0 24px rgba(77,163,255,0.9)',
            }} />
          )}
          <Appear f={fs} delay={76} style={{ position: 'absolute', width: '100%', top: 730, textAlign: 'center' }}>
            <span style={{ fontSize: 38, color: C.red, fontWeight: 700 }}>老问题，换个样子回来</span>
          </Appear>
        </div>
      )}
      {segIdx === 4 && (
        <>
          <Appear f={fs} delay={4} y={30} style={{ position: 'absolute', width: '100%', top: 320, textAlign: 'center' }}>
            <span style={{ fontSize: 66, fontWeight: 900, color: C.amber }}>你缺的是一把固定的尺子</span>
          </Appear>
          <svg width={760} height={90} style={{ position: 'absolute', left: 580, top: 500 }}>
            <line x1={10} y1={45} x2={10 + 740 * rulerP} y2={45} stroke={C.amber} strokeWidth={5} strokeLinecap="round" />
            {Array.from({ length: 11 }).map((_, i) => {
              const x = 30 + i * 70;
              const vis = rulerP > (i + 1) / 12;
              return <line key={i} x1={x} y1={45 - (i % 5 === 0 ? 18 : 10)} x2={x} y2={45 + (i % 5 === 0 ? 18 : 10)} stroke={C.amber} strokeWidth={i % 5 === 0 ? 3 : 2} opacity={vis ? 0.9 : 0} />;
            })}
          </svg>
          <Appear f={fs} delay={44} style={{ position: 'absolute', width: '100%', top: 660, textAlign: 'center' }}>
            <span style={{ fontSize: 38, color: C.ink2 }}>分清真进步，和碰运气</span>
          </Appear>
        </>
      )}
    </div>
  );
};

/* ---------- 场景 3：三组样本 ---------- */
const ROWS = [
  { y: 300, name: '修复样本', sub: '要修的老失败', col: C.green },
  { y: 480, name: '回归保护样本', sub: '原本正常的任务', col: C.blue },
  { y: 650, name: '留出样本', sub: '没看过的题', col: C.cyan },
];
const CELL = { w: 170, h: 104 };
const cellX = { pre: 1010, post: 1360 };
const Cell = ({ x, y, state, color }) => (
  <div style={{
    position: 'absolute', left: x, top: y - CELL.h / 2, width: CELL.w, height: CELL.h, borderRadius: 16,
    background: state === 'cross' ? 'rgba(248,113,113,0.13)' : state === 'check' ? 'rgba(52,211,153,0.11)' : state === 'q' ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.04)',
    border: `1.5px solid ${state === 'cross' ? C.red : state === 'check' ? C.green : state === 'q' ? C.amber : 'rgba(255,255,255,0.13)'}`,
    boxShadow: state === 'cross' ? '0 0 30px rgba(248,113,113,0.25)' : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }}>
    {state === 'cross' && <Cross />}
    {state === 'check' && <Check color={color} />}
    {state === 'q' && <span style={{ fontSize: 44, fontWeight: 900, color: C.amber }}>?</span>}
    {state === 'lock' && (
      <svg width="34" height="34" viewBox="0 0 34 34">
        <rect x="6" y="14" width="22" height="15" rx="4" fill="none" stroke={C.cyan} strokeWidth="2.6" />
        <path d="M11 14 V10 a6 6 0 0 1 12 0 V14" fill="none" stroke={C.cyan} strokeWidth="2.6" />
      </svg>
    )}
  </div>
);
const SceneMatrix = ({ fs, segIdx }) => {
  const st = [
    { pre: segIdx >= 6 ? 'cross' : 'empty', post: segIdx >= 6 ? 'check' : 'empty' },
    { pre: segIdx >= 7 ? 'check' : 'empty', post: segIdx >= 8 ? 'cross' : segIdx >= 7 ? 'q' : 'empty' },
    { pre: segIdx >= 9 ? 'lock' : 'empty', post: segIdx >= 9 ? 'check' : 'empty' },
  ];
  const stampT = 16;
  const stampS = segIdx >= 8 ? pop(fs, stampT, 10) : 0;
  const sh = segIdx >= 8 ? shake(fs, stampT + 6, 9) : { x: 0, y: 0 };
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <div style={{ position: 'absolute', left: cellX.pre - 10, top: 196, fontSize: 32, color: C.ink3 }}>改动前</div>
      <div style={{ position: 'absolute', left: cellX.post - 10, top: 196, fontSize: 32, color: C.ink3 }}>改动后</div>
      {ROWS.map((r, i) => {
        const s = pop(fs, 6 + i * 8, 12);
        return (
          <div key={r.name} style={{
            position: 'absolute', left: 120, top: r.y - 52, width: 520, opacity: fade(s), transform: `translateX(${(1 - s) * -40}px)`,
          }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>{r.name}</div>
            <div style={{ fontSize: 28, color: C.ink3, marginTop: 6 }}>{r.sub}</div>
          </div>
        );
      })}
      {ROWS.map((r, i) => (
        <div key={r.name + '-a'} style={{ position: 'absolute', left: cellX.pre + CELL.w + 10, top: ROWS[i].y - 13 }}>
          <DrawArrow p={segIdx >= 6 + i ? 1 : ease(fs, 30 + i * 8, 8)} len={150} color={r.col} />
        </div>
      ))}
      {ROWS.map((r, i) => (
        <div key={r.name + '-c'} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Cell x={cellX.pre} y={ROWS[i].y} state={st[i].pre} color={r.col} />
          <Cell x={cellX.post} y={ROWS[i].y} state={st[i].post} color={r.col} />
        </div>
      ))}
      {segIdx >= 6 && segIdx <= 7 && (
        <Appear f={fs} delay={26} style={{ position: 'absolute', left: 1580, top: ROWS[0].y - 26 }}>
          <span style={{ fontSize: 30, color: C.green, fontWeight: 700 }}>全过 ✓</span>
        </Appear>
      )}
      {segIdx === 9 && (
        <Appear f={fs} delay={30} style={{ position: 'absolute', left: 1560, top: ROWS[2].y - 40, width: 280 }}>
          <span style={{ fontSize: 28, color: C.cyan }}>迭代期间锁定</span>
        </Appear>
      )}
      {segIdx >= 8 && (
        <div style={{
          position: 'absolute', left: 720, top: ROWS[1].y - 88, width: 620, height: 176,
          transform: `rotate(-7deg) scale(${0.5 + stampS * 0.5})`, opacity: fade(stampS),
          border: `5px solid ${C.red}`, borderRadius: 26,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(248,113,113,0.35)', background: 'rgba(248,113,113,0.07)',
        }}>
          <div style={{ fontSize: 52, fontWeight: 900, color: C.red, letterSpacing: 4 }}>修 A 伤 B</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: C.red, marginTop: 8 }}>这版直接打回</div>
        </div>
      )}
    </div>
  );
};

/* ---------- 场景 4：≠ 整体变好 ---------- */
const SceneCaveat = ({ fs }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <Appear f={fs} delay={4} y={30} style={{ position: 'absolute', width: '100%', top: 300, textAlign: 'center' }}>
      <span style={{ fontSize: 60, fontWeight: 900, color: C.ink }}>三组都过 = 本版过关</span>
    </Appear>
    <Appear f={fs} delay={18} y={30} style={{ position: 'absolute', width: '100%', top: 470, textAlign: 'center' }}>
      <span style={{ fontSize: 76, fontWeight: 900, color: C.amber }}>≠ 整体变好了</span>
    </Appear>
    <Appear f={fs} delay={34} style={{ position: 'absolute', width: '100%', top: 640, textAlign: 'center' }}>
      <span style={{ fontSize: 34, color: C.ink2 }}>只是"这些样本上，没发现问题"</span>
    </Appear>
  </div>
);

/* ---------- 场景 5：六步 → 一句 ---------- */
const STEPS = ['失败记录', '行为定义', '区分性样本', '可重复测量', '对照', '受控改动'];
const SceneSteps = ({ fs, segIdx }) => {
  const delays = [4, 8, 11, 14, 16, 18];
  const collapsed = segIdx >= 12;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {!collapsed && STEPS.map((t, i) => {
        const s = pop(fs, delays[i], 12);
        const r = Math.floor(i / 3), c = i % 3;
        return (
          <div key={t} style={{
            position: 'absolute', left: 300 + c * 460, top: 300 + r * 210, width: 380, height: 130, borderRadius: 20,
            ...CARD, opacity: fade(s), transform: `translateY(${(1 - s) * 40}px)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 26, color: C.ink3 }}>{`0${i + 1}`}</span>
            <span style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{t}</span>
          </div>
        );
      })}
      {collapsed && (
        <Appear f={fs} delay={6} y={26} style={{ position: 'absolute', width: '100%', top: 380, textAlign: 'center' }}>
          <span style={{ fontSize: 62, fontWeight: 900, ...GRAD }}>固定样本 · 固定判据 · 一次一个变量</span>
        </Appear>
      )}
      {collapsed && (
        <Appear f={fs} delay={26} style={{ position: 'absolute', width: '100%', top: 540, textAlign: 'center' }}>
          <span style={{ fontSize: 34, color: C.ink2 }}>浓缩成一句</span>
        </Appear>
      )}
    </div>
  );
};

/* ---------- 场景 6：不建平台 → 尺子长短 ---------- */
const SceneRuler = ({ fs, segIdx }) => {
  const strike = ease(fs, segIdx === 13 ? 14 : 1e9, 12);
  const growP = interpolate(fs, [segIdx === 15 ? 14 : 1e9, (segIdx === 15 ? 14 : 1e9) + 22], [0.4, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const iconOn = segIdx === 13 ? 1 : segIdx === 14 ? 0.5 : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {/* s13 划掉平台 */}
      {segIdx <= 14 && (
        <div style={{ position: 'absolute', left: 200, top: 280, opacity: iconOn, transition: 'opacity 0.5s' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: 300 + i * 30, height: 64, marginTop: 26, borderRadius: 14,
              background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.14)',
              marginLeft: i * -15, transform: `translateX(${i * 40}px)`,
            }} />
          ))}
          <svg width={460} height={280} style={{ position: 'absolute', left: -30, top: 0 }}>
            <line x1={20} y1={70} x2={20 + 400 * strike} y2={70 + 180 * strike} stroke={C.red} strokeWidth={7} strokeLinecap="round" />
          </svg>
          <div style={{ marginTop: 30, fontSize: 30, color: C.ink3 }}>评测平台</div>
        </div>
      )}
      {segIdx === 13 && (
        <Appear f={fs} delay={6} style={{ position: 'absolute', left: 760, top: 330 }}>
          <div style={{ fontSize: 58, fontWeight: 900, color: C.ink }}>不需要建<span style={{ color: C.red }}>评测平台</span></div>
        </Appear>
      )}
      {segIdx === 14 && (
        <Appear f={fs} delay={4} style={{ position: 'absolute', width: '100%', top: 560, textAlign: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: C.ink }}>低风险任务：<span style={{ color: C.green }}>少量固定样本起步</span></span>
        </Appear>
      )}
      {/* s15 尺子变长 */}
      {segIdx === 15 && (
        <>
          <Appear f={fs} delay={4} y={26} style={{ position: 'absolute', width: '100%', top: 280, textAlign: 'center' }}>
            <span style={{ fontSize: 54, fontWeight: 900, color: C.ink }}>任务越关键，<span style={{ color: C.amber }}>尺子就要越长</span></span>
          </Appear>
          <div style={{ position: 'absolute', left: 360, top: 470, width: 1200, height: 60 }}>
            <div style={{
              width: 1200 * growP, height: 54, borderRadius: 12, border: `2.5px solid ${C.amber}`,
              background: 'rgba(251,191,36,0.08)', position: 'relative', overflow: 'hidden',
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ position: 'absolute', left: 40 + i * 95, top: 5, width: 3, height: i % 4 === 0 ? 44 : 24, background: C.amber, opacity: growP > (i + 1) / 12 ? 0.85 : 0 }} />
              ))}
            </div>
            <div style={{ position: 'absolute', left: 40, top: 66, fontSize: 28, color: C.ink3 }}>低风险 → 短尺</div>
            <div style={{ position: 'absolute', right: 40, top: 66, fontSize: 28, color: C.ink3 }}>关键任务 → 长尺</div>
          </div>
          <Appear f={fs} delay={44} style={{ position: 'absolute', width: '100%', top: 660, textAlign: 'center' }}>
            <span style={{ fontSize: 30, color: C.ink2 }}>样本够不够，看风险与覆盖</span>
          </Appear>
        </>
      )}
    </div>
  );
};

/* ---------- 场景 7：收尾三词 ---------- */
const SceneClose = ({ fs }) => {
  const words = [
    { t: '修掉的', c: C.green }, { t: '没伤到的', c: C.blue }, { t: '没见过的', c: C.cyan },
  ];
  const sweep = ease(fs, 30, 20);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <div style={{ position: 'absolute', width: '100%', top: 250, textAlign: 'center' }}>
        <span style={{ fontSize: 44, color: C.ink2 }}>它真的变好了吗？先看三组结果</span>
      </div>
      <div style={{ position: 'absolute', left: 210, top: 400, width: 1500, height: 260 }}>
        {words.map((w, i) => {
          const s = pop(fs, 6 + i * 9, 12);
          return (
            <div key={w.t} style={{
              position: 'absolute', left: i * 500, top: 0, width: 440, height: 240, borderRadius: 24,
              ...CARD, borderColor: `${w.c}88`,
              opacity: fade(s), transform: `translateY(${(1 - s) * 40}px)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 60, fontWeight: 900, color: w.c,
            }}>{w.t}</div>
          );
        })}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 1500, height: 260, borderRadius: 24, overflow: 'hidden', pointerEvents: 'none',
          opacity: sweep > 0 && sweep < 1 ? 1 : 0,
        }}>
          <div style={{
            position: 'absolute', left: -300 + 1800 * sweep, top: -40, width: 180, height: 340,
            background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.10), transparent)',
            transform: 'skewX(-12deg)',
          }} />
        </div>
      </div>
    </div>
  );
};

/* ---------- SFX 钉帧表 ---------- */
const SFX = [
  { seg: 0, at: 6, src: 'swoosh-slow.mp3', vol: 0.18, note: '答题卡批量入场' },
  { seg: 0, at: 46, src: 'sparkle-touch.mp3', vol: 0.30, note: '首格答对变绿' },
  { seg: 1, at: 24, src: 'zoom-air-fast.mp3', vol: 0.24, note: '急推至答题卡' },
  { seg: 1, at: 30, src: 'glitch-virtual-quick.mp3', vol: 0.18, note: '三格变红' },
  { seg: 3, at: 10, src: 'air-woosh-deep.mp3', vol: 0.14, note: '循环流转' },
  { seg: 4, at: 16, src: 'marker-pen-line.mp3', vol: 0.22, note: '尺子描画' },
  { seg: 5, at: 8, src: 'sweep-fast-small.mp3', vol: 0.18, note: '三组样本框架入场' },
  { seg: 6, at: 22, src: 'sparkle.mp3', vol: 0.22, note: '修复组全过' },
  { seg: 7, at: 24, src: 'clock-tick-single.mp3', vol: 0.16, note: '回归组悬念 1' },
  { seg: 7, at: 52, src: 'clock-tick-single.mp3', vol: 0.12, note: '回归组悬念 2' },
  { seg: 8, at: 18, src: 'impact-cine-big.mp3', vol: 0.5, note: '打回印章（全片最大打击点）' },
  { seg: 9, at: 28, src: 'lock-quick.mp3', vol: 0.22, note: '留出组上锁' },
  { seg: 10, at: 10, src: 'glitch-static.mp3', vol: 0.14, note: '≠ 揭示' },
  { seg: 11, at: 6, src: 'paper-slide.mp3', vol: 0.26, note: '六步连发 1' },
  { seg: 11, at: 15, src: 'paper-slide.mp3', vol: 0.20, note: '六步连发 2' },
  { seg: 11, at: 24, src: 'paper-slide.mp3', vol: 0.15, note: '六步连发 3' },
  { seg: 12, at: 8, src: 'sweep-fast.mp3', vol: 0.20, note: '压缩成一句' },
  { seg: 13, at: 16, src: 'chalk-line.mp3', vol: 0.24, note: '划掉平台' },
  { seg: 15, at: 16, src: 'clock-knob-spin.mp3', vol: 0.18, note: '尺子变长' },
  { seg: 16, at: 26, src: 'shimmer-sparkle-sweep.mp3', vol: 0.24, note: '结尾微光' },
];

const Bgm = ({ f }) => {
  const v = interpolate(f, [0, 30, TOTAL - 60, TOTAL], [0, 0.14, 0.14, 0], clamp);
  return <AbsoluteFill><Audio src={staticFile('audio/bgm-tech-house.mp3')} volume={v} /></AbsoluteFill>;
};

/* ---------- 路由（17 句） ---------- */
const SCENE_OF = (i) =>
  i <= 1 ? 'answer' : i <= 4 ? 'loop' : i <= 9 ? 'matrix' : i === 10 ? 'caveat' : i <= 12 ? 'steps' : i <= 15 ? 'ruler' : 'close';
const SCENE_START = {};
[0, 2, 5, 10, 11, 13, 16].forEach((i) => { SCENE_START[SCENE_OF(i)] = SEGS[i].from; });
const SCENE_TAG = { answer: '示例', loop: null, matrix: '示例', caveat: null, steps: null, ruler: null, close: null };

const MainVideo = ({ bgm = true }) => {
  const f = useCurrentFrame();
  const seg = SEGS.find((s) => f >= s.from && f < s.from + s.frames) ?? SEGS[SEGS.length - 1];
  const scene = SCENE_OF(seg.idx);
  const fs = f - (SCENE_START[scene] ?? 0);
  const fadeIn = ease(f, 0, 8);
  const fadeOut = interpolate(f, [TOTAL - 16, TOTAL - 2], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <Background f={f} />
      {SCENE_TAG[scene] && <CornerTag f={f} text={SCENE_TAG[scene]} />}
      {scene === 'answer' && <SceneAnswer fs={fs} segIdx={seg.idx} />}
      {scene === 'loop' && <SceneLoop fs={fs} segIdx={seg.idx} />}
      {scene === 'matrix' && <SceneMatrix fs={fs} segIdx={seg.idx} />}
      {scene === 'caveat' && <SceneCaveat fs={fs} />}
      {scene === 'steps' && <SceneSteps fs={fs} segIdx={seg.idx} />}
      {scene === 'ruler' && <SceneRuler fs={fs} segIdx={seg.idx} />}
      {scene === 'close' && <SceneClose fs={fs} />}
      <Subtitle key={seg.id} lf={f - seg.from} text={seg.sentence} />
      <ProgressBar f={f} />
      {bgm && <Bgm f={f} />}
      {SEGS.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
          <Audio src={staticFile(`narration/${s.id}.mp3`)} />
        </Sequence>
      ))}
      {SFX.map((s, i) => (
        <Sequence key={i} from={at(s.seg, s.at)} durationInFrames={90}>
          <Audio src={staticFile(`audio/${s.src}`)} volume={s.vol} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => (
  <>
    <Composition id="Video" component={MainVideo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} defaultProps={{ bgm: true }} />
  </>
);

registerRoot(RemotionRoot);
