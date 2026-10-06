import {
  AbsoluteFill, Audio, Composition, Easing, Sequence,
  interpolate, registerRoot, spring, staticFile, useCurrentFrame,
} from 'remotion';
import timing from './timing.json';

/* ---------- 时间轴：与新生成的逐句旁白绑定 ---------- */
const FPS = 30;
const ids = Object.keys(timing.durations).sort();
let acc = 0;
const SEGS = ids.map((id, i) => {
  const audio = timing.durations[id];
  const pad = i === ids.length - 1 ? timing.tail : timing.gap;
  const from = Math.round(acc * FPS);
  acc += audio + pad;
  const frames = Math.round(acc * FPS) - from;
  return { id, sentence: timing.sentences[i], from, frames, idx: i };
});
const TOTAL = SEGS[SEGS.length - 1].from + SEGS[SEGS.length - 1].frames;
const sentenceFrame = (f, idx) => f - SEGS[idx].from;

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
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };
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

const CornerTag = ({ f, text }) => {
  const e = ease(f, 4, 8);
  return (
    <div style={{
      position: 'absolute', right: 52, top: 44, opacity: e, transform: `translateY(${(1 - e) * -10}px)`,
      padding: '8px 20px', borderRadius: 999, border: `1.5px solid ${C.amber}66`,
      color: C.amber, fontFamily: FONT, fontSize: 28, fontWeight: 600, background: 'rgba(251,191,36,0.08)',
    }}>{text}</div>
  );
};

