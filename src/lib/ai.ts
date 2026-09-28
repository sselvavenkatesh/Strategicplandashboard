import {apiGet,apiPost} from './api';

export type AiAnswer={answer:string;sources:string[];outOfScope?:boolean};

export async function isAiEnabled(){
  try{
    const data=await apiGet<{enabled:boolean}>('/api/v1/features/V2.3/AI%20Assistant');
    return data.enabled===true;
  }catch(error){
    console.error(error);
    return false;
  }
}

export async function askDistrictAi(question:string,sessionId:string):Promise<AiAnswer>{
  return apiPost<AiAnswer>('/api/v1/ai/ask',{question,sessionId});
}
