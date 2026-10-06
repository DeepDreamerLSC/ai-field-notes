import {AbsoluteFill, Audio, Composition, Sequence, registerRoot, staticFile, useCurrentFrame} from 'remotion';
import timing from './video002-timing.json';
import example from './video002-case.json';
import {FPS, C, FONT, CARD, GRAD, ease, Background, CornerTag, Subtitle, ProgressBar, Appear, DrawArrow, Check, Cross} from './visuals';

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

const Hook = ({f}) => (
  <>
    <div style={{...heading, fontSize: 92}}>修好 A，<span style={{color: C.red}}>却弄坏 B</span></div>
    <div style={{position: 'absolute', left: 130, top: 268, color: C.ink2, fontSize: 48}}>同一个 Prompt 改动</div>
    {[a, b].map((sample, i) => {
      const changed = f >= 40 + i * 20;
      return <div key={sample.id} style={{...card, position: 'absolute', left: 130 + i * 885, top: 370, width: 775, height: 360, borderColor: (i ? C.red : C.green) + '99'}}>
        <div style={{color: C.ink, fontSize: 48, fontWeight: 800, marginBottom: 42}}>样本 {sample.id} · {i ? '原本正确' : '原本错误'}</div>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-around'}}>
          {i ? <Check f={100} size={86}/> : <Cross f={100} size={86}/>}
          <DrawArrow f={f} delay={40 + i * 20} len={140} color={i ? C.red : C.green}/>
          <div style={{opacity: changed ? ease(f, 40 + i * 20, 10) : 0}}>{i ? <Cross f={f - 60} size={86}/> : <Check f={f - 40} size={86}/>}</div>
        </div>
        <div style={{color: i ? C.red : C.green, fontSize: 46, marginTop: 40, fontWeight: 800}}>{changed ? (i ? '新错误出现' : '旧错误修复') : '改前'}</div>
      </div>;
    })}
    <Appear f={local(f, 1)} style={{position: 'absolute', left: 130, top: 782}}><div style={{fontSize: 58, fontWeight: 900, color: C.amber}}>这次优化，能直接通过吗？</div></Appear>
  </>
);

const Case = ({f}) => (
  <>
    <div style={heading}>先把任务和答案说清楚</div>
    <div style={{...card, position: 'absolute', left: 130, top: 275, width: 1660, height: 230}}>
      <div style={{fontSize: 40, color: C.ink2, marginBottom: 20}}>任务：{example.task} · 样本 A</div>
      <div style={{fontSize: 62, fontWeight: 800, color: C.ink}}>{a.input}</div>
    </div>
    <div style={{...card, position: 'absolute', left: 130, top: 553, width: 775, height: 235}}>
      <div style={{fontSize: 44, color: C.ink2, marginBottom: 28}}>预期输出</div><Result value={a.expected} expected={a.expected}/>
    </div>
    <Appear f={local(f, 3)} style={{...card, position: 'absolute', left: 1015, top: 553, width: 775, height: 235, borderColor: C.red+'99'}}>
      <div style={{fontSize: 44, color: C.ink2, marginBottom: 28}}>旧版输出 · 提取错了</div><Result value={a.before} expected={a.expected}/>
    </Appear>
  </>
);

const Change = ({f, idx}) => (
  <>
    <div style={{...heading, top: 112}}>一次改动，两种结局</div>
    <div style={{...card, position: 'absolute', left: 130, top: 218, width: 1660, height: 110, fontSize: 52, color: C.amber, fontWeight: 800}}>规则改成：{example.newPrompt}</div>
    <div style={{position: 'absolute', left: 1190, top: 348, fontSize: 38, color: C.ink2}}>改前</div>
    <div style={{position: 'absolute', left: 1560, top: 348, fontSize: 38, color: C.ink2}}>改后</div>
    {[a, b].map((sample, i) => {
      if (i && idx < 5) return null;
      const changed = i ? local(f, 6) >= 30 : local(f, 4) >= 54;
      const focus = i && local(f, 6) >= 8;
      return <div key={sample.id} style={{...card, position: 'absolute', left: 130, top: 408 + i * 180, width: 1660, height: 154, display: 'grid', gridTemplateColumns: '80px 830px 220px 110px 220px', alignItems: 'center', gap: 12, borderColor: changed ? (i ? C.red : C.green)+'99' : undefined}}>
        <div style={{fontSize: 62, fontWeight: 900, ...GRAD}}>{sample.id}</div>
        <div style={{fontSize: 50, color: C.ink, fontWeight: 700, lineHeight: 1.3}}>{i ? <>{sample.input.split(String(sample.after))[0]}<span style={{color: focus ? C.amber : C.ink, borderBottom: focus ? `4px solid ${C.amber}` : 'none'}}>{sample.after}</span>{sample.input.split(String(sample.after))[1]}</> : sample.input}</div>
        <Result value={sample.before} expected={sample.expected} size={62}/>
        <DrawArrow f={i ? local(f, 6) : local(f, 4)} delay={i ? 12 : 40} len={100} color={changed ? (i ? C.red : C.green) : C.ink3}/>
        {changed ? <Result value={sample.after} expected={sample.expected} f={i ? local(f, 6)-30 : local(f, 4)-54} size={62}/> : <div style={{fontSize: 42, color: C.ink2, textAlign: 'center'}}>待复测</div>}
      </div>;
    })}
    {idx < 7 && <div style={{position: 'absolute', left: 130, top: 790, fontSize: 42, color: C.ink2}}>固定预期：A = {a.expected}元 · B = {b.expected}元</div>}
    {idx >= 7 && <Appear f={local(f, 7)} delay={18} style={{position: 'absolute', left: 130, top: 784}}><div style={{fontSize: 56, fontWeight: 900, color: C.red}}>回归失败 → 这版先退回</div></Appear>}
  </>
);

