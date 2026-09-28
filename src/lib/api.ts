const API_BASE = 'https://strategicplan-apiv1.vercel.app'

async function apiRequest<T>(path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(API_BASE+path,{...init,headers:{Accept:'application/json',...(init?.body?{'Content-Type':'application/json'}:{}),...(init?.headers||{})}})
  if(!response.ok){let message=`StrategicPlan API request failed (${response.status})`;try{const x=await response.json();if(x?.detail)message=String(x.detail)}catch{}throw new Error(message)}
  if(response.status===204)return undefined as T
  return response.json() as Promise<T>
}
export function apiGet<T>(path:string){return apiRequest<T>(path)}
export function apiPost<T>(path:string,body?:unknown){return apiRequest<T>(path,{method:'POST',body:body===undefined?undefined:JSON.stringify(body)})}
export function apiPut<T>(path:string,body:unknown){return apiRequest<T>(path,{method:'PUT',body:JSON.stringify(body)})}
export function apiDelete<T>(path:string){return apiRequest<T>(path,{method:'DELETE'})}
export function apiUrl(path:string){return API_BASE+path}
