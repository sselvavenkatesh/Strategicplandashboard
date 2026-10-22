import {supabase} from './supabase';
import {formatIndicatorReferences,type IndicatorLabel} from './aiAnswerText';

export type AiAnswer={answer:string;sources:string[];outOfScope?:boolean};

let indicatorLabels:Promise<IndicatorLabel[]>|null=null;
function getIndicatorLabels(){
  if(!indicatorLabels)indicatorLabels=(async()=>{
    const {data,error}=await supabase.from('Indicator_master').select('"Indicator ID","Indicator_short_name","Indicator Name"').eq('Role','All');
    if(error)throw error;
    return (data??[]).map(row=>({id:String(row['Indicator ID']),name:String(row.Indicator_short_name||row['Indicator Name']||'indicator')}));
  })().catch(()=>{indicatorLabels=null;return []});
  return indicatorLabels;
}

export async function isAiEnabled(){
  const{data,error}=await supabase.rpc('is_feature_enabled',{p_version:'V2.3',p_feature:'AI Assistant'});
  if(error){console.error(error);return false}
  return data===true;
}

export async function askDistrictAi(question:string,sessionId:string):Promise<AiAnswer>{
  // Load labels alongside the AI request; this does not add a request per turn.
  const labels=getIndicatorLabels();
  const functionName=import.meta.env.VITE_ACHIEVEMENT_PREVIEW==='true'?'district-ai-preview':'district-ai';
  const{data,error}=await supabase.functions.invoke(functionName,{body:{question,sessionId}});
  if(error)throw new Error(error.message||'AI service is unavailable.');
  const result=data as AiAnswer;
  return {...result,answer:formatIndicatorReferences(result.answer,await labels)};
}
