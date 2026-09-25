import {useEffect,useState} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {getGoals,getIndicators,getInitiatives,getIndicatorHistory,getStudentGroups,Goal,Indicator,Initiative} from '../../lib/dashboard';
import {useDashboard} from '../../hooks/useDashboard';

type HistoryMap=Record<string,any[]>;
type AvgMap=Record<string,string>;

function InitiativeBars({i}:{i:Initiative}){
  return <div className="subChart">
    {i.subInitiatives.map(s=><div className="subRow" key={s.name}>
      <span title={s.name+(i.start?' — Start Date: '+i.start:'')+(i.end?' | End Date: '+i.end:'')}>{s.name}</span>
      <div className="subBar" aria-label={`${s.name}: ${s.done.toFixed(0)}% Done, ${s.inProgress.toFixed(0)}% In Progress, ${s.notStarted.toFixed(0)}% Not Yet Started`}>
        <i className="done" title={`Done: ${s.done.toFixed(0)}%`} style={{width:s.done+'%'}}>{s.done>=14?Math.round(s.done)+'%':''}</i>
        <i className="progress" title={`In Progress: ${s.inProgress.toFixed(0)}%`} style={{width:s.inProgress+'%'}}>{s.inProgress>=14?Math.round(s.inProgress)+'%':''}</i>
        <i className="not" title={`Not Yet Started: ${s.notStarted.toFixed(0)}%`} style={{width:s.notStarted+'%'}}>{s.notStarted>=14?Math.round(s.notStarted)+'%':''}</i>
      </div>
    </div>)}
    <div className="subLegend">
      <span><i className="done"/>Done</span>
      <span><i className="progress"/>In Progress</span>
      <span><i className="not"/>Not Yet Started</span>
    </div>
  </div>;
}

function formatIndicatorValue(k:Indicator){
  if(k.numeric==null)return k.value;
  if(k.isPercent)return k.numeric.toFixed(1)+'%';
  if(k.shortName.toLowerCase().includes('fund balance')||k.name.toLowerCase().includes('fund balance'))return '$'+(k.numeric/1000000).toFixed(2)+'M';
  return k.numeric.toFixed(1);
}

function formatStatewide(raw:string|undefined){
  if(!raw||raw==='—')return '—';
  const n=Number(String(raw).replace(/[^0-9.-]/g,''));
  if(!Number.isFinite(n))return raw;
  return n.toFixed(1)+(String(raw).includes('%')?'%':'');
}

