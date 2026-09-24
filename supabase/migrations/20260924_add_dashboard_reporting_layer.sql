-- District 360 reporting layer: Initiative + Indicator calculations.
-- Applied to Supabase as migration: add_dashboard_reporting_layer
--
-- Scope semantics:
-- * Initiative p_school IS NULL = All Schools / all applicable Initiative_Data rows.
-- * Indicator p_school IS NULL = district KPI rows where School IS NULL.
-- * Statewide Average is a reference row and is not rendered as a Student Group bar.
-- * Value 3 is preserved as display text and normalized to numeric for charts.
-- * Functions and the view use SECURITY INVOKER behavior and do not bypass RLS.

create or replace view public.vw_indicator_reporting_normalized
with (security_invoker = true) as
select
  d."Goal ID" as goal_id,
  d."Goal Name" as goal_name,
  d."Indicator ID" as indicator_id,
  d."Indicator Name" as indicator_name,
  d."School Year" as school_year,
  case
    when d."School Year" ~ '^[0-9]{4}'
      then substring(d."School Year" from 1 for 4)::integer
    else null
  end as school_year_start,
  d."Category" as category,
  d."Student Group" as student_group,
  d."Value 3" as value_3_display,
  case
    when nullif(
      regexp_replace(coalesce(d."Value 3", ''), '[^0-9.-]', '', 'g'),
      ''
    ) is not null
      then nullif(
        regexp_replace(d."Value 3", '[^0-9.-]', '', 'g'),
        ''
      )::numeric
    else null
  end as value_3_numeric,
  d."Target 1" as target_1,
  d."Target 2" as target_2,
  d."Target 3" as target_3,
  d."School" as school,
  d."Role" as role
from public."Indicator_Data" d;


