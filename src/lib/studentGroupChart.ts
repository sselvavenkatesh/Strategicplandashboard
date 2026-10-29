export const studentYearColors=['#69b7ff','#43d3a0','#f1cd48','#c1a0ff','#ffa96b'];
export function latestChartYears(years:string[]){
  return [...new Set(years.filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).slice(-5);
}
export type StudentGroupRow={student_group?:string;category?:string;value_3_numeric?:unknown;value_3_display?:unknown;statewide_value_3_numeric?:unknown;statewide_value_3_display?:unknown};
export const hasGroupValue=(row:StudentGroupRow)=>row.category!=='Statewide Average'&&Boolean(row.student_group)&&row.value_3_numeric!=null&&Number.isFinite(Number(row.value_3_numeric));
