import {AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import timing from './video002-timing.json';
import example from './video002-case.json';
import {FPS, C, FONT, CARD, ease, Background, CornerTag, Subtitle, ProgressBar, Appear, DrawArrow, Check, Cross} from './visuals';

const ids = Object.keys(timing.durations).sort();
let seconds = 0;
const segments = ids.map((id, i) => {
  const from = Math.round(seconds * FPS);
  seconds += timing.durations[id] + (i === ids.length - 1 ? timing.tail : timing.gaps[id]);
  return {id, from, frames: Math.round(seconds * FPS) - from, text: timing.sentences[i], idx: i};
});
const total = Math.round(seconds * FPS);
const local = (f, idx) => f - segments[idx].from;
const [a, b] = example.samples;
const heading = {position: 'absolute', left: 130, top: 132, fontSize: 72, fontWeight: 900, color: C.ink};
const card = { ...CARD, boxSizing: 'border-box', padding: '24px 32px'};
const Result = ({value, expected, f = 100, size = 70}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, color: value === expected ? C.green : C.red, fontSize: size, fontWeight: 900}}>
    {value === expected ? <Check f={f} size={46}/> : <Cross f={f} size={46}/>}{value}
  </div>
);

const NumberChange = ({before, after, p, color, size = 170}) => (
  <div style={{position: 'relative', width: 450, height: size * 1.3, overflow: 'hidden', fontSize: size, fontWeight: 900, lineHeight: 1.2, letterSpacing: -6, fontVariantNumeric: 'tabular-nums'}}>
    <div style={{position: 'absolute', color: C.ink2, opacity: 1-p, transform: `translateY(${-p*size}px)`}}>{before}</div>
    <div style={{position: 'absolute', color, opacity: p, transform: `translateY(${(1-p)*size}px)`}}>{after}</div>
  </div>
);

const Hook = ({f}) => (
  <>
    <div style={{...heading, top: 130, fontSize: 70}}>AI 把错题改对了，就能换新版？</div>
    <div style={{position: 'absolute', left: 130, top: 240, color: C.ink2, fontSize: 40}}>金额提取 · 同一次提示词改动 · 原输出 → 新输出</div>
    {[a, b].map((sample, i) => {
      const p = ease(f, 30+i*30, 24);
      const color = i ? C.red : C.green;
      return <div key={sample.id} style={{position: 'absolute', left: 130, top: 332+i*224, width: 1660, height: 210, borderTop: '1px solid rgba(255,255,255,0.14)'}}>
        <div style={{position: 'absolute', top: 58, color: C.blue, fontSize: 76, fontWeight: 800}}>{sample.id}</div>
        <div style={{position: 'absolute', left: 210, top: 10, fontSize: 170, fontWeight: 900, color: C.ink2, letterSpacing: -6}}>{sample.before}</div>
        <div style={{position: 'absolute', left: 620, top: 107}}><DrawArrow f={f} delay={30+i*30} len={130} color={color}/></div>
        <div style={{position: 'absolute', left: 825, top: 10}}><NumberChange before={sample.before} after={sample.after} p={p} color={color}/></div>
        <div style={{position: 'absolute', left: 1350, top: 59, opacity: p}}>{i ? <Cross f={100} size={48}/> : <Check f={100} size={48}/>}<div style={{fontSize: 40, color, marginTop: 15}}>{i ? '新错出现' : '旧错修复'}</div></div>
      </div>;
    })}
    <Appear f={local(f, 1)} style={{position: 'absolute', left: 130, top: 805}}><div style={{fontSize: 54, fontWeight: 800, color: C.amber}}>旧错修好了，原来对的却错了</div></Appear>
  </>
);