create or replace function public.fn_goal_initiative_progress(
  p_goal_id text default null,
  p_school text default null
)
returns table (
  goal_id text,
  total_action_items bigint,
  done_count bigint,
  in_progress_count bigint,
  not_yet_started_count bigint,
  done_percent numeric,
  in_progress_percent numeric,
  not_yet_started_percent numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    d."Goal ID",
    count(*)::bigint,
    count(*) filter (where d."Status" = 'Done')::bigint,
    count(*) filter (where d."Status" = 'In Progress')::bigint,
    count(*) filter (where d."Status" = 'Not Yet Started')::bigint,
    round(
      100.0 * count(*) filter (where d."Status" = 'Done')
      / nullif(count(*), 0),
      1
    ),
    round(
      100.0 * count(*) filter (where d."Status" = 'In Progress')
      / nullif(count(*), 0),
      1
    ),
    round(
      100.0 * count(*) filter (where d."Status" = 'Not Yet Started')
      / nullif(count(*), 0),
      1
    )
  from public."Initiative_Data" d
  where (p_goal_id is null or d."Goal ID" = p_goal_id)
    and (p_school is null or d."School" = p_school)
  group by d."Goal ID"
  order by d."Goal ID";
$$;


create or replace function public.fn_initiative_progress(
  p_goal_id text,
  p_school text default null
)
returns table (
  goal_id text,
  initiative_id text,
  initiative_name text,
  start_date text,
  end_date text,
  total_action_items bigint,
  done_count bigint,
  completion_percent numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    d."Goal ID",
    d."Initiative ID",
    d."Initiative Name",
    min(d."Start Date") as start_date,
    max(d."End Date") as end_date,
    count(*)::bigint,
    count(*) filter (where d."Status" = 'Done')::bigint,
    round(
      100.0 * count(*) filter (where d."Status" = 'Done')
      / nullif(count(*), 0),
      1
    )
  from public."Initiative_Data" d
  where d."Goal ID" = p_goal_id
    and (p_school is null or d."School" = p_school)
  group by d."Goal ID", d."Initiative ID", d."Initiative Name"
  order by d."Initiative ID";
$$;


create or replace function public.fn_subinitiative_progress(
  p_goal_id text,
  p_initiative_id text,
  p_school text default null
)
returns table (
  goal_id text,
  initiative_id text,
  sub_initiative_name text,
  total_action_items bigint,
  done_count bigint,
  in_progress_count bigint,
  not_yet_started_count bigint,
  done_percent numeric,
  in_progress_percent numeric,
  not_yet_started_percent numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    d."Goal ID",
    d."Initiative ID",
    d."Sub Initiative Name",
    count(*)::bigint,
    count(*) filter (where d."Status" = 'Done')::bigint,
    count(*) filter (where d."Status" = 'In Progress')::bigint,
    count(*) filter (where d."Status" = 'Not Yet Started')::bigint,
    round(
      100.0 * count(*) filter (where d."Status" = 'Done')
      / nullif(count(*), 0),
      1
    ),
    round(
      100.0 * count(*) filter (where d."Status" = 'In Progress')
      / nullif(count(*), 0),
      1
    ),
    round(
      100.0 * count(*) filter (where d."Status" = 'Not Yet Started')
      / nullif(count(*), 0),
      1
    )
  from public."Initiative_Data" d
  where d."Goal ID" = p_goal_id
    and d."Initiative ID" = p_initiative_id
    and (p_school is null or d."School" = p_school)
  group by d."Goal ID", d."Initiative ID", d."Sub Initiative Name"
  order by d."Sub Initiative Name";
$$;


create or replace function public.fn_indicator_key_values(
  p_goal_id text,
  p_school text default null
)
returns table (
  goal_id text,
  indicator_id text,
  indicator_name text,
  school_year text,
  school_year_start integer,
  value_3_display text,
  value_3_numeric numeric,
  school text,
  role text
)
language sql
stable
security invoker
set search_path = public
as $$
  with eligible as (
    select n.*
    from public.vw_indicator_reporting_normalized n
    where n.goal_id = p_goal_id
      and n.category = 'All'
      and n.student_group = 'All Students'
      and (
        (p_school is null and n.school is null)
        or
        (p_school is not null and n.school = p_school)
      )
  ),
  ranked as (
    select
      e.*,
      row_number() over (
        partition by e.goal_id, e.indicator_id
        order by e.school_year_start desc nulls last, e.school_year desc
      ) as rn
    from eligible e
  )
  select
    r.goal_id,
    r.indicator_id,
    r.indicator_name,
    r.school_year,
    r.school_year_start,
    r.value_3_display,
    r.value_3_numeric,
    r.school,
    r.role
  from ranked r
  where r.rn = 1
  order by r.indicator_id;
$$;


create or replace function public.fn_indicator_year_history(
  p_indicator_id text,
  p_school text default null
)
returns table (
  goal_id text,
  indicator_id text,
  indicator_name text,
  school_year text,
  school_year_start integer,
  value_3_display text,
  value_3_numeric numeric,
  statewide_value_3_display text,
  statewide_value_3_numeric numeric,
  school text,
  role text
)
language sql
stable
security invoker
set search_path = public
as $$
  with district_values as (
    select n.*
    from public.vw_indicator_reporting_normalized n
    where n.indicator_id = p_indicator_id
      and n.category = 'All'
      and n.student_group = 'All Students'
      and (
        (p_school is null and n.school is null)
        or
        (p_school is not null and n.school = p_school)
      )
  ),
  statewide as (
    select
      n.indicator_id,
      n.school_year,
      n.value_3_display,
      n.value_3_numeric
    from public.vw_indicator_reporting_normalized n
    where n.indicator_id = p_indicator_id
      and n.category = 'Statewide Average'
      and n.student_group = 'All Students'
      and n.school is null
  )
  select
    d.goal_id,
    d.indicator_id,
    d.indicator_name,
    d.school_year,
    d.school_year_start,
    d.value_3_display,
    d.value_3_numeric,
    s.value_3_display,
    s.value_3_numeric,
    d.school,
    d.role
  from district_values d
  left join statewide s
    on s.indicator_id = d.indicator_id
   and s.school_year = d.school_year
  order by d.school_year_start, d.school_year;
$$;


create or replace function public.fn_indicator_student_groups(
  p_indicator_id text,
  p_school_year text,
  p_school text default null
)
returns table (
  goal_id text,
  indicator_id text,
  indicator_name text,
  school_year text,
  category text,
  student_group text,
  value_3_display text,
  value_3_numeric numeric,
  statewide_value_3_display text,
  statewide_value_3_numeric numeric,
  school text,
  role text
)
language sql
stable
security invoker
set search_path = public
as $$
  with bars as (
    select n.*
    from public.vw_indicator_reporting_normalized n
    where n.indicator_id = p_indicator_id
      and n.school_year = p_school_year
      and n.category <> 'Statewide Average'
      and (
        (p_school is null and n.school is null)
        or
        (p_school is not null and n.school = p_school)
      )
  ),
  statewide as (
    select
      n.value_3_display,
      n.value_3_numeric
    from public.vw_indicator_reporting_normalized n
    where n.indicator_id = p_indicator_id
      and n.school_year = p_school_year
      and n.category = 'Statewide Average'
      and n.student_group = 'All Students'
      and n.school is null
    order by n.school_year_start desc nulls last
    limit 1
  )
  select
    b.goal_id,
    b.indicator_id,
    b.indicator_name,
    b.school_year,
    b.category,
    b.student_group,
    b.value_3_display,
    b.value_3_numeric,
    s.value_3_display,
    s.value_3_numeric,
    b.school,
    b.role
  from bars b
  left join statewide s on true
  order by
    case
      when b.category = 'All'
       and b.student_group = 'All Students'
        then 0
      else 1
    end,
    b.category,
    b.student_group;
$$;


comment on view public.vw_indicator_reporting_normalized is
'Normalized Indicator_Data reporting layer. Preserves Value 3 display text and exposes numeric Value 3 for charts/benchmark logic.';

comment on function public.fn_goal_initiative_progress(text, text) is
'Goal-level Initiative action-item status counts and percentages. Optional school filter; NULL means all Initiative_Data rows.';

comment on function public.fn_initiative_progress(text, text) is
'Initiative-level completion based on Done action items / total action items for a Goal. Optional school filter.';

comment on function public.fn_subinitiative_progress(text, text, text) is
'Sub-Initiative status distribution based on action-item status. Optional school filter.';

comment on function public.fn_indicator_key_values(text, text) is
'Latest Value 3 for each KPI in a Goal where Category=All and Student Group=All Students. NULL school uses district rows where School IS NULL.';

comment on function public.fn_indicator_year_history(text, text) is
'Indicator Value 3 history for Category=All and All Students, with same-year Statewide Average. NULL school uses district rows.';

comment on function public.fn_indicator_student_groups(text, text, text) is
'Student-group Value 3 rows for an Indicator/year, excluding Statewide Average from bars and returning Statewide Average as the chart reference-line value.';
