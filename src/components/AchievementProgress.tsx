import {useEffect,useId,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {AchievementIndicator,AchievementScore} from '../lib/achievement';
import '../styles/achievement.css';

type Props={label:string;score:AchievementScore|null;indicators:AchievementIndicator[];loading?:boolean;error?:string};

export function AchievementProgress({label,score,indicators,loading=false,error=''}:Props){
  const [open,setOpen]=useState(false),id=useId(),close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    const previous=document.activeElement as HTMLElement|null;
    close.current?.focus();
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setOpen(false)}
      // The details dialog has one interactive control.
      if(e.key==='Tab'){e.preventDefault();close.current?.focus()}
    };
    document.addEventListener('keydown',key,true);
    return()=>{document.removeEventListener('keydown',key,true);previous?.focus()};
  },[open]);
  const percent=score?.percent??null;
  const available=!loading&&!error&&percent!=null;
  const value=loading?'…':available?`${Math.round(percent)}%`:'N/A';
  const caption=loading?'Loading…':error?'Unavailable':score?.eligible?`${score.achieved} of ${score.eligible} ${score.eligible===1?'indicator':'indicators'} achieved`:'No targets available';
  const details=indicators.map(k=>`${k.name} (${k.year||'No year'}): Actual ${k.actual??'N/A'}; Target ${k.target??'N/A'}; ${k.achieved==null?k.reason:k.achieved?'Achieved':'Not achieved'}${k.nature==='Negative'?' (lower is better)':''}`).join('\n');
  const tooltip=`${label}: ${value}. ${caption}.${score?.excluded?` ${score.excluded} indicators excluded.`:''}\n${details}`;
  return <>
    <button type="button" className="achievementProgress" aria-label={`${label}: ${value}, ${caption}. View target details`}
      title={tooltip} aria-haspopup="dialog" aria-expanded={open} disabled={loading||!!error}
      onClick={e=>{e.stopPropagation();setOpen(true)}} onKeyDown={e=>e.stopPropagation()}>
      <span className="achievementProgressTop"><span>{label==='Overall Achievement'?'Overall Achievement':'Achievement'}</span><strong>{value}</strong></span>
      <span className="achievementProgressTrack" aria-hidden="true"><span style={{width:(available?percent:0)+'%'}}/></span>
      <span className="achievementProgressCaption">{caption}</span>
    </button>
    {open&&createPortal(<div className="achievementBackdrop" onClick={e=>{e.stopPropagation();setOpen(false)}} onKeyDown={e=>e.stopPropagation()}>
      <section className="achievementDialog" role="dialog" aria-modal="true" aria-labelledby={id} onClick={e=>e.stopPropagation()}>
        <button ref={close} className="achievementClose" type="button" aria-label="Close achievement details" onClick={()=>setOpen(false)}>×</button>
        <h2 id={id}>{label}</h2><p><strong>{value}</strong> · {caption}{score?.excluded?` · ${score.excluded} awaiting data or target`:''}</p>
        <div className="achievementTableWrap"><table><thead><tr><th>Indicator / Year</th><th>Actual</th><th>Target 1</th><th>Result</th></tr></thead><tbody>
          {indicators.map(k=><tr key={k.id}><th scope="row">{k.name}<small>{k.year||'Year unavailable'}{k.nature==='Negative'?' · Lower is better':''}</small></th><td>{k.actual||'—'}</td><td>{k.target||'—'}</td><td className={k.achieved===true?'achieved':''}>{k.achieved==null?k.reason:k.achieved?'Achieved':'Not achieved'}</td></tr>)}
        </tbody></table></div>
        <p className="achievementExplanation">Each indicator counts once. Actual and Target 1 use the same reporting year. Meeting the target counts as achieved. Missing or invalid values are excluded.</p>
      </section>
    </div>,document.body)}
  </>;
}
