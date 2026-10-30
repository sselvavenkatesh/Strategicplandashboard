import {apiGet} from './api'
export type DistrictProfile={districtId:string;districtName:string;planName:string;duration:string;subText:string;totalGoals:number;mission:string;vision:string;logo:string|null;planImage:string|null}
export type Goal={id:string;name:string;description:string;totalIndicators:number;totalInitiatives:number}
export type Indicator={id:string;name:string;shortName:string;description:string;value:string;numeric:number|null;previous:number|null;variance:number|null;year:string;nature:'Positive'|'Negative';isPercent:boolean;type:string}
export type SubInitiative={name:string;done:number;inProgress:number;notStarted:number;start?:string;end?:string;totalActionItems:number;completion:number}
export type Initiative={id:string;name:string;shortName:string;description:string;done:number;inProgress:number;notStarted:number;completion:number;start?:string;end?:string;totalActionItems:number;subInitiatives:SubInitiative[]}
type Bootstrap = {profile: DistrictProfile; goals: Goal[]};
let pendingBootstrap: Promise<Bootstrap> | null = null;
function getBootstrap(): Promise<Bootstrap> {
 if (!pendingBootstrap) pendingBootstrap = apiGet<Bootstrap>('/api/v1/bootstrap').catch(error => {pendingBootstrap = null; throw error}).finally(() => {window.setTimeout(() => {pendingBootstrap = null}, 15000)});
 return pendingBootstrap;
}
export async function getProfile():Promise<DistrictProfile>{return (await getBootstrap()).profile}
export async function getGoals():Promise<Goal[]>{return (await getBootstrap()).goals}
export async function getIndicators(goalId:string):Promise<Indicator[]>{return apiGet(`/api/v1/goals/${encodeURIComponent(goalId)}/indicators`)}
export async function getIndicatorHistory(indicatorId:string){return apiGet<Record<string,unknown>[]>(`/api/v1/indicators/${encodeURIComponent(indicatorId)}/history`)}
export async function getStudentGroups(indicatorId:string,schoolYear:string){return apiGet<Record<string,unknown>[]>(`/api/v1/indicators/${encodeURIComponent(indicatorId)}/student-groups?school_year=${encodeURIComponent(schoolYear)}`)}
export async function getInitiatives(goalId:string):Promise<Initiative[]>{return apiGet(`/api/v1/goals/${encodeURIComponent(goalId)}/initiatives-full`)}
export type GoalInitiativeProgress={goal_id:string;total_action_items:number;done_count:number;done_percent:number};
export async function getGoalInitiativeProgress(goalId:string):Promise<GoalInitiativeProgress>{
 const rows=await apiGet<GoalInitiativeProgress[]>(`/api/v1/goals/${encodeURIComponent(goalId)}/initiative-progress`);
 return rows.find(row=>row.goal_id===goalId)??{goal_id:goalId,total_action_items:0,done_count:0,done_percent:0};
}
