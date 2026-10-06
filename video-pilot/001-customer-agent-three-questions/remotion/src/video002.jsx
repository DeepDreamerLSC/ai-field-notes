import {AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import timing from './video002-timing.json';
import example from './video002-case.json';
import {FPS, C, FONT, ease, Background, Subtitle, ProgressBar, DrawArrow, Check, Cross} from './visuals';

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
const NumberChange = ({before, after, p, color, size = 170}) => (
  <div style={{position: 'relative', width: 450, height: size * 1.3, overflow: 'hidden', fontSize: size, fontWeight: 900, lineHeight: 1.2, letterSpacing: -6, fontVariantNumeric: 'tabular-nums'}}>
    <div style={{position: 'absolute', color: C.ink2, opacity: 1-p, transform: `translateY(${-p*size}px)`}}>{before}</div>
    <div style={{position: 'absolute', color, opacity: p, transform: `translateY(${(1-p)*size}px)`}}>{after}</div>
  </div>
);

const Hook = ({f}) => {
  const bStart = segments[1].from + 24;
  const end = local(f, 1) >= 174;
  return <>
    <div style={{...heading, fontSize: f < 48 ? 64 : 38, color: f < 48 ? C.ink : C.ink2}}>{f < 48 ? '优化 AI：修改给 AI 的指令（提示词）' : '改提示词，让 AI 提取对订单金额'}</div>
    {[a, b].map((sample, i) => {
      const start = i ? bStart : 48;
      const visible = f >= start;
      const on = !end && (i ? f >= bStart : f < bStart);
      const color = i ? C.red : C.green;
      return visible && !end && <div key={sample.id} style={{position: 'absolute', left: 130, top: 310+i*225, width: 1660, height: 210, opacity: on ? 1 : 0.1}}>
        <div style={{position: 'absolute', top: 66, fontSize: 42, color: C.ink2}}>订单 {sample.id}</div>
        <div style={{position: 'absolute', left: 230, top: 0, fontSize: 162, fontWeight: 900, color: C.ink2}}>{sample.before}</div>
        <div style={{position: 'absolute', left: 640, top: 103}}><DrawArrow f={f} delay={start} len={100} color={color}/></div>
        <div style={{position: 'absolute', left: 230, top: 180, fontSize: 32, color: C.ink2}}>旧提示词输出</div>
        <div style={{position: 'absolute', left: 820, top: 180, fontSize: 32, color: C.ink2}}>新提示词输出</div>
        <div style={{position: 'absolute', left: 820, top: 0}}><NumberChange before={sample.before} after={sample.after} p={ease(f, start, 24)} color={color} size={162}/></div>
        <div style={{position: 'absolute', left: 1320, top: 76, fontSize: 36, color}}>{i ? '正确 → 错取尾号' : '错取金额 → 正确'}</div>
      </div>;
    })}
    {end && <div style={{position: 'absolute', left: 130, top: 720, fontSize: 88, fontWeight: 900, color: C.ink}}>一条金额对了，另一条却错了</div>}
  </>;
};

const Case = ({f}) => {
  const wrong = local(f, 3) >= 125;
  return <>
    <div style={{...heading, fontSize: 40, color: C.ink2}}>任务：从订单备注里，找出要付的钱</div>
    <div style={{position: 'absolute', left: 130, top: 275, fontSize: 48, color: C.ink2, opacity: wrong ? 0.25 : 0.6}}>{a.input}</div>
    <div style={{position: 'absolute', left: 130, top: 425, opacity: wrong ? 0.18 : 1}}>
      <div style={{fontSize: 44, color: C.ink2}}>标准答案 · 应付金额</div>
      <div style={{fontSize: 180, fontWeight: 900, color: C.ink, lineHeight: 1.5}}>{a.expected}<span style={{fontSize: 52, fontWeight: 600}}>元</span></div>
    </div>
    {wrong && <div style={{position: 'absolute', left: 1020, top: 425}}>
      <div style={{fontSize: 44, color: C.ink2}}>旧提示词错取了合计</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 25, fontSize: 180, fontWeight: 900, color: C.red, lineHeight: 1.5}}>{a.before}<Cross f={100} size={48}/></div>
    </div>}
  </>;
};

