import {
  AbsoluteFill, Audio, Composition, Easing, Sequence,
  interpolate, registerRoot, spring, staticFile, useCurrentFrame,
} from 'remotion';
import { CameraMotionBlur } from '@remotion/motion-blur';
import timing from './timing.json';
import { wrapSub, textWidth } from './wrap.js';

/* ---------- 时间轴（19 句，内容与时轴不变） ---------- */
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

/* ---------- 触发锚点 ---------- */
const T = {
  open_hit: 1, bugs: 20, riser: 12,
  reg_pre: 10, reg_wrong: 28, reg_zoom: 44,
  ruler_draw: 16, row1_flip: 22, row2_q: 8, stamp: 18, lock: 14, row3_late: 0.72,
  step0: 0.10, strike: 16, grow: 16, sweep: 26,
};
const STEP_DELAY = (i) => Math.floor(SEGS[13].frames * (T.step0 + i * 0.12));

/* ---------- 设计令牌 ---------- */
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
const clamp = { extrapolateLeft: 'stop', extrapolateRight: 'clamp' };
const ease = (f, delay = 0, dur = 9) =>
  interpolate(f, [delay, delay + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
const pop = (f, delay = 0, damping = 13) =>
  spring({ frame: Math.max(0, f - delay), fps: FPS, config: { damping, mass: 0.9 } });
const fade = (v) => Math.max(0, Math.min(1, v));
const shake = (f, t0, amp = 10, tau = 1.8) => {
  const t = f - t0;
  if (t < 0 || t > 14) return { x: 0, y: 0 };
  const env = amp * Math.exp(-t / tau);
  return { x: Math.sin(t * 2.7) * env, y: Math.cos(t * 3.3) * env * 0.7 };
};
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/* ---------- 华丽层组件 ---------- */
const Grad = ({ f, children, style }) => (
  <span style={{
    background: 'linear-gradient(92deg,#4DA3FF,#8EE7FF,#4DA3FF)', backgroundSize: '200% 100%',
    backgroundPosition: `${(f * 0.9) % 200}% 0`,
    WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', ...style,
  }}>{children}</span>
);
const Chars = ({ f, text, delay = 0, step = 2, style, chStyle }) => (
  <span style={style}>
    {[...text].map((ch, i) => {
      const s = pop(f, delay + i * step, 12);
      return (
        <span key={i} style={{ display: 'inline-block', opacity: fade(s), transform: `translateY(${(1 - s) * 34}px)`, ...chStyle }}>{ch}</span>
      );
    })}
  </span>
);
const Roll = ({ f, t0, dur, from, to, style }) => (
  <span style={style}>{Math.round(interpolate(f, [t0, t0 + dur], [from, to], clamp))}</span>
);
const ShockRings = ({ f, t0, x, y, color = '#F87171', maxR = 190, gap = 6 }) => {
  const rings = [0, gap].map((off, k) => {
    const p = ease(f, t0 + off, 17);
    if (p <= 0 || p >= 1) return null;
    const r = 26 + maxR * p;
    return (
      <div key={k} style={{
        position: 'absolute', left: x - r / 2, top: y - r / 2, width: r, height: r, borderRadius: '50%',
        border: `${Math.max(0.5, 4 * (1 - p))}px solid ${color}`, opacity: (1 - p) * 0.75,
        boxShadow: `0 0 ${18 * (1 - p)}px ${color}55`,
      }} />
    );
  });
  return <>{rings}</>;
};
const Burst = ({ f, t0, x, y, color = '#F87171', n = 13, dur = 20, spread = 120 }) => (
  <>
    {Array.from({ length: n }).map((_, i) => {
      const p = ease(f, t0, dur);
      if (p <= 0 || p >= 1) return null;
      const a = rnd(i) * Math.PI * 2;
      const d = (26 + rnd(i + 40) * spread) * p;
      const sz = 3 + rnd(i + 80) * 4;
      return (
        <div key={i} style={{
          position: 'absolute', left: x + Math.cos(a) * d - sz / 2, top: y + Math.sin(a) * d - sz / 2,
          width: sz, height: sz, borderRadius: '50%', background: color,
          opacity: (1 - p) * 0.9, boxShadow: `0 0 8px ${color}aa`,
        }} />
      );
    })}
  </>
);
const Float = ({ f, phase = 0, amp = 3, speed = 56, style, children }) => (
  <div style={{ ...style, transform: `translateY(${Math.sin((f + phase) / speed) * amp}px)` }}>{children}</div>
);
const Sweep = ({ f, t0, y, h, w, x = 0, color = 'rgba(77,163,255,0.16)' }) => {
  const p = ease(f, t0, 11);
  if (p <= 0 || p >= 1) return null;
  return (
    <div style={{
      position: 'absolute', left: x - w * 0.25 + (w * 1.5) * p, top: y, width: w * 0.3, height: h,
      background: `linear-gradient(90deg, transparent, ${color}, transparent)`, borderRadius: 12,
      transform: 'skewX(-14deg)',
    }} />
  );
};

/* ---------- 背景：网格漂移 + 三光斑 + 浮尘 ---------- */
const Background = ({ f }) => (
  <AbsoluteFill style={{ background: 'linear-gradient(160deg,#0B1220,#0D1830)', overflow: 'hidden' }}>
    <AbsoluteFill style={{
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.026) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.026) 1px,transparent 1px)',
      backgroundSize: '64px 64px',
      backgroundPosition: `${(f * 0.14) % 64}px ${(f * 0.09) % 64}px`,
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
    <div style={{
      position: 'absolute', width: 560, height: 560, borderRadius: '50%',
      background: 'radial-gradient(circle,rgba(251,191,36,0.055),transparent 65%)',
      left: 760 + Math.sin(f / 500 + 2) * 46, top: -140 + Math.cos(f / 430) * 30, filter: 'blur(8px)',
    }} />
    {Array.from({ length: 36 }).map((_, i) => {
      const x = rnd(i) * 1920;
      const speed = 0.18 + rnd(i + 30) * 0.35;
      const y = ((rnd(i + 60) * 1100 + f * speed) % 1140) - 30;
      const sz = 1.6 + rnd(i + 90) * 2.6;
      const tw = 0.05 + 0.10 * (0.5 + 0.5 * Math.sin(f / 26 + i));
      return <div key={i} style={{ position: 'absolute', left: x + Math.sin(f / 90 + i) * 8, top: y, width: sz, height: sz, borderRadius: '50%', background: '#BFD7FF', opacity: tw }} />;
    })}
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

const Subtitle = ({ lf, text }) => {
  const lines = wrapSub(text);
  const e = ease(lf, 0, 6);
  const lh = 78;
  const w = Math.min(1560, Math.ceil(Math.max(...lines.map(textWidth))) + 72);
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 44, opacity: e, width: w, boxSizing: 'content-box',
      transform: `translateX(-50%) translateY(${(1 - e) * 18}px)`,
      padding: '10px 34px', borderRadius: 18, background: 'rgba(6,10,20,0.62)',
      backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,0.08)',
      fontFamily: FONT, fontSize: 56, fontWeight: 700, color: C.ink,
      lineHeight: `${lh}px`, textAlign: 'center', whiteSpace: 'pre-wrap',
    }}>{lines.join('\n')}</div>
  );
};