const Case = ({f}) => (
  <>
    <div style={heading}>从订单备注里，找出要付的钱</div>
    <div style={{...card, position: 'absolute', left: 130, top: 280, width: 1660, height: 216}}>
      <div style={{fontSize: 40, color: C.ink2, marginBottom: 20}}>样本 A · 输出应付金额，不能把合计当答案</div>
      <div style={{fontSize: 62, fontWeight: 800, color: C.ink}}>{a.input}</div>
    </div>
    <div style={{position: 'absolute', left: 235, top: 565, width: 650}}>
      <div style={{fontSize: 42, color: C.ink2, marginBottom: 14}}>固定预期</div><Result value={a.expected} expected={a.expected} size={148}/>
    </div>
    <div style={{position: 'absolute', left: 960, top: 590, height: 185, borderLeft: '1px solid rgba(255,255,255,0.2)'}}/>
    <Appear f={local(f, 3)} style={{position: 'absolute', left: 1090, top: 565, width: 650}}>
      <div style={{fontSize: 42, color: C.ink2, marginBottom: 14}}>旧版输出 · 提取错了</div><Result value={a.before} expected={a.expected} size={148}/>
    </Appear>
  </>
);

const Change = ({f, idx}) => {
  const sample = idx < 5 || (idx === 5 && local(f, 5) < 66) ? a : b;
  const isB = sample === b;
  const p = isB ? ease(local(f, 6), 22, 38) : ease(local(f, 4), 105, 22);
  const color = isB ? C.red : C.green;
  const [prefix, rest] = b.input.split(String(b.before));
  const [middle, suffix] = rest.split(String(b.after));
  const tokenSize = 88 + 60*p;
  const x = (1-p)**2*467 + 2*(1-p)*p*950 + p**2*1503;
  const y = (1-p)**2*542 + 2*(1-p)*p*800 + p**2*484;
  return <>
    <div style={{...heading, top: 125, fontSize: 72}}>{isB ? '最后的数字，不一定是要付的钱' : '只看这条：钱恰好写在最后'}</div>
    {isB && <div style={{position: 'absolute', left: 130, top: 245, fontSize: 40, color: C.green}}>A：{a.before} → {a.after}　旧错已修复</div>}
    <div style={{position: 'absolute', left: 130, top: 342, fontSize: 36, letterSpacing: 3, color: C.ink2}}>01 / 输入证据 · {sample.id}</div>
    <div style={{position: 'absolute', left: 815, top: 342, fontSize: 36, letterSpacing: 3, color: C.ink2}}>02 / 试改提示词</div>
    <div style={{position: 'absolute', left: 1340, top: 342, fontSize: 36, letterSpacing: 3, color: C.ink2}}>03 / 输出</div>
    {isB ? <>
      <div style={{position: 'absolute', left: 130, top: 412, lineHeight: 1.15, fontSize: 64, fontWeight: 800, color: C.ink}}>{prefix}<span style={{color: C.green}}>{b.before}</span>{middle.split('，')[0]}，</div>
      <div style={{position: 'absolute', left: 130, top: 520, lineHeight: 1.2, fontSize: 48, color: C.ink2}}>{middle.split('，')[1]}</div>
      <div style={{position: 'absolute', left: 370, top: 489, fontSize: 88, lineHeight: 1.2, fontWeight: 900, color: C.amber, borderBottom: `3px solid ${C.amber}`}}>{b.after}<span style={{fontSize: 40}}>{suffix}</span></div>
    </> : <div style={{position: 'absolute', left: 130, top: 414, width: 610, fontSize: 60, color: C.ink, fontWeight: 800, lineHeight: 1.4}}>{a.input.split('，').map((part, i) => <div key={i} style={{color: i === 2 ? C.green : C.ink, whiteSpace: 'nowrap'}}>{part}{i < 2 ? '，' : ''}</div>)}</div>}
    <div style={{position: 'absolute', left: 815, top: 418, width: 425, borderLeft: `3px solid ${C.blue}`, padding: '8px 0 8px 26px', boxSizing: 'border-box', fontSize: 52, color: C.amber, fontWeight: 800, lineHeight: 1.5}}>“{example.newPrompt.slice(0,5)}<br/>{example.newPrompt.slice(5)}”</div>
    <div style={{position: 'absolute', left: 745, top: 456}}><DrawArrow f={100} len={52} color={C.ink3}/></div>
    <div style={{position: 'absolute', left: 1260, top: 456}}><DrawArrow f={100} len={60} color={C.ink3}/></div>
    <div style={{position: 'absolute', left: 1340, top: 395}}>
      {isB ? <>
        <div style={{fontSize: 148, fontWeight: 900, color: p >= 1 ? C.red : C.green, lineHeight: 1.2, opacity: p >= 1 ? 1 : Math.max(0,1-2*p)}}>{p >= 1 ? b.after : b.before}</div>
        {p >= 1 && <div style={{position: 'absolute', left: 390, top: 63}}><Cross f={100} size={40}/></div>}
      </> : <NumberChange before={a.before} after={a.after} p={p} color={color} size={148}/>}
      <div style={{fontSize: 40, color: C.ink2, marginTop: 35, opacity: isB && p > 0 && p < 1 ? 0 : 1}}>改前 {sample.before} → 改后 {p >= 1 ? sample.after : '…'}</div>
      <div style={{fontSize: 38, color: C.ink2, marginTop: 16}}>固定预期：{sample.expected}元</div>
    </div>
    {isB && p > 0 && <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}><path d="M467 542 Q950 800 1503 484" pathLength={1} fill="none" stroke={C.amber} strokeWidth={3} strokeOpacity={0.45} strokeDasharray={1} strokeDashoffset={1-p}/></svg>}
    {isB && p > 0 && p < 1 && <div style={{position: 'absolute', left: x-tokenSize*1.1, top: y-tokenSize*0.6, fontSize: tokenSize, lineHeight: 1.2, fontWeight: 900, color: p < 0.7 ? C.amber : C.red, fontVariantNumeric: 'tabular-nums'}}>{b.after}</div>}
    <div style={{position: 'absolute', left: 130, top: 780, fontSize: 58, fontWeight: 900, color: idx >= 7 ? C.red : C.ink2}}>{idx >= 7 ? '修好一题 ≠ 足够支持换新版' : isB && p >= 1 ? '预期仍是80元，原来答对的却变错了' : isB ? '下一条：金额在前，尾号在后' : p >= 1 ? 'A通过，只能证明这一条修好了' : '局部猜测：这条的最后一个数字是金额'}</div>
  </>;
};

