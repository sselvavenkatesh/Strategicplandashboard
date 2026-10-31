-- Allen Park demonstration only. Never changes Riverside public objects.
-- Run once in a transaction after validating the new backend runtime.
begin;
set local lock_timeout='5s';
set local statement_timeout='90s';
set local check_function_bodies=off;
set local search_path=pg_catalog;
do $provision$
declare r record; ddl text; tab text;
  tables constant text[]:=array['District_Profile','Goal_master','Indicator_master','Initiative_master','Indicator_Data','Initiative_Data','Indicator_Target_Preview','Product_Feature_Flags','admin_users','admin_sessions','superadmin_sessions','admin_oauth_states','District_Auth_Config','District_AI_Config','AI_Conversation_Log','User_Access_Log','v25_goal_stakeholders','v25_indicator_stakeholders','v25_initiative_stakeholders','v25_api_limits','v25_ai_leases'];
begin
 if exists(select 1 from pg_namespace where nspname='district_allen_park') then raise exception 'Allen Park schema already exists: refusing to overwrite';end if;
 if exists(select 1 from pg_roles where rolname='allenpark_api') then raise exception 'Allen Park role already exists: inspect before reuse';end if;
 create role allenpark_api nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
 create schema district_allen_park;
 revoke all on schema district_allen_park from public,anon,authenticated;
 grant usage on schema district_allen_park,extensions to allenpark_api;
 alter default privileges in schema district_allen_park revoke execute on functions from public;
 foreach tab in array tables loop
  execute format('create table district_allen_park.%I (like public.%I including all)',tab,tab);
  execute format('alter table district_allen_park.%I enable row level security',tab);
 end loop;
 -- LIKE INCLUDING IDENTITY creates independent sequences; reject shared defaults.
 if exists(select 1 from pg_attrdef d join pg_class c on c.oid=d.adrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='district_allen_park' and pg_get_expr(d.adbin,d.adrelid) like '%public.%') then raise exception 'A copied default still references Riverside';end if;
 for r in select c.relname,pg_get_viewdef(c.oid,true) as definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='vw_indicator_reporting_normalized' and c.relkind='v'
 loop
  execute format('create view district_allen_park.%I with (security_invoker=true) as %s',r.relname,replace(r.definition,'public.','district_allen_park.'));
 end loop;
 for r in select pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')
 loop
  ddl:=replace(replace(r.definition,'public.','district_allen_park.'),'''public''','''district_allen_park''');
  execute ddl;
 end loop;
 -- Business data only. No accounts, hashes, sessions, assignments, secrets or logs.
 foreach tab in array array['District_Profile','Goal_master','Indicator_master','Initiative_master','Indicator_Data','Initiative_Data','Indicator_Target_Preview','Product_Feature_Flags'] loop
  execute format('insert into district_allen_park.%I select * from public.%I',tab,tab);
 end loop;
 foreach tab in array array['Goal_master','Indicator_master','Initiative_master','Initiative_Data'] loop
  execute format('update district_allen_park.%I set "Stakeholder ID"=null',tab);
 end loop;
 for r in select c.conname,t.relname,pg_get_constraintdef(c.oid) as definition
  from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
  where n.nspname='public' and c.contype='f' and t.relname=any(tables)
 loop
  -- Supabase Auth is retired; do not couple new district users to auth.users.
  if r.definition like '%REFERENCES auth.users%' then continue;end if;
  ddl:=replace(r.definition,'public.','district_allen_park.');
  if ddl=r.definition then raise exception 'Foreign key is not schema-qualified: %',r.conname;end if;
  execute format('alter table district_allen_park.%I add constraint %I %s',r.relname,r.conname,ddl);
 end loop;

 revoke all on all tables in schema district_allen_park from public,anon,authenticated;
 revoke all on all sequences in schema district_allen_park from public,anon,authenticated;
 revoke all on all functions in schema district_allen_park from public,anon,authenticated;
 foreach tab in array array['District_Profile','Goal_master','Indicator_master','Initiative_master','Indicator_Data','Initiative_Data','Indicator_Target_Preview','Product_Feature_Flags'] loop
  execute format('grant select on district_allen_park.%I to allenpark_api',tab);
  execute format('create policy api_read on district_allen_park.%I for select to allenpark_api using (true)',tab);
 end loop;
 grant select on district_allen_park.vw_indicator_reporting_normalized to allenpark_api;
 grant execute on all functions in schema district_allen_park to allenpark_api;
end $provision$;
update district_allen_park."District_Profile" set
 "District ID"='allen-park',
 "School District Name"='Allen Park Public Schools',
 "Sub Text"='Demonstration using sample strategic plan data',
 "Admin Signin Method"='Userbased',
 "Google Client ID"=null,"Google Auth ID"=null,
 "Microsoft Client ID"=null,"Microsoft Tenant ID"=null,"Microsoft Auth ID"=null;
comment on schema district_allen_park is 'Allen Park demonstration; Riverside-derived sample business data. Separate users and credentials.';
commit;

