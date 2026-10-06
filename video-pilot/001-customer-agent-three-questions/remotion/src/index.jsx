import {
  AbsoluteFill, Audio, Composition, Easing, Sequence,
  interpolate, registerRoot, spring, staticFile, useCurrentFrame,
} from 'remotion';
import timing from './timing.json';

/* ---------- 时间轴：18 句旁白复用静态基线的音频与计时 ---------- */
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

/* ---------- 基础组件 ---------- */
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

const Brand = ({ f }) => {
  const e = ease(f, 1, 8);
  return (
    <div style={{ position: 'absolute', left: 52, top: 40, display: 'flex', alignItems: 'center', gap: 14, opacity: e, transform: `translateY(${(1 - e) * -12}px)` }}>
      <div style={{ width: 12, height: 12, borderRadius: 4, background: 'linear-gradient(135deg,#4DA3FF,#67E8F9)', boxShadow: '0 0 14px rgba(77,163,255,0.8)' }} />
      <div style={{ fontFamily: FONT, color: C.ink2, fontSize: 24, fontWeight: 700, letterSpacing: 6 }}>AI FIELD NOTES</div>
      <div style={{ fontFamily: FONT, color: C.ink3, fontSize: 19, borderLeft: '1px solid rgba(255,255,255,0.16)', paddingLeft: 14 }}>企业 AI 落地 · 第 01 条</div>
    </div>
  );
};

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
  const e = ease(lf, 0, 6);
  return (
    <div style={{
      position: 'absolute', left: '50%', bottom: 58, opacity: e,
      transform: `translateX(-50%) translateY(${(1 - e) * 18}px)`,
      padding: '15px 38px', borderRadius: 16, background: 'rgba(6,10,20,0.80)',
      border: '1px solid rgba(255,255,255,0.09)',
      color: C.ink, fontFamily: FONT, fontSize: 33, fontWeight: 700,
      maxWidth: 1560, textAlign: 'center', lineHeight: 1.55, whiteSpace: 'pre-wrap',
    }}>{text}</div>
  );
};

const ProgressBar = ({ f }) => (
  <div style={{ position: 'absolute', left: 0, bottom: 0, height: 4, width: `${(f / TOTAL) * 100}%`, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)', opacity: 0.75, boxShadow: '0 0 12px rgba(77,163,255,0.7)' }} />
);

/* ---------- 动效件 ---------- */
const Appear = ({ f, delay = 0, y = 26, damping = 13, style, children }) => {
  const s = pop(f, delay, damping);
  return (
    <div style={{ ...style, opacity: fade(s), transform: `translateY(${(1 - s) * y}px)` }}>{children}</div>
  );
};

const Float = ({ f, phase = 0, amp = 3, children, style }) => (
  <div style={{ ...style, transform: `translateY(${Math.sin((f + phase) / 56) * amp}px)` }}>{children}</div>
);

const DrawArrow = ({ f, delay = 0, len = 64, color = C.ink3, w = 3.2 }) => {
  const p = ease(f, delay, 8);
  if (p <= 0) return <div style={{ width: len, height: 24, flexShrink: 0 }} />;
  return (
    <svg width={len} height={24} style={{ width: len, height: 24, display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <line x1={2} y1={12} x2={2 + (len - 16) * p} y2={12} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`${2 + (len - 2) * p},12 ${2 + (len - 2) * p - 13},4.5 ${2 + (len - 2) * p - 13},19.5`} fill={color} opacity={p > 0.65 ? 1 : 0} />
    </svg>
  );
};

const DrawArrowV = ({ f, delay = 0, h = 34, color = C.blue, w = 3 }) => {
  const p = ease(f, delay, 7);
  if (p <= 0) return <div style={{ width: 24, height: h, flexShrink: 0 }} />;
  return (
    <svg width={24} height={h} style={{ width: 24, height: h, display: 'block', overflow: 'visible', flexShrink: 0 }}>
      <line x1={12} y1={2} x2={12} y2={2 + (h - 14) * p} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <polygon points={`12,${2 + (h - 2) * p} 4.5,${2 + (h - 2) * p - 12} 19.5,${2 + (h - 2) * p - 12}`} fill={color} opacity={p > 0.65 ? 1 : 0} />
    </svg>
  );
};

const Check = ({ f, delay = 0, color = C.green, size = 30 }) => {
  const p = ease(f, delay, 8);
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <path d="M5 16 L12 24 L25 7" stroke={color} strokeWidth={4.2} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - p)} />
    </svg>
  );
};

