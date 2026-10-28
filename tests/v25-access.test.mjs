import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
// Load the pure access rules without initializing a network client.
const source = readFileSync(new URL('../src/pages/admin/v25/model.ts', import.meta.url), 'utf8').replace("import {supabase} from '../../../lib/supabase';", 'const supabase = null;').replace("import {apiGet, fastApiV25Enabled} from '../../../lib/api';", 'const fastApiV25Enabled = false; const apiGet = null;');
const {outputText} = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}});
const {accessibleRows, emptyAssignments} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const rows = [
  {'Indicator ID':'ID1','Initiative ID':'IN1','Goal ID':'G1'},
  {'Indicator ID':'ID2','Initiative ID':'IN2','Goal ID':'G1'},
  {'Indicator ID':'ID5','Initiative ID':'IN4','Goal ID':'G2'},
];
const ids = result => result.map(row => row['Indicator ID']);
test('None grants no data to an Admin with no assigned goals', () => {
  assert.deepEqual(accessibleRows(rows, 'indicators', '6', emptyAssignments()), []);
});
test('An assigned goal grants all its indicators when there is no explicit selection', () => {
  const assignments = emptyAssignments(); assignments.goals.G1 = ['6','7'];
  assert.deepEqual(ids(accessibleRows(rows, 'indicators', '6', assignments)), ['ID1','ID2']);
});
test('Explicit indicator selection restricts that Admin across their assigned goals', () => {
  const assignments = emptyAssignments(); assignments.goals.G1 = ['6']; assignments.goals.G2 = ['6']; assignments.indicators.ID1 = ['6'];
  assert.deepEqual(ids(accessibleRows(rows, 'indicators', '6', assignments)), ['ID1']);
});
test('Explicit assignments for one Admin do not restrict another Admin', () => {
  const assignments = emptyAssignments(); assignments.goals.G1 = ['6','7']; assignments.indicators.ID1 = ['6'];
  assert.deepEqual(ids(accessibleRows(rows, 'indicators', '7', assignments)), ['ID1','ID2']);
});
test('Clearing the last explicit assignment restores inherited goal access', () => {
  const assignments = emptyAssignments(); assignments.goals.G1 = ['6']; assignments.indicators.ID1 = [];
  assert.deepEqual(ids(accessibleRows(rows, 'indicators', '6', assignments)), ['ID1','ID2']);
});
test('Indicator restrictions do not restrict initiatives; explicit initiatives do', () => {
  const assignments = emptyAssignments(); assignments.goals.G1 = ['6']; assignments.indicators.ID1 = ['6'];
  assert.equal(accessibleRows(rows, 'initiatives', '6', assignments).length, 2);
  assignments.initiatives.IN2 = ['6'];
  assert.deepEqual(ids(accessibleRows(rows, 'initiatives', '6', assignments)), ['ID2']);
});
test('A direct resource assignment grants only that resource without granting a goal', () => {
  const assignments = emptyAssignments(); assignments.indicators.ID5 = ['8'];
  assert.deepEqual(ids(accessibleRows(rows, 'indicators', '8', assignments)), ['ID5']);
});
