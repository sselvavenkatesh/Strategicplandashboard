import {supabase} from './supabase';

export type AiChart={type:'line'|'bar';title:string;xKey:string;yKey:string;yLabel?:string;suffix?:string;data:Array<Record<string,string|number>>};
export type AiAnswer={answer:string;sources:string[];outOfScope?:boolean;chart?:AiChart};

export async function isAiEnabled(){
  const{data,error}=await supabase.rpc('is_feature_enabled',{p_version:'V2.3',p_feature:'AI Assistant'});
  if(error){console.error(error);return false}
  return data===true;
}

export async function askDistrictAi(question:string,sessionId:string):Promise<AiAnswer>{
  const{data,error}=await supabase.functions.invoke('district-ai',{body:{question,sessionId}});
  if(error)throw new Error(error.message||'AI service is unavailable.');
  return data as AiAnswer;
}