const Change = ({f, idx}) => {
  const isB = idx > 5 || (idx === 5 && local(f, 5) >= 90);
  const sample = isB ? b : a;
  const af = local(f, 4);
  const p = isB ? ease(local(f, 6), 22, 38) : ease(local(f, 5), 0, 22);
  const flying = isB && p > 0 && p < 1;
  const verdict = idx === 7;
  const focus = verdict ? 'verdict' : isB ? (p > 0 ? 'output' : 'input') : idx === 5 ? 'output' : af < 72 ? 'input' : 'rule';
  const weight = (part) => verdict || flying ? 0.1 : focus === part ? 1 : 0.14;
  const [prefix, rest] = b.input.split(String(b.before));
  const [middle, suffix] = rest.split(String(b.after));
  const tokenSize = 88 + 60*p;
  const x = (1-p)**2*467 + 2*(1-p)*p*950 + p**2*1503;
  const y = (1-p)**2*542 + 2*(1-p)*p*800 + p**2*484;
  return <>
    <div style={{...heading, fontSize: 38, color: C.ink2, opacity: flying || verdict ? 0.15 : 0.7}}>{isB ? '同一条规则，遇到另一条订单备注' : '先试一个局部猜测，再看结果'}</div>
    <div style={{position: 'absolute', left: 130, top: 320, opacity: weight('input')}}>
      <div style={{fontSize: 32, color: C.ink2, marginBottom: 44}}>订单备注 · {sample.id}</div>
      {isB ? <>
        <div style={{fontSize: 64, fontWeight: 800, color: C.ink}}>{prefix}{b.before}{middle.split('，')[0]}，</div>
        <div style={{position: 'absolute', top: 200, fontSize: 48, color: C.ink2}}>{middle.split('，')[1]}</div>
        <div style={{position: 'absolute', left: 240, top: 169, fontSize: 88, lineHeight: 1.2, fontWeight: 900, color: C.amber}}>{b.after}<span style={{fontSize: 40}}>{suffix}</span></div>
      </> : <div style={{fontSize: 60, lineHeight: 1.4, fontWeight: 800}}>{a.input.split('，').map((part, i) => <div key={i} style={{color: i === 2 ? C.ink : C.ink2, opacity: i === 2 ? 1 : 0.35}}>{part}{i < 2 ? '，' : ''}</div>)}</div>}
    </div>
    <div style={{position: 'absolute', left: 815, top: 320, width: 425, opacity: weight('rule')}}>
      <div style={{fontSize: 32, color: C.ink2, marginBottom: 56}}>候选提示词</div>
      <div style={{borderLeft: `3px solid ${C.amber}`, paddingLeft: 26, fontSize: 62, color: C.amber, fontWeight: 800, lineHeight: 1.5}}>“{example.newPrompt.slice(0,5)}<br/>{example.newPrompt.slice(5)}”</div>
    </div>
    <div style={{position: 'absolute', left: 1340, top: 320, opacity: weight('output')}}>
      <div style={{fontSize: 32, color: C.ink2, marginBottom: 30}}>改后提示词输出</div>
      {isB ? <div style={{fontSize: 148, fontWeight: 900, lineHeight: 1.2, color: p >= 1 ? C.red : C.ink, opacity: flying ? 0 : 1}}>{p >= 1 ? b.after : b.before}</div> : <NumberChange before={a.before} after={a.after} p={p} color={C.green} size={148}/>}
      <div style={{fontSize: 38, color: C.ink2, marginTop: 40}}>标准答案：{sample.expected}元</div>
      {p >= 1 && <div style={{fontSize: 42, color: isB ? C.red : C.green, marginTop: 18}}>{isB ? '错误 · 把尾号当金额' : '这条订单的金额对了'}</div>}
    </div>
    {isB && p > 0 && <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}><path d="M467 542 Q950 800 1503 484" pathLength={1} fill="none" stroke={C.ink2} strokeWidth={2} strokeOpacity={0.16} strokeDasharray={1} strokeDashoffset={1-p}/></svg>}
    {flying && <div style={{position: 'absolute', left: x-tokenSize*1.1, top: y-tokenSize*0.6, fontSize: tokenSize, lineHeight: 1.2, fontWeight: 900, color: p < 0.7 ? C.amber : C.red, fontVariantNumeric: 'tabular-nums'}}>{b.after}</div>}
    {verdict && <div style={{position: 'absolute', left: 130, top: 720, fontSize: 76, color: C.ink, fontWeight: 900}}>修好一条订单，先别换提示词</div>}
  </>;
};