const ProgressBar = ({ f }) => {
  const p = (f / TOTAL) * 100;
  return (
    <>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${p}%`, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)', opacity: 0.75 }} />
      <div style={{ position: 'absolute', left: `calc(${p}% - 5px)`, bottom: -2, width: 10, height: 10, borderRadius: '50%', background: '#8EE7FF', boxShadow: '0 0 14px rgba(103,232,249,0.95)', opacity: 0.9 }} />
    </>
  );
};

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
const zoomK = (ft, t0) => interpolate(ft, [t0, t0 + 6, t0 + 11], [1, 1.3, 1.22], { ...clamp, easing: Easing.bezier(0.55, 0, 0.7, 1) });
const flipDeg = (ft, t0) => (1 - pop(ft, t0, 12)) * 78;

/* ---------- 场景 0：倒叙开场（华丽版） ---------- */
const SceneOpen = ({ ft, f, segIdx }) => {
  if (segIdx === 0) {
    const sh = shake(ft, 2, 13, 2.0);
    const glow = ease(ft, 26, 8) * (0.6 + 0.4 * Math.sin(f / 14));
    return (
      <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
        <ShockRings f={ft} t0={2} x={1270} y={485} color={C.red} maxR={230} />
        <ShockRings f={ft} t0={7} x={1270} y={485} color="#FFB4B4" maxR={150} />
        <Burst f={ft} t0={4} x={1270} y={485} color={C.red} n={15} spread={150} />
        <div style={{
          position: 'absolute', left: 930, top: 360, width: 680, height: 250,
          transform: `rotate(-7deg) scale(${interpolate(ft, [0, 10], [1.05, 1], clamp)}) translate(${sh.x}px, ${sh.y}px)`,
          border: `6px solid ${C.red}`, borderRadius: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 80px rgba(248,113,113,0.40), 0 0 140px rgba(248,113,113,0.18)',
          background: 'rgba(248,113,113,0.07)',
        }}>
          <Chars f={ft} text="这版直接打回" delay={4} step={2.4} style={{ fontSize: 66, fontWeight: 900, color: C.red, letterSpacing: 6 }} />
        </div>
        <Appear f={ft} delay={10} y={26} style={{ position: 'absolute', left: 210, top: 340 }}>
          <div style={{ fontSize: 150, fontWeight: 900, color: C.ink, lineHeight: 1.1 }}>
            第 <span style={{ color: C.red, textShadow: `0 0 ${28 * glow}px rgba(248,113,113,0.8)` }}><Roll f={ft} t0={12} dur={20} from={1} to={7} /></span> 版
          </div>
          <div style={{ fontSize: 44, color: C.ink2, marginTop: 18 }}>Prompt 迭代</div>
        </Appear>
        <Appear f={ft} delay={30} style={{ position: 'absolute', left: 216, top: 610 }}>
          <span style={{ fontSize: 28, color: C.ink3 }}>上周 · 迭代记录（示例）</span>
        </Appear>
      </div>
    );
  }
  if (segIdx === 1) {
    return (
      <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, textAlign: 'center', transform: `scale(${interpolate(ft, [0, 70], [1, 1.045], clamp)})` }}>
        <div style={{ marginTop: 280, fontSize: 92, fontWeight: 900, color: C.ink }}>
          <Chars f={ft} text="它明明修好了" delay={2} step={2} />
        </div>
        <div style={{ marginTop: 22, fontSize: 116, fontWeight: 900 }}>
          <Roll f={ft} t0={8} dur={16} from={0} to={3} style={{ color: C.green }} />
          <span style={{ color: C.ink }}> 个 </span>
          <Grad f={f}>bug</Grad>
        </div>
        <div style={{ marginTop: 44, display: 'flex', justifyContent: 'center', gap: 28 }}>
          {[0, 1, 2].map((i) => {
            const sp = pop(ft, T.bugs + i * 7, 11);
            return (
              <div key={i} style={{ position: 'relative' }}>
                <ShockRings f={ft} t0={T.bugs + i * 7 + 5} x={46} y={46} color={C.green} maxR={54} gap={99} />
                <div style={{
                  width: 92, height: 92, borderRadius: 18, border: `2px solid ${C.green}88`,
                  background: 'rgba(52,211,153,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: fade(sp), transform: `scale(${0.8 + sp * 0.2})`,
                  boxShadow: `0 0 ${26 * sp}px rgba(52,211,153,0.35)`,
                }}><Check s={42} /></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  const vig = interpolate(ft, [10, 40], [0, 0.32], clamp);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, transparent 38%, rgba(2,5,12,${vig}) 100%)` }} />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${interpolate(ft, [0, 85], [1, 1.06], clamp)})`,
      }}>
        <Chars f={ft} text="修好了，" delay={2} step={3} style={{ fontSize: 100, fontWeight: 900, color: C.ink }} />
        <div style={{ height: 18 }} />
        <Chars f={ft} text="为什么还打回？" delay={10} step={2.6} style={{ fontSize: 100, fontWeight: 900, color: C.amber, textShadow: '0 0 40px rgba(251,191,36,0.25)' }} />
      </div>
    </div>
  );
};

/* ---------- 场景 1：具体回归对照（具象客服问答 + 华丽动效） ---------- */
/* 贯穿示例：AI 客服机器人。退货期 7→70 天（数字级错误），库存 80→2024 件（荒谬错误） */
const REG = [
  { q: '退货期是几天？', expect: '7 天', before: '7 天', after: '70 天', y: 400 },
  { q: '还剩多少库存？', expect: '80 件', before: '80 件', after: '2024 件', y: 620 },
];
const RC = { left: 220, w: 1440, h: 150, labelW: 350, preX: 410, postX: 880, cw: 250, ch: 100 };

const SceneAnswer = ({ ft, f, segIdx }) => {
  const t0 = T.reg_zoom;
  const tx = RC.left + RC.preX + 125, ty = 510;      // 急推目标：前格列（题面与 2024 均在可视带）
  const z = zoomK(ft, t0);
  const ccx = interpolate(ft, [t0, t0 + 6], [960, tx], { ...clamp, easing: Easing.in(Easing.quad) });
  const ccy = interpolate(ft, [t0, t0 + 6], [540, ty], { ...clamp, easing: Easing.in(Easing.quad) });
  const sh = shake(ft, t0 + 8, 9);
  const redPulse = ease(ft, t0 + 6, 10) * (1 - ease(ft, t0 + 22, 14));
  const cards = (
    <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${960 - ccx * z + sh.x}px, ${540 - ccy * z + sh.y}px) scale(${z})` }}>
      {REG.map((r, i) => {
        const sb = pop(ft, T.reg_pre + i * 8, 12);
        const wrong = ft > T.reg_wrong + i * 8;
        const cellT = T.reg_wrong + i * 8;
        return (
          <div key={r.q} style={{ position: 'absolute', left: RC.left, top: r.y - RC.h / 2, width: RC.w, height: RC.h, ...CARD, opacity: fade(sb) }}>
            <Sweep f={ft} t0={cellT} y={8} h={RC.h - 16} w={RC.w - 40} x={RC.left + 20} color="rgba(248,113,113,0.15)" />
            <div style={{ position: 'absolute', left: 36, top: RC.h / 2 - 36, width: RC.labelW }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.ink }}>问：{r.q}</div>
              <div style={{ fontSize: 25, color: C.ink3, marginTop: 7 }}>期望 {r.expect}</div>
            </div>
            <div style={{
              position: 'absolute', left: RC.preX, top: (RC.h - RC.ch) / 2, width: RC.cw, height: RC.ch, borderRadius: 16,
              border: `1.5px solid ${C.green}99`, background: 'rgba(52,211,153,0.10)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transform: `perspective(700px) rotateY(${flipDeg(ft, T.reg_pre + 4 + i * 8)}deg)`,
            }}>
              <Check s={32} /><span style={{ fontSize: 36, fontWeight: 800, color: C.ink }}>{r.before}</span>
            </div>
            <div style={{ position: 'absolute', left: RC.preX + RC.cw + 22, top: RC.h / 2 - 13 }}>
              <DrawArrow p={ease(ft, T.reg_pre + 10 + i * 8, 8)} len={120} color={C.ink3} />
            </div>
            <div style={{
              position: 'absolute', left: RC.postX, top: (RC.h - RC.ch) / 2, width: RC.cw + (i === 1 ? 70 : 0), height: RC.ch, borderRadius: 16,
              border: `1.5px solid ${wrong ? C.red : 'rgba(255,255,255,0.13)'}`,
              background: wrong ? 'rgba(248,113,113,0.13)' : 'rgba(255,255,255,0.04)',
              boxShadow: wrong ? `0 0 ${34 * pop(ft, cellT, 12)}px rgba(248,113,113,0.30)` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: fade(ease(ft, cellT - 4, 8)),
              transform: `perspective(700px) rotateY(${flipDeg(ft, cellT)}deg)`,
            }}>
              {wrong ? <Cross s={32} /> : <span style={{ fontSize: 28, color: C.ink3 }}>…</span>}
              <span style={{ fontSize: 36, fontWeight: 800, color: wrong ? C.red : C.ink3 }}>{wrong ? r.after : '…'}</span>
            </div>
          </div>
        );
      })}
      <ShockRings f={ft} t0={t0 + 8} x={RC.left + RC.postX + 500} y={REG[1].y} color={C.red} maxR={130} />
      <Burst f={ft} t0={t0 + 8} x={RC.left + RC.postX + 500} y={REG[1].y} color={C.red} n={10} spread={90} />
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 62% 58%, transparent 46%, rgba(120,20,28,${0.22 * redPulse}) 100%)`, opacity: redPulse > 0 ? 1 : 0 }} />
      <Appear f={ft} delay={2} y={20} style={{ position: 'absolute', width: '100%', top: 138, textAlign: 'center' }}>
        <span style={{ fontSize: 46, fontWeight: 800, color: C.amber }}>
          <Chars f={ft} text="同一道旧题：改动前 ✓ → 改动后 ✗" delay={1} step={1.2} />
        </span>
      </Appear>
      <div style={{ position: 'absolute', left: RC.left + RC.preX + 40, top: 305, fontSize: 26, color: C.ink3 }}>改动前</div>
      <div style={{ position: 'absolute', left: RC.left + RC.postX + 60, top: 305, fontSize: 26, color: C.ink3 }}>改动后</div>
      {ft >= t0 && ft <= t0 + 7 ? <CameraMotionBlur shutterAngle={200} samples={20}>{cards}</CameraMotionBlur> : cards}
      <Appear f={ft} delay={t0 + 34} style={{ position: 'absolute', width: '100%', top: 760, textAlign: 'center' }}>
        <span style={{ fontSize: 40, fontWeight: 800, color: C.red }}>
          <Chars f={ft} text="不是没学会，是把会的改坏了" delay={t0 + 34} step={1.2} />
        </span>
      </Appear>
    </div>
  );
};

/* ---------- 场景 2：抽样 → 循环 → 尺子（华丽版） ---------- */
const LOOP_NODES = ['改一版', '跑几条', '感觉不错', '上线', '翻车'];
const EL = { cx: 960, cy: 450, rx: 300, ry: 200 };
const nodePos = (i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
  return { x: EL.cx + Math.cos(a) * EL.rx, y: EL.cy + Math.sin(a) * EL.ry };
};
const SceneLoop = ({ fs, ft, f, segIdx }) => {
  const rulerP = ease(ft, segIdx === 6 ? T.ruler_draw : 1e9, 20);
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {segIdx === 4 && (
        <>
          <div style={{ position: 'absolute', width: '100%', top: 340, textAlign: 'center', fontSize: 76, fontWeight: 900 }}>
            <Chars f={ft} text="单次答对，只是" delay={2} step={2.2} style={{ color: C.ink }} />
            <Chars f={ft} text="抽样" delay={16} step={3} style={{ color: C.amber }} />
          </div>
          <Appear f={ft} delay={30} style={{ position: 'absolute', width: '100%', top: 520, textAlign: 'center' }}>
            <span style={{ fontSize: 36, color: C.ink2 }}>一次过关 ≠ 稳定表现</span>
          </Appear>
        </>
      )}
      {segIdx === 5 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
            <ellipse cx={EL.cx} cy={EL.cy} rx={EL.rx} ry={EL.ry} fill="none" stroke="rgba(159,176,201,0.42)" strokeWidth={3} strokeDasharray="16 12" strokeDashoffset={-ft * 1.6} opacity={ease(ft, 40, 20)} />
          </svg>
          {LOOP_NODES.map((t, i) => {
            const { x, y } = nodePos(i);
            const s = pop(ft, 6 + i * 7, 12);
            const red = i === 4;
            const cyc = ft > 52 ? Math.floor((ft - 52) / 26) % 5 : -1;
            const active = cyc === i;
            const hitP = red && ft > 52 ? ((ft - 52) % 26) / 26 : 0;
            return (
              <div key={t}>
                {red && ft > 52 && hitP < 0.5 && (
                  <ShockRings f={hitP * 14} t0={1} x={x} y={y} color={C.red} maxR={90} gap={99} />
                )}
                <Float f={ft} phase={i * 37} amp={3}>
                  <div style={{
                    position: 'absolute', left: x - 95, top: y - 40, width: 190, height: 80, borderRadius: 16,
                    background: red ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${red ? C.red : active ? C.blue : 'rgba(255,255,255,0.14)'}`,
                    boxShadow: active ? '0 0 34px rgba(77,163,255,0.35)' : 'none',
                    opacity: fade(s), transform: `scale(${0.9 + s * 0.1})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, fontWeight: 700, color: red ? C.red : C.ink,
                  }}>{t}</div>
                </Float>
              </div>
            );
          })}
          {ft > 52 && [0, 1, 2].map((k) => {
            const lag = (k + 1) * 4;
            const a = -Math.PI / 2 + (((ft - 52 - lag) / 26) % 5) * (Math.PI * 2 / 5);
            const dx = EL.cx + Math.cos(a) * EL.rx, dy = EL.cy + Math.sin(a) * EL.ry;
            const sz = 16 - k * 4;
            return <div key={k} style={{ position: 'absolute', left: dx - sz / 2, top: dy - sz / 2, width: sz, height: sz, borderRadius: '50%', background: C.blue, opacity: 0.55 - k * 0.16, boxShadow: '0 0 12px rgba(77,163,255,0.9)' }} />;
          })}
          {ft > 52 && (() => {
            const a = -Math.PI / 2 + (((ft - 52) / 26) % 5) * (Math.PI * 2 / 5);
            return <div style={{ position: 'absolute', left: EL.cx + Math.cos(a) * EL.rx - 11, top: EL.cy + Math.sin(a) * EL.ry - 11, width: 22, height: 22, borderRadius: '50%', background: C.blue, boxShadow: '0 0 26px rgba(77,163,255,0.95)' }} />;
          })()}
          <Appear f={ft} delay={86} style={{ position: 'absolute', width: '100%', top: 730, textAlign: 'center' }}>
            <span style={{ fontSize: 38, color: C.red, fontWeight: 700 }}>
              <Chars f={ft} text="老问题，换个样子回来" delay={86} step={1.6} />
            </span>
          </Appear>
        </div>
      )}
      {segIdx === 6 && (
        <>
          <Appear f={ft} delay={4} y={30} style={{ position: 'absolute', width: '100%', top: 320, textAlign: 'center' }}>
            <span style={{ fontSize: 66, fontWeight: 900, color: C.amber }}>
              <Chars f={ft} text="你缺的是一把固定的尺子" delay={4} step={2} />
            </span>
          </Appear>
          <svg width={760} height={90} style={{ position: 'absolute', left: 580, top: 500 }}>
            <line x1={10} y1={45} x2={10 + 740 * rulerP} y2={45} stroke={C.amber} strokeWidth={5} strokeLinecap="round" />
            {Array.from({ length: 11 }).map((_, i) => {
              const x = 30 + i * 70;
              return <line key={i} x1={x} y1={45 - (i % 5 === 0 ? 18 : 10)} x2={x} y2={45 + (i % 5 === 0 ? 18 : 10)} stroke={C.amber} strokeWidth={i % 5 === 0 ? 3 : 2} opacity={rulerP > (i + 1) / 12 ? 0.9 : 0} />;
            })}
          </svg>
          <Appear f={ft} delay={44} style={{ position: 'absolute', width: '100%', top: 660, textAlign: 'center' }}>
            <span style={{ fontSize: 38, color: C.ink2 }}>分清真进步，和碰运气</span>
          </Appear>
        </>
      )}
    </div>
  );
};

/* ---------- 场景 3：三组样本（具象行说明 + 翻转/光带/冲击波） ---------- */
const ROWS = [
  { y: 300, name: '修复样本', sub: '这次要修的：退货期答 70 天', col: C.green },
  { y: 480, name: '回归保护样本', sub: '原本正常的：库存答 80 件', col: C.blue },
  { y: 650, name: '留出样本', sub: '没见过的：保修期是多久', col: C.cyan },
];
const CELL = { w: 170, h: 104 };
const cellX = { pre: 1010, post: 1360 };
const CellContent = ({ state, color }) => (
  <>
    {state === 'cross' && <Cross />}
    {state === 'check' && <Check color={color} />}
    {state === 'q' && <span style={{ fontSize: 44, fontWeight: 900, color: C.amber }}>?</span>}
    {state === 'untested' && <span style={{ fontSize: 27, color: C.ink3 }}>未测</span>}
    {state === 'lock' && (
      <svg width="34" height="34" viewBox="0 0 34 34">
        <rect x="6" y="14" width="22" height="15" rx="4" fill="none" stroke={C.cyan} strokeWidth="2.6" />
        <path d="M11 14 V10 a6 6 0 0 1 12 0 V14" fill="none" stroke={C.cyan} strokeWidth="2.6" />
      </svg>
    )}
  </>
);
const Cell = ({ x, y, state, color, flipAt = null, ft = 0 }) => {
  const rot = flipAt != null ? flipDeg(ft, flipAt) : 0;
  const sp = flipAt != null ? pop(ft, flipAt, 12) : 0;
  return (
    <div style={{
      position: 'absolute', left: x, top: y - CELL.h / 2, width: CELL.w, height: CELL.h, borderRadius: 16,
      background: state === 'cross' ? 'rgba(248,113,113,0.13)' : state === 'check' ? 'rgba(52,211,153,0.11)' : state === 'q' ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.04)',
      border: state === 'untested' ? '1.5px dashed rgba(255,255,255,0.22)'
        : `1.5px solid ${state === 'cross' ? C.red : state === 'check' ? C.green : state === 'q' ? C.amber : 'rgba(255,255,255,0.13)'}`,
      boxShadow: state === 'cross' ? `0 0 ${30 + 14 * sp}px rgba(248,113,113,0.25)` : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transform: `perspective(700px) rotateY(${rot}deg)`,
    }}>
      <CellContent state={state} color={color} />
    </div>
  );
};
const SceneMatrix = ({ fs, ft, f, segIdx }) => {
  const row3Done = segIdx === 11 ? ft > SEGS[11].frames * T.row3_late : segIdx > 11;
  const dimAt = Math.floor(SEGS[11].frames * T.row3_late);
  const stampDim = segIdx === 11 ? interpolate(ft, [dimAt, dimAt + 20], [1, 0.3], clamp) : segIdx > 11 ? 0.3 : 1;
  const st = [
    { pre: segIdx >= 8 ? 'cross' : 'empty', post: segIdx >= 8 ? 'check' : 'empty' },
    { pre: segIdx >= 9 ? 'check' : 'empty', post: segIdx >= 10 ? 'cross' : segIdx >= 9 ? 'q' : 'empty' },
    { pre: segIdx >= 11 ? 'lock' : 'empty', post: segIdx > 11 ? 'check' : segIdx === 11 ? (row3Done ? 'check' : 'untested') : 'empty' },
  ];
  const stampS = segIdx >= 10 ? pop(ft, T.stamp, 10) : 0;
  const sh = segIdx === 10 ? shake(ft, T.stamp + 6, 12) : { x: 0, y: 0 };
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, perspective: 1100, transform: `translate(${sh.x}px, ${sh.y}px)` }}>
      <div style={{ position: 'absolute', left: cellX.pre - 10, top: 196, fontSize: 32, color: C.ink3 }}>改动前</div>
      <div style={{ position: 'absolute', left: cellX.post - 10, top: 196, fontSize: 32, color: C.ink3 }}>改动后</div>
      {ROWS.map((r, i) => {
        const s = pop(fs, 6 + i * 8, 12);
        return (
          <div key={r.name} style={{ position: 'absolute', left: 120, top: r.y - 52, width: 620, opacity: fade(s), transform: `translateX(${(1 - s) * -40}px)` }}>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>{r.name}</div>
            <div style={{ fontSize: 27, color: C.ink3, marginTop: 6 }}>如：{r.sub.replace('这次要修的：', '这次要修的——').replace('原本正常的：', '原本正常——').replace('没见过的：', '没见过——')}</div>
          </div>
        );
      })}
      {ROWS.map((r, i) => (
        <div key={r.name + '-a'} style={{ position: 'absolute', left: cellX.pre + CELL.w + 10, top: ROWS[i].y - 13 }}>
          <DrawArrow p={segIdx >= 8 + i ? 1 : ease(fs, 30 + i * 8, 8)} len={150} color={r.col} />
        </div>
      ))}
      <Sweep f={fs} t0={segIdx === 8 ? T.row1_flip : 1e9} y={ROWS[0].y - 52} h={104} w={1000} x={1000} color="rgba(52,211,153,0.14)" />
      <Sweep f={fs} t0={segIdx === 10 ? T.stamp : 1e9} y={ROWS[1].y - 52} h={104} w={1000} x={1000} color="rgba(248,113,113,0.14)" />
      <Sweep f={fs} t0={segIdx === 11 ? dimAt : 1e9} y={ROWS[2].y - 52} h={104} w={1000} x={1000} color="rgba(103,232,249,0.14)" />
      {ROWS.map((r, i) => (
        <div key={r.name + '-c'} style={{ position: 'absolute', left: 0, top: 0 }}>
          <Cell x={cellX.pre} y={ROWS[i].y} state={st[i].pre} color={r.col}
            ft={ft} flipAt={i === 0 ? (segIdx === 8 ? T.row1_flip - 12 : null) : i === 1 ? (segIdx === 9 ? T.row2_q : null) : (segIdx === 11 ? T.lock : null)} />
          <Cell x={cellX.post} y={ROWS[i].y} state={st[i].post} color={r.col}
            ft={ft} flipAt={i === 0 ? (segIdx === 8 ? T.row1_flip : null) : i === 1 ? (segIdx === 10 ? T.stamp : null) : (segIdx === 11 && row3Done ? dimAt : null)} />
        </div>
      ))}
      {segIdx >= 8 && segIdx <= 9 && (
        <Appear f={ft} delay={14} style={{ position: 'absolute', left: 1580, top: ROWS[0].y - 26 }}>
          <span style={{ fontSize: 30, color: C.green, fontWeight: 700 }}>全过 ✓</span>
        </Appear>
      )}
      {segIdx === 11 && (
        <Appear f={ft} delay={T.lock + 6} style={{ position: 'absolute', left: 1560, top: ROWS[2].y - 40, width: 280 }}>
          <span style={{ fontSize: 28, color: C.cyan }}>迭代期间锁定</span>
        </Appear>
      )}
      {segIdx >= 10 && (
        <>
          <ShockRings f={ft} t0={T.stamp + 4} x={1030} y={ROWS[1].y} color={C.red} maxR={240} />
          <ShockRings f={ft} t0={T.stamp + 9} x={1030} y={ROWS[1].y} color="#FFB4B4" maxR={150} />
          <Burst f={ft} t0={T.stamp + 5} x={1030} y={ROWS[1].y} color={C.red} n={14} spread={160} />
          <div style={{
            position: 'absolute', left: 720, top: ROWS[1].y - 88, width: 620, height: 176,
            transform: `rotate(-7deg) scale(${0.5 + stampS * 0.5})`, opacity: fade(stampS) * stampDim,
            border: `5px solid ${C.red}`, borderRadius: 26,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 70px rgba(248,113,113,0.38)', background: 'rgba(248,113,113,0.07)',
            transition: 'opacity 0.5s',
          }}>
            <div style={{ fontSize: 52, fontWeight: 900, color: C.red, letterSpacing: 4 }}>修 A 伤 B</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: C.red, marginTop: 8 }}>这版直接打回</div>
          </div>
        </>
      )}
    </div>
  );
};

/* ---------- 场景 4：即使三组都过 ---------- */
const SceneCaveat = ({ ft, f }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <div style={{ position: 'absolute', width: '100%', top: 300, textAlign: 'center', fontSize: 60, fontWeight: 900, color: C.ink }}>
      <Chars f={ft} text="即使三组都过 = 本版过关" delay={4} step={1.6} />
    </div>
    <div style={{ position: 'absolute', width: '100%', top: 470, textAlign: 'center' }}>
      <span style={{ fontSize: 76, fontWeight: 900, color: C.amber }}>
        <Chars f={ft} text="≠ 整体变好了" delay={18} step={2.4} chStyle={{ textShadow: '0 0 34px rgba(251,191,36,0.3)' }} />
      </span>
    </div>
    <Appear f={ft} delay={40} style={{ position: 'absolute', width: '100%', top: 640, textAlign: 'center' }}>
      <span style={{ fontSize: 34, color: C.ink2 }}>只是"这些样本上，没发现问题"</span>
    </Appear>
  </div>
);

/* ---------- 场景 5：六步 → 一句（两侧飞入 + 汇聚） ---------- */
const STEPS = ['失败记录', '行为定义', '区分性样本', '可重复测量', '对照', '受控改动'];
const SceneSteps = ({ ft, f, segIdx }) => {
  const collapsed = segIdx >= 14;
  const conv = collapsed ? ease(ft, 4, 12) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {!collapsed && STEPS.map((t, i) => {
        const s = pop(ft, STEP_DELAY(i), 12);
        const r = Math.floor(i / 3), c = i % 3;
        const side = (i % 2 === 0 ? -1 : 1);
        return (
          <Float key={t} f={ft} phase={i * 31} amp={2.4}>
            <div style={{
              position: 'absolute', left: 300 + c * 460, top: 300 + r * 210, width: 380, height: 130, borderRadius: 20,
              ...CARD, opacity: fade(s),
              transform: `translate(${side * (1 - s) * 150}px, ${(1 - s) * 46}px) rotate(${side * (1 - s) * 8}deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
            }}>
              <span style={{ fontSize: 26, color: C.ink3 }}>{`0${i + 1}`}</span>
              <span style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{t}</span>
            </div>
          </Float>
        );
      })}
      {collapsed && (
        <>
          {STEPS.map((t, i) => {
            const r = Math.floor(i / 3), c = i % 3;
            return (
              <div key={t} style={{
                position: 'absolute', left: 300 + c * 460, top: 300 + r * 210, width: 380, height: 130, borderRadius: 20,
                ...CARD, opacity: 1 - conv,
                transform: `translate(${(960 - (300 + c * 460 + 190)) * conv * 0.9}px, ${(430 - (300 + r * 210 + 65)) * conv * 0.9}px) scale(${1 - 0.4 * conv})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
              }}>
                <span style={{ fontSize: 26, color: C.ink3 }}>{`0${i + 1}`}</span>
                <span style={{ fontSize: 38, fontWeight: 800, color: C.ink }}>{t}</span>
              </div>
            );
          })}
          <div style={{ position: 'absolute', width: '100%', top: 380, textAlign: 'center', opacity: ease(ft, 14, 10) }}>
            <Grad f={f} style={{ fontSize: 62, fontWeight: 900 }}>固定样本 · 固定判据 · 一次一个变量</Grad>
          </div>
          <Appear f={ft} delay={34} style={{ position: 'absolute', width: '100%', top: 540, textAlign: 'center' }}>
            <span style={{ fontSize: 34, color: C.ink2 }}>浓缩成一句</span>
          </Appear>
        </>
      )}
    </div>
  );
};

/* ---------- 场景 6：不建平台 → 尺子长短（华丽版） ---------- */
const SceneRuler = ({ ft, f, segIdx }) => {
  const strikeP = ease(ft, segIdx === 15 ? T.strike : 1e9, 12);
  const growS = segIdx === 17 ? pop(ft, T.grow + 20, 9) : 0;
  const growP = interpolate(ft, [segIdx === 17 ? T.grow : 1e9, (segIdx === 17 ? T.grow : 1e9) + 22], [0.4, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const tipX = 190 + 400 * strikeP, tipY = 280 + 62 + 180 * strikeP;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      {segIdx <= 16 && (
        <div style={{ position: 'absolute', left: 200, top: 280, opacity: segIdx === 16 ? 0.5 : 1, transition: 'opacity 0.5s' }}>
          {[0, 1, 2].map((i) => (
            <Float key={i} f={ft} phase={i * 47} amp={2.5}>
              <div style={{
                width: 300 + i * 30, height: 64, marginTop: 26, borderRadius: 14,
                background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.14)',
                marginLeft: i * -15, transform: `translateX(${i * 40}px)`,
              }} />
            </Float>
          ))}
          <svg width={460} height={280} style={{ position: 'absolute', left: -30, top: 0 }}>
            <line x1={20} y1={70} x2={20 + 400 * strikeP} y2={70 + 180 * strikeP} stroke={C.red} strokeWidth={7} strokeLinecap="round" />
            <line x1={40} y1={64} x2={40 + 240 * strikeP} y2={64 + 108 * strikeP} stroke="#FF9D9D" strokeWidth={3.5} strokeLinecap="round" opacity={0.8} />
          </svg>
          {strikeP > 0 && strikeP < 1 && <Burst f={strikeP * 12} t0={0.5} x={tipX} y={tipY} color={C.red} n={7} spread={46} dur={12} />}
          <div style={{ marginTop: 30, fontSize: 30, color: C.ink3 }}>评测平台</div>
        </div>
      )}
      {segIdx === 15 && (
        <Appear f={ft} delay={6} style={{ position: 'absolute', left: 760, top: 330 }}>
          <div style={{ fontSize: 58, fontWeight: 900, color: C.ink }}>
            <Chars f={ft} text="不需要建" delay={6} step={1.6} />
            <span style={{ color: C.red }}>评测平台</span>
          </div>
        </Appear>
      )}
      {segIdx === 16 && (
        <Appear f={ft} delay={4} style={{ position: 'absolute', width: '100%', top: 560, textAlign: 'center' }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: C.ink }}>低风险任务：<span style={{ color: C.green }}>少量固定样本起步</span></span>
        </Appear>
      )}
      {segIdx === 17 && (
        <>
          <Appear f={ft} delay={4} y={26} style={{ position: 'absolute', width: '100%', top: 280, textAlign: 'center' }}>
            <span style={{ fontSize: 54, fontWeight: 900, color: C.ink }}>
              <Chars f={ft} text="任务越关键，" delay={4} step={1.8} />
              <span style={{ color: C.amber }}>尺子就要越长</span>
            </span>
          </Appear>
          <div style={{ position: 'absolute', left: 360, top: 470, width: 1200, height: 60 }}>
            <div style={{
              width: 1200 * (growP + (growS - 1) * 0.02 * fade(growS)), height: 54, borderRadius: 12, border: `2.5px solid ${C.amber}`,
              background: 'rgba(251,191,36,0.08)', position: 'relative', overflow: 'hidden',
              boxShadow: `0 0 ${30 * fade(growS)}px rgba(251,191,36,0.25)`,
            }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{
                  position: 'absolute', left: 40 + i * 95, top: 5, width: 3, height: i % 4 === 0 ? 44 : 24,
                  background: C.amber, opacity: growP > (i + 1) / 12 ? 0.85 : 0,
                  boxShadow: growP > (i + 1) / 12 ? '0 0 8px rgba(251,191,36,0.6)' : 'none',
                }} />
              ))}
              <div style={{
                position: 'absolute', left: -260 + 1720 * ease(ft, T.grow + 34, 22), top: -30, width: 150, height: 114,
                background: 'linear-gradient(100deg, transparent, rgba(251,191,36,0.22), transparent)', transform: 'skewX(-14deg)',
              }} />
            </div>
            <Appear f={ft} delay={26} style={{ position: 'absolute', left: 40, top: 66 }}><span style={{ fontSize: 28, color: C.ink3 }}>低风险 → 短尺</span></Appear>
            <Appear f={ft} delay={34} style={{ position: 'absolute', right: 40, top: 66 }}><span style={{ fontSize: 28, color: C.ink3 }}>关键任务 → 长尺</span></Appear>
          </div>
          <Appear f={ft} delay={48} style={{ position: 'absolute', width: '100%', top: 660, textAlign: 'center' }}>
            <span style={{ fontSize: 30, color: C.ink2 }}>样本够不够，看风险与覆盖</span>
          </Appear>
        </>
      )}
    </div>
  );
};

/* ---------- 场景 7：收尾三词（景深入场 + 微彩带） ---------- */
const SceneClose = ({ ft, f }) => {
  const words = [
    { t: '修掉的', c: C.green }, { t: '没伤到的', c: C.blue }, { t: '没见过的', c: C.cyan },
  ];
  const sweep = ease(ft, T.sweep, 20);
  const celebre = ease(ft, 40, 14) * (0.5 + 0.5 * Math.sin(f / 16));
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <div style={{ position: 'absolute', width: '100%', top: 250, textAlign: 'center' }}>
        <span style={{ fontSize: 44, color: C.ink2 }}>
          <Chars f={ft} text="它真的变好了吗？先看三组结果" delay={2} step={1.4} />
        </span>
      </div>
      <div style={{ position: 'absolute', left: 210, top: 400, width: 1500, height: 260 }}>
        {words.map((w, i) => {
          const s = pop(ft, 6 + i * 9, 11);
          const blur = (1 - s) * 6;
          return (
            <div key={w.t} style={{
              position: 'absolute', left: i * 500, top: 0, width: 440, height: 240, borderRadius: 24,
              ...CARD, borderColor: `${w.c}88`,
              opacity: fade(s),
              transform: `translateY(${(1 - s) * 60}px) scale(${0.62 + s * 0.38 + 0.015 * celebre})`,
              filter: `blur(${blur}px)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 60, fontWeight: 900, color: w.c,
              boxShadow: `0 18px 50px rgba(2,6,16,0.45), 0 0 ${34 * fade(ease(ft, 30, 12))}px ${w.c}33`,
            }}>{w.t}</div>
          );
        })}
        {ft > 36 && Array.from({ length: 14 }).map((_, i) => {
          const x = 220 + rnd(i + 200) * 1480;
          const y = ((rnd(i + 260) * 300 + ft * (0.5 + rnd(i + 300) * 0.5)) % 340) + 380;
          const sz = 4 + rnd(i + 340) * 5;
          const col = [C.blue, C.cyan, C.amber, C.green][i % 4];
          return (
            <div key={i} style={{
              position: 'absolute', left: x + Math.sin(f / 34 + i) * 14, top: y, width: sz, height: sz * 0.5,
              background: col, opacity: 0.32, borderRadius: 2, transform: `rotate(${rnd(i + 380) * 360}deg)`,
            }} />
          );
        })}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: 1500, height: 260, borderRadius: 24, overflow: 'hidden', pointerEvents: 'none',
          opacity: sweep > 0 && sweep < 1 ? 1 : 0,
        }}>
          <div style={{
            position: 'absolute', left: -300 + 1800 * sweep, top: -40, width: 180, height: 340,
            background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.12), transparent)',
            transform: 'skewX(-12deg)',
          }} />
        </div>
      </div>
    </div>
  );
};

