begin;
do $$
declare sa bigint; adm bigint; other_admin bigint; pw text:=gen_random_uuid()::text; tok uuid; s jsonb; r jsonb; g text; ind text; ini text; n bigint; rowdata jsonb; old_hash text; new_hash text;
begin
 select coalesce(max(id),0)+1 into sa from public.admin_users;
 insert into public.admin_users(id,"Email","Name","Role","Password Hash") values(sa,gen_random_uuid()::text||'@example.invalid','Transactional QA Super Admin','SuperAdmin',extensions.crypt(pw,extensions.gen_salt('bf')));
 adm:=sa+1; insert into public.admin_users(id,"Email","Name","Role") values(adm,gen_random_uuid()::text||'@example.invalid','Transactional QA Admin','Admin');
 other_admin:=adm+1; insert into public.admin_users(id,"Email","Name","Role") values(other_admin,gen_random_uuid()::text||'@example.invalid','Transactional QA Other Admin','Admin');
 select session_token into tok from public.validate_superadmin_login((select "Email" from public.admin_users where id=sa),pw);
 if tok is null then raise exception 'Login failed'; end if;
 s:=public.v25_superadmin_snapshot(tok);
 select md5(coalesce(string_agg(x,'' order by x),'')) into old_hash from (select 'i'||ctid::text||xmin::text x from public."Indicator_Data" union all select 'n'||ctid::text||xmin::text from public."Initiative_Data")q;
 -- No-op configuration must not change its revision or existing reporting rows.
 r:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',s->'goals','owners','{}'::jsonb));
 if r->>'revision'<>s->>'revision' then raise exception 'No-op configuration changed data'; end if;
 -- Existing duplicate master names remain valid when saving unchanged definitions.
 s:=public.v25_superadmin_save(tok,r->>'revision',jsonb_build_object('action','masters','kind','initiatives','records',r->'initiatives','owners','{}'::jsonb));
 select md5(coalesce(string_agg(x,'' order by x),'')) into new_hash from (select 'i'||ctid::text||xmin::text x from public."Indicator_Data" union all select 'n'||ctid::text||xmin::text from public."Initiative_Data")q;
 if old_hash<>new_hash then raise exception 'Unchanged masters rewrote reporting data'; end if;
 select 'G'||(coalesce(max(substring("Goal ID" from 2)::int),0)+1) into g from public."Goal_master" where "Goal ID"~'^G[0-9]+$';
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',(s->'goals')||jsonb_build_array(jsonb_build_object('Goal ID',g,'Goal Name','Transactional QA Goal','Goal Description','Rollback only')),'owners',jsonb_build_object(g,jsonb_build_array(adm::text))));
 if s->'assignments'->'goals'->g<>jsonb_build_array(adm::text) then raise exception 'Goal assignment was not saved'; end if;
 select 'ID'||(coalesce(max(substring("Indicator ID" from 3)::int),0)+1) into ind from public."Indicator_master" where "Indicator ID"~'^ID[0-9]+$';
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','indicators','create',true,'records',jsonb_build_array(jsonb_build_object('Indicator ID',ind,'Indicator Name','Transactional QA Indicator','Goal ID',g,'Indicator Type','Number','KPI Nature','Positive','Indicator_short_name','QA KPI')),'owners',jsonb_build_object(ind,jsonb_build_array(adm::text))));
 if (select "Indicator_short_name" from public."Indicator_master" where "Indicator ID"=ind)<>'QA KPI' then raise exception 'Indicator short name missing'; end if;
 begin
  perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','indicators','records','[]'::jsonb,'owners',jsonb_build_object(ind,jsonb_build_array(other_admin::text))));
  raise exception 'Outside Goal stakeholder accepted';
 exception when raise_exception then if sqlerrm='Outside Goal stakeholder accepted' then raise; end if;end;
 -- Goal changes remove obsolete restrictions; children then inherit dynamically.
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',s->'goals','owners',jsonb_build_object(g,jsonb_build_array(other_admin::text))));
 if exists(select 1 from public.v25_indicator_stakeholders where indicator_id=ind) then raise exception 'Obsolete override survived Goal owner change'; end if;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',s->'goals','owners',jsonb_build_object(g,jsonb_build_array(adm::text,other_admin::text))));
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','indicators','records','[]'::jsonb,'owners',jsonb_build_object(ind,jsonb_build_array(adm::text))));
 if s->'assignments'->'indicators'->ind<>jsonb_build_array(adm::text) then raise exception 'Restricted subset did not round-trip'; end if;
 rowdata:=jsonb_build_object('Indicator ID',ind,'Goal ID',g,'Indicator Name','Transactional QA Indicator','School Year','2030-31','Category','All','Student Group','All Students','Value 3','7','Target 1','5');
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','reporting','kind','indicators','dataRows',jsonb_build_array(rowdata)));
 insert into public."Indicator_Target_Preview"(indicator_id,school_year,target_1) values(ind,'2030-31','10');
 s:=public.v25_superadmin_snapshot(tok);
 select x into rowdata from jsonb_array_elements(s->'indicatorData')x where x->>'Indicator ID'=ind;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','reporting','kind','indicators','dataRows',jsonb_build_array(rowdata||jsonb_build_object('Value 3','8'))));
 if (select count(*) from public."Indicator_Data" where "Indicator ID"=ind and "Value 3"='8')<>1 then raise exception 'Indicator edit did not persist exactly once'; end if;
 if (select "Target 1" from public."Indicator_Data" where "Indicator ID"=ind)<>'5' or (select target_1 from public."Indicator_Target_Preview" where indicator_id=ind and school_year='2030-31')<>'10' then raise exception 'Actual-only edit copied the demo target'; end if;
 select x into rowdata from jsonb_array_elements(s->'indicatorData')x where x->>'Indicator ID'=ind;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','reporting','kind','indicators','dataRows',jsonb_build_array(rowdata||jsonb_build_object('Target 1','9'))));
 if (select "Target 1" from public."Indicator_Data" where "Indicator ID"=ind)<>'9' or (select target_1 from public."Indicator_Target_Preview" where indicator_id=ind and school_year='2030-31')<>'9' then raise exception 'Explicit target edit was not synchronized'; end if;
 select x into rowdata from jsonb_array_elements(s->'indicatorData')x where x->>'Indicator ID'=ind;
 begin
  perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','reporting','kind','indicators','dataRows',jsonb_build_array(rowdata||jsonb_build_object('Value 3','999'),jsonb_build_object('Indicator ID','missing-fixture'))));
  raise exception 'Invalid batch was accepted';
 exception when raise_exception then if sqlerrm='Invalid batch was accepted' then raise; end if; end;
 if (select "Value 3" from public."Indicator_Data" where "Indicator ID"=ind)<>'8' then raise exception 'Failed batch partially committed'; end if;
 if (select count(*) from public.fn_indicator_key_values(g,null) where indicator_id=ind)<>1 then raise exception 'Assignments hid a public KPI'; end if;
 select 'IN'||(coalesce(max(substring("Initiative ID" from 3)::int),0)+1) into ini from public."Initiative_master" where "Initiative ID"~'^IN[0-9]+$';
 rowdata:=jsonb_build_object('Initiative ID',ini,'Initiative Name','Transactional QA Initiative','Goal ID',g,'Sub Initiative Name','QA Sub','Action Item','QA action','Status','Not Started');
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','initiatives','create',true,'records',jsonb_build_array(jsonb_build_object('Initiative ID',ini,'Initiative Name','Transactional QA Initiative','Goal ID',g,'Initiative_Short_name','QA Initiative')),'dataRows',jsonb_build_array(rowdata)));
 if (select "Initiative_Short_name" from public."Initiative_master" where "Initiative ID"=ini)<>'QA Initiative' then raise exception 'Initiative short name missing'; end if;
 select x into rowdata from jsonb_array_elements(s->'initiativeData')x where x->>'Initiative ID'=ini;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','reporting','kind','initiatives','dataRows',jsonb_build_array(rowdata||jsonb_build_object('Action Item','Renamed QA action','Status','Done'))));
 if (select count(*) from public."Initiative_Data" where "Initiative ID"=ini)<>1 or not exists(select 1 from public."Initiative_Data" where "Initiative ID"=ini and "Action Item"='Renamed QA action' and "Status"='Done') then raise exception 'Action edit duplicated or lost data'; end if;
 begin
  perform public.v25_superadmin_save(tok,'stale revision',jsonb_build_object('action','reporting','kind','indicators'));
  raise exception 'Stale revision accepted';
 exception when serialization_failure then null; end;
 begin
  perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','delete_goal','goalId',g));
  raise exception 'Dependent Goal deletion accepted';
 exception when raise_exception then if sqlerrm='Dependent Goal deletion accepted' then raise; end if; end;
 begin
  perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',s->'goals','owners',jsonb_build_object(g,jsonb_build_array(sa::text))));
  raise exception 'SuperAdmin accepted as stakeholder';
 exception when raise_exception then if sqlerrm='SuperAdmin accepted as stakeholder' then raise; end if; end;

 -- Privacy uses existing Role metadata; preserve reporting data and assignments.
 select md5(coalesce(string_agg(x,'' order by x),'')) into old_hash from (select 'i'||ctid::text||xmin::text x from public."Indicator_Data" union all select 'n'||ctid::text||xmin::text from public."Initiative_Data")q;
 select x into rowdata from jsonb_array_elements(s->'indicators')x where x->>'Indicator ID'=ind;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','indicators','records',jsonb_build_array(rowdata||jsonb_build_object('Role','Admin'))));
 if (select "Role" from public."Indicator_master" where "Indicator ID"=ind)<>'Admin' then raise exception 'Indicator Private did not persist'; end if;
 if exists(select 1 from jsonb_array_elements(public.fn_indicator_achievement_summary(false)->'goals') x,jsonb_array_elements(x->'indicators') i where i->>'id'=ind) then raise exception 'Private indicator leaked in Achievement';end if;
 if not public.v25_admin_can_manage(adm,'indicators',ind) then raise exception 'Privacy changed Admin assignment access';end if;
 select x into rowdata from jsonb_array_elements(s->'initiatives')x where x->>'Initiative ID'=ini;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','initiatives','records',jsonb_build_array(rowdata||jsonb_build_object('Role','Admin'))));
 if (select "Role" from public."Initiative_master" where "Initiative ID"=ini)<>'Admin' then raise exception 'Initiative Private did not persist'; end if;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',(select jsonb_agg(case when x->>'Goal ID'=g then x||jsonb_build_object('Role','Admin') else x end) from jsonb_array_elements(s->'goals') x)));
 if (select "Role" from public."Goal_master" where "Goal ID"=g)<>'Admin' then raise exception 'Goal Private did not persist'; end if;
 if exists(select 1 from jsonb_array_elements(public.fn_indicator_achievement_summary(false)->'goals') x where x->>'goalId'=g) then raise exception 'Private goal leaked in Achievement';end if;
 -- Changing Yes back to No must be reversible without editing reporting rows.
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',s->'profile','goals',(select jsonb_agg(case when x->>'Goal ID'=g then x||jsonb_build_object('Role','All') else x end) from jsonb_array_elements(s->'goals') x)));
 if (select "Role" from public."Goal_master" where "Goal ID"=g)<>'All' then raise exception 'Goal could not be made public again';end if;
 select md5(coalesce(string_agg(x,'' order by x),'')) into new_hash from (select 'i'||ctid::text||xmin::text x from public."Indicator_Data" union all select 'n'||ctid::text||xmin::text from public."Initiative_Data")q;
 if old_hash<>new_hash then raise exception 'Privacy rewrote reporting data';end if;


 -- Reject duplicate master names across goals, including whitespace/case differences.
 begin
 perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','indicators','create',true,'records',jsonb_build_array(jsonb_build_object('Indicator ID',ind||'0','Indicator Name','  TRANSACTIONAL   QA INDICATOR  ','Goal ID',(select "Goal ID" from public."Goal_master" where "Goal ID"<>g limit 1),'KPI Nature','Positive'))));
 raise exception 'Duplicate indicator accepted';
 exception when raise_exception then if sqlerrm='Duplicate indicator accepted' or position('already exists' in sqlerrm)=0 then raise;end if;end;
 begin
 perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','masters','kind','initiatives','create',true,'records',jsonb_build_array(jsonb_build_object('Initiative ID',ini||'0','Initiative Name',' TRANSACTIONAL   QA INITIATIVE ','Goal ID',(select "Goal ID" from public."Goal_master" where "Goal ID"<>g limit 1)))));
 raise exception 'Duplicate initiative accepted';
 exception when raise_exception then if sqlerrm='Duplicate initiative accepted' or position('already exists' in sqlerrm)=0 then raise;end if;end;
 perform public.v25_superadmin_logout(tok);
 begin perform public.v25_superadmin_snapshot(tok);raise exception 'Revoked session accepted';exception when invalid_authorization_specification then null;end;
end $$;
rollback;
select 'PASS: real SQL login, no-op preservation, assignment persistence, master creation, indicator update, nested action rename, public KPI visibility, Private save/reload/reversal without reporting rewrites, conflict/deletion/role checks, logout; all fixtures rolled back' as result;