const Subtitle = ({ lf, text }) => {
  const e = ease(lf, 0, 6);
  return (
    <div style={{
      position: 'absolute', left: 130, right: 130, bottom: 42, height: 144,
      boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: e, padding: '12px 32px', borderRadius: 18,
      background: 'rgba(6,10,20,0.86)', border: '1px solid rgba(255,255,255,0.09)',
      color: C.ink, fontFamily: FONT, fontSize: 42, fontWeight: 700,
      textAlign: 'center', lineHeight: 1.4,
    }}><span>{text}</span></div>
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

/* ---------- 场景 1：开场直接交付三问 ---------- */
const SceneHook = ({ f, fs, segIdx }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <div style={{ position: 'absolute', left: 130, top: 252, width: 770 }}>
      <Appear f={fs} delay={2}>
        <div style={{ fontSize: 82, fontWeight: 900, color: C.ink, lineHeight: 1.3 }}>想做 AI Agent？</div>
      </Appear>
      <Appear f={fs} delay={10}>
        <div style={{ fontSize: 82, fontWeight: 900, lineHeight: 1.3, ...GRAD }}>我先问三件事</div>
      </Appear>
      <div style={{ marginTop: 32, height: 5, width: 360 * ease(fs, 18, 14), borderRadius: 3, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)' }} />
      <Appear f={fs} delay={26}>
        <div style={{ marginTop: 32, fontSize: 38, color: C.ink2 }}>把业务问清楚，再选工具</div>
      </Appear>
    </div>
    <div style={{ position: 'absolute', right: 130, top: 202, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {['流程怎么走？', '数据和权限够吗？', '怎样算成功？'].map((t, i) => (
        <Box key={t} f={fs} delay={20 + i * 10} w={750} h={166} style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '0 38px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 48, fontWeight: 900, ...GRAD }}>{`0${i + 1}`}</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: C.ink }}>{t}</div>
        </Box>
      ))}
    </div>
    {segIdx >= 2 && (
      <Appear f={sentenceFrame(f, 2)} delay={2} style={{ position: 'absolute', top: 790, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: C.amber }}>三问答完，再选工具</div>
      </Appear>
    )}
  </div>
);

/* ---------- 场景 2：短铺垫，进入同一虚构示例 ---------- */
const ScenePath = ({ f, fs, segIdx }) => {
  const labs = ['选模型', '搭知识库', '上框架', 'demo 惊艳', '能上线？'];
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <Appear f={fs} delay={2} style={{ position: 'absolute', top: 178, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 68, fontWeight: 900, color: C.ink }}>demo 惊艳 <span style={{ color: C.amber }}>≠ 能上线</span></div>
      </Appear>
      <div style={{ position: 'absolute', left: 120, right: 120, top: 354, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {labs.map((t, i) => (
          <div key={t} style={{ display: 'flex', alignItems: 'center' }}>
            <Box f={fs} delay={4 + i * 8} w={268} h={126} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderColor: i === 4 ? `${C.amber}aa` : undefined,
              background: i === 4 ? 'rgba(251,191,36,0.08)' : CARD.background,
            }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: i === 4 ? C.amber : C.ink }}>{t}</div>
            </Box>
            {i < 4 && <DrawArrow f={fs} delay={10 + i * 8} len={62} />}
          </div>
        ))}
      </div>
      {segIdx >= 4 && (
        <div style={{ position: 'absolute', top: 576, width: '100%', display: 'flex', justifyContent: 'center', gap: 30 }}>
          {['做什么', '谁批准', '怎样验收'].map((t, i) => (
            <Appear key={t} f={sentenceFrame(f, 4)} delay={2 + i * 7}>
              <div style={{ ...CARD, padding: '18px 44px', fontSize: 44, fontWeight: 800, color: C.amber }}>{t}</div>
            </Appear>
          ))}
        </div>
      )}
      {segIdx >= 5 && (
        <Appear f={sentenceFrame(f, 5)} delay={2} style={{ position: 'absolute', top: 766, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: C.blue }}>用订单核对，走一遍三问</div>
        </Appear>
      )}
    </div>
  );
};

/* ---------- 场景 3：保留三问导航，放大正在讲解的问题 ---------- */
const SceneDiag = ({ f, segIdx }) => {
  const act = segIdx <= 7 ? 0 : segIdx <= 10 ? 1 : 2;
  const local = sentenceFrame(f, [6, 8, 11][act]);
  const titles = ['流程', '数据与边界', '验收'];
  const questions = ['今天，人怎么做？', '拿得到、靠得住？\n哪些动作要批准？', '先记基线，再定目标。'];
  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 130, top: 118, fontSize: 56, fontWeight: 900, color: C.ink }}>用订单核对，回答三问</div>
      <div style={{ position: 'absolute', left: 130, right: 130, top: 220, display: 'flex', gap: 24 }}>
        {titles.map((t, i) => (
          <div key={t} style={{
            ...CARD, flex: 1, padding: '18px 26px', display: 'flex', alignItems: 'center', gap: 22,
            borderColor: i === act ? `${C.blue}bb` : 'rgba(255,255,255,0.12)',
            color: i === act ? C.ink : C.ink2, fontSize: 36, fontWeight: 800,
            background: i === act ? 'rgba(77,163,255,0.12)' : CARD.background,
          }}><span style={{ color: i === act ? C.cyan : C.ink3 }}>{`0${i + 1}`}</span>{t}</div>
        ))}
      </div>
      <Box key={act} f={local} delay={0} w={1660} h={462} style={{ position: 'absolute', left: 130, top: 332, boxSizing: 'border-box', borderColor: `${C.blue}66` }}>
        <div style={{ position: 'absolute', left: 52, top: 58, width: 510 }}>
          <div style={{ fontSize: 70, fontWeight: 900, color: C.ink }}>{titles[act]}</div>
          <div style={{ marginTop: 26, fontSize: 42, fontWeight: 700, color: C.cyan, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{questions[act]}</div>
          <div style={{ marginTop: 34, fontSize: 32, color: C.ink2 }}>虚构示例 · 订单核对</div>
        </div>
        <div style={{ position: 'absolute', left: 610, top: 48, right: 44 }}>
          {act === 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 78 }}>
                {['接单', '查库存', '核对', '确认'].map((t, i) => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center' }}>
                    <Box f={local} delay={4 + i * 9} w={196} h={118} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderColor: `${C.blue}66` }}>
                      <span style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>{t}</span>
                    </Box>
                    {i < 3 && <DrawArrow f={local} delay={12 + i * 9} len={38} color={C.blue} />}
                  </div>
                ))}
              </div>
              {segIdx >= 7 && (
                <Appear f={sentenceFrame(f, 7)} delay={6}>
                  <div style={{ marginTop: 58, fontSize: 38, fontWeight: 700, color: C.ink2 }}>先画出今天的流程</div>
                </Appear>
              )}
            </>
          )}
          {act === 1 && (
            <>
              <div style={{ display: 'flex', gap: 32, marginTop: 6 }}>
                {[['订单', true], ['库存', false], ['核对规则', true]].map(([t, ok], i) => (
                  <Appear key={t} f={local} delay={4 + i * 8}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {ok ? <Check f={local} delay={8 + i * 8} size={36} /> : <Cross f={local} delay={8 + i * 8} size={36} />}
                      <span style={{ fontSize: 42, fontWeight: 800, color: C.ink }}>{t}</span>
                    </div>
                  </Appear>
                ))}
              </div>
              {segIdx >= 9 && (
                <Appear f={sentenceFrame(f, 9)} delay={2}>
                  <div style={{ marginTop: 38, padding: '14px 24px', borderRadius: 16, border: `1px solid ${C.amber}66`, color: C.amber, fontSize: 40, fontWeight: 800 }}>缺库存 → 停下 / 转人工</div>
                </Appear>
              )}
              {segIdx >= 10 && (
                <Appear f={sentenceFrame(f, 10)} delay={2}>
                  <div style={{ marginTop: 30, fontSize: 36, color: C.ink, lineHeight: 1.65 }}>
                    <div><span style={{ color: C.green }}>可自动：</span>核对</div>
                    <div><span style={{ color: C.amber }}>需批准：</span>改单 / 承诺交期</div>
                    <div style={{ color: C.amber }}>异常 → 人工兜底</div>
                  </div>
                </Appear>
              )}
            </>
          )}
          {act === 2 && (
            <>
              <Appear f={local} delay={4}>
                <div style={{ fontSize: 38, fontWeight: 700, color: C.ink2 }}>核对耗时（虚构示例）</div>
              </Appear>
              <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginTop: 26 }}>
                {[['当前基线', '12 分钟'], ['试点目标', '8 分钟']].map(([label, value], i) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
                    {i === 1 && <DrawArrow f={local} delay={16} len={64} color={C.amber} w={4} />}
                    <Appear f={local} delay={6 + i * 14}>
                      <div style={{ ...CARD, width: 350, padding: '22px 0', textAlign: 'center', borderColor: i === 1 ? `${C.amber}88` : 'rgba(255,255,255,0.15)' }}>
                        <div style={{ fontSize: 34, color: C.ink2 }}>{label}</div>
                        <div style={{ marginTop: 12, fontSize: 68, fontWeight: 900, color: i === 1 ? C.amber : C.ink }}>{value}</div>
                      </div>
                    </Appear>
                  </div>
                ))}
              </div>
              <Appear f={local} delay={32}>
                <div style={{ marginTop: 28, fontSize: 38, fontWeight: 800, color: C.amber }}>质量底线：差错不能增加</div>
              </Appear>
            </>
          )}
        </div>
      </Box>
    </div>
  );
};

