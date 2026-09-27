import {Check,Copy,Download,Send,Sparkles} from 'lucide-react';
import {FormEvent,useMemo,useState} from 'react';
import {askDistrictAi,AiAnswer} from '../../lib/ai';

type ChartSpec={type:'line'|'bar';title:string;xKey:string;yKey:string;yLabel?:string;suffix?:string;data:Array<Record<string,string|number>>};
type Message={role:'user'|'assistant';text:string;sources?:string[];chart?:ChartSpec};

function cleanAiText(text:string){
  return text.replace(/\*\*/g,'').replace(/^\s*---+\s*$/gm,'').replace(/\n{3,}/g,'\n\n').trim();
}
function MiniChart({chart}:{chart:ChartSpec}){
  const values=chart.data.map(d=>Number(d[chart.yKey])).filter(Number.isFinite);
  if(!values.length)return null;
  const max=Math.max(...values,1),min=chart.type==='line'?Math.min(...values,0):0,w=560,h=150,pad=24;
  const x=(i:number)=>pad+(chart.data.length<=1?0:(i*(w-pad*2)/(chart.data.length-1)));
  const y=(v:number)=>h-pad-((v-min)/(Math.max(max-min,1)))*(h-pad*2);
  const points=chart.data.map((d,i)=>x(i)+','+y(Number(d[chart.yKey]))).join(' ');
  return <div className="aiChart"><b>{chart.title}</b><svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={chart.title}><line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} className="aiChartAxis"/>{chart.type==='line'?<polyline points={points} className="aiChartLine"/>:chart.data.map((d,i)=>{const v=Number(d[chart.yKey]),bw=Math.max(12,(w-pad*2)/chart.data.length*.55);return <rect key={i} x={x(i)-bw/2} y={y(v)} width={bw} height={h-pad-y(v)} rx="2" className="aiChartBar"/>})}{chart.data.map((d,i)=><g key={i}><text x={x(i)} y={h-6} textAnchor="middle">{String(d[chart.xKey]).slice(0,16)}</text><text x={x(i)} y={Math.max(10,y(Number(d[chart.yKey]))-5)} textAnchor="middle">{String(d[chart.yKey])}{chart.suffix||''}</text></g>)}</svg></div>
}

export function AiAssistantPage(){
  const sessionId=useMemo(()=>crypto.randomUUID(),[]);
  const[input,setInput]=useState('');
  const[busy,setBusy]=useState(false);
  const[copied,setCopied]=useState<number|null>(null);
  const[messages,setMessages]=useState<Message[]>([
    {role:'assistant',text:'Hi! I can help explain your district’s strategic plan, goals, indicators and initiatives in plain language. What would you like to know?'}
  ]);
  async function submit(e:FormEvent){e.preventDefault();const q=input.trim();if(!q||busy)return;setMessages(m=>[...m,{role:'user',text:q}]);setInput('');setBusy(true);try{const r:AiAnswer=await askDistrictAi(q,sessionId);setMessages(m=>[...m,{role:'assistant',text:cleanAiText(r.answer),sources:r.sources,chart:r.chart}])}catch{setMessages(m=>[...m,{role:'assistant',text:'I’m unable to review the district data right now. Please try again shortly.'}])}finally{setBusy(false)}}
  async function copy(text:string,index:number){await navigator.clipboard.writeText(text);setCopied(index);window.setTimeout(()=>setCopied(v=>v===index?null:v),1800)}
  function download(text:string){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='strategic-plan-ai-answer.txt';a.click();URL.revokeObjectURL(a.href)}
  return <main className="page aiPage">
    <header className="aiHero"><div className="aiHeroIcon"><span>AI</span><Sparkles size={15}/></div><div><small>DISTRICT DATA ASSISTANT</small><h1>Ask about your Strategic Plan</h1><p>Simple, data-based explanations for parents, community members and district staff.</p></div></header>
    <section className="aiChat" aria-live="polite">
      {messages.map((m,i)=><article key={i} className={'aiMessage '+m.role}><div className="aiBubble">{m.text}{m.chart&&<MiniChart chart={m.chart}/>} {m.sources&&m.sources.length>0&&<div className="aiSources"><b>District data reviewed</b>{m.sources.map(s=><span key={s}>{s.replaceAll('_',' ')}</span>)}</div>}{m.role==='assistant'&&i>0&&<div className="aiActions"><button onClick={()=>copy(m.text,i)} title="Copy answer">{copied===i?<><Check size={14}/> Copied</>:<><Copy size={14}/> Copy</>}</button><button onClick={()=>download(m.text)} title="Download answer"><Download size={14}/> Download</button></div>}</div></article>)}
      {busy&&<article className="aiMessage assistant"><div className="aiBubble aiThinking"><span className="aiLoader" aria-hidden="true"/><span><b>AI is reviewing district data…</b><small>Checking the strategic plan, indicators and initiatives.</small></span></div></article>}
    </section>
    <form className="aiComposer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question about the district strategic plan…" rows={1} maxLength={1200} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="submit" disabled={busy||!input.trim()} aria-label="Send question"><Send size={17}/></button><small>Answers use approved district data only.</small></form>
  </main>
}