const Cross = ({ f, delay = 0, color = C.red, size = 30 }) => {
  const p = ease(f, delay, 8);
  const pp = (a, b) => 22 * (1 - Math.max(0, Math.min(1, (p - a) / (b - a))));
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
      <path d="M8 8 L22 22" stroke={color} strokeWidth={4.2} strokeLinecap="round" strokeDasharray={22} strokeDashoffset={pp(0, 0.6)} />
      <path d="M8 22 L22 8" stroke={color} strokeWidth={4.2} strokeLinecap="round" strokeDasharray={22} strokeDashoffset={pp(0.5, 1)} />
    </svg>
  );
};

const Box = ({ f, delay = 0, w, h, style, children }) => {
  const s = pop(f, delay, 12);
  return (
    <div style={{
      width: w, height: h, ...CARD, ...style,
      opacity: fade(s), transform: `scale(${0.9 + s * 0.1})`,
    }}>{children}</div>
  );
};

/* ---------- 场景 1：Hook ---------- */
const SceneHook = ({ fs, segIdx }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 150, top: 300, width: 800 }}>
      <Appear f={fs} delay={2}>
        <div style={{ fontSize: 78, fontWeight: 900, color: C.ink, lineHeight: 1.25 }}>想做 AI Agent？</div>
      </Appear>
      <Appear f={fs} delay={10}>
        <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1.25, ...GRAD }}>先确认三件事</div>
      </Appear>
      <div style={{ marginTop: 26, height: 5, width: 320 * ease(fs, 18, 14), borderRadius: 3, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)' }} />
      <Appear f={fs} delay={26}>
        <div style={{ marginTop: 30, fontSize: 30, color: C.ink2 }}>先问对问题，再谈技术选型</div>
      </Appear>
    </div>
    <div style={{ position: 'absolute', right: 150, top: 252, display: 'flex', flexDirection: 'column', gap: 22 }}>
      {[1, 2, 3].map((n, i) => (
        <Float key={n} f={fs} phase={i * 40}>
          <Box f={fs} delay={segIdx >= 1 ? 24 + i * 9 : 64 + i * 12} w={620} h={148} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 40px' }}>
            <div style={{ fontSize: 52, fontWeight: 900, ...GRAD }}>{['①', '②', '③'][i]}</div>
            <div>
              <div style={{ fontSize: 24, color: C.ink3, marginBottom: 6 }}>第 {n} 问</div>
              <div style={{ fontSize: 44, fontWeight: 800, color: C.ink2 }}>？</div>
            </div>
          </Box>
        </Float>
      ))}
      <Appear f={fs} delay={segIdx >= 2 ? 3 : 999}>
        <div style={{
          alignSelf: 'flex-end', padding: '12px 26px', borderRadius: 999,
          border: `1.5px solid ${C.amber}88`, color: C.amber, fontSize: 27, fontWeight: 700, background: 'rgba(251,191,36,0.08)',
        }}>他要的，可能根本不是 Agent</div>
      </Appear>
    </div>
  </div>
);

