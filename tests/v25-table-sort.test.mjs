import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=readFileSync(new URL('../src/pages/admin/v25/tableSort.ts',import.meta.url),'utf8');
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {compareDataValues:compare}=await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
test('Numeric actuals and targets sort by value, including currency and percentages',()=>{
 assert.ok(compare('9','100','Value 1','asc')<0);assert.ok(compare('10%','2%','Target 1','desc')<0);assert.ok(compare('$1,200','200','Target 2','asc')>0);
});
test('Blank data stays last for both directions',()=>{for(const direction of ['asc','desc']){assert.ok(compare(null,'8','Value 1',direction)>0);assert.equal(compare('',null,'Goal Name',direction),0)}});
test('Names use natural order and dates chronological order',()=>{
 assert.ok(compare('Goal 2','Goal 10','Goal Name','asc')<0);
 assert.ok(compare('12/31/2025','01/01/2026','Start Date','asc')<0);
 assert.ok(compare('2026-01-02','2025-12-31','End Date','desc')<0);
});
