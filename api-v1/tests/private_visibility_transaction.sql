begin;
savepoint before_private;
update public."Goal_master" set "Role"='Admin';
do $test$ declare n bigint; begin execute $sql$select count(*) from (select m.* from public."Indicator_master" m where m."Goal ID"='G1' and m."Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by m."Indicator ID" ) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 1 leaked rows'; end if;
execute $sql$select count(*) from (select m.* from public."Initiative_master" m where m."Goal ID"='G1' and m."Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by m."Initiative ID" ) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 2 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_indicator_key_values('G1',null) f where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=f.indicator_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 3 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_indicator_year_history('ID1',null) f where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=f.indicator_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 4 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_indicator_student_groups('ID1','2025-26',null) f where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=f.indicator_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 5 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_initiative_progress('G1',null) f where exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"=f.initiative_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 6 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_subinitiative_progress('G1','IN1',null) f where exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"='IN1' and m."Goal ID"='G1' and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 7 leaked rows'; end if;
execute $sql$select count(*) from (
      select d."Goal ID" as goal_id, count(*) as total_action_items,
        count(*) filter (where d."Status"='Done') as done_count,
        count(*) filter (where d."Status"='In Progress') as in_progress_count,
        count(*) filter (where d."Status"='Not Yet Started') as not_yet_started_count,
        round(100.0*count(*) filter (where d."Status"='Done')/count(*),1) as done_percent,
        round(100.0*count(*) filter (where d."Status"='In Progress')/count(*),1) as in_progress_percent,
        round(100.0*count(*) filter (where d."Status"='Not Yet Started')/count(*),1) as not_yet_started_percent
      from public."Initiative_Data" d
      join public."Initiative_master" m on m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID"
      where d."Role"='All' and m."Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All')
        and ('G1'::text is null or d."Goal ID"='G1')
        and (null::text is null or d."School"=null)
      group by d."Goal ID" order by d."Goal ID"
    ) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 8 leaked rows'; end if;
execute $sql$select count(*) from (select coalesce(
        (select target_1 from public."Indicator_Target_Preview" where true and indicator_id='ID1' and school_year='2025-26'),
        (select target_1 from public.vw_indicator_reporting_normalized where indicator_id='ID1' and school_year='2025-26' and category='All' and student_group='All Students' and role='All' and school is null)
    ) as target_1 where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"='ID1' and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 9 leaked rows'; end if;
execute $sql$select count(*) from (select "Indicator ID" as id, coalesce(nullif("Indicator_short_name",''),"Indicator Name",'indicator') as name from public."Indicator_master" m where "Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by "Indicator ID") privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 10 leaked rows'; end if; end $test$;
rollback to savepoint before_private;
update public."Indicator_master" set "Role"='Admin';
update public."Initiative_master" set "Role"='Admin';
do $test$ declare n bigint; begin execute $sql$select count(*) from (select m.* from public."Indicator_master" m where m."Goal ID"='G1' and m."Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by m."Indicator ID" ) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 1 leaked rows'; end if;
execute $sql$select count(*) from (select m.* from public."Initiative_master" m where m."Goal ID"='G1' and m."Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by m."Initiative ID" ) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 2 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_indicator_key_values('G1',null) f where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=f.indicator_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 3 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_indicator_year_history('ID1',null) f where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=f.indicator_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 4 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_indicator_student_groups('ID1','2025-26',null) f where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=f.indicator_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 5 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_initiative_progress('G1',null) f where exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"=f.initiative_id and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 6 leaked rows'; end if;
execute $sql$select count(*) from (select f.* from public.fn_subinitiative_progress('G1','IN1',null) f where exists(select 1 from public."Initiative_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"='IN1' and m."Goal ID"='G1' and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 7 leaked rows'; end if;
execute $sql$select count(*) from (
      select d."Goal ID" as goal_id, count(*) as total_action_items,
        count(*) filter (where d."Status"='Done') as done_count,
        count(*) filter (where d."Status"='In Progress') as in_progress_count,
        count(*) filter (where d."Status"='Not Yet Started') as not_yet_started_count,
        round(100.0*count(*) filter (where d."Status"='Done')/count(*),1) as done_percent,
        round(100.0*count(*) filter (where d."Status"='In Progress')/count(*),1) as in_progress_percent,
        round(100.0*count(*) filter (where d."Status"='Not Yet Started')/count(*),1) as not_yet_started_percent
      from public."Initiative_Data" d
      join public."Initiative_master" m on m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID"
      where d."Role"='All' and m."Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All')
        and ('G1'::text is null or d."Goal ID"='G1')
        and (null::text is null or d."School"=null)
      group by d."Goal ID" order by d."Goal ID"
    ) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 8 leaked rows'; end if;
execute $sql$select count(*) from (select coalesce(
        (select target_1 from public."Indicator_Target_Preview" where true and indicator_id='ID1' and school_year='2025-26'),
        (select target_1 from public.vw_indicator_reporting_normalized where indicator_id='ID1' and school_year='2025-26' and category='All' and student_group='All Students' and role='All' and school is null)
    ) as target_1 where exists(select 1 from public."Indicator_master" m join public."Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"='ID1' and m."Role"='All' and g."Role"='All')) privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 9 leaked rows'; end if;
execute $sql$select count(*) from (select "Indicator ID" as id, coalesce(nullif("Indicator_short_name",''),"Indicator Name",'indicator') as name from public."Indicator_master" m where "Role"='All' and exists(select 1 from public."Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by "Indicator ID") privacy_check;$sql$ into n; if n<>0 then raise exception 'Public privacy query 10 leaked rows'; end if; end $test$;
rollback;
select 'PASS: 10 public queries hide private goals and private resources, including direct history, groups, targets, progress, and labels; all changes rolled back' as result;
