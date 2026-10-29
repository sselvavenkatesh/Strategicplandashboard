import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source = readFileSync(new URL('../src/pages/admin/v25/model.ts', import.meta.url), 'utf8').replace("import {supabase} from '../../../lib/supabase';", 'const supabase = null;').replace("import {apiGet, fastApiEnabled, fastApiV25Enabled} from '../../../lib/api';", 'const fastApiV25Enabled = false; const fastApiEnabled = false; const apiGet = null;');
const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}});
const {accessibleRows, emptyAssignments,resourceStakeholders} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const rows = [
  {'Indicator ID':'ID1','Initiative ID':'IN1','Goal ID':'G1'},
  {'Indicator ID':'ID2','Initiative ID':'IN2','Goal ID':'G1'},
  {'Indicator ID':'ID5','Initiative ID':'IN4','Goal ID':'G2'},
];
const ids = result => result.map(row => row['Indicator ID']);
test('Unassigned Goals grant no resource access', () => assert.deepEqual(accessibleRows(rows,'indicators','6',emptyAssignments()),[]));
test('Both Goal stakeholders inherit each indicator and initiative by default',()=>{
  const a=emptyAssignments();a.goals.G1=['6','7'];
  for(const kind of ['indicators','initiatives'])for(const user of ['6','7'])assert.deepEqual(ids(accessibleRows(rows,kind,user,a)),['ID1','ID2']);
  assert.deepEqual(resourceStakeholders(rows[0],'indicators',a),['6','7']);
});
test('A restriction applies only to its row, without restricting other inherited items',()=>{
  const a=emptyAssignments();a.goals.G1=['6','7'];a.indicators.ID1=['6'];
  assert.deepEqual(ids(accessibleRows(rows,'indicators','7',a)),['ID2']);
  assert.deepEqual(ids(accessibleRows(rows,'indicators','6',a)),['ID1','ID2']);
  assert.deepEqual(ids(accessibleRows(rows,'initiatives','7',a)),['ID1','ID2']);
});
test('Clearing restriction restores Goal inheritance',()=>{
  const a=emptyAssignments();a.goals.G1=['6','7'];a.indicators.ID1=[];
  assert.deepEqual(resourceStakeholders(rows[0],'indicators',a),['6','7']);
});
test('Explicit selection outside the parent Goal never grants access',()=>{
  const a=emptyAssignments();a.goals.G1=['6'];a.indicators.ID1=['8'];
  assert.deepEqual(ids(accessibleRows(rows,'indicators','8',a)),[]);
});
test('Inherited values follow later Goal changes without copying child assignments',()=>{
  const a=emptyAssignments();a.goals.G1=['6'];
  assert.deepEqual(resourceStakeholders(rows[0],'indicators',a),['6']);
  a.goals.G1=['7'];assert.deepEqual(resourceStakeholders(rows[0],'indicators',a),['7']);
});
