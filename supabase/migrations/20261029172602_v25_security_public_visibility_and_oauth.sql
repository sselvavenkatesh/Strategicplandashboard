-- Preserve public reporting contracts; enforce privacy before window/aggregate calculations.
set local lock_timeout='2s';
set local statement_timeout='30s';

alter policy public_read_indicators on public."Indicator_master" using ("Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"="Indicator_master"."Goal ID" and g."Role"='All'));
alter policy public_read_initiatives on public."Initiative_master" using ("Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"="Initiative_master"."Goal ID" and g."Role"='All'));
alter policy public_read_indicator_data on public."Indicator_Data" using ("Role"='All' and exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"="Indicator_Data"."Indicator ID" and m."Goal ID"="Indicator_Data"."Goal ID" and m."Role"='All' and g."Role"='All'));
alter policy public_read_initiative_data on public."Initiative_Data" using ("Role"='All' and exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"="Initiative_Data"."Initiative ID" and m."Goal ID"="Initiative_Data"."Goal ID" and m."Role"='All' and g."Role"='All'));
alter policy "Public read of demonstration targets" on public."Indicator_Target_Preview" using (exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=indicator_id and m."Role"='All' and g."Role"='All') and exists(select 1 from public."Indicator_Data" d where d."Indicator ID"=indicator_id and d."School Year"=school_year and d."Role"='All' and d."Category"='All' and d."Student Group"='All Students' and d."School" is null));

-- Keep every existing view column, type, order and window calculation.
create or replace view public.vw_indicator_reporting_normalized with (security_invoker=true,security_barrier=true) as
 SELECT "Goal ID" AS goal_id,
    "Goal Name" AS goal_name,
    "Indicator ID" AS indicator_id,
    "Indicator Name" AS indicator_name,
    "School Year" AS school_year,
        CASE
            WHEN "School Year" ~ '^[0-9]{4}'::text THEN SUBSTRING("School Year" FROM 1 FOR 4)::integer
            ELSE NULL::integer
        END AS school_year_start,
    "Category" AS category,
    "Student Group" AS student_group,
    "Value 3" AS value_3_display,
        CASE
            WHEN NULLIF(regexp_replace(COALESCE("Value 3", ''::text), '[^0-9.-]'::text, ''::text, 'g'::text), ''::text) IS NOT NULL THEN NULLIF(regexp_replace("Value 3", '[^0-9.-]'::text, ''::text, 'g'::text), ''::text)::numeric
            ELSE NULL::numeric
        END AS value_3_numeric,
    "Target 1" AS target_1,
    "Target 2" AS target_2,
    "Target 3" AS target_3,
    "School" AS school,
    "Role" AS role,
    lag(
        CASE
            WHEN NULLIF(regexp_replace(COALESCE("Value 3", ''::text), '[^0-9.-]'::text, ''::text, 'g'::text), ''::text) IS NOT NULL THEN NULLIF(regexp_replace("Value 3", '[^0-9.-]'::text, ''::text, 'g'::text), ''::text)::numeric
            ELSE NULL::numeric
        END) OVER (PARTITION BY "Goal ID", "Indicator ID", "Category", "Student Group", "School" ORDER BY (
        CASE
            WHEN "School Year" ~ '^[0-9]{4}'::text THEN SUBSTRING("School Year" FROM 1 FOR 4)::integer
            ELSE NULL::integer
        END), "School Year") AS previous_year_value_3_numeric,
        CASE
            WHEN NULLIF(regexp_replace(COALESCE("Value 3", ''::text), '[^0-9.-]'::text, ''::text, 'g'::text), ''::text) IS NOT NULL THEN NULLIF(regexp_replace("Value 3", '[^0-9.-]'::text, ''::text, 'g'::text), ''::text)::numeric
            ELSE NULL::numeric
        END - lag(
        CASE
            WHEN NULLIF(regexp_replace(COALESCE("Value 3", ''::text), '[^0-9.-]'::text, ''::text, 'g'::text), ''::text) IS NOT NULL THEN NULLIF(regexp_replace("Value 3", '[^0-9.-]'::text, ''::text, 'g'::text), ''::text)::numeric
            ELSE NULL::numeric
        END) OVER (PARTITION BY "Goal ID", "Indicator ID", "Category", "Student Group", "School" ORDER BY (
        CASE
            WHEN "School Year" ~ '^[0-9]{4}'::text THEN SUBSTRING("School Year" FROM 1 FOR 4)::integer
            ELSE NULL::integer
        END), "School Year") AS ly_variance_numeric
   FROM "Indicator_Data" d
 where d."Role"='All' and exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=d."Indicator ID" and m."Goal ID"=d."Goal ID" and m."Role"='All' and g."Role"='All');