/* ---------- 场景 4：依需求选择工具 ---------- */
const Step = ({ f, x, y, w, h, title, subs, color, lit }) => {
  const s = pop(f, 2, 12);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, ...CARD,
      borderColor: lit ? `${color}cc` : 'rgba(255,255,255,0.12)',
      boxShadow: lit ? `0 0 40px ${color}22` : CARD.boxShadow,
      opacity: lit ? 0.5 + fade(s) * 0.5 : 0.55,
      transform: `scale(${lit ? 0.97 + s * 0.03 : 1})`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
    }}>
      <div style={{ fontSize: 52, fontWeight: 900, color: lit ? C.ink : C.ink2 }}>{title}</div>
      {subs.map((sub) => <div key={sub} style={{ fontSize: 36, color: lit ? color : C.ink2, fontWeight: 700 }}>{sub}</div>)}
    </div>
  );
};

const SceneLadder = ({ f, fs, segIdx }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT }}>
    <Appear f={fs} delay={2} style={{ position: 'absolute', left: 130, top: 124 }}>
      <div style={{ fontSize: 64, fontWeight: 900, color: C.ink }}>按需求，选最小的工具</div>
    </Appear>
    <Step f={sentenceFrame(f, 12)} x={130} y={492} w={510} h={230} title="普通自动化" subs={['规则固定']} color={C.green} lit={true} />
    <Step f={sentenceFrame(f, 13)} x={705} y={378} w={510} h={230} title="+ 模型组件" subs={['局部理解文字']} color={C.blue} lit={segIdx >= 13} />
    <Step f={sentenceFrame(f, 14)} x={1280} y={266} w={510} h={276} title="Agent" subs={['边执行边决策', '自主选择工具']} color={C.amber} lit={segIdx === 14} />
    {segIdx >= 15 && (
      <Appear f={sentenceFrame(f, 15)} delay={2} style={{ position: 'absolute', width: '100%', top: 796, textAlign: 'center' }}>
        <span style={{ display: 'inline-block', padding: '12px 38px', borderRadius: 999, border: `1.5px solid ${C.amber}88`, color: C.amber, fontSize: 36, fontWeight: 800 }}>没有这类需求 → 停在前两格</span>
      </Appear>
    )}
  </div>
);

