import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const {outputText} = ts.transpileModule(readFileSync(new URL('../src/pages/admin/v25/goalConfiguration.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {increaseGoalCount,validateGoalNames,goalDependencies} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const goals = [{'Goal ID':'G1','Goal Name':'Excellence'},{'Goal ID':'G3','Goal Name':'Equity'}];
test('Increasing the count preserves existing IDs and appends editable unassigned goals',()=>{
  const result=increaseGoalCount(goals,4);
  assert.deepEqual(result.goals.slice(0,2),goals);assert.deepEqual(result.goals.map(row=>row['Goal ID']),['G1','G3','G4','G5']);assert.equal(result.goals[2]['Goal Name'],'');assert.equal(result.nextGoalNumber,6);assert.equal(goals.length,2);
});
test('Reducing the count is blocked rather than silently removing goals',()=>{
  assert.throws(()=>increaseGoalCount(goals,1),/delete the goal/);assert.equal(goals.length,2);
});
test('Counts outside the existing whole-number 1–20 range are rejected',()=>{
  for(const count of [0,21,2.5,NaN])assert.throws(()=>increaseGoalCount(goals,count),/whole number/);
});
test('A stored sequence avoids reusing a newly deleted ID',()=>{
  assert.equal(increaseGoalCount(goals,3,8).goals[2]['Goal ID'],'G8');
});
test('Configuration saving requires nonblank, distinct goal names',()=>{
  assert.doesNotThrow(()=>validateGoalNames(goals));assert.throws(()=>validateGoalNames([...goals,{'Goal ID':'G4','Goal Name':' '}]),/required/);assert.throws(()=>validateGoalNames([...goals,{'Goal ID':'G4','Goal Name':' EXCELLENCE '}]),/distinct/);
});
test('Deletion checks both master dependencies and orphan reporting records',()=>{
  const deps=goalDependencies('G1',[{'Indicator ID':'ID1','Goal ID':'G1'}],[{'Initiative ID':'IN1','Goal ID':'G1'}],[{'Indicator ID':'ID1','Goal ID':'G1'},{'Indicator ID':'orphan','Goal ID':'G1'}],[]);
  assert.deepEqual(deps,{indicators:1,initiatives:1,data:2,total:4});
  assert.equal(goalDependencies('G9',[],[],[],[]).total,0);
});
test('Dependency checks follow preview master reassignment',()=>{
  const master=[{'Indicator ID':'ID1','Goal ID':'G3'}];const data=[{'Indicator ID':'ID1','Goal ID':'G1'}];
  assert.equal(goalDependencies('G1',master,[],data,[]).total,0);assert.equal(goalDependencies('G3',master,[],data,[]).total,2);
});
