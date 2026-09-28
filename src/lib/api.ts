const API_BASE = (import.meta.env.VITE_STRATEGICPLAN_API_URL || 'https://strategicplan-apiv1.vercel.app').replace(/\/$/, '')

export async function apiGet<T>(path:string):Promise<T>{
  const response=await fetch(API_BASE+path,{headers:{Accept:'application/json'}})
  if(!response.ok)throw new Error(`StrategicPlan API request failed (${response.status})`)
  return response.json() as Promise<T>
}

export async function apiPost<T>(path:string,body:unknown):Promise<T>{
  const response=await fetch(API_BASE+path,{
    method:'POST',
    headers:{'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(body),
  })
  if(!response.ok)throw new Error(`StrategicPlan API request failed (${response.status})`)
  return response.json() as Promise<T>
}
