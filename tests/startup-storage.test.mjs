import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const require=createRequire(import.meta.url);
function themeModule(effects){
 const source=ts.transpileModule(readFileSync('src/app/ThemeProvider.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const exports={};
 new Function('require','exports',source)(name=>name==='react'?{...React,useEffect:effect=>effects.push(effect)}:require(name),exports);
 return exports;
}

test('blocked browser storage preserves the dashboard theme and children',()=>{
 const storage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const document=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new DOMException('Blocked','SecurityError');}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{documentElement:{dataset:{}}}});
 try{
  const effects=[];
  const {ThemeProvider,useTheme}=themeModule(effects);
  function Content(){return React.createElement('span',null,'Dashboard '+useTheme().theme);}
  assert.match(renderToStaticMarkup(React.createElement(ThemeProvider,null,React.createElement(Content))),/Dashboard dark/);
  for(const effect of effects)assert.doesNotThrow(()=>effect());
  assert.equal(globalThis.document.documentElement.dataset.theme,'dark');
 }finally{
  if(storage)Object.defineProperty(globalThis,'localStorage',storage);else delete globalThis.localStorage;
  if(document)Object.defineProperty(globalThis,'document',document);else delete globalThis.document;
 }
});
