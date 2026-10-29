-- Preserve demo overlays and use real uploaded targets for additional indicators.
CREATE OR REPLACE FUNCTION public.fn_indicator_achievement_summary(p_preview boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with goals as (
  select "Goal ID" as id from public."Goal_master" where "Role"='All'
), raw as (
  select m."Goal ID" as goal_id, m."Indicator ID" as indicator_id,
    coalesce(m."Indicator_short_name",m."Indicator Name",m."Indicator ID") as name,
    m."KPI Nature" as nature, d.school_year, d.value_3_display as actual,
    case when p_preview then coalesce(t.target_1,d.target_1) else d.target_1 end as target
  from public."Indicator_master" m join goals g on g.id=m."Goal ID"
  left join lateral (
    select n.* from public.vw_indicator_reporting_normalized n
    where n.indicator_id=m."Indicator ID" and n.goal_id=m."Goal ID"
      and n.category='All' and n.student_group='All Students'
      and n.school is null and n.role='All'
    order by n.school_year_start desc nulls last,n.school_year desc limit 1
  ) d on true
  left join public."Indicator_Target_Preview" t
    on p_preview and t.indicator_id=m."Indicator ID" and t.school_year=d.school_year
  where m."Role"='All'
), cleaned as (
  select *, regexp_replace(coalesce(actual,''),'[,$%[:space:]]','','g') as a,
    regexp_replace(coalesce(target,''),'[,$%[:space:]]','','g') as t from raw
), parsed as (
  select *, case when a ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' then a::numeric end as actual_number,
    case when t ~ '^[+-]?([0-9]+([.][0-9]*)?|[.][0-9]+)$' then t::numeric end as target_number
  from cleaned
), evaluated as (
  select *, case
    when actual_number is null or target_number is null or nature not in ('Positive','Negative') or nature is null then null
    when nature='Negative' then actual_number <= target_number
    else actual_number >= target_number end as achieved
  from parsed
), grouped as (
  select g.id as goal_id, count(e.indicator_id) as total,
    count(e.achieved) as eligible,
    count(*) filter (where e.achieved) as achieved,
    coalesce(jsonb_agg(jsonb_build_object(
      'id',e.indicator_id,'name',e.name,'year',e.school_year,'actual',e.actual,
      'target',e.target,'nature',e.nature,'achieved',e.achieved,
      'reason',case when e.actual_number is null then 'Actual unavailable'
        when e.target_number is null then 'Target unavailable'
        when e.achieved is null then 'KPI direction unavailable' else null end
    ) order by e.indicator_id) filter (where e.indicator_id is not null),'[]'::jsonb) as indicators
  from goals g left join evaluated e on e.goal_id=g.id group by g.id
), totals as (
  select coalesce(sum(total),0) as total, coalesce(sum(eligible),0) as eligible,
    coalesce(sum(achieved),0) as achieved from grouped
)
select jsonb_build_object('preview',p_preview,
  'overall',jsonb_build_object('total',total,'eligible',eligible,'achieved',achieved,
    'excluded',total-eligible,'percent',round(100.0*achieved/nullif(eligible,0),1)),
  'goals',coalesce((select jsonb_agg(jsonb_build_object(
    'goalId',goal_id,'total',total,'eligible',eligible,'achieved',achieved,
    'excluded',total-eligible,'percent',round(100.0*achieved/nullif(eligible,0),1),
    'indicators',indicators) order by goal_id) from grouped),'[]'::jsonb))
from totals;
$function$;