CREATE OR REPLACE FUNCTION public.fn_goal_initiative_progress(p_goal_id text DEFAULT NULL::text, p_school text DEFAULT NULL::text)
 RETURNS TABLE(goal_id text, total_action_items bigint, done_count bigint, in_progress_count bigint, not_yet_started_count bigint, done_percent numeric, in_progress_percent numeric, not_yet_started_percent numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    d."Goal ID",
    count(*)::bigint,
    count(*) filter (where d."Status" = 'Done')::bigint,
    count(*) filter (where d."Status" = 'In Progress')::bigint,
    count(*) filter (where d."Status" = 'Not Yet Started')::bigint,
    round(100.0 * count(*) filter (where d."Status" = 'Done') / nullif(count(*),0), 1),
    round(100.0 * count(*) filter (where d."Status" = 'In Progress') / nullif(count(*),0), 1),
    round(100.0 * count(*) filter (where d."Status" = 'Not Yet Started') / nullif(count(*),0), 1)
  from public."Initiative_Data" d
  where (p_goal_id is null or d."Goal ID" = p_goal_id)
    and (p_school is null or d."School" = p_school)
    and d."Role"='All' and exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID" and m."Role"='All' and g."Role"='All')
  group by d."Goal ID"
  order by d."Goal ID";
$function$
;

CREATE OR REPLACE FUNCTION public.fn_initiative_progress(p_goal_id text, p_school text DEFAULT NULL::text)
 RETURNS TABLE(goal_id text, initiative_id text, initiative_name text, start_date text, end_date text, total_action_items bigint, done_count bigint, completion_percent numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    d."Goal ID",
    d."Initiative ID",
    d."Initiative Name",
    min(d."Start Date") as start_date,
    max(d."End Date") as end_date,
    count(*)::bigint,
    count(*) filter (where d."Status" = 'Done')::bigint,
    round(100.0 * count(*) filter (where d."Status" = 'Done') / nullif(count(*),0), 1)
  from public."Initiative_Data" d
  where d."Goal ID" = p_goal_id
    and (p_school is null or d."School" = p_school)
    and d."Role"='All' and exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID" and m."Role"='All' and g."Role"='All')
  group by d."Goal ID", d."Initiative ID", d."Initiative Name"
  order by d."Initiative ID";
$function$
;

CREATE OR REPLACE FUNCTION public.fn_subinitiative_progress(p_goal_id text, p_initiative_id text, p_school text DEFAULT NULL::text)
 RETURNS TABLE(goal_id text, initiative_id text, sub_initiative_name text, total_action_items bigint, done_count bigint, in_progress_count bigint, not_yet_started_count bigint, done_percent numeric, in_progress_percent numeric, not_yet_started_percent numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    d."Goal ID",
    d."Initiative ID",
    d."Sub Initiative Name",
    count(*)::bigint,
    count(*) filter (where d."Status" = 'Done')::bigint,
    count(*) filter (where d."Status" = 'In Progress')::bigint,
    count(*) filter (where d."Status" = 'Not Yet Started')::bigint,
    round(100.0 * count(*) filter (where d."Status" = 'Done') / nullif(count(*),0), 1),
    round(100.0 * count(*) filter (where d."Status" = 'In Progress') / nullif(count(*),0), 1),
    round(100.0 * count(*) filter (where d."Status" = 'Not Yet Started') / nullif(count(*),0), 1)
  from public."Initiative_Data" d
  where d."Goal ID" = p_goal_id
    and d."Initiative ID" = p_initiative_id
    and (p_school is null or d."School" = p_school)
    and d."Role"='All' and exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID" and m."Role"='All' and g."Role"='All')
  group by d."Goal ID", d."Initiative ID", d."Sub Initiative Name"
  order by d."Sub Initiative Name";
$function$
;

-- Only FastAPI may mint/consume state. No legacy frontend calls these RPCs.
revoke all on function public.create_admin_oauth_state(text,text),public.consume_admin_oauth_state(uuid,text) from public,anon,authenticated;
grant execute on function public.create_admin_oauth_state(text,text),public.consume_admin_oauth_state(uuid,text) to strategicuser_readonly;

create or replace function public.validate_admin_session(p_token uuid)
returns table(user_id text,user_name text,user_email text,user_role text)
language sql security definer set search_path='' as $$
 select coalesce(u."User ID"::text,u.id::text),u."Name"::text,u."Email"::text,u."Role"::text
 from public.admin_sessions s join public.admin_users u on u.id::text=s.user_id or (s.user_id !~ '^[0-9]+$' and u."User ID"::text=s.user_id)
 where s.token=p_token and s.expires_at>now() and u."Is Active" and u."Role"='Admin' limit 1
$$;
