import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {getGoals,getIndicators,getInitiatives,Goal,Indicator,Initiative} from '../../lib/dashboard';
import {useDashboard} from '../../hooks/useDashboard';

type Bundle={goal:Goal;indicators:Indicator[];initiatives:Initiative[]};
const goalImages=[
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
  'https://images.unsplash.com/photo-1564981797816-1043664bf78d?auto=format&fit=crop&w=900&q=80'
];

export function SummaryPage(){
 const nav=useNavigate(),goals=useDashboard(getGoals),[bundles,setBundles]=useState<Bundle[]>([]),[err,setErr]=useState('');
 useEffect(()=>{if(!goals.data)return;Promise.all(goals.data.map(async goal=>({goal,indicators:await getIndicators(goal.id),initiatives:await getInitiatives(goal.id)}))).then(setBundles).catch(e=>setErr(e.message))},[goals.data]);
 if(goals.loading||(!bundles.length&&!err))return <main className="page state">Loading strategic plan summary…</main>;
 if(goals.error||err)return <main className="page state error">{goals.error||err}</main>;
 return <main className="page summaryPage">
  <div className="summaryHeading"><div><small>STRATEGIC PLAN</small><h1>Goal Summary</h1></div><span>{bundles.length} Goals</span></div>
  <section className="summaryGrid">{bundles.map(({goal,indicators,initiatives},idx)=>{
   const all=initiatives.reduce((a,x)=>({d:a.d+x.done,p:a.p+x.inProgress,n:a.n+x.notStarted}),{d:0,p:0,n:0}),total=all.d+all.p+all.n;
   const pct=(n:number)=>total?Math.round(100*n/total):0;
   return <article className="summaryGoal" key={goal.id} onClick={()=>nav('/goals/'+goal.id)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')nav('/goals/'+goal.id)}}>
    <div className="goalImage" style={{backgroundImage:`url(${goalImages[idx%goalImages.length]})`}} role="img" aria-label={goal.name}/>
    <div className="summaryBody"><small>Goal {idx+1}</small><h2>{goal.name}</h2><p className="clamp3" title={goal.description}>{goal.description}</p>
     <div className="sectionLabel"><b>Key Initiatives</b><span>View All →</span></div>
     {total?<><div className="stack" aria-label={`Initiative progress: ${pct(all.d)}% Done, ${pct(all.p)}% In Progress, ${pct(all.n)}% Not Yet Started`}>
       <i className="done" title={`Done: ${pct(all.d)}% (${all.d} actions)`} style={{width:pct(all.d)+'%'}}>{pct(all.d)>11?<span>{pct(all.d)}%</span>:null}</i>
       <i className="progress" title={`In Progress: ${pct(all.p)}% (${all.p} actions)`} style={{width:pct(all.p)+'%'}}>{pct(all.p)>11?<span>{pct(all.p)}%</span>:null}</i>
       <i className="not" title={`Not Yet Started: ${pct(all.n)}% (${all.n} actions)`} style={{width:pct(all.n)+'%'}}>{pct(all.n)>11?<span>{pct(all.n)}%</span>:null}</i>
      </div><div className="legend"><span>■ Done</span><span>■ In Progress</span><span>■ Not Yet Started</span></div></>:<div className="summaryUnavailable" title="No initiative action-item data is currently available for this goal.">Initiative data unavailable</div>}
     <div className="sectionLabel"><b>Key Indicators</b><span>View All →</span></div>
     <div className="kpis">{indicators.map(k=><div className="kpi" key={k.id} title={k.description||`${k.name}: latest available value ${k.value}`} onClick={e=>e.stopPropagation()}>
       <span>{k.name}</span><div className="kpiValue"><b>{k.value}</b>{k.variance!=null&&<span className="varianceLine"><small>LY Var</small><em className={(k.nature==='Negative'?k.variance<=0:k.variance>=0)?'up':'down'}>{k.variance>=0?'↗':'↘'} {k.variance.toFixed(1)}{k.isPercent?'%':''}</em></span>}</div>{k.year!=='—'&&<small className="kpiYear">{k.year}</small>}
      </div>)}</div>
    </div>
   </article>})}</section>
 </main>
}