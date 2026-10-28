import {supabase} from './supabase';
import {apiGet, apiPost, fastApiEnabled, fastApiV25Enabled} from './api';
import {formatIndicatorReferences,type IndicatorLabel} from './aiAnswerText';

export type AiAnswer={answer:string;sources:string[];outOfScope?:boolean};

let indicatorLabels:Promise<IndicatorLabel[]>|null=null;
function getIndicatorLabels(){
  if(!indicatorLabels)indicatorLabels=(async()=>{
    if(fastApiV25Enabled)return apiGet<IndicatorLabel[]>('/api/v1/indicator-labels');
    const {data,error}=await supabase.from('Indicator_master').select('"Indicator ID","Indicator_short_name","Indicator Name"').eq('Role','All');
    if(error)throw error;
    return (data??[]).map(row=>({id:String(row['Indicator ID']),name:String(row.Indicator_short_name||row['Indicator Name']||'indicator')}));
  })().catch(()=>{indicatorLabels=null;return []});
  return indicatorLabels;
}

export async function isAiEnabled(){
  if(fastApiEnabled){try{return (await apiGet<{enabled:boolean}>('/api/v1/features/V2.3/AI%20Assistant')).enabled}catch{return false}}
  const{data,error}=await supabase.rpc('is_feature_enabled',{p_version:'V2.3',p_feature:'AI Assistant'});
  if(error){console.error(error);return false}
  return data===true;
}

export async function askDistrictAi(question:string,sessionId:string):Promise<AiAnswer>{
  // Load labels alongside the AI request; this does not add a request per turn.
  const labels=getIndicatorLabels();
  if(fastApiV25Enabled){const result=await apiPost<AiAnswer>('/api/v1/ai/ask',{question,sessionId});return {...result,answer:formatIndicatorReferences(result.answer,await labels)}}
  const functionName=import.meta.env.VITE_ACHIEVEMENT_PREVIEW==='true'?'district-ai-preview':'district-ai';
  const{data,error}=await supabase.functions.invoke(functionName,{body:{question,sessionId}});
  if(error)throw new Error(error.message||'AI service is unavailable.');
  const result=data as AiAnswer;
  return {...result,answer:formatIndicatorReferences(result.answer,await labels)};
}
