import {AbsoluteFill, Easing, interpolate, spring} from 'remotion';
export const FPS = 30;

/* ---------- 设计令牌 ---------- */
export const C = {
  ink: '#F2F6FC', ink2: '#9FB0C9', ink3: '#64789A',
  blue: '#4DA3FF', cyan: '#67E8F9', green: '#34D399', red: '#F87171', amber: '#FBBF24',
};
export const FONT = `"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif`;
export const CARD = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.025))',
  border: '1px solid rgba(255,255,255,0.11)',
  borderRadius: 22,
  boxShadow: '0 18px 50px rgba(2,6,16,0.45)',
};
export const GRAD = {
  background: 'linear-gradient(92deg,#4DA3FF,#67E8F9)',
  WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
};
export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
export const ease = (f, delay = 0, dur = 9) =>
  interpolate(f, [delay, delay + dur], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
export const pop = (f, delay = 0, damping = 13) =>
  spring({ frame: Math.max(0, f - delay), fps: FPS, config: { damping, mass: 0.9 } });
export const fade = (v) => Math.max(0, Math.min(1, v));

/* ---------- 基础组件 ---------- */
export const Background = ({ f }) => (
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

export const CornerTag = ({ f, text, fontSize = 28 }) => {
  const e = ease(f, 4, 8);
  return (
    <div style={{
      position: 'absolute', right: 52, top: 44, opacity: e, transform: `translateY(${(1 - e) * -10}px)`,
      padding: '8px 20px', borderRadius: 999, border: `1.5px solid ${C.amber}66`,
      color: C.amber, fontFamily: FONT, fontSize, fontWeight: 600, background: 'rgba(251,191,36,0.08)',
    }}>{text}</div>
  );
};

export const Subtitle = ({ lf, text, fontSize = 42, height = 144, style }) => {
  const e = ease(lf, 0, 6);
  return (
    <div style={{
      position: 'absolute', left: 130, right: 130, bottom: 42, height,
      boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: e, padding: '12px 32px', borderRadius: 18,
      background: 'rgba(6,10,20,0.86)', border: '1px solid rgba(255,255,255,0.09)',
      color: C.ink, fontFamily: FONT, fontSize, fontWeight: 700,
      textAlign: 'center', lineHeight: 1.4, ...style,
    }}><span>{text}</span></div>
  );
};

export const ProgressBar = ({ f, total }) => (
  <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${(f / total) * 100}%`, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)', opacity: 0.75, boxShadow: '0 0 12px rgba(77,163,255,0.7)' }} />
);

/* ---------- 动效件 ---------- */
export const Appear = ({ f, delay = 0, y = 26, damping = 13, style, children }) => {
  const s = pop(f, delay, damping);
  return (
    <div style={{ ...style, opacity: fade(s), transform: `translateY(${(1 - s) * y}px)` }}>{children}</div>
  );
};

export const DrawArrow = ({ f, delay = 0, len = 64, color = C.ink3, w = 3.2 }) => {
  const p = ease(f, delay, 8);
  if (p <= 0) return <div style={{ width: len, height: 24, flexShrink: 0 }} />;
  return (
    <svg width={len} height={24} style={{ width: len, height: 24, display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <line x1={2} y1={12} x2={2 + (len - 16) * p} y2={12} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${2 + (len - 2) * p},12 ${2 + (len - 2) * p - 13},4.5 ${2 + (len - 2) * p - 13},19.5`} fill={color} opacity={p > 0.65 ? 1 : 0} />
    </svg>
  );
};

export const Check = ({ f, delay = 0, color = C.green, size = 30 }) => {
  const p = ease(f, delay, 8);
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <path d="M5 16 L12 24 L25 7" stroke={color} strokeWidth={4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - p)} />
    </svg>
  );
};

export const Cross = ({ f, delay = 0, color = C.red, size = 30 }) => {
  const p = ease(f, delay, 8);
  const pp = (a, b) => 22 * (1 - Math.max(0, Math.min(1, (p - a) / (b - a))));
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <path d="M8 8 L22 22" stroke={color} strokeWidth={4.2} strokeLinecap="round" strokeDasharray={22} strokeDashoffset={pp(0, 0.6)} />
      <path d="M8 22 L22 8" stroke={color} strokeWidth={4.2} strokeLinecap="round" strokeDasharray={22} strokeDashoffset={pp(0.5, 1)} />
    </svg>
  );
};

export const Box = ({ f, delay = 0, w, h, style, children }) => {
  const s = pop(f, delay, 12);
  return (
    <div style={{
      width: w, height: h, ...CARD, ...style,
      opacity: fade(s), transform: `scale(${0.9 + s * 0.1})`,
    }}>{children}</div>
  );
};
