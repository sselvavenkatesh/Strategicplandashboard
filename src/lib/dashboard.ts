import {apiGet} from './api'

export type DistrictProfile={districtId:string;districtName:string;planName:string;duration:string;subText:string;totalGoals:number;mission:string;vision:string;logo:string|null;planImage:string|null}
export type Goal={id:string;name:string;description:string;totalIndicators:number;totalInitiatives:number}
export type Indicator={id:string;name:string;shortName:string;description:string;value:string;numeric:number|null;previous:number|null;variance:number|null;year:string;nature:'Positive'|'Negative';isPercent:boolean;type:string}
export type SubInitiative={name:string;done:number;inProgress:number;notStarted:number;start?:string;end?:string;totalActionItems:number;completion:number}
export type Initiative={id:string;name:string;shortName:string;description:string;done:number;inProgress:number;notStarted:number;completion:number;start?:string;end?:string;totalActionItems:number;subInitiatives:SubInitiative[]}

export async function getProfile():Promise<DistrictProfile>{
  return apiGet<DistrictProfile>('/api/v1/profile')
}

export async function getGoals():Promise<Goal[]>{
  return apiGet<Goal[]>('/api/v1/goals')
}

export async function getIndicators(goalId:string):Promise<Indicator[]>{
  return apiGet<Indicator[]>(`/api/v1/goals/${encodeURIComponent(goalId)}/indicators`)
}

export async function getIndicatorHistory(indicatorId:string){
  return apiGet<any[]>(`/api/v1/indicators/${encodeURIComponent(indicatorId)}/history`)
}

export async function getStudentGroups(indicatorId:string,schoolYear:string){
  return apiGet<any[]>(`/api/v1/indicators/${encodeURIComponent(indicatorId)}/student-groups?school_year=${encodeURIComponent(schoolYear)}`)
}

export async function getInitiatives(goalId:string):Promise<Initiative[]>{
  return apiGet<Initiative[]>(`/api/v1/goals/${encodeURIComponent(goalId)}/initiatives-full`)
}
