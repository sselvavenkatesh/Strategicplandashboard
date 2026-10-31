import {apiGet} from './api';
export type AchievementIndicator = {
  id:string; name:string; year:string|null; actual:string|null; target:string|null;
  nature:string|null; achieved:boolean|null; reason:string|null;
};
export type AchievementScore = {
  total:number; eligible:number; achieved:number; excluded:number; percent:number|null;
};
export type GoalAchievement = AchievementScore & {goalId:string; indicators:AchievementIndicator[]};
export type AchievementSummary = {preview:boolean; overall:AchievementScore; goals:GoalAchievement[]};

// Retain the approved demo target dataset for this release.
export const previewTargets = import.meta.env.VITE_ACHIEVEMENT_PREVIEW === 'true';
export async function getAchievementSummary():Promise<AchievementSummary>{return apiGet(`/api/v1/achievement?preview=${previewTargets}`)}
export async function getIndicatorTarget(indicatorId:string|undefined,year:string):Promise<string|null>{
 if(!indicatorId||!year)return null;
 return (await apiGet<{target:string|null}>(`/api/v1/indicators/${encodeURIComponent(indicatorId)}/target?school_year=${encodeURIComponent(year)}&preview=${previewTargets}`)).target;
}

export function numericTarget(target:string|null):number|null {
  const cleaned=(target??'').replace(/[,$%\s]/g,'');
  if(!/^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$/.test(cleaned))return null;
  const value=Number(cleaned);
  return Number.isFinite(value)?value:null;
}