const Matrix = ({f, idx}) => {
  const active = idx === 8 || idx === 9 ? 0 : idx === 10 ? 1 : idx <= 12 ? 2 : local(f, 13) < 50 ? 0 : local(f, 13) < 92 ? 1 : 2;
  const verdict = idx === 13 && local(f, 13) >= 144;
  const labels = [['查旧错', '旧错误修好了', C.green], ['守旧对', '原来正确的变错了', C.red], ['测新例子', '没用来改提示词 · 未测', C.amber]];
  if (idx === 14) return <>
    <div style={{...heading, fontSize: 40, color: C.ink2}}>当前提示词改动：不采用 · 原来正确的订单出错</div>
    <div style={{position: 'absolute', left: 130, top: 350, fontSize: 88, fontWeight: 900, color: C.ink}}>都提取对，也只限这些订单</div>
    <div style={{position: 'absolute', left: 130, top: 580, fontSize: 54, color: C.ink2}}>偶发错误重复测 · 重要业务多测几种情况</div>
  </>;
  return <>
    <div style={{...heading, fontSize: 40, color: C.ink2}}>{idx === 8 ? '只看改过的订单，会漏掉新错误' : '换提示词前，检查三组订单'}</div>
    {labels.map(([title, desc, color], i) => {
      const visible = idx >= 13 || i <= active;
      const opacity = verdict ? 0.14 : active === i ? 1 : 0.09;
      return visible && <div key={title} style={{position: 'absolute', left: 130+i*575, top: 320, width: 510, textAlign: 'center', opacity}}>
        <div style={{fontSize: 58, fontWeight: 800, color: C.ink}}>{title}</div>
        <div style={{height: 205, marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i === 0 ? <Check f={100} size={136}/> : i === 1 ? <Cross f={100} size={136}/> : <span style={{fontSize: 118, color, fontWeight: 900}}>未测</span>}</div>
        <div style={{fontSize: 40, color: idx === 13 ? C.ink2 : color, marginTop: 25}}>{desc}</div>
      </div>;
    })}
    {verdict && <div style={{position: 'absolute', left: 130, top: 700, fontSize: 112, fontWeight: 900, color: C.red}}>先别换提示词</div>}
    {!verdict && idx === 12 && <div style={{position: 'absolute', left: 1140, top: 750, fontSize: 34, color: C.ink2}}>看结果再改提示词 → 补新订单</div>}
    {idx === 8 && <div style={{position: 'absolute', left: 130, top: 760, fontSize: 42, color: C.ink2}}>只检查订单A，会漏掉订单B的新错误</div>}
  </>;
};

const actions = ['保存原文与正确答案', '写清怎么算通过', '旧错、旧对、新例子', '一次只改一项，前后同测', '新错误加入下次检查'];
const Checklist = ({f, idx}) => {
  const complete = idx === 19;
  const active = idx === 15 ? (local(f, 15) < 120 ? 0 : 1) : idx === 16 ? 3 : idx === 17 ? 4 : 2;
  return <>
    <div style={{...heading, fontSize: complete ? 76 : 40, color: complete ? C.ink : C.ink2}}>改提示词前检查卡</div>
    {complete ? <>
      {actions.map((text, i) => <div key={text} style={{position: 'absolute', left: i < 3 ? 130+i*575 : 130+(i-3)*860, top: i < 3 ? 350 : 590, width: i < 3 ? 510 : 800, height: 190, padding: '24px 30px', boxSizing: 'border-box', borderTop: `3px solid ${C.blue}`, borderRadius: 10, background: 'rgba(77,163,255,0.06)'}}>
        <div style={{fontSize: 44, fontWeight: 800, color: C.ink2}}>{`0${i+1}`}</div>
        <div style={{fontSize: i < 3 ? 48 : 54, fontWeight: 800, color: C.ink, marginTop: 20, whiteSpace: 'nowrap'}}>{text}</div>
      </div>)}
      <div style={{position: 'absolute', left: 130, top: 830, fontSize: 38, color: C.ink2}}>先写清正确答案，再比较新旧提示词</div>
    </> : <>
      <div style={{position: 'absolute', left: 130, top: 445, fontSize: 96, fontWeight: 900, color: C.ink}}>{actions[active]}</div>
      <div style={{position: 'absolute', left: 130, top: 620, fontSize: 44, color: C.ink2}}>{['订单原文、正确金额，放在同一张表','提取应付或实付金额，不取合计或尾号','查旧错 · 守旧对 · 测没用来改提示词的订单','新旧提示词，处理同一批订单','把错误订单存下来，下次也要检查'][active]}</div>
    </>}
  </>;
};

const Video002 = () => {
  const f = useCurrentFrame();
  const seg = segments.find(s => f >= s.from && f < s.from + s.frames) ?? segments.at(-1);
  const idx = seg.idx;
  const hasSubtitle = f < segments.at(-1).from + Math.ceil(timing.durations[ids.at(-1)]*FPS);
  return <AbsoluteFill style={{fontFamily: FONT}}>
    <Background f={0}/>
    <div style={{position: 'absolute', right: 70, top: 50, fontSize: 24, color: C.ink3}}>合成示例 · 非模型实测</div>
    {idx <= 1 ? <Hook f={f}/> : idx <= 3 ? <Case f={f}/> : idx <= 7 ? <Change f={f} idx={idx}/> : idx <= 14 ? <Matrix f={f} idx={idx}/> : <Checklist f={f} idx={idx}/>}
    {hasSubtitle && <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 192, background: 'linear-gradient(0deg,rgba(6,10,20,0.72),rgba(6,10,20,0))'}}/>}
    {hasSubtitle && <Subtitle key={seg.id} lf={f-seg.from} text={seg.text} fontSize={48} height={seg.text.length > 32 ? 142 : 112} style={{background: 'transparent', border: 'none', borderRadius: 0, padding: '8px 12px', fontWeight: 600, lineHeight: 1.3, textWrap: 'balance', textShadow: '0 2px 5px rgba(0,0,0,0.85)'}}/>}
    {!(idx === 6 && local(f, 6) > 22 && local(f, 6) < 60) && <ProgressBar f={f} total={total}/>}
    {segments.map(s => <Sequence key={s.id} from={s.from} durationInFrames={s.frames}><Audio src={staticFile(`narration002/${s.id}.mp3`)}/></Sequence>)}
  </AbsoluteFill>;
};
registerRoot(() => <Composition id="Video002" component={Video002} durationInFrames={total} fps={FPS} width={1920} height={1080}/>);
