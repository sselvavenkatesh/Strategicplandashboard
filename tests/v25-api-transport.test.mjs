import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import handler,{config} from '../netlify/edge-functions/strategic-api.js';

function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`])}
test('Active React source has no Supabase SDK, REST, RPC or Edge Function transport',()=>{
 for(const file of files('src').filter(x=>/\.(ts|tsx)$/.test(x)))assert.doesNotMatch(readFileSync(file,'utf8'),/from\s+[\'\"][^\'\"]*supabase|supabase\.(?:from|auth|rpc|functions)|\.functions\.invoke\(/i,file);
 assert.equal(JSON.parse(readFileSync('package.json','utf8')).dependencies['@supabase/supabase-js'],undefined);
});
test('Edge routes are restricted to API traffic',()=>assert.deepEqual(config.path,['/strategic-plan/demo/api/v1/*','/api/v1/*']));
test('Proxy fails closed when its server-only key is unavailable',async()=>{
 globalThis.Netlify={env:{get:()=>undefined}};
 const r=await handler(new Request('https://k12matrix.com/strategic-plan/demo/api/v1/bootstrap'),{ip:'192.0.2.1'});
 assert.equal(r.status,503);
});
test('Proxy overwrites forged headers, forwards only application cookies and streams without buffering',async()=>{
 globalThis.Netlify={env:{get:()=> 'unit-proxy-key'}};
 const previous=globalThis.fetch;
 let captured;
 globalThis.fetch=async(url,init)=>{captured={url,init};return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(' \n'));controller.close()}}),{headers:{'Content-Type':'application/json','Set-Cookie':'strategic_admin_session=unit; Secure; HttpOnly; Path=/'}})};
 try{
  const r=await handler(new Request('https://k12matrix.com/strategic-plan/demo/api/v1/ai/ask-stream?x=1',{method:'POST',headers:{'x-strategic-proxy-token':'forged','x-strategic-public-origin':'https://evil.example','x-strategic-client-ip':'forged','Authorization':'forged','Cookie':'marketing_secret=private; strategic_admin_session=unit'},body:'{}'}),{ip:'192.0.2.1'});
  assert.equal(captured.url.href,'https://k12matrix-strategicplan.vercel.app/api/v1/ai/ask-stream?x=1');
  assert.equal(captured.init.headers.get('x-strategic-public-origin'),'https://k12matrix.com');
  assert.equal(captured.init.headers.get('x-strategic-client-ip'),'192.0.2.1');
  assert.equal(captured.init.headers.get('x-strategic-proxy-token'),'unit-proxy-key');
  assert.equal(captured.init.headers.get('Authorization'),null);
  assert.equal(captured.init.headers.get('Cookie'),'strategic_admin_session=unit');
  assert.equal(await r.text(),' \n');assert.equal(r.headers.get('Cache-Control'),'no-store');
  assert.ok(r.headers.get('Set-Cookie').includes('HttpOnly'));
 }finally{globalThis.fetch=previous}
});
