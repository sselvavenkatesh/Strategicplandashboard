-- Run only in a transaction: all temporary privacy changes and state/session fixtures roll back.
begin;
set local lock_timeout='2s';
set local statement_timeout='30s';
savepoint private_goal;
update public."Goal_master" set "Role"='Admin';
set local role anon;
do $$ begin
 if (select count(*) from public."Goal_master")<>0 or (select count(*) from public."Indicator_master")<>0 or (select count(*) from public."Initiative_master")<>0 or (select count(*) from public."Indicator_Data")<>0 or (select count(*) from public."Initiative_Data")<>0 or (select count(*) from public."Indicator_Target_Preview")<>0 or (select count(*) from public.vw_indicator_reporting_normalized)<>0 or (select count(*) from public.fn_goal_initiative_progress(null,null))<>0 then raise exception 'Private Goal leaked through direct public reads';end if;
 if (public.fn_indicator_achievement_summary(true)->'overall'->>'total')::int<>0 then raise exception 'Private Goal leaked through achievement';end if;
end $$;
reset role; -- Test explicit public predicates as owner; backend grants are checked separately.
do $$ begin
 if (select count(*) from public."Goal_master")=0 or (select count(*) from public."Indicator_Data")=0 then raise exception 'Backend lost private data access';end if;
 if exists(select 1 from public."Indicator_master" m cross join lateral public.fn_indicator_year_history(m."Indicator ID",null) f) or exists(select 1 from public."Indicator_master" m cross join lateral public.fn_indicator_student_groups(m."Indicator ID",'2025-26',null) f) or exists(select 1 from public."Goal_master" g cross join lateral public.fn_indicator_key_values(g."Goal ID",null) f) or exists(select 1 from public."Goal_master" g cross join lateral public.fn_initiative_progress(g."Goal ID",null) f) or exists(select 1 from public."Initiative_master" m cross join lateral public.fn_subinitiative_progress(m."Goal ID",m."Initiative ID",null) f) then raise exception 'Public reporting functions leaked private Goal to backend caller';end if;
end $$;
rollback to private_goal;
savepoint private_masters;
update public."Indicator_master" set "Role"='Admin';
update public."Initiative_master" set "Role"='Admin';
set local role authenticated;
do $$ begin
 if (select count(*) from public."Indicator_master")<>0 or (select count(*) from public."Initiative_master")<>0 or (select count(*) from public."Indicator_Data")<>0 or (select count(*) from public."Initiative_Data")<>0 or (select count(*) from public."Indicator_Target_Preview")<>0 or (select count(*) from public.vw_indicator_reporting_normalized)<>0 or (select count(*) from public.fn_goal_initiative_progress(null,null))<>0 then raise exception 'Private master leaked to public authenticated role';end if;
end $$;
reset role; -- Test explicit public predicates as owner; backend grants are checked separately.
do $$ begin
 if exists(select 1 from public."Indicator_master" m cross join lateral public.fn_indicator_year_history(m."Indicator ID",null) f) or exists(select 1 from public."Goal_master" g cross join lateral public.fn_initiative_progress(g."Goal ID",null) f) then raise exception 'Private master leaked through backend reporting';end if;
end $$;
rollback to private_masters;
savepoint private_rows;
update public."Indicator_Data" set "Role"='Admin';
update public."Initiative_Data" set "Role"='Admin';
set local role anon;
do $$ begin
 if (select count(*) from public."Indicator_Data")<>0 or (select count(*) from public."Initiative_Data")<>0 or (select count(*) from public.vw_indicator_reporting_normalized)<>0 or (select count(*) from public."Indicator_Target_Preview")<>0 or (select count(*) from public.fn_goal_initiative_progress(null,null))<>0 then raise exception 'Private reporting rows leaked to anonymous caller';end if;
end $$;
reset role; -- Test explicit public predicates as owner; backend grants are checked separately.
do $$ begin
 if exists(select 1 from public."Indicator_master" m cross join lateral public.fn_indicator_year_history(m."Indicator ID",null) f) or exists(select 1 from public."Indicator_master" m cross join lateral public.fn_indicator_student_groups(m."Indicator ID",'2025-26',null) f) or exists(select 1 from public."Goal_master" g cross join lateral public.fn_indicator_key_values(g."Goal ID",null) f) or exists(select 1 from public."Goal_master" g cross join lateral public.fn_initiative_progress(g."Goal ID",null) f) then raise exception 'Private reporting rows leaked through backend reporting';end if;
 if (public.fn_indicator_achievement_summary(true)->'overall'->>'eligible')::int<>0 then raise exception 'Private rows contributed to achievement';end if;
end $$;
rollback to private_rows;
savepoint private_previous_year;
update public."Indicator_Data" set "Role"='Admin',"Value 3"='987654321' where "School Year"='2024-25';
reset role; -- Test explicit public predicates as owner; backend grants are checked separately.
do $$ begin
 if exists(select 1 from public.vw_indicator_reporting_normalized where school_year='2024-25' or previous_year_value_3_numeric=987654321 or ly_variance_numeric=value_3_numeric-987654321) then raise exception 'Private historical value contributed to public history/variance';end if;
end $$;
rollback to private_previous_year;
do $$ declare role_name text; begin
 foreach role_name in array array['anon','authenticated'] loop
  if has_function_privilege(role_name,'public.create_admin_oauth_state(text,text)','execute') or has_function_privilege(role_name,'public.consume_admin_oauth_state(uuid,text)','execute') then raise exception 'Browser can mint or consume OAuth state';end if;
 end loop;
end $$;
reset role; -- Test explicit public predicates as owner; backend grants are checked separately.
do $$ declare state uuid; begin
 state:=public.create_admin_oauth_state('google','https://testserver/admin');
 if public.consume_admin_oauth_state(state,'microsoft') is not null then raise exception 'Wrong-provider OAuth state consumed';end if;
 if public.consume_admin_oauth_state(state,'google')<>'https://testserver/admin' or public.consume_admin_oauth_state(state,'google') is not null then raise exception 'OAuth state single-use contract failed';end if;
end $$;
reset role;
do $$ declare uid bigint; tok uuid; begin
 select coalesce(max(id),0)+1 into uid from public.admin_users;
 insert into public.admin_users(id,"Email","Name","Role","User ID","Is Active") values(uid,gen_random_uuid()::text||'@example.invalid','Security rollback fixture','Admin','security-fixture-'||uid,true);
 tok:=public.create_admin_session(uid::text);
 if not exists(select 1 from public.validate_admin_session(tok)) then raise exception 'Active Admin session failed';end if;
 update public.admin_users set "Is Active"=false where id=uid;
 if exists(select 1 from public.validate_admin_session(tok)) or public.v25_admin_identity(tok) is not null then raise exception 'Disabled Admin session remained active';end if;
 update public.admin_users set "Is Active"=true,"Role"='SuperAdmin' where id=uid;
 if exists(select 1 from public.validate_admin_session(tok)) then raise exception 'SuperAdmin accepted as Admin';end if;
end $$;
rollback;