/* ---------- SFX 钉帧表（12 条，不变） ---------- */
const SFX = [
  { seg: 0, at: T.open_hit, src: 'bass-hit-short.mp3', vol: 0.32, note: '开场定格印章落定重音（0 帧声音事件）' },
  { seg: 1, at: T.bugs, src: 'sparkle.mp3', vol: 0.20, note: '三个 bug 勾（单次）' },
  { seg: 2, at: T.riser, src: 'riser-cine.mp3', vol: 0.10, note: '"为什么还打回"张力渐升' },
  { seg: 3, at: T.reg_wrong, src: 'glitch-virtual-quick.mp3', vol: 0.20, note: '前后对照变错' },
  { seg: 3, at: T.reg_zoom, src: 'zoom-air-fast.mp3', vol: 0.22, note: '急推 2024 件（crash-zoom）' },
  { seg: 6, at: T.ruler_draw, src: 'marker-pen-line.mp3', vol: 0.22, note: '尺子描画' },
  { seg: 10, at: T.stamp, src: 'impact-cine-big.mp3', vol: 0.5, note: '打回印章（全片最大打击点）' },
  { seg: 11, at: T.lock + 6, src: 'lock-quick.mp3', vol: 0.22, note: '留出组上锁' },
  { seg: 13, at: STEP_DELAY(0), src: 'paper-slide.mp3', vol: 0.22, note: '六步首卡（跟随口播）' },
  { seg: 15, at: T.strike, src: 'chalk-line.mp3', vol: 0.24, note: '划掉平台' },
  { seg: 17, at: T.grow, src: 'clock-knob-spin.mp3', vol: 0.18, note: '尺子变长' },
  { seg: 18, at: T.sweep, src: 'shimmer-sparkle-sweep.mp3', vol: 0.24, note: '结尾微光' },
];