const Matrix = ({idx}) => {
  const active = idx === 9 ? 0 : idx === 10 ? 1 : idx === 11 || idx === 12 ? 2 : -1;
  const labels = [['修复', '老错误修复', C.green], ['保护', '新回归出现', C.red], ['留出', '尚未验证', C.amber]];
  return <>
    <div style={{...heading, fontSize: 72}}>{idx === 8 ? '局部修好 ≠ 整体变好' : '换新版前，补齐三种证据'}</div>
    <div style={{position: 'absolute', left: 130, top: 245, fontSize: 40, color: C.ink2}}>{idx === 8 ? '只重跑用来改稿的A，就会漏掉B的新错误' : '修复旧错 · 守住旧对 · 检查没参与改稿的题'}</div>
    {labels.map(([title, desc, color], i) => <div key={title} style={{position: 'absolute', left: 130+i*575, top: 350, width: 510, height: 340, textAlign: 'center', borderTop: `3px solid ${active === i ? color : 'rgba(255,255,255,0.12)'}`, background: active === i ? 'rgba(255,255,255,0.025)' : 'transparent'}}>
      <div style={{fontSize: 52, fontWeight: 800, color: C.ink, marginTop: 25}}>{title}</div>
      <div style={{height: 166, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: active < 0 || active === i ? 1 : 0.65}}>{i === 0 ? <Check f={100} size={126}/> : i === 1 ? <Cross f={100} size={126}/> : <span style={{fontSize: 100, color, fontWeight: 900}}>未测</span>}</div>
      <div style={{fontSize: 42, color, marginTop: 8}}>{desc}</div>
    </div>)}
    <div style={{position: 'absolute', left: 130, top: 732, fontSize: 80, fontWeight: 900, color: C.red}}>本版：退回</div>
    {idx >= 12 && <div style={{position: 'absolute', left: 680, top: 766, fontSize: 38, color: C.amber}}>{idx === 12 ? '看过结果再改稿 → 补新的留出题' : idx === 13 ? '保护失败，不能用A通过抵消' : '全过也仅限这些题 · 重复跑 / 扩大覆盖'}</div>}
  </>;
};

