import {Bot,Copy,Download,Send} from 'lucide-react';
import {FormEvent,useMemo,useState} from 'react';
import {askDistrictAi,AiAnswer} from '../../lib/ai';

type Message={role:'user'|'assistant';text:string;sources?:string[]};

export function AiAssistantPage(){
  const sessionId=useMemo(()=>crypto.randomUUID(),[]);
  const[input,setInput]=useState('');
  const[busy,setBusy]=useState(false);
  const[messages,setMessages]=useState<Message[]>([
    {role:'assistant',text:'Ask me about your school district strategic plan, goals, indicators, initiatives, student-group performance, or related district data.'}
  ]);
  async function submit(e:FormEvent){e.preventDefault();const q=input.trim();if(!q||busy)return;setMessages(m=>[...m,{role:'user',text:q}]);setInput('');setBusy(true);try{const r:AiAnswer=await askDistrictAi(q,sessionId);setMessages(m=>[...m,{role:'assistant',text:r.answer,sources:r.sources}])}catch{setMessages(m=>[...m,{role:'assistant',text:'The district AI service is not available right now. Please try again later.'}])}finally{setBusy(false)}}
  async function copy(text:string){await navigator.clipboard.writeText(text)}
  function download(text:string){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='strategic-plan-ai-answer.txt';a.click();URL.revokeObjectURL(a.href)}
  return <main className="page aiPage">
    <header className="aiHero"><div className="aiHeroIcon"><Bot size={22}/></div><div><small>V2.3 · DISTRICT DATA ONLY</small><h1>Strategic Plan AI Assistant</h1><p>Grounded answers from approved district strategic-plan data. The assistant does not browse the public internet.</p></div></header>
    <section className="aiChat" aria-live="polite">
      {messages.map((m,i)=><article key={i} className={'aiMessage '+m.role}><div className="aiBubble">{m.text}{m.sources&&m.sources.length>0&&<div className="aiSources"><b>Data used</b>{m.sources.map(s=><span key={s}>{s}</span>)}</div>}{m.role==='assistant'&&i>0&&<div className="aiActions"><button onClick={()=>copy(m.text)} title="Copy answer"><Copy size={14}/> Copy</button><button onClick={()=>download(m.text)} title="Download answer"><Download size={14}/> Download</button></div>}</div></article>)}
      {busy&&<article className="aiMessage assistant"><div className="aiBubble aiThinking">Reviewing district data…</div></article>}
    </section>
    <form className="aiComposer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask about goals, indicators, initiatives or district performance…" rows={2} maxLength={1200} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="submit" disabled={busy||!input.trim()} aria-label="Send question"><Send size={18}/></button><small>District-data questions only. AI responses should be verified against the cited dashboard data.</small></form>
  </main>
}
