import {supabase} from './supabase';

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
  const {data,error} = await supabase.rpc('fn_indicator_achievement_summary',{p_preview:previewTargets});
  if(error)throw error;
  if(!data || !Array.isArray(data.goals) || !data.overall)throw new Error('Achievement data unavailable');
  return data as AchievementSummary;
}
