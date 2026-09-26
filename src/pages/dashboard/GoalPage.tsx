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

function parseMonthDate(v?:string){
  if(!v)return null;
  const s=String(v).trim(),m=s.match(/^([A-Za-z]{3})-(\d{4})$/);
  const d=m?new Date(`1 ${m[1]} ${m[2]}`):new Date(s);
  return Number.isNaN(d.getTime())?null:d;
}
function timelinePct(v:string|undefined,min:string|undefined,max:string|undefined){
  const d=parseMonthDate(v),a=parseMonthDate(min),b=parseMonthDate(max);
  if(!d||!a||!b||b.getTime()===a.getTime())return 50;
  return Math.max(0,Math.min(100,(d.getTime()-a.getTime())/(b.getTime()-a.getTime())*100));
}
function InitiativeTimeline({initiative}:{initiative:Initiative}){
  const min=initiative.start,max=initiative.end;
  const groups=new Map<string,typeof initiative.subInitiatives>();
  initiative.subInitiatives.forEach(s=>{const key=s.end||max||'';groups.set(key,[...(groups.get(key)||[]),s])});
  return <section className="timelinePanel">
    <div className="timelineTitle"><b>Plan of Action</b><span className="timelineEndDate"><small>END DATE</small><strong>{max||'End'}</strong></span></div>
    <div className="timelineScale">
      <div className="timelineLine"/>
      <div className="timelineEndpoint timelineStart"><i className="greenFlag">⚑</i><b>{min||'Start'}</b><span>Initiative Start</span></div>
      {[...groups.entries()].map(([date,items])=><div className="timelineMilestoneGroup" key={date} style={{left:timelinePct(date,min,max)+'%'}}>
        <i className={items.every(s=>s.completion>=99.999)?'greenFlag':'redFlag'}>⚑</i>
        <div className="timelineMilestoneLabels">{items.map(s=><div key={s.name}><strong>{s.name}</strong><span>{s.end||date}</span></div>)}</div>
      </div>)}
      <div className="timelineEndpoint timelineEnd"><i className={initiative.completion>=99.999?'greenFlag':'redFlag'}>⚑</i></div>
    </div>
    <div className="timelineLegend"><span><i className="greenFlag">⚑</i> Completed</span><span><i className="redFlag">⚑</i> Not Completed</span></div>
  </section>
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
  const[initiative,setInitiative]=useState<Initiative|null>(null),[indicator,setIndicator]=useState<Indicator|null>(null),[history,setHistory]=useState<any[]>([]),[groups,setGroups]=useState<any[]>([]),[selectedYear,setSelectedYear]=useState(''),[indicatorLoading,setIndicatorLoading]=useState(false),[error,setError]=useState('');

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
    setIndicatorLoading(true);getStudentGroups(indicator.id,indicator.year).then(setGroups).finally(()=>setIndicatorLoading(false));
  },[indicator]);

  useEffect(()=>{
    if(indicator&&selectedYear&&selectedYear!==indicator.year){setIndicatorLoading(true);getStudentGroups(indicator.id,selectedYear).then(setGroups).finally(()=>setIndicatorLoading(false))}
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
          <div className="gauge" style={{'--pct':i.completion+'%','--progress-color':(i.completion>=100?'var(--green)':`hsl(${Math.round(i.completion*1.2)} 72% 48%)`)} as React.CSSProperties} tabIndex={0} aria-label={`${i.shortName} progress: ${i.completion.toFixed(0)}% completed`}>
            <b>{i.completion.toFixed(0)}%</b>
            <div className="initiativeProgressTooltip" role="tooltip">
              <div><span>Initiative Name</span><em>—</em><b>{i.shortName}</b></div>
              <div><span>Sub Initiative Name</span><em>—</em><b>{i.subInitiatives.map(s=>s.name).join(', ')||'—'}</b></div>
              <div><span>Start Date</span><em>—</em><b>{i.start||'—'}</b></div>
              <div><span>End Date</span><em>—</em><b>{i.end||'—'}</b></div>
              <div><span>Total Action Items</span><em>—</em><b>{i.totalActionItems}</b></div>
              <div><span>Completed %</span><em>—</em><b>{i.completion.toFixed(0)}%</b></div>
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

    {initiative&&<div className="initiativeModal open" role="dialog" aria-modal="true" aria-label={initiative.shortName} onClick={()=>setInitiative(null)}>
      <div className="modalShell" onClick={e=>e.stopPropagation()}>
        <button className="modalClose" onClick={()=>setInitiative(null)} aria-label="Close">×</button>
        <div className="modalGoal">
          <span className="popupGoalIcon" aria-hidden="true">✦</span>
          <div><small>GOAL {goalIndex+1}</small><h2>{goal.name}</h2><p>{goal.description}</p></div>
        </div>
        <div className="modalInitiativeHead"><span className="statusDot"/><div><small>INITIATIVE</small><h3>{initiative.shortName}</h3></div></div>
        <InitiativeTimeline initiative={initiative}/>
        <section className="overallPanel">
          <div><small>INITIATIVE OVERALL PROGRESS</small><div className="overallDone"><b>{initiative.completion.toFixed(0)}%</b><span>Done</span></div></div>
          <div className="modalGauge" style={{'--pct':initiative.completion+'%','--progress-color':(initiative.completion>=100?'var(--green)':`hsl(${Math.round(initiative.completion*1.2)} 72% 48%)`)} as React.CSSProperties}><b>{initiative.completion.toFixed(0)}%</b></div>
        </section>
        <section className="progressPanel">
          <div className="progressTitle"><div><small>SUB-INITIATIVE STATUS</small><h3>Initiative Progress</h3></div><span>Done · In Progress · Not Started</span></div>
          <div>
            {initiative.subInitiatives.map(s=><div className="modalProgressRow" key={s.name}>
              <span title={s.name}>{s.name}</span>
              <div className="modalProgressBar" aria-label={`${s.name}: ${s.done.toFixed(0)}% Done, ${s.inProgress.toFixed(0)}% In Progress, ${s.notStarted.toFixed(0)}% Not Started`}>
                <i className="done" style={{width:s.done+'%'}}>{s.done>=10?Math.round(s.done)+'%':''}</i>
                <i className="progress" style={{width:s.inProgress+'%'}}>{s.inProgress>=10?Math.round(s.inProgress)+'%':''}</i>
                <i className="not" style={{width:s.notStarted+'%'}}>{s.notStarted>=10?Math.round(s.notStarted)+'%':''}</i>
              </div>
            </div>)}
          </div>
          <div className="modalLegend"><span><i className="done"/>Done</span><span><i className="progress"/>In Progress</span><span><i className="not"/>Not Started</span></div>
        </section>
      </div>
    </div>}

    {indicator&&<div className="indicatorModal open" role="dialog" aria-modal="true" aria-label={indicator.shortName} onClick={()=>setIndicator(null)}>
      <div className="indicatorModalShell" onClick={e=>e.stopPropagation()}>
        <button className="modalClose" onClick={()=>setIndicator(null)} aria-label="Close">×</button>
        <div className="indicatorModalGoal">
          <span className="popupGoalIcon" aria-hidden="true">✦</span>
          <div><small>GOAL {goalIndex+1}</small><h2>{goal.name}</h2><p>{goal.description}</p></div>
        </div>
        <div className="indicatorModalHead"><span className="statusDot"/><h3>{indicator.shortName}</h3></div>
        <section className="currentKpi">
          <div><small>CY: {selectedYear||indicator.year}</small><span>{indicator.shortName}{indicator.isPercent?' Proficient %':''}</span></div>
          <b>{(()=>{const r=history.find((x:any)=>x.school_year===selectedYear);if(!r)return formatIndicatorValue(indicator);const raw=r.value_3_display;const n=r.value_3_numeric==null?null:Number(r.value_3_numeric);if(raw!=null)return String(raw);if(n==null)return '—';if(indicator.isPercent)return n.toFixed(1)+'%';if(indicator.shortName.toLowerCase().includes('fund balance')||indicator.name.toLowerCase().includes('fund balance'))return '
        <section className="indicatorChartPanel">
          <div className="indicatorChartTitle"><h3>{indicator.shortName} — Student Group Performance</h3><span title="Chart options and full indicator details">•••</span></div>
          <div className="yearChooser"><label htmlFor="indicatorYear">Choose Year:</label><select id="indicatorYear" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{[...new Set(history.map((r:any)=>r.school_year))].map((y:any)=><option key={y}>{y}</option>)}</select></div>
          <div className={'studentChart '+(indicatorLoading?'isLoading':'')}>{indicatorLoading&&<div className="indicatorLoader" role="status" aria-live="polite"><i/><span>Loading data…</span></div>}
            <div className="yAxisLabel">{indicator.isPercent?'Percent of students proficient':'Indicator value'}</div>
            <div className="studentBars">
              {(()=>{const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0));return rows.map((r:any)=><div className="studentBarCol" key={r.student_group}><div className="studentBar" style={{height:Math.max(4,(Number(r.value_3_numeric)||0)/mx*100)+'%'}}><b>{r.value_3_display??r.value_3_numeric}</b></div><span>{r.student_group}</span></div>)})()}
            </div>
            {(()=>{const avg=groups.find((r:any)=>r.statewide_value_3_numeric!=null);const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0),Number(avg?.statewide_value_3_numeric)||0);return avg?<div className="stateAvgLine" style={{bottom:Math.min(100,Math.max(0,(Number(avg.statewide_value_3_numeric)||0)/mx*100))+'%'}}><span>Statewide Average: {avg.statewide_value_3_display??avg.statewide_value_3_numeric}</span></div>:null})()}
          </div>
          <div className="xAxisLabel">Student Group</div>
          <p className="chartNote">ⓘ Student-group performance for the selected school year. Statewide Average is shown as a reference line.</p>
        </section>
      </div>
    </div>}
  </main>;
}
+(n/1000000).toFixed(2)+'M';return n.toFixed(1)})()}</b>
        </section>
        <section className="indicatorChartPanel">
          <div className="indicatorChartTitle"><h3>{indicator.shortName} — Student Group Performance</h3><span title="Chart options and full indicator details">•••</span></div>
          <div className="yearChooser"><label htmlFor="indicatorYear">Choose Year:</label><select id="indicatorYear" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{[...new Set(history.map((r:any)=>r.school_year))].map((y:any)=><option key={y}>{y}</option>)}</select></div>
          <div className={'studentChart '+(indicatorLoading?'isLoading':'')}>{indicatorLoading&&<div className="indicatorLoader" role="status" aria-live="polite"><i/><span>Loading data…</span></div>}
            <div className="yAxisLabel">{indicator.isPercent?'Percent of students proficient':'Indicator value'}</div>
            <div className="studentBars">
              {(()=>{const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0));return rows.map((r:any)=><div className="studentBarCol" key={r.student_group}><div className="studentBar" style={{height:Math.max(4,(Number(r.value_3_numeric)||0)/mx*100)+'%'}}><b>{r.value_3_display??r.value_3_numeric}</b></div><span>{r.student_group}</span></div>)})()}
            </div>
            {(()=>{const avg=groups.find((r:any)=>r.statewide_value_3_numeric!=null);const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0),Number(avg?.statewide_value_3_numeric)||0);return avg?<div className="stateAvgLine" style={{bottom:Math.min(100,Math.max(0,(Number(avg.statewide_value_3_numeric)||0)/mx*100))+'%'}}><span>Statewide Average: {avg.statewide_value_3_display??avg.statewide_value_3_numeric}</span></div>:null})()}
          </div>
          <div className="xAxisLabel">Student Group</div>
          <p className="chartNote">ⓘ Student-group performance for the selected school year. Statewide Average is shown as a reference line.</p>
        </section>
      </div>
    </div>}
  </main>;
}
+(n/1000000).toFixed(2)+'M';return n.toFixed(1)})()}</b>
        </section>
        <section className="indicatorChartPanel">
          <div className="indicatorChartTitle"><h3>{indicator.shortName} — Student Group Performance</h3><span title="Chart options and full indicator details">•••</span></div>
          <div className="yearChooser"><label htmlFor="indicatorYear">Choose Year:</label><select id="indicatorYear" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{[...new Set(history.map((r:any)=>r.school_year))].map((y:any)=><option key={y}>{y}</option>)}</select></div>
          <div className={'studentChart '+(indicatorLoading?'isLoading':'')}>{indicatorLoading&&<div className="indicatorLoader" role="status" aria-live="polite"><i/><span>Loading data…</span></div>}
            <div className="yAxisLabel">{indicator.isPercent?'Percent of students proficient':'Indicator value'}</div>
            <div className="studentBars">
              {(()=>{const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0));return rows.map((r:any)=><div className="studentBarCol" key={r.student_group}><div className="studentBar" style={{height:Math.max(4,(Number(r.value_3_numeric)||0)/mx*100)+'%'}}><b>{r.value_3_display??r.value_3_numeric}</b></div><span>{r.student_group}</span></div>)})()}
            </div>
            {(()=>{const avg=groups.find((r:any)=>r.statewide_value_3_numeric!=null);const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0),Number(avg?.statewide_value_3_numeric)||0);return avg?<div className="stateAvgLine" style={{bottom:Math.min(100,Math.max(0,(Number(avg.statewide_value_3_numeric)||0)/mx*100))+'%'}}><span>Statewide Average: {avg.statewide_value_3_display??avg.statewide_value_3_numeric}</span></div>:null})()}
          </div>
          <div className="xAxisLabel">Student Group</div>
          <p className="chartNote">ⓘ Student-group performance for the selected school year. Statewide Average is shown as a reference line.</p>
        </section>
      </div>
    </div>}
  </main>;
}
+(n/1000000).toFixed(2)+'M';return n.toFixed(1)})()}</b>
        </section>
        <section className="indicatorChartPanel">
          <div className="indicatorChartTitle"><h3>{indicator.shortName} — Student Group Performance</h3><span title="Chart options and full indicator details">•••</span></div>
          <div className="yearChooser"><label htmlFor="indicatorYear">Choose Year:</label><select id="indicatorYear" value={selectedYear} onChange={e=>setSelectedYear(e.target.value)}>{[...new Set(history.map((r:any)=>r.school_year))].map((y:any)=><option key={y}>{y}</option>)}</select></div>
          <div className={'studentChart '+(indicatorLoading?'isLoading':'')}>{indicatorLoading&&<div className="indicatorLoader" role="status" aria-live="polite"><i/><span>Loading data…</span></div>}
            <div className="yAxisLabel">{indicator.isPercent?'Percent of students proficient':'Indicator value'}</div>
            <div className="studentBars">
              {(()=>{const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0));return rows.map((r:any)=><div className="studentBarCol" key={r.student_group}><div className="studentBar" style={{height:Math.max(4,(Number(r.value_3_numeric)||0)/mx*100)+'%'}}><b>{r.value_3_display??r.value_3_numeric}</b></div><span>{r.student_group}</span></div>)})()}
            </div>
            {(()=>{const avg=groups.find((r:any)=>r.statewide_value_3_numeric!=null);const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);const mx=Math.max(1,...rows.map((r:any)=>Number(r.value_3_numeric)||0),Number(avg?.statewide_value_3_numeric)||0);return avg?<div className="stateAvgLine" style={{bottom:Math.min(100,Math.max(0,(Number(avg.statewide_value_3_numeric)||0)/mx*100))+'%'}}><span>Statewide Average: {avg.statewide_value_3_display??avg.statewide_value_3_numeric}</span></div>:null})()}
          </div>
          <div className="xAxisLabel">Student Group</div>
          <p className="chartNote">ⓘ Student-group performance for the selected school year. Statewide Average is shown as a reference line.</p>
        </section>
      </div>
    </div>}
  </main>;
}
