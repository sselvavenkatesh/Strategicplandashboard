import {Check,Copy,Download,Send,Sparkles} from 'lucide-react';
import {FormEvent,useMemo,useState} from 'react';
import {askDistrictAi,AiAnswer} from '../../lib/ai';

type Message={role:'user'|'assistant';text:string;sources?:string[]};
const popularQuestions=[
  'Provide an overview of our strategic plan.',
  'What are the main goals in our strategic plan?',
  'Provide insights about the Culture of Excellence goal.',
  'How are our key indicators performing?',
  'Which indicators have improved over time?',
  'Which indicators need the most attention?',
  'How are our strategic initiatives progressing?',
  'Which initiatives are still in progress?',
  'What student-group performance gaps are visible in the data?',
  'What are the most important takeaways from our strategic plan data?'
];

function cleanAiText(text:string){return text.replace(/\*\*/g,'').replace(/^\s*---+\s*$/gm,'').replace(/^#{1,6}\s*/gm,'').replace(/\n{3,}/g,'\n\n').trim()}

export function AiAssistantPage(){
  const sessionId=useMemo(()=>crypto.randomUUID(),[]);
  const[input,setInput]=useState('');
  const[busy,setBusy]=useState(false);
  const[copied,setCopied]=useState<number|null>(null);
  const[messages,setMessages]=useState<Message[]>([{role:'assistant',text:'Hi! I’m the K12 AI Assistant. I can explain your district’s strategic plan, goals, indicators and initiatives in plain language. What would you like to know?'}]);

  async function ask(question:string){
    const q=question.trim();if(!q||busy)return;
    setMessages(m=>[...m,{role:'user',text:q}]);setInput('');setBusy(true);
    try{const r:AiAnswer=await askDistrictAi(q,sessionId);setMessages(m=>[...m,{role:'assistant',text:cleanAiText(r.answer),sources:r.sources}])}
    catch{setMessages(m=>[...m,{role:'assistant',text:'I’m unable to review the district data right now. Please try again shortly.'}])}
    finally{setBusy(false)}
  }
  async function submit(e:FormEvent){e.preventDefault();await ask(input)}
  async function copy(text:string,index:number){await navigator.clipboard.writeText(text);setCopied(index);window.setTimeout(()=>setCopied(v=>v===index?null:v),1800)}
  function download(text:string){const blob=new Blob([text],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='k12-ai-assistant-answer.txt';a.click();URL.revokeObjectURL(a.href)}

  return <main className="page aiPage">
    <header className="aiHero"><div className="aiHeroIcon"><span>AI</span><Sparkles size={13}/></div><div><small>DISTRICT DATA ASSISTANT</small><h1>K12 AI Assistant</h1><p>Simple, data-based explanations for parents, community members and district staff.</p></div></header>
    <div className="aiWorkspace">
      <aside className="aiPopular"><div className="aiPopularTitle"><Sparkles size={13}/><b>Popular Questions</b></div><p>Choose a question to get started.</p>{popularQuestions.map((q,i)=><button key={i} type="button" disabled={busy} onClick={()=>ask(q)}><span>{i+1}</span>{q}</button>)}</aside>
      <section className="aiConversation">
        <div className="aiChat" aria-live="polite">
          {messages.map((m,i)=><article key={i} className={'aiMessage '+m.role}><div className="aiBubble">{m.text}{m.sources&&m.sources.length>0&&<div className="aiSources"><b>District data reviewed</b>{m.sources.map(s=><span key={s}>{s.replaceAll('_',' ')}</span>)}</div>}{m.role==='assistant'&&i>0&&<div className="aiActions"><button onClick={()=>copy(m.text,i)} title="Copy answer">{copied===i?<><Check size={14}/> Copied</>:<><Copy size={14}/> Copy</>}</button><button onClick={()=>download(m.text)} title="Download answer"><Download size={14}/> Download</button></div>}</div></article>)}
          {busy&&<article className="aiMessage assistant"><div className="aiBubble aiThinking"><span className="aiLoader" aria-hidden="true"/><span><b>K12 AI is reviewing district data…</b><small>Checking the strategic plan, indicators and initiatives.</small></span></div></article>}
        </div>
        <form className="aiComposer" onSubmit={submit}><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask K12 AI about the district strategic plan…" rows={1} maxLength={1200} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();e.currentTarget.form?.requestSubmit()}}}/><button type="submit" disabled={busy||!input.trim()} aria-label="Send question"><Send size={16}/></button><small>Answers use approved district data only.</small></form>
      </section>
    </div>
  </main>
}
