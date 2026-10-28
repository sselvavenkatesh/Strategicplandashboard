import {supabase} from './supabase';
import {apiGet, fastApiReportingEnabled} from './api';

export type AchievementIndicator = {
  id:string; name:string; year:string|null; actual:string|null; target:string|null;
  nature:string|null; achieved:boolean|null; reason:string|null;
};
export type AchievementScore = {
  total:number; eligible:number; achieved:number; excluded:number; percent:number|null;
};
export type GoalAchievement = AchievementScore & {goalId:string; indicators:AchievementIndicator[]};
export type AchievementSummary = {preview:boolean; overall:AchievementScore; goals:GoalAchievement[]};

// Enabled only by the preview build context. Normal builds use production targets.
export const previewTargets = import.meta.env.VITE_ACHIEVEMENT_PREVIEW === 'true';
export async function getAchievementSummary():Promise<AchievementSummary> {
  if(fastApiReportingEnabled)return apiGet<AchievementSummary>(`/api/v1/achievement?preview=${previewTargets}`);
  const {data,error} = await supabase.rpc('fn_indicator_achievement_summary',{p_preview:previewTargets});
  if(error)throw error;
  if(!data || !Array.isArray(data.goals) || !data.overall)throw new Error('Achievement data unavailable');
  return data as AchievementSummary;
}

// Read the target for the selected popup year, without borrowing a newer target.
export async function getIndicatorTarget(indicatorId:string|undefined,year:string):Promise<string|null> {
  if(!indicatorId||!year)return null;
  if(fastApiReportingEnabled){const result=await apiGet<{target:string|null}>(`/api/v1/indicators/${encodeURIComponent(indicatorId)}/target?school_year=${encodeURIComponent(year)}&preview=${previewTargets}`);return result.target}
  const request=previewTargets
    ? supabase.from('Indicator_Target_Preview').select('target_1').eq('indicator_id',indicatorId).eq('school_year',year)
    : supabase.from('vw_indicator_reporting_normalized').select('target_1').eq('indicator_id',indicatorId).eq('school_year',year).eq('category','All').eq('student_group','All Students').eq('role','All').is('school',null);
  const {data,error}=await request.maybeSingle();
  if(error)throw error;
  return data?.target_1??null;
}

export function numericTarget(target:string|null):number|null {
  const cleaned=(target??'').replace(/[,$%\s]/g,'');
  if(!/^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(cleaned))return null;
  const value=Number(cleaned);
  return Number.isFinite(value)?value:null;
}