const Bgm = ({ f }) => {
  const v = interpolate(f, [0, 8, TOTAL - 60, TOTAL], [0.06, 0.14, 0.14, 0], clamp);
  return <AbsoluteFill><Audio src={staticFile('audio/bgm-tech-house.mp3')} volume={v} /></AbsoluteFill>;
};

/* ---------- 路由 + 2.5D 相机 + 场景交叠转场 ---------- */
const SCENE_OF = (i) =>
  i <= 2 ? 'open' : i === 3 ? 'answer' : i <= 6 ? 'loop' : i <= 11 ? 'matrix' : i === 12 ? 'caveat' : i <= 14 ? 'steps' : i <= 17 ? 'ruler' : 'close';
const SCENE_START = {};
[0, 3, 4, 7, 12, 13, 15, 18].forEach((i) => { SCENE_START[SCENE_OF(i)] = SEGS[i].from; });
const SCENE_TAG = { open: '示例', answer: '示例', loop: null, matrix: '示例', caveat: null, steps: null, ruler: null, close: null };

const renderScene = (scene, fs, ft, segIdx, f) => (
  <>
    {scene === 'open' && <SceneOpen ft={ft} f={f} segIdx={segIdx} />}
    {scene === 'answer' && <SceneAnswer ft={ft} f={f} segIdx={segIdx} />}
    {scene === 'loop' && <SceneLoop fs={fs} ft={ft} f={f} segIdx={segIdx} />}
    {scene === 'matrix' && <SceneMatrix fs={fs} ft={ft} f={f} segIdx={segIdx} />}
    {scene === 'caveat' && <SceneCaveat ft={ft} f={f} />}
    {scene === 'steps' && <SceneSteps ft={ft} f={f} segIdx={segIdx} />}
    {scene === 'ruler' && <SceneRuler ft={ft} f={f} segIdx={segIdx} />}
    {scene === 'close' && <SceneClose ft={ft} f={f} />}
  </>
);

