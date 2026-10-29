import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';

// Exercise the actual form handlers with isolated hook state and a fake API.
const source=readFileSync(new URL('../src/pages/admin/v25/SsoSettings.tsx',import.meta.url),'utf8');
let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
code=code.replace(/import .* from ["']react["'];/, 'const {useEffect,useState}=globalThis.ssoHarness;')
 .replace(/import .* from ["'].*\/lib\/api["'];/, 'const {apiGet,apiPost}=globalThis.ssoHarness;')
 .replace('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')));

async function setup({method='Google',saved=false,failConfiguration=false}={}){
 const states=[],effects=[],calls=[];let cursor=0,first=true;
 const status={googleConfigured:false,microsoftConfigured:false,googleSecretSaved:saved,microsoftSecretSaved:false,googleCallback:'https://preview/callback',microsoftCallback:'https://preview/microsoft'};
 globalThis.ssoHarness={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=value}]},useEffect(fn){if(first)effects.push(fn)},apiGet:async()=>({...status}),apiPost:async(path,payload)=>{calls.push(['secret',payload]);if(payload.googleSecret)status.googleSecretSaved=true;if(payload.microsoftSecret)status.microsoftSecretSaved=true;return {...status}}};
 const {SsoSettings}=await import(`data:text/javascript;base64,${Buffer.from(code+'\n//'+Math.random()).toString('base64')}`);
 const props={method,googleClientId:'client-id',microsoftClientId:'ms-client-id',tenantId:'tenant-id',onSavingChange:saving=>calls.push(['busy',saving]),saveConfiguration:async()=>{calls.push(['configuration']);if(failConfiguration)throw new Error('Reload required.')}};
 const render=()=>{cursor=0;const result=SsoSettings(props);first=false;return result};
 let tree=render();for(const effect of effects)effect();await new Promise(setImmediate);tree=render();
 const descendants=node=>!node||typeof node!=='object'?[]:[node,...[node.props?.children].flat(Infinity).flatMap(descendants)];
 return {calls,render,inputs:()=>descendants(tree).filter(x=>x.type==='input'&&x.props.type==='password'),async submit(){tree=render();tree.props.onSubmit({preventDefault(){}});await new Promise(setImmediate);tree=render();return descendants(tree)}};
}

test('The district Save button submits the SSO form rather than bypassing it',()=>{
 const page=readFileSync(new URL('../src/pages/admin/v25/V25AdminPage.tsx',import.meta.url),'utf8');
 assert.match(page,/form=\{live\?'v25-sso-configuration':undefined\}/);
 assert.match(page,/onClick=\{live\?undefined:saveConfiguration\}/);
 assert.doesNotMatch(source,/Save SSO Settings/);
});
test('One submit stores the entered Google secret before saving the configuration',async()=>{
 const h=await setup();h.inputs()[0].props.onChange({target:{value:' sample-google-secret '}});await h.submit();
 assert.deepEqual(h.calls.filter(x=>x[0]!=='busy'),[['secret',{googleSecret:'sample-google-secret',microsoftSecret:null}],['configuration']]);
});
test('An already saved secret can be retained without re-entering it',async()=>{
 const h=await setup({saved:true});await h.submit();assert.equal(h.calls.filter(x=>x[0]==='configuration').length,1);
 assert.equal(h.calls.find(x=>x[0]==='secret')[1].googleSecret,null);
});
test('Missing credentials stop the save before any writes',async()=>{
 const h=await setup();await h.submit();assert.equal(h.calls.filter(x=>x[0]!=='busy').length,0);
});
test('Microsoft uses the same ordered save flow',async()=>{
 const h=await setup({method:'Microsoft'});h.inputs()[1].props.onChange({target:{value:'sample-ms-secret'}});await h.submit();
 assert.deepEqual(h.calls.filter(x=>x[0]!=='busy'),[['secret',{googleSecret:null,microsoftSecret:'sample-ms-secret'}],['configuration']]);
});
test('A failed configuration save retains the saved-secret status for retry',async()=>{
 const h=await setup({failConfiguration:true});h.inputs()[0].props.onChange({target:{value:'sample-secret'}});await h.submit();await h.submit();
 assert.equal(h.calls.filter(x=>x[0]==='configuration').length,2);
 assert.equal(h.calls.filter(x=>x[0]==='secret')[1][1].googleSecret,null);
});
