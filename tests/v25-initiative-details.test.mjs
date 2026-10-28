import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/pages/admin/v25/initiativeDetails.ts', import.meta.url),'utf8');
const {outputText} = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {buildInitiativeRows} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const master = {'Goal ID':'G1','Initiative ID':'IN12','Initiative Name':'Improved instruction'};
const groups = [
  {id:'sub-a',name:' Staff training ',actions:[{id:'a-1',text:' Train teachers '},{id:'a-2',text:'Coach leaders'}]},
  {id:'sub-b',name:'Implementation',actions:[{id:'b-1',text:'Review classrooms'}]},
];
test('Multiple sub-initiatives retain their own action items and master relationship',()=>{
  const rows=buildInitiativeRows(master,groups);
  assert.equal(rows.length,3);
  assert.deepEqual(rows.map(row=>[row['Sub Initiative Name'],row['Action Item']]),[['Staff training','Train teachers'],['Staff training','Coach leaders'],['Implementation','Review classrooms']]);
  assert.ok(rows.every(row=>row['Goal ID']==='G1'&&row['Initiative ID']==='IN12'&&row.Status==='Not Started'));
  assert.equal(new Set(rows.map(row=>row.__previewKey)).size,3);
});
test('Adding a master without sub-initiatives does not create fake data rows',()=>{
  assert.deepEqual(buildInitiativeRows(master,[]),[]);
});
test('Blank names, empty action lists and blank action items are rejected',()=>{
  assert.throws(()=>buildInitiativeRows(master,[{...groups[0],name:' '}]),/name is required/);
  assert.throws(()=>buildInitiativeRows(master,[{...groups[0],actions:[]}]),/at least one action/);
  assert.throws(()=>buildInitiativeRows(master,[{...groups[0],actions:[{id:'x',text:' '}]}]),/Action item is required/);
});
test('Duplicate sub-initiatives and duplicate actions within one sub-initiative are rejected',()=>{
  assert.throws(()=>buildInitiativeRows(master,[groups[0],{...groups[1],name:'staff TRAINING'}]),/names must be distinct/);
  assert.throws(()=>buildInitiativeRows(master,[{...groups[0],actions:[{id:'1',text:'Train'},{id:'2',text:' train '}]}]),/Action items must be distinct/);
});
test('The same action text under different sub-initiatives remains distinct',()=>{
  const rows=buildInitiativeRows(master,groups.map(group=>({...group,actions:[{id:group.id+'-x',text:'Review'}]})));
  assert.equal(rows.length,2);assert.notEqual(rows[0].__previewKey,rows[1].__previewKey);
});