const MainVideo = ({ bgm = true }) => {
  const f = useCurrentFrame();
  const seg = SEGS.find((s) => f >= s.from && f < s.from + s.frames) ?? SEGS[SEGS.length - 1];
  const scene = SCENE_OF(seg.idx);
  const sceneFrom = SCENE_START[scene] ?? 0;
  const fs = f - sceneFrom;
  const ft = f - seg.from;
  const k = ease(fs, 0, 11);
  const prevScene = fs < 11 && seg.idx > 0 ? SCENE_OF(seg.idx - 1) : null;
  const prevFs = prevScene ? f - (SCENE_START[prevScene] ?? 0) : 0;
  const prevFt = prevScene ? f - SEGS[seg.idx - 1].from : 0;
  const cam = `rotateX(1.7deg) scale(1.024) translate(${Math.sin(f / 200) * 6}px, ${Math.cos(f / 250) * 4}px)`;
  const camPrev = `rotateX(1.7deg) scale(${1.024 + 0.09 * k}) translate(${Math.sin(f / 200) * 6}px, ${Math.cos(f / 250) * 4}px)`;
  const fadeIn = ease(f, 0, 8);
  const fadeOut = interpolate(f, [TOTAL - 16, TOTAL - 2], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <Background f={f} />
      {SCENE_TAG[scene] && <CornerTag f={f} text={SCENE_TAG[scene]} />}
      <AbsoluteFill style={{ perspective: 1500 }}>
        {prevScene && (
          <AbsoluteFill style={{ transform: camPrev, opacity: 1 - k }}>{renderScene(prevScene, prevFs, prevFt, seg.idx - 1, f)}</AbsoluteFill>
        )}
        <AbsoluteFill style={{ transform: `${cam} scale(${0.965 + 0.035 * k})`, opacity: k }}>
          {renderScene(scene, fs, ft, seg.idx, f)}
        </AbsoluteFill>
      </AbsoluteFill>
      <Subtitle key={seg.id} lf={ft} text={seg.sentence} />
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