/* ---------- 场景 5：收尾与实际第二条选题一致 ---------- */
const SceneQuote = ({ f, fs, segIdx }) => (
  <div style={{ position: 'absolute', inset: 0, fontFamily: FONT, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 220 }}>
    <Appear f={fs} delay={2} y={34}>
      <div style={{ fontSize: 92, fontWeight: 900, color: C.ink }}>先把业务问清楚，</div>
    </Appear>
    <Appear f={fs} delay={12} y={34}>
      <div style={{ marginTop: 12, fontSize: 92, fontWeight: 900, ...GRAD }}>再决定要不要 Agent。</div>
    </Appear>
    <div style={{ marginTop: 42, height: 4, width: 540 * ease(fs, 22, 16), borderRadius: 2, background: 'linear-gradient(90deg,#4DA3FF,#67E8F9)' }} />
    {segIdx >= 17 && (
      <Appear f={sentenceFrame(f, 17)} delay={4} y={22}>
        <div style={{ marginTop: 46, textAlign: 'center' }}>
          <div style={{ color: C.ink2, fontSize: 32 }}>下期 · 如何构建可靠 AI 系统</div>
          <div style={{ marginTop: 20, fontSize: 48, fontWeight: 800, color: C.ink }}>AI 这次答对了，你凭什么确定它真的变好了？</div>
        </div>
      </Appear>
    )}
  </div>
);

/* ---------- 场景路由 ---------- */
const SCENE_OF = (i) =>
  i <= 2 ? 'hook' : i <= 5 ? 'path' : i <= 11 ? 'diag' : i <= 15 ? 'ladder' : 'quote';
const SCENE_START = {};
[0, 3, 6, 12, 16].forEach((i) => { SCENE_START[SCENE_OF(i)] = SEGS[i].from; });
const SCENE_TAG = { hook: null, path: '虚构示例', diag: '虚构示例 · 方法示意', ladder: '选型示意', quote: null };

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
      {scene === 'hook' && <SceneHook f={f} fs={fs} segIdx={seg.idx} />}
      {scene === 'path' && <ScenePath f={f} fs={fs} segIdx={seg.idx} />}
      {scene === 'diag' && <SceneDiag f={f} fs={fs} segIdx={seg.idx} />}
      {scene === 'ladder' && <SceneLadder f={f} fs={fs} segIdx={seg.idx} />}
      {scene === 'quote' && <SceneQuote f={f} fs={fs} segIdx={seg.idx} />}
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