export function GoalPage(){
  const{goalId:id}=useParams(),nav=useNavigate(),goals=useDashboard(getGoals);
  const[goal,setGoal]=useState<Goal|null>(null),[initiatives,setInitiatives]=useState<Initiative[]>([]),[indicators,setIndicators]=useState<Indicator[]>([]);
  const[histories,setHistories]=useState<HistoryMap>({}),[stateAvgs,setStateAvgs]=useState<AvgMap>({});
  const[initiative,setInitiative]=useState<Initiative|null>(null),[indicator,setIndicator]=useState<Indicator|null>(null),[history,setHistory]=useState<any[]>([]),[groups,setGroups]=useState<any[]>([]),[selectedYear,setSelectedYear]=useState(''),[error,setError]=useState('');

  useEffect(()=>{
    if(!id||!goals.data)return;
    setGoal(goals.data.find(x=>x.id===id)||null);
    Promise.all([getInitiatives(id),getIndicators(id)]).then(async([a,b])=>{
      setInitiatives(a);setIndicators(b);
      const hs:HistoryMap={},av:AvgMap={};
      await Promise.all(b.map(async k=>{
        hs[k.id]=await getIndicatorHistory(k.id);
        if(k.year!=='—'){
          const gr=await getStudentGroups(k.id,k.year);
          const avg=gr.find((r:any)=>r.statewide_value_3_display!=null||r.statewide_value_3_numeric!=null);
          if(avg)av[k.id]=String(avg.statewide_value_3_display??avg.statewide_value_3_numeric??'—');
        }
      }));
      setHistories(hs);setStateAvgs(av);
    }).catch(e=>setError(e.message));
  },[id,goals.data]);

  useEffect(()=>{
    if(!indicator)return;
    getIndicatorHistory(indicator.id).then(rows=>{setHistory(rows);setSelectedYear(indicator.year)});
    getStudentGroups(indicator.id,indicator.year).then(setGroups);
  },[indicator]);

  useEffect(()=>{
    if(indicator&&selectedYear&&selectedYear!==indicator.year)getStudentGroups(indicator.id,selectedYear).then(setGroups);
  },[selectedYear]);

  useEffect(()=>{
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){setInitiative(null);setIndicator(null)}};
    document.addEventListener('keydown',esc);
    return()=>document.removeEventListener('keydown',esc);
  },[]);

  if(goals.loading||!goal)return <main className="page state">Loading goal…</main>;
  if(error)return <main className="page state error">{error}</main>;

  const goalIndex=Math.max(0,goals.data?.findIndex(g=>g.id===id)??0);

  return <main className="page goalPage">
    <nav className="goalTabs" aria-label="Strategic goals">
      {goals.data?.map((g,idx)=><button className={'goalTab '+(g.id===id?'active':'')} onClick={()=>nav('/goals/'+g.id)} key={g.id}>Goal {idx+1} · {g.name}</button>)}
    </nav>

    <header className="goalHero">
      <div><small>GOAL {goalIndex+1}</small><h2>{goal.name}</h2><p>{goal.description}</p></div>
      <span className="goalHeroIcon" aria-hidden="true">✦</span>
    </header>

    <div className="goalSectionTitle">
      <div><small>PROGRESS TOWARD THE GOAL</small><h3>Key Initiatives</h3></div>
      <span>Click an initiative to view details</span>
    </div>

    <section className="initiativeGrid">
      {initiatives.map(i=><article className="initiativeCard detailed" key={i.id} onClick={()=>setInitiative(i)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setInitiative(i)}}>
        <div className="initiativeIntro">
          <h4>{i.shortName}</h4>
          <p title={i.name}>{i.name}</p>
        </div>
        <div className="initiativeSummary">
          <div>
            <span className="duration">Duration: {i.start||'—'} — {i.end||'—'}</span>
            <div className="donePct"><b>{i.completion.toFixed(0)}%</b> Done</div>
          </div>
          <div className="gauge" style={{'--pct':i.completion+'%','--progress-color':`hsl(${Math.round(i.completion*1.2)} 72% 48%)`} as React.CSSProperties} tabIndex={0} aria-label={`${i.shortName} progress: ${i.completion.toFixed(0)}% completed`}>
            <b>{i.completion.toFixed(0)}%</b>
            <div className="initiativeProgressTooltip" role="tooltip">
              <div><span>Initiative Name</span><b>{i.shortName}</b></div>
              <div><span>Sub Initiative Name</span><b>{i.subInitiatives.map(s=>s.name).join(', ')||'—'}</b></div>
              <div><span>Start Date</span><b>{i.start||'—'}</b></div>
              <div><span>End Date</span><b>{i.end||'—'}</b></div>
              <div><span>Total Action Items</span><b>{i.totalActionItems}</b></div>
              <div><span>Completed %</span><b>{i.completion.toFixed(0)}%</b></div>
            </div>
          </div>
        </div>
        <InitiativeBars i={i}/>
      </article>)}
    </section>

    <div className="goalSectionTitle indicatorTitle">
      <div><small>MEASURING OUTCOMES</small><h3>Key Indicators</h3></div>
      <span>Latest year performance &amp; trend</span>
    </div>

    <section className="indicatorGrid">
      {indicators.map(k=>{
        const rows=(histories[k.id]||[]).filter((r:any)=>r.value_3_numeric!=null).slice(-4);
        const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0));
        const favorable=k.variance==null?null:(k.nature==='Negative'?k.variance<=0:k.variance>=0);
        return <article className="indicatorCard goalIndicatorCard" key={k.id} onClick={()=>setIndicator(k)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setIndicator(k)}}>
          <div className="indicatorIntro"><h4>{k.shortName}</h4><p title={k.name}>{k.name}</p></div>
          <div className="indicatorValueRow">
            <div className="indicatorValueWrap">
              <span className="indicatorValue">{formatIndicatorValue(k)}</span>
              {k.variance!=null&&<span className="varianceLine">
                <span className={'variance '+(favorable?'positive':'negative')} title={`Current year minus last year: ${k.variance.toFixed(1)}${k.isPercent?'%':''}`}>
                  <span className="trend">{k.variance>=0?'↗':'↘'}</span>{k.variance.toFixed(1)}{k.isPercent?'%':''}
                </span>
                <span className="varianceLabel">LY Var</span>
              </span>}
            </div>
            <span className="stateAvg">Statewide Average <b>{formatStatewide(stateAvgs[k.id])}</b></span>
          </div>
          <div className="yearBars">
            {rows.map((r:any)=><i key={r.school_year} title={`${r.school_year}: ${r.value_3_display??r.value_3_numeric}`} style={{height:Math.max(10,(Number(r.value_3_numeric)||0)/mx*100)+'%'}}>
              <b className="barValue">{r.value_3_display??r.value_3_numeric??'—'}</b>
            </i>)}
          </div>
          <div className="yearLabels">{rows.map((r:any)=><span key={r.school_year}>{String(r.school_year).replace('20','')}</span>)}</div>
        </article>;
      })}
    </section>

    {initiative&&<div className="modal" onClick={()=>setInitiative(null)}>
      <article className="modalCard" onClick={e=>e.stopPropagation()}>
        <button className="close" onClick={()=>setInitiative(null)} aria-label="Close">×</button>
        <p className="eyebrow">{goal.name}</p>
        <h2>{initiative.shortName}</h2>
        <p>{initiative.name}</p>
        <div className="timeline"><b>Plan of Action</b><span>{initiative.start||'Start'} ━━━━━━━━━━━ {initiative.end||'End'}</span></div>
        <div className="bigCompletion"><strong>{initiative.completion.toFixed(0)}%</strong><span>Overall Done</span></div>
        <h3>Initiative Progress</h3>
        <InitiativeBars i={initiative}/>
      </article>
    </div>}

    {indicator&&<div className="modal" onClick={()=>setIndicator(null)}>
      <article className="modalCard indicatorModalCard" onClick={e=>e.stopPropagation()}>
        <button className="close" onClick={()=>setIndicator(null)} aria-label="Close">×</button>
        <p className="eyebrow">{goal.name}</p>
        <h2>{indicator.shortName}</h2>
        <p>{indicator.name}</p>
        <div className="indicatorTop">
          <div><span>Latest value · {indicator.year}</span><strong>{formatIndicatorValue(indicator)}</strong></div>
          {indicator.variance!=null&&<em className={(indicator.nature==='Negative'?indicator.variance<=0:indicator.variance>=0)?'up':'down'}>LY Var {indicator.variance>=0?'↗':'↘'} {indicator.variance.toFixed(1)}{indicator.isPercent?'%':''}</em>}
        </div>
        <h3>Performance by School Year</h3>
        <div className="historyBars">{history.map((r:any)=><div key={r.school_year}><i style={{height:Math.max(8,Number(r.value_3_numeric||0))+'%'}} title={String(r.value_3_display||r.value_3_numeric)}/><span>{r.school_year}</span></div>)}</div>
        <div className="chartChooser">
          <h3>Student Group Performance</h3>
          <label>Choose Year: <select value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{[...new Set(history.map((r:any)=>r.school_year))].map((y:any)=><option key={y}>{y}</option>)}</select></label>
        </div>
        <div className="groupBars">{groups.filter((r:any)=>r.category!=='Statewide Average').map((r:any)=><div key={r.student_group}><b>{r.value_3_display||r.value_3_numeric}</b><i style={{height:Math.max(8,Number(r.value_3_numeric||0))+'%'}} title={`${r.student_group}: ${r.value_3_display||r.value_3_numeric}`}/><span>{r.student_group}</span></div>)}</div>
        {(()=>{const avg=groups.find((r:any)=>r.statewide_value_3_display!=null||r.statewide_value_3_numeric!=null);return avg?<p className="stateReference">Statewide Average: <b>{avg.statewide_value_3_display||avg.statewide_value_3_numeric}</b></p>:null})()}
      </article>
    </div>}
  </main>;
}