/* ---------- 场景 2：错误路径 ---------- */
const ScenePath = ({ fs, segIdx }) => {
  const labs = ['选模型', '搭知识库', '上框架', 'demo 惊艳', '上线失控'];
  const red = segIdx >= 5;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: segIdx >= 4 ? 0.72 : 1, transition: 'opacity 0.4s' }}>
        {labs.map((t, i) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center' }}>
            <Float f={fs} phase={i * 30}>
              <Box f={fs} delay={4 + i * 8} w={268} h={112} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderColor: red && i === 4 ? `${C.red}99` : undefined,
                background: red && i === 4 ? 'linear-gradient(135deg,rgba(248,113,113,0.18),rgba(248,113,113,0.06))' : CARD.background,
                boxShadow: red && i === 4 ? '0 0 42px rgba(248,113,113,0.28)' : CARD.boxShadow,
              }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: red && i === 4 ? C.red : C.ink }}>{t}</div>
              </Box>
            </Float>
            {i < 4 && <DrawArrow f={fs} delay={10 + i * 8} len={62} color={red ? C.ink3 : C.ink3} />}
          </div>
        ))}
      </div>
      <Appear f={fs} delay={46} style={{ position: 'absolute', width: '100%', top: 496, textAlign: 'center' }}>
        <div style={{ fontSize: 32, color: C.ink2 }}>每一步都在回答“怎么做”</div>
      </Appear>
      {segIdx >= 4 && (
        <Appear f={fs} delay={2} style={{ position: 'absolute', width: '100%', top: 580, textAlign: 'center' }}>
          <div style={{ fontSize: 56, fontWeight: 900, color: C.amber }}>但没人回答：“做什么？算成功？”</div>
        </Appear>
      )}
      {red && (
        <div style={{ position: 'absolute', width: '100%', top: 720, display: 'flex', justifyContent: 'center', gap: 30 }}>
          {['数据没对上', '权限没想清楚', '效果没法衡量'].map((t, i) => (
            <Appear key={t} f={fs} delay={4 + i * 7}>
              <div style={{
                padding: '14px 34px', borderRadius: 16, border: `1.5px solid ${C.red}88`,
                color: C.red, fontSize: 30, fontWeight: 700, background: 'rgba(248,113,113,0.08)',
              }}>{t}</div>
            </Appear>
          ))}
        </div>
      )}
    </div>
  );
};

/* ---------- 场景 3：三栏诊断图 ---------- */
const COLW = 540, COLH = 566, GAP = 36;
const ColCard = ({ fs, x, num, title, lit, active, children }) => (
  <div style={{ position: 'absolute', left: x, top: 236, width: COLW, height: COLH, ...CARD, borderColor: active ? `${C.blue}cc` : lit ? `${C.blue}55` : 'rgba(255,255,255,0.10)', boxShadow: active ? `0 0 60px rgba(77,163,255,0.20)` : CARD.boxShadow, opacity: lit ? 1 : 0.42, transition: 'opacity 0.5s' }}>
    <Appear f={fs} delay={lit ? 2 : 999}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '30px 36px 0' }}>
        <div style={{
          padding: '7px 20px', borderRadius: 999, fontSize: 25, fontWeight: 800,
          color: active ? '#08121F' : C.ink, background: active ? 'linear-gradient(92deg,#4DA3FF,#67E8F9)' : 'rgba(255,255,255,0.08)',
        }}>{`问${num}`}</div>
        <div style={{ fontSize: 44, fontWeight: 900, color: C.ink }}>{title}</div>
      </div>
    </Appear>
    <div style={{ margin: '22px 36px 0', height: 1.5, background: 'rgba(255,255,255,0.10)' }} />
    <div style={{ padding: '26px 44px 0' }}>{children}</div>
  </div>
);