const Matrix = ({f, idx}) => {
  const active = idx === 9 ? 0 : idx === 10 ? 1 : idx === 11 || idx === 12 ? 2 : -1;
  const labels = [['修复样本','这次要修的旧错误'], ['保护样本','原本正确的任务'], ['留出样本','没用于调提示词的题']];
  return <>
    <div style={{...heading, fontSize: 68}}>同一次改动，检查三组样本</div>
    <div style={{position: 'absolute', left: 1270, top: 238, fontSize: 42, color: C.ink2}}>改前</div>
    <div style={{position: 'absolute', left: 1560, top: 238, fontSize: 42, color: C.ink2}}>改后</div>
    {labels.map(([title, desc], i) => <div key={title} style={{...card, position: 'absolute', left: 130, top: 306 + i * 154, width: 1660, height: 136, padding: '12px 32px', lineHeight: 1.1, display: 'grid', gridTemplateColumns: '940px 270px 310px', gap: 22, alignItems: 'center', borderColor: active === i ? C.cyan : undefined, background: active === i ? 'rgba(77,163,255,0.13)' : CARD.background}}>
      <div><div style={{fontSize: 50, fontWeight: 900, color: C.ink}}>{`0${i+1}`}　{title}</div><div style={{fontSize: 42, color: C.ink2, marginTop: 6}}>{desc}</div></div>
      {i < 2 ? <Result value={example.samples[i].before} expected={example.samples[i].expected} size={56}/> : <div style={{fontSize: 38, color: C.ink2, textAlign: 'center'}}>未用于调参</div>}
      {i < 2 ? <Result value={example.samples[i].after} expected={example.samples[i].expected} size={56}/> : <div style={{fontSize: 44, fontWeight: 800, color: C.amber, textAlign: 'center'}}>尚未测试</div>}
    </div>)}
    <div style={{position: 'absolute', left: 130, top: 795, fontSize: 42, fontWeight: 800, color: idx < 12 ? C.red : C.amber}}>{idx === 12 ? '留出结果用于改动 → 补一组新的留出题' : idx < 13 ? '本次示例：出现新失败，仍不通过' : idx === 13 ? '即使全过，也只说明这些样本过关' : '偶发错误重复跑 · 关键任务扩大覆盖'}</div>
  </>;
};

const actions = ['保存输入和预期输出', '固定通过条件', '修复 / 保护 / 留出，三组都查', '一次只改一项，前后同跑', '新失败加入下次保护样本'];
const Checklist = ({idx}) => (
  <>
    <div style={{...heading, fontSize: 68}}>下次改 Prompt，照这张清单检查</div>
    <div style={{position: 'absolute', left: 130, top: 239, fontSize: 42, color: C.amber}}>修好一个错误 ≠ 一次成功的迭代</div>
    {actions.map((text, i) => {
      const active = idx === 15 ? i <= 2 : idx === 16 ? i === 3 : idx === 17 ? i === 4 : true;
      return <div key={text} style={{...card, position: 'absolute', left: 130, top: 316+i*100, width: 1660, height: 88, display: 'flex', alignItems: 'center', gap: 28, borderColor: active ? C.blue+'99' : undefined}}>
        <div style={{width: 32, height: 32, border: `3px solid ${C.blue}`, borderRadius: 5, flexShrink: 0}}/>
        <div style={{fontSize: 52, fontWeight: 800, color: active ? C.ink : C.ink2}}>{text}</div>
      </div>;
    })}
  </>
);

const Video002 = () => {
  const f = useCurrentFrame();
  const seg = segments.find(s => f >= s.from && f < s.from + s.frames) ?? segments.at(-1);
  const idx = seg.idx;
  return <AbsoluteFill style={{fontFamily: FONT}}>
    <Background f={f}/>
    <CornerTag f={f} text="合成示例 · 非模型实测" fontSize={34}/>
    {idx <= 1 ? <Hook f={f}/> : idx <= 3 ? <Case f={f}/> : idx <= 7 ? <Change f={f} idx={idx}/> : idx <= 14 ? <Matrix f={f} idx={idx}/> : <Checklist idx={idx}/>}
    <Subtitle key={seg.id} lf={f-seg.from} text={seg.text} fontSize={56} height={174}/>
    <ProgressBar f={f} total={total}/>
    {segments.map(s => <Sequence key={s.id} from={s.from} durationInFrames={s.frames}><Audio src={staticFile(`narration002/${s.id}.mp3`)}/></Sequence>)}
  </AbsoluteFill>;
};
registerRoot(() => <Composition id="Video002" component={Video002} durationInFrames={total} fps={FPS} width={1920} height={1080}/>);