const actions = ['保存输入与预期', '固定通过条件', '修复 / 保护 / 留出', '只改一个变量，前后同跑', '新失败加入保护集'];
const Checklist = ({f, idx}) => (
  <>
    <div style={{...heading, fontSize: 76}}>Prompt 改动前检查卡</div>
    <div style={{position: 'absolute', left: 130, top: 248, fontSize: 42, color: C.ink2}}>先固定标准，再判断变化</div>
    {actions.map((text, i) => {
      const on = i === 0 ? local(f, 15) >= 12 : i === 1 ? local(f, 15) >= 120 : i === 2 ? idx >= 18 : i === 3 ? idx >= 16 : idx >= 17;
      const x = i < 3 ? 130+i*575 : 130+(i-3)*860;
      return <div key={text} style={{position: 'absolute', left: x, top: i < 3 ? 350 : 590, width: i < 3 ? 510 : 800, height: 190, padding: '24px 30px', boxSizing: 'border-box', borderTop: `3px solid ${on ? C.blue : C.ink3}`, borderRadius: 10, background: on ? 'rgba(77,163,255,0.075)' : 'rgba(255,255,255,0.018)'}}>
        <div style={{fontSize: 44, fontWeight: 800, color: on ? C.cyan : C.ink3}}>{`0${i+1}`}</div>
        <div style={{fontSize: i < 3 ? 48 : 54, fontWeight: 800, color: on ? C.ink : C.ink2, marginTop: 20, whiteSpace: 'nowrap'}}>{text}</div>
      </div>;
    })}
    <div style={{position: 'absolute', left: 130, top: 830, fontSize: 40, color: C.amber}}>先证明：旧错修好了 · 原来对的没变坏 · 新题也检查了</div>
  </>
);

const Video002 = () => {
  const f = useCurrentFrame();
  const seg = segments.find(s => f >= s.from && f < s.from + s.frames) ?? segments.at(-1);
  const idx = seg.idx;
  const hasSubtitle = f < segments.at(-1).from + Math.ceil(timing.durations[ids.at(-1)]*FPS);
  return <AbsoluteFill style={{fontFamily: FONT}}>
    <Background f={f}/>
    <CornerTag f={f} text="合成示例 · 非模型实测" fontSize={34}/>
    {idx <= 1 ? <Hook f={f}/> : idx <= 3 ? <Case f={f}/> : idx <= 7 ? <Change f={f} idx={idx}/> : idx <= 14 ? <Matrix f={f} idx={idx}/> : <Checklist f={f} idx={idx}/>}
    {hasSubtitle && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 192, background: 'linear-gradient(0deg,rgba(6,10,20,0.72),rgba(6,10,20,0))'}}/>}
    {hasSubtitle && <Subtitle key={seg.id} lf={f-seg.from} text={seg.text} fontSize={48} height={seg.text.length > 32 ? 142 : 112} style={{background: 'transparent', border: 'none', borderRadius: 0, padding: '8px 12px', fontWeight: 600, lineHeight: 1.3, textWrap: 'balance', textShadow: '0 2px 5px rgba(0,0,0,0.85)'}}/>}
    <ProgressBar f={f} total={total}/>
    {segments.map(s => <Sequence key={s.id} from={s.from} durationInFrames={s.frames}><Audio src={staticFile(`narration002/${s.id}.mp3`)}/></Sequence>)}
  </AbsoluteFill>;
};
registerRoot(() => <Composition id="Video002" component={Video002} durationInFrames={total} fps={FPS} width={1920} height={1080}/>);
