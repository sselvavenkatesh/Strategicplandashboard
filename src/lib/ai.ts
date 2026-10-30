import {apiGet,apiPost} from './api';
import {formatIndicatorReferences,type IndicatorLabel} from './aiAnswerText';
export type AiAnswer={answer:string;sources:string[];outOfScope?:boolean};
let indicatorLabels:Promise<IndicatorLabel[]>|null=null;
function getIndicatorLabels(){
 if(!indicatorLabels)indicatorLabels=apiGet<IndicatorLabel[]>('/api/v1/indicator-labels').catch(()=>{indicatorLabels=null;return []});
 return indicatorLabels;
}
export async function isAiEnabled(){try{return (await apiGet<{enabled:boolean}>('/api/v1/features/V2.3/AI%20Assistant')).enabled}catch{return false}}
export async function askDistrictAi(question:string,sessionId:string):Promise<AiAnswer>{
 const [result,labels]=await Promise.all([apiPost<AiAnswer>('/api/v1/ai/ask-stream',{question,sessionId}),getIndicatorLabels()]);
 return {...result,answer:formatIndicatorReferences(result.answer,labels)};
}