const SceneDiag = ({ fs, segIdx }) => {
  const lit1 = segIdx >= 7, lit2 = segIdx >= 8, lit3 = segIdx >= 11;
  const act = segIdx === 7 ? 0 : (segIdx >= 8 && segIdx <= 10) ? 1 : segIdx === 11 ? 2 : -1;
  const steps = ['接需求', '录入', '核对', '交付'];
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <ColCard fs={fs} x={114} num="一" title="流程" lit={lit1} active={act === 0}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {steps.map((t, i) => (
            <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Appear f={fs} delay={lit1 ? 6 + i * 8 : 999} y={16}>
                <div style={{
                  width: 300, padding: '14px 0', textAlign: 'center', borderRadius: 14,
                  border: `1.5px solid ${C.blue}77`, color: C.ink, fontSize: 30, fontWeight: 700,
                  background: 'rgba(77,163,255,0.07)',
                }}>{t}</div>
              </Appear>
              {i < 3 && <DrawArrowV f={fs} delay={lit1 ? 12 + i * 8 : 999} h={30} />}
            </div>
          ))}
          <Appear f={fs} delay={lit1 ? 44 : 999}>
            <div style={{ marginTop: 10, fontSize: 25, color: C.ink3 }}>一步步画出来</div>
          </Appear>
        </div>
      </ColCard>

      <ColCard fs={fs} x={114 + COLW + GAP} num="二" title="数据与边界" lit={lit2} active={act === 1}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 17 }}>
          {[['订单记录', true], ['商品目录', true], ['关键反馈', false]].map(([t, ok], i) => (
            <div key={t}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {ok ? <Check f={fs} delay={lit2 ? 4 + i * 8 : 999} /> : <Cross f={fs} delay={lit2 ? 4 + i * 8 : 999} />}
                <div style={{ fontSize: 31, fontWeight: 700, color: C.ink }}>{t}</div>
                {!ok && <div style={{ fontSize: 24, color: C.red }}>（拿不到）</div>}
              </div>
            </div>
          ))}
          <Appear f={fs} delay={segIdx >= 9 ? 3 : 999}>
            <div style={{ alignSelf: 'flex-start', marginTop: 6, padding: '9px 22px', borderRadius: 999, border: `1.5px solid ${C.amber}88`, color: C.amber, fontSize: 25, fontWeight: 700, background: 'rgba(251,191,36,0.08)' }}>
              答不了 / 只能猜
            </div>
          </Appear>
          {segIdx >= 10 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Appear f={fs} delay={3}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Check f={fs} delay={6} size={26} />
                  <span style={{ fontSize: 29, color: C.ink }}>可自动</span>
                  <div style={{ width: 22, height: 22, borderRadius: 5, border: `2.5px solid ${C.amber}cc`, marginLeft: 26 }} />
                  <span style={{ fontSize: 29, color: C.ink }}>需人工</span>
                </div>
              </Appear>
              <Appear f={fs} delay={12}>
                <div style={{ fontSize: 28, color: C.amber, fontWeight: 700 }}>异常 → 人工兜底</div>
              </Appear>
            </div>
          )}
        </div>
      </ColCard>

      <ColCard fs={fs} x={114 + 2 * (COLW + GAP)} num="三" title="验收" lit={lit3} active={act === 2}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Appear f={fs} delay={lit3 ? 3 : 999} y={18}>
            <div style={{
              width: 380, padding: '26px 0 22px', textAlign: 'center', borderRadius: 18,
              border: `1.5px solid ${C.amber}aa`, background: 'rgba(251,191,36,0.07)',
            }}>
              <div style={{ fontSize: 27, color: C.ink2, marginBottom: 10 }}>交付时长</div>
              <div style={{ fontSize: 47, fontWeight: 900, color: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <span>3.2 天</span>
                <DrawArrow f={fs} delay={lit3 ? 10 : 999} len={56} color={C.amber} w={4} />
                <span style={{ color: C.amber }}>2.5 天</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 22, color: C.ink3 }}>（示例）</div>
            </div>
          </Appear>
          <Appear f={fs} delay={lit3 ? 26 : 999}>
            <div style={{ marginTop: 26, fontSize: 33, fontWeight: 800, color: C.blue }}>哪个数字变了？</div>
          </Appear>
          <Appear f={fs} delay={lit3 ? 34 : 999}>
            <div style={{ marginTop: 12, fontSize: 27, color: C.ink2 }}>说不清指标 = 没法验证</div>
          </Appear>
        </div>
      </ColCard>

      <Appear f={fs} delay={50} style={{ position: 'absolute', width: '100%', top: 836, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '12px 44px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.14)', fontSize: 29, color: C.ink2 }}>
          结论：要不要 Agent —— 看图说话
        </span>
      </Appear>
    </div>
  );
};

