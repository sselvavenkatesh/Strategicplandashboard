import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const model = asUrl(compile(readFileSync(new URL('../src/pages/admin/v25/model.ts', import.meta.url), 'utf8').replace("import {supabase} from '../../../lib/supabase';", 'const supabase = null;').replace("import {apiGet, fastApiV25Enabled} from '../../../lib/api';", 'const fastApiV25Enabled = false; const apiGet = null;')));
const csvCode = compile(readFileSync(new URL('../src/pages/admin/v25/csv.ts', import.meta.url), 'utf8')).replaceAll("'./model'", JSON.stringify(model));
const {parseCsv, csvColumns, validateCsv, prepareUpload} = await import(asUrl(csvCode));
const goals = [{'Goal ID':'G1', 'Goal Name':'Excellence'}, {'Goal ID':'G2', 'Goal Name':'Equity'}];
const masters = [{'Indicator ID':'ID1', 'Indicator Name':'Renamed ELA', 'Goal ID':'G1'}];
const initiativeMasters = [{'Initiative ID':'IN1','Initiative Name':'Teaching','Goal ID':'G1'}];
const indicator = {'Goal ID':'G1','Goal Name':'Excellence','Indicator ID':'ID1','Indicator Name':'ELA','School Year':'2025-26',Category:'All','Student Group':'All Students','Value 3':'39.53%','Target 1':'40%'};
const initiative = {'Goal ID':'G1','Goal Name':'Excellence','Initiative ID':'IN1','Initiative Name':'Teaching','Sub Initiative Name':'Training','Action Item':'Train staff','Start Date':'Sep-2026',Status:'In Progress'};
const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
const csv = (kind, rows) => csvColumns[kind].join(',')+'\r\n'+rows.map(row => csvColumns[kind].map(key => quote(row[key])).join(',')).join('\r\n');
test('CSV parser retains commas, escaped quotes and multiline action items', () => {
  assert.deepEqual(parseCsv('\uFEFFa,b\r\n"One, two","He said ""yes""\nNext line"\r\n'), [['a','b'], ['One, two','He said "yes"\nNext line']]);
});
test('Malformed quoted CSV is rejected', () => {
  assert.throws(() => parseCsv('a,b\n"broken,value'), /unclosed/);
  assert.throws(() => parseCsv('a,b\n"text"junk,x'), /Unexpected text/);
});
test('Indicator upload preserves units and adopts current master name', () => {
  const [row] = validateCsv(csv('indicators',[indicator]), 'indicators', masters, goals);
  assert.equal(row['Indicator Name'],'Renamed ELA'); assert.equal(row['Value 3'],'39.53%'); assert.equal(row['Target 1'],'40%'); assert.equal(row.Role,'All');
});
test('Unknown/unassigned items, mismatched goals and blank keys are rejected', () => {
  assert.throws(() => validateCsv(csv('indicators',[indicator]),'indicators',[],goals), /unknown or unassigned/);
  assert.throws(() => validateCsv(csv('indicators',[{...indicator,'Goal ID':'G2'}]),'indicators',masters,goals), /goal does not match/);
  assert.throws(() => validateCsv(csv('indicators',[{...indicator,'School Year':''}]),'indicators',masters,goals), /School Year is required/);
});
test('Templates must retain the existing column order and duplicate upload keys are rejected', () => {
  assert.throws(() => validateCsv('Indicator ID\nID1','indicators',masters,goals), /columns do not match/);
  assert.throws(() => validateCsv(csv('indicators',[indicator,indicator]),'indicators',masters,goals), /duplicate reporting key/);
});
test('Existing reporting rows are updated after a rename, while new school years are added', () => {
  const existing = [{...indicator,__previewKey:'original-row'}];
  const validated = validateCsv(csv('indicators',[{...indicator,'Value 3':'45%'},{...indicator,'School Year':'2026-27'}]),'indicators',masters,goals);
  const result = prepareUpload('indicators',validated,existing);
  assert.equal(result.updated,1); assert.equal(result.added,1); assert.equal(result.rows[0].__previewKey,'original-row'); assert.equal(result.rows[0]['Value 3'],'45%');
});
test('Initiative upload matches an action item and preserves dates, status and currency targets', () => {
  const validated = validateCsv(csv('initiatives',[{...initiative,'End Date':'Jun-2027','Target 1':'$1,200.50'}]),'initiatives',initiativeMasters,goals);
  const result = prepareUpload('initiatives',validated,[{...initiative,__previewKey:'action-row'}]);
  assert.equal(result.updated,1); assert.equal(result.rows[0]['End Date'],'Jun-2027'); assert.equal(result.rows[0]['Target 1'],'$1,200.50');
});
test('Ambiguous existing reporting rows are not silently overwritten', () => {
  assert.throws(() => prepareUpload('indicators',[indicator],[{...indicator,__previewKey:'a'},{...indicator,__previewKey:'b'}]), /matches multiple records/);
});
