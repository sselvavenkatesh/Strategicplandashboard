import {useEffect,useMemo,useRef,useState} from 'react';
import {getStudentGroups,type Indicator} from '../lib/dashboard';
import {hasGroupValue,latestChartYears,studentYearColors,type StudentGroupRow} from '../lib/studentGroupChart';

type Series={year:string;rows:StudentGroupRow[]};
export function StudentGroupChart({indicator,history,selectedYear,onYearChange}:{indicator:Indicator;history:Record<string,any>[];selectedYear:string;onYearChange:(year:string)=>void}){
  const [showAll,setShowAll]=useState(false),[series,setSeries]=useState<Series[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  const cache=useRef(new Map<string,Promise<StudentGroupRow[]>>());
  const availableYears=useMemo(()=>latestChartYears(history.map(row=>String(row.school_year??''))),[history]);
  const yearOptions=useMemo(()=>[...new Set([indicator.year,...history.map(row=>String(row.school_year??''))].filter(year=>year&&year!=='—'))].sort((a,b)=>b.localeCompare(a,undefined,{numeric:true})),[history,indicator.year]);
  const requestedYears=showAll?(availableYears.length?availableYears:[indicator.year]):[selectedYear||indicator.year];
  const yearKey=JSON.stringify(requestedYears);
  useEffect(()=>{
    let live=true;setLoading(true);setError('');
    const years=JSON.parse(yearKey) as string[];
    Promise.all(years.filter(year=>year&&year!=='—').map(async year=>{
      const key=indicator.id+'|'+year;
      if(!cache.current.has(key))cache.current.set(key,getStudentGroups(indicator.id,year).catch(reason=>{cache.current.delete(key);throw reason}));
      return {year,rows:await cache.current.get(key)!};
    })).then(result=>{if(live)setSeries(result)}).catch(()=>{if(live){setSeries([]);setError('Chart data could not be loaded.')}}).finally(()=>{if(live)setLoading(false)});
    return()=>{live=false};
  },[indicator.id,yearKey,retry]);
  const rows=series.flatMap(item=>item.rows);
  const names=[...new Set(rows.filter(hasGroupValue).map(row=>row.student_group!))];
  const scale=chartScale(indicator,rows);
  const avg=!showAll?rows.find(row=>row.statewide_value_3_numeric!=null):undefined;
  return <section className="indicatorChartPanel">
    <div className="indicatorChartTitle"><h3>{indicator.shortName} — Student Group Performance</h3><span title="Chart options and full indicator details">•••</span></div>
    <div className="yearChooser"><label htmlFor="indicatorYear">Choose Year:</label><select id="indicatorYear" value={selectedYear||indicator.year} disabled={showAll} onChange={event=>onYearChange(event.target.value)}>{yearOptions.map(year=><option key={year}>{year}</option>)}</select><label className="allYearsToggle"><span>Show All years</span><input type="checkbox" role="switch" checked={showAll} onChange={event=>setShowAll(event.target.checked)}/><i aria-hidden="true"/></label></div>
    {showAll&&<div className="studentYearLegend" aria-label="School year legend">{series.map((item,index)=><span key={item.year}><i style={{background:studentYearColors[index]}}/>{item.year}</span>)}</div>}
    {error?<div className="studentChartError" role="alert">{error}<button type="button" onClick={()=>setRetry(value=>value+1)}>Try again</button></div>:<div className="studentChartViewport"><div className={'studentChart '+(showAll?'clustered ':'')+(loading?'isLoading':'')} aria-busy={loading} style={showAll?{minWidth:Math.max(620,names.length*series.length*24)+'px'}:undefined}>
      {loading&&<div className="indicatorLoader" role="status" aria-live="polite"><i/><span>Loading data…</span></div>}
      <div className="yAxisLabel">{indicatorYAxisLabel(indicator)}</div>
      <div className="yAxisTicks" aria-hidden="true">{scale.ticks.map(tick=><span key={tick} style={{bottom:tick/scale.max*100+'%'}}>{scale.format(tick)}</span>)}</div>
      <div className="studentBars" style={{gridTemplateColumns:'repeat('+Math.max(1,names.length)+',minmax(0,1fr))'}}>
        {names.map(name=><div className="studentBarCol" key={name}><div className="studentBarCluster">{series.map((item,index)=>{
          const row=item.rows.find(value=>value.student_group===name&&hasGroupValue(value));
          if(!row)return showAll?<div className="studentBarMissing" key={item.year} title={name+' · '+item.year+': No data'}/>:null;
          const percent=Math.max(0,Math.min(100,Number(row.value_3_numeric)/scale.max*100));
          const label=String(row.value_3_display??row.value_3_numeric);
          return <div key={item.year} className={'studentBar '+(showAll&&percent<26?'shortBar':'')} style={{height:Math.max(1,percent)+'%',background:showAll?studentYearColors[index]:undefined}} tabIndex={0} role="img" aria-label={name+' · '+item.year+': '+label} title={name+' · '+item.year+': '+label}><b>{label}</b></div>;
        })}</div><span>{name}</span></div>)}
      </div>
      {!loading&&!names.length&&<div className="studentChartEmpty">No student-group data is available.</div>}
      {avg&&<div className="stateAvgLine" style={{bottom:Math.min(100,Math.max(0,Number(avg.statewide_value_3_numeric)/scale.max*100))+'%'}}><span>Statewide Average: {String(avg.statewide_value_3_display??avg.statewide_value_3_numeric)}</span></div>}
    </div></div>}
    <div className="xAxisLabel">Student Group</div>
    <p className="chartNote">{showAll?'Latest '+series.length+' available school years. Statewide average is shown in single-year mode.':'Student-group performance for the selected school year. Statewide average is shown as a reference line.'}</p>
  </section>;
}

function indicatorYAxisLabel(k:Indicator){
  const type=(k.type||'').trim().toLowerCase();
  if(type==='percent'||k.isPercent)return 'Percent of students proficient';
  if(type==='number'&&k.shortName.toLowerCase().includes('sat'))return 'SAT score';
  if(type==='currency'||k.shortName.toLowerCase().includes('fund balance'))return 'Fund balance';
  if(type==='number')return 'Indicator value';
  return k.type?String(k.type):'Indicator value';
}

function chartScale(indicator:Indicator,groups:any[]){
  const rows=groups.filter((r:any)=>r.category!=='Statewide Average'&&r.value_3_numeric!=null);
  const avg=groups.find((r:any)=>r.statewide_value_3_numeric!=null);
  const values=[...rows.map((r:any)=>Number(r.value_3_numeric)),Number(avg?.statewide_value_3_numeric)].filter(Number.isFinite) as number[];
  const dataMax=Math.max(0,...values);
  if(indicator.isPercent){
    const max=Math.min(100,Math.max(25,Math.ceil(dataMax/25)*25));
    const step=max<=50?10:25;
    const ticks=Array.from({length:Math.floor(max/step)+1},(_,i)=>i*step);
    if(ticks[ticks.length-1]!==max)ticks.push(max);
    return{max,ticks,format:(n:number)=>n.toFixed(0)+'%'};
  }
  const rough=Math.max(1,dataMax/4);
  const power=Math.pow(10,Math.floor(Math.log10(rough)));
  const normalized=rough/power;
  const nice=normalized<=1?1:normalized<=2?2:normalized<=5?5:10;
  const step=nice*power;
  const max=Math.max(step,Math.ceil(dataMax/step)*step);
  const ticks=Array.from({length:Math.round(max/step)+1},(_,i)=>i*step);
  const fund=indicator.shortName.toLowerCase().includes('fund balance')||indicator.name.toLowerCase().includes('fund balance');
  const format=(n:number)=>{
    if(!fund)return n.toLocaleString(undefined,{maximumFractionDigits:1});
    const currency=String.fromCharCode(36);
    if(Math.abs(n)>=1000000)return currency+(n/1000000).toFixed(n%1000000===0?0:1)+'M';
    if(Math.abs(n)>=1000)return currency+(n/1000).toFixed(0)+'K';
    return currency+n.toFixed(0);
  };
  return{max,ticks,format};
}