/* ---------- 场景 4：阶梯判断 ---------- */
const Step = ({ fs, delay, x, y, w, h, title, subs, color, lit, glow, note }) => {
  const s = pop(fs, delay, 12);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, ...CARD,
      borderColor: lit ? `${color}cc` : 'rgba(255,255,255,0.10)',
      boxShadow: lit ? `0 0 ${glow ? 70 : 46}px ${color}33` : CARD.boxShadow,
      opacity: lit ? 1 : 0.52, transition: 'opacity 0.5s',
      transform: `scale(${(0.92 + s * 0.08) * (glow ? 1.03 : 1)})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      <div style={{ fontSize: 44, fontWeight: 900, color: lit ? C.ink : C.ink2 }}>{title}</div>
      {subs.map((sub, i) => (
        <div key={i} style={{ fontSize: 27, color: lit ? color : C.ink3, fontWeight: 600 }}>{sub}</div>
      ))}
      {note && <div style={{ fontSize: 21, color: C.ink3, marginTop: 2 }}>{note}</div>}
    </div>
  );
};

const SceneLadder = ({ fs, segIdx }) => {
  const l1 = segIdx >= 12, l2 = segIdx >= 13, l3 = segIdx >= 14, tag = segIdx === 15;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <Step fs={fs} delay={4} x={140} y={560} w={480} h={190} title="普通自动化" subs={['规则写得死']} color={C.green} lit={l1} glow={tag} />
      <Step fs={fs} delay={12} x={690} y={420} w={480} h={190} title="+ 模型组件" subs={['局部要理解语义']} color={C.blue} lit={l2} glow={tag} />
      <Step fs={fs} delay={20} x={1240} y={250} w={540} h={250} title="Agent" subs={['多步规划', '自主用工具']} color={C.amber} lit={l3} note="（典型场景）" />
      {tag && (
        <Appear f={fs} delay={4} style={{ position: 'absolute', width: '100%', top: 788, textAlign: 'center' }}>
          <span style={{ display: 'inline-block', padding: '14px 40px', borderRadius: 999, border: `1.5px solid ${C.amber}99`, color: C.amber, fontSize: 32, fontWeight: 800, background: 'rgba(251,191,36,0.09)' }}>
            图里没有这类需求 → 停在前两格
          </span>
        </Appear>
      )}
    </div>
  );
};

/* ---------- 场景 5：收尾 ---------- */
const SceneQuote = ({ fs, segIdx }) => {
  const nxt = segIdx >= 17;
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 250 }}>
      <Appear f={fs} delay={2} y={34}>
        <div style={{ fontSize: 84, fontWeight: 900, color: C.ink }}>Agent 是最后一格，</div>
      </Appear>
      <Appear f={fs} delay={12} y={34}>
        <div style={{ fontSize: 84, fontWeight: 900, ...GRAD }}>不是第一格。</div>
      </Appear>
      <div style={{ marginTop: 44, height: 4, width: 460 * ease(fs, 22, 16), borderRadius: 2, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)' }} />
      {nxt && (
        <Appear f={fs} delay={4} y={22}>
          <div style={{ marginTop: 46, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <span style={{ padding: '8px 24px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.18)', color: C.ink2, fontSize: 24 }}>下期</span>
            <div style={{ fontSize: 42, fontWeight: 800, color: C.ink2 }}>怎么切出第一段最小、可验证的工作负载</div>
          </div>
        </Appear>
      )}
    </div>
  );
};

/* ---------- 场景路由 ---------- */
const SCENE_OF = (i) =>
  i <= 2 ? 'hook' : i <= 5 ? 'path' : i <= 11 ? 'diag' : i <= 15 ? 'ladder' : 'quote';
const SCENE_START = {};
[0, 3, 6, 12, 16].forEach((i) => { SCENE_START[SCENE_OF(i)] = SEGS[i].from; });
const SCENE_TAG = { hook: null, path: '示意', diag: '方法示意', ladder: null, quote: null };

const MainVideo = () => {
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
      {scene === 'hook' && <SceneHook fs={fs} segIdx={seg.idx} />}
      {scene === 'path' && <ScenePath fs={fs} segIdx={seg.idx} />}
      {scene === 'diag' && <SceneDiag fs={fs} segIdx={seg.idx} />}
      {scene === 'ladder' && <SceneLadder fs={fs} segIdx={seg.idx} />}
      {scene === 'quote' && <SceneQuote fs={fs} segIdx={seg.idx} />}
      <Subtitle key={seg.id} lf={f - seg.from} text={seg.sentence} />
      <ProgressBar f={f} />
      {SEGS.map((s) => (
        <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
          <Audio src={staticFile(`narration/${s.id}.mp3`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const RemotionRoot = () => (
  <>
    <Composition id="Video" component={MainVideo} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
  </>
);

registerRoot(RemotionRoot);
