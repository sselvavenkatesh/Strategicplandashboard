// API transport only. All identity, permissions, DB access and AI stay in FastAPI.
export default async function strategicApi(request,context){
 const input=new URL(request.url),prefix='/strategic-plan/demo';
 const path=input.pathname.startsWith(prefix+'/api/v1/')?input.pathname.slice(prefix.length):input.pathname;
 const key=Netlify.env.get('STRATEGIC_PROXY_KEY');
 if(!key)return Response.json({detail:'Application API proxy is not configured.'},{status:503});
 const target=new URL(path+input.search,'https://k12matrix-strategicplan.vercel.app');
 const headers=new Headers(request.headers);
 for(const name of ['host','forwarded','x-forwarded-host','x-forwarded-proto','x-forwarded-for','x-strategic-proxy-token','x-strategic-public-origin','x-strategic-client-ip','authorization'])headers.delete(name);
 const allowedCookies=(request.headers.get('cookie')||'').split(';').filter(part=>/^(strategic_(?:admin|superadmin)_session|__Host-strategic_oauth_(?:google|microsoft))=/.test(part.trim())).join(';');
 if(allowedCookies)headers.set('cookie',allowedCookies);else headers.delete('cookie');
 headers.set('x-strategic-proxy-token',key);
 headers.set('x-strategic-public-origin',input.origin);
 headers.set('x-strategic-client-ip',context.ip);
 try{
  const upstream=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual',signal:request.signal});
  const output=new Headers(upstream.headers);
  output.set('Cache-Control','no-store');output.set('X-Content-Type-Options','nosniff');output.set('Referrer-Policy','no-referrer');
  // Preserve individual Set-Cookie headers; never buffer streamed AI output.
  return new Response(upstream.body,{status:upstream.status,headers:output});
 }catch{return Response.json({detail:'The application API is temporarily unavailable.'},{status:502,headers:{'Cache-Control':'no-store'}})}
}
export const config={path:['/strategic-plan/demo/api/v1/*','/api/v1/*']};
