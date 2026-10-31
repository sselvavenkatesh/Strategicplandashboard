import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const transpile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const dataUrl=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const helperUrl=dataUrl(transpile(readFileSync(new URL('../src/lib/studentGroupChart.ts',import.meta.url),'utf8')));
const {latestChartYears,hasGroupValue}=await import(helperUrl);
test('Latest five available years are chronological, unique and do not invent missing years',()=>{
 assert.deepEqual(latestChartYears(['2025-26','2021-22','2023-24','2020-21','2024-25','2022-23','2025-26']),['2021-22','2022-23','2023-24','2024-25','2025-26']);
 assert.deepEqual(latestChartYears(['2025-26','2023-24']),['2023-24','2025-26']);
});
test('Zero is a valid observation; missing and statewide rows are not student-group bars',()=>{
 assert.equal(hasGroupValue({student_group:'All Students',value_3_numeric:0}),true);
 for(const row of [{student_group:'All Students',value_3_numeric:null},{student_group:'All Students',value_3_numeric:'bad'},{student_group:'All Students',category:'Statewide Average',value_3_numeric:40}])assert.equal(hasGroupValue(row),false);
});

async function chartHarness(){
 const values=[],dependencies=[],cleanups=[],calls=[];let cursor=0;let effects=[];
 const props={indicator:{id:'ID1',year:'2025-26',shortName:'ELA',name:'ELA',type:'Percent',isPercent:true},history:['2020-21','2021-22','2022-23','2023-24','2024-25','2025-26'].map(school_year=>({school_year})),selectedYear:'2025-26',onYearChange:year=>{props.selectedYear=year}};
 const rows=year=>[{student_group:'All Students',value_3_numeric:40,value_3_display:'40%',statewide_value_3_numeric:39},...(year==='2024-25'?[]:[{student_group:'English Learners',value_3_numeric:20,value_3_display:'20%'}])];
 globalThis.chartHarness={
  useState(initial){const i=cursor++;if(!(i in values))values[i]=initial;return [values[i],value=>{values[i]=typeof value==='function'?value(values[i]):value}]},
  useRef(initial){const i=cursor++;if(!(i in values))values[i]={current:initial};return values[i]},
  useMemo(fn){return fn()},
  useEffect(fn,deps){const i=cursor++;if(!dependencies[i]||deps.some((value,j)=>value!==dependencies[i][j])){dependencies[i]=deps;effects.push(()=>{cleanups[i]?.();cleanups[i]=fn()})}},
  getStudentGroups:async(id,year)=>{calls.push(year);return rows(year)},
 };
 let code=transpile(readFileSync(new URL('../src/components/StudentGroupChart.tsx',import.meta.url),'utf8'));
 code=code.replace(/import .* from ['"]react['"];/,'const {useEffect,useMemo,useRef,useState}=globalThis.chartHarness;')
  .replace(/import .* from ['"]\.\.\/lib\/dashboard['"];/,'const {getStudentGroups}=globalThis.chartHarness;')
  .replace(/(['"])\.\.\/lib\/studentGroupChart\1/,JSON.stringify(helperUrl))
  .replace('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')));
 const {StudentGroupChart}=await import(dataUrl(code+'\n//'+Math.random()));
 const walk=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(walk)];
 let tree;
 function render(){cursor=0;effects=[];tree=StudentGroupChart(props);for(const effect of effects)effect()}
 async function flush(){render();await new Promise(setImmediate);render();return walk(tree)}
 await flush();
 return {calls,props,flush,nodes:()=>walk(tree),async toggle(checked){walk(tree).find(x=>x.props?.role==='switch').props.onChange({target:{checked}});return flush()}};
}
test('All-years mode disables the year selector, fetches only five years, and uses a year legend',async()=>{
 const h=await chartHarness();assert.deepEqual(h.calls,['2025-26']);
 const nodes=await h.toggle(true);assert.equal(nodes.find(x=>x.type==='select').props.disabled,true);
 assert.deepEqual([...h.calls].sort(),['2021-22','2022-23','2023-24','2024-25','2025-26']);
 const legend=nodes.find(x=>x.props?.className==='studentYearLegend');assert.equal(legend.props.children.length,5);
 const bars=nodes.filter(x=>x.props?.role==='img');assert.equal(bars.length,9); // One missing observation stays empty.
 assert.equal(new Set(bars.map(x=>x.props.style.background)).size,5);
 const off=await h.toggle(false);assert.equal(off.find(x=>x.type==='select').props.disabled,false);assert.equal(h.props.selectedYear,'2025-26');assert.equal(h.calls.length,5);
 await h.toggle(true);assert.equal(h.calls.length,5); // Cached years are reused.
});
test('Returning to a cached single year changes the selection without another API request',async()=>{
 const h=await chartHarness();await h.toggle(true);await h.toggle(false);h.props.onYearChange('2023-24');const nodes=await h.flush();
 assert.equal(nodes.find(x=>x.type==='select').props.value,'2023-24');assert.equal(h.calls.length,5);
 assert.equal(nodes.filter(x=>x.props?.role==='img').length,2);
});
