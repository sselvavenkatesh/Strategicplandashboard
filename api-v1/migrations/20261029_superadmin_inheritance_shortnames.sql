-- Dynamic Goal inheritance, parent-scoped restrictions, and existing short-name fields.
create or replace function public.v25_superadmin_save(p_token uuid,p_revision text,p_change jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare before_state jsonb; op text:=p_change->>'action'; kind text:=p_change->>'kind'; r jsonb; owners jsonb; uid text; rid text; gid text; title text; goal_title text; table_name text; id_column text; entity text; key jsonb; old_row jsonb; existing jsonb; profile jsonb; rows jsonb; previous_target text; new_target text; is_new boolean; changed_goals jsonb; affected_goals text[]:='{}';
begin
 if not exists(select 1 from public.validate_superadmin_session(p_token)) then raise exception using errcode='28000',message='Invalid or expired Super Admin session'; end if;
 perform pg_advisory_xact_lock(hashtext('v25-superadmin-workspace'));
 -- Serialize against legacy writers too; the district has a few hundred reporting rows.
 lock table public."District_Profile",public."Goal_master",public."Indicator_master",public."Initiative_master",public."Indicator_Data",public."Initiative_Data",public."Indicator_Target_Preview" in share row exclusive mode;
 before_state:=public.v25_superadmin_snapshot(p_token);
 if p_revision is distinct from before_state->>'revision' then raise exception using errcode='40001',message='Data changed since loading. Reload and try again.'; end if;
 if op='configuration' then
   profile:=p_change->'profile'; rows:=p_change->'goals';
   if nullif(btrim(profile->>'School District Name'),'') is null then raise exception 'School District Name is required'; end if;
   if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows) not between 1 and 20 then raise exception 'Goal count must be between 1 and 20'; end if;
   if coalesce(profile->>'Admin Signin Method','Userbased') not in ('Userbased','Google','Microsoft') then raise exception 'Invalid sign-in method'; end if;
   if exists(select 1 from public."Goal_master" g where not exists(select 1 from jsonb_array_elements(rows) x where x->>'Goal ID'=g."Goal ID")) then raise exception 'Use Delete Goal to remove a goal'; end if;
   if exists(select 1 from jsonb_array_elements(rows) x where coalesce(x->>'Goal ID','')!~'^G[0-9]+$') then raise exception 'Invalid Goal ID'; end if;
   if exists(select 1 from jsonb_array_elements(rows) x group by x->>'Goal ID' having count(*)>1) then raise exception 'Duplicate Goal ID'; end if;
   if exists(select 1 from jsonb_array_elements(rows) x where nullif(btrim(x->>'Goal Name'),'') is null) or exists(select 1 from jsonb_array_elements(rows) x group by lower(btrim(x->>'Goal Name')) having count(*)>1) then raise exception 'Goal names must be nonblank and distinct'; end if;
   select coalesce(jsonb_agg(x),'[]') into changed_goals from jsonb_array_elements(rows) x where not exists(select 1 from public."Goal_master" g where g."Goal ID"=x->>'Goal ID' and g."Goal Name" is not distinct from x->>'Goal Name' and g."Goal Description" is not distinct from x->>'Goal Description');
   if jsonb_array_length(changed_goals)>0 or (profile-'District Logo'-'Total Goals') is distinct from ((before_state->'profile')-'District Logo'-'Total Goals') then
   perform public.save_superadmin_configuration(p_token,jsonb_build_object('districtName',profile->>'School District Name','planName',profile->>'Strategic Plan Name','duration',profile->>'Strategic Plan Duration','mission',profile->>'Mission Statement','vision',profile->>'Vision Statement','goals',jsonb_array_length(rows),'signinMethod',profile->>'Admin Signin Method','googleClientId',profile->>'Google Client ID','googleAuthId',profile->>'Google Auth ID','microsoftClientId',profile->>'Microsoft Client ID','microsoftTenantId',profile->>'Microsoft Tenant ID','microsoftAuthId',profile->>'Microsoft Auth ID'),changed_goals); end if;
   if profile ? 'District Logo' and profile->>'District Logo' is distinct from before_state->'profile'->>'District Logo' then
     if length(coalesce(profile->>'District Logo',''))>1500000 then raise exception 'Logo must be 1 MB or smaller'; end if;
     if coalesce(profile->>'District Logo','')<>'' and profile->>'District Logo' !~ '^data:image/(png|jpeg|webp|svg\+xml);base64,' then
       -- Retain an existing remote logo, but do not accept arbitrary new URLs.
       if profile->>'District Logo' is distinct from before_state->'profile'->>'District Logo' then raise exception 'Select an image file for the logo'; end if;
     end if;
     perform public.update_superadmin_logo(p_token,profile->>'District Logo');
   end if;
   update public."Indicator_Data" d set "Goal Name"=g."Goal Name" from public."Goal_master" g where g."Goal ID"=d."Goal ID" and d."Goal Name" is distinct from g."Goal Name" and exists(select 1 from jsonb_array_elements(changed_goals) x where x->>'Goal ID'=g."Goal ID");
   update public."Initiative_Data" d set "Goal Name"=g."Goal Name" from public."Goal_master" g where g."Goal ID"=d."Goal ID" and d."Goal Name" is distinct from g."Goal Name" and exists(select 1 from jsonb_array_elements(changed_goals) x where x->>'Goal ID'=g."Goal ID");
   kind:='goals'; owners:=coalesce(p_change->'owners','{}');
 elsif op='masters' then
   if coalesce(kind,'') not in ('indicators','initiatives') then raise exception 'Invalid master type'; end if;
   rows:=p_change->'records';
   if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>1000 then raise exception 'Invalid master records'; end if;
   for r in select value from jsonb_array_elements(rows) loop
     rid:=r->>(case kind when 'indicators' then 'Indicator ID' else 'Initiative ID' end); title:=btrim(r->>(case kind when 'indicators' then 'Indicator Name' else 'Initiative Name' end)); gid:=r->>'Goal ID';
     if nullif(title,'') is null or length(title)>1000 then raise exception 'A master name of at most 1000 characters is required'; end if;
     if not exists(select 1 from public."Goal_master" where "Goal ID"=gid) then raise exception 'Unknown Goal'; end if;
     if kind='indicators' then
       if rid!~'^ID[0-9]+$' then raise exception 'Invalid Indicator ID'; end if;
       select to_jsonb(i) into existing from public."Indicator_master" i where "Indicator ID"=rid;
       if coalesce((p_change->>'create')::boolean,false) and existing is not null then raise exception 'Indicator ID already exists. Reload and try again.'; end if;
       if not coalesce((p_change->>'create')::boolean,false) and existing is null then raise exception 'Indicator no longer exists'; end if;
       if (existing is null or title is distinct from existing->>'Indicator Name' or gid is distinct from existing->>'Goal ID') and exists(select 1 from public."Indicator_master" where "Goal ID"=gid and lower(btrim("Indicator Name"))=lower(title) and "Indicator ID"<>rid) then raise exception 'Duplicate Indicator name'; end if;
       insert into public."Indicator_master"("Indicator ID","Indicator Name","Goal ID","Indicator Type","KPI Nature","Role","Indicator_short_name") values(rid,title,gid,r->>'Indicator Type',coalesce(r->>'KPI Nature','Positive'),coalesce(existing->>'Role','All'),case when r ? 'Indicator_short_name' then nullif(btrim(r->>'Indicator_short_name'),'') else existing->>'Indicator_short_name' end) on conflict("Indicator ID") do update set "Indicator Name"=excluded."Indicator Name","Goal ID"=excluded."Goal ID","Indicator Type"=excluded."Indicator Type","KPI Nature"=excluded."KPI Nature","Indicator_short_name"=excluded."Indicator_short_name" where ("Indicator_master"."Indicator Name","Indicator_master"."Goal ID","Indicator_master"."Indicator Type","Indicator_master"."KPI Nature","Indicator_master"."Indicator_short_name") is distinct from (excluded."Indicator Name",excluded."Goal ID",excluded."Indicator Type",excluded."KPI Nature",excluded."Indicator_short_name");
       if existing is null or title is distinct from existing->>'Indicator Name' or gid is distinct from existing->>'Goal ID' then update public."Indicator_Data" set "Indicator Name"=title,"Goal ID"=gid,"Goal Name"=(select "Goal Name" from public."Goal_master" where "Goal ID"=gid) where "Indicator ID"=rid; end if;
     else
       if rid!~'^IN[0-9]+$' then raise exception 'Invalid Initiative ID'; end if;
       select to_jsonb(i) into existing from public."Initiative_master" i where "Initiative ID"=rid;
       if coalesce((p_change->>'create')::boolean,false) and existing is not null then raise exception 'Initiative ID already exists. Reload and try again.'; end if;
       if not coalesce((p_change->>'create')::boolean,false) and existing is null then raise exception 'Initiative no longer exists'; end if;
       if (existing is null or title is distinct from existing->>'Initiative Name' or gid is distinct from existing->>'Goal ID') and exists(select 1 from public."Initiative_master" where "Goal ID"=gid and lower(btrim("Initiative Name"))=lower(title) and "Initiative ID"<>rid) then raise exception 'Duplicate Initiative name'; end if;
       insert into public."Initiative_master"("Initiative ID","Initiative Name","Goal ID","Total Sub Initiatives","Role","Initiative_Short_name") values(rid,title,gid,coalesce((r->>'Total Sub Initiatives')::bigint,0),coalesce(existing->>'Role','All'),case when r ? 'Initiative_Short_name' then nullif(btrim(r->>'Initiative_Short_name'),'') else existing->>'Initiative_Short_name' end) on conflict("Initiative ID") do update set "Initiative Name"=excluded."Initiative Name","Goal ID"=excluded."Goal ID","Initiative_Short_name"=excluded."Initiative_Short_name" where ("Initiative_master"."Initiative Name","Initiative_master"."Goal ID","Initiative_master"."Initiative_Short_name") is distinct from (excluded."Initiative Name",excluded."Goal ID",excluded."Initiative_Short_name");
       if existing is null or title is distinct from existing->>'Initiative Name' or gid is distinct from existing->>'Goal ID' then update public."Initiative_Data" set "Initiative Name"=title,"Goal ID"=gid,"Goal Name"=(select "Goal Name" from public."Goal_master" where "Goal ID"=gid) where "Initiative ID"=rid; end if;
     end if;
     if existing is null or gid is distinct from existing->>'Goal ID' then affected_goals:=array_append(affected_goals,gid); if existing is not null then affected_goals:=array_append(affected_goals,existing->>'Goal ID'); end if; end if;
   end loop;
   owners:=coalesce(p_change->'owners','{}');
 elsif op='delete_goal' then
   if (select count(*) from public."Goal_master")<=1 then raise exception 'At least one goal must remain'; end if;
   perform public.delete_superadmin_goal(p_token,p_change->>'goalId');
 elsif coalesce(op,'')<>'reporting' then raise exception 'Unsupported action';
 end if;

 -- Replace assignments only for the supplied resources. Empty arrays mean None.
 if owners is not null then
   table_name:=case kind when 'goals' then 'v25_goal_stakeholders' when 'indicators' then 'v25_indicator_stakeholders' when 'initiatives' then 'v25_initiative_stakeholders' end;
   id_column:=case kind when 'goals' then 'goal_id' when 'indicators' then 'indicator_id' when 'initiatives' then 'initiative_id' end;
   for rid,r in select e.key,e.value from jsonb_each(owners) e loop
     if jsonb_typeof(r)<>'array' then raise exception 'Stakeholder selection must be an array'; end if;
     if kind='goals' and not exists(select 1 from public."Goal_master" where "Goal ID"=rid) or kind='indicators' and not exists(select 1 from public."Indicator_master" where "Indicator ID"=rid) or kind='initiatives' and not exists(select 1 from public."Initiative_master" where "Initiative ID"=rid) then raise exception 'Unknown assignment resource'; end if;
     execute format('delete from public.%I where %I=$1 and user_id::text not in (select jsonb_array_elements_text($2))',table_name,id_column) using rid,r;
     for uid in select value from jsonb_array_elements_text(r) loop
       if uid!~'^[0-9]+$' or not exists(select 1 from public.admin_users where id=uid::bigint and "Role"='Admin' and "Is Active") then raise exception 'Select an active district Admin'; end if;
       if kind<>'goals' then
         if kind='indicators' then select "Goal ID" into gid from public."Indicator_master" where "Indicator ID"=rid;
         else select "Goal ID" into gid from public."Initiative_master" where "Initiative ID"=rid; end if;
         if not exists(select 1 from public.v25_goal_stakeholders where goal_id=gid and user_id=uid::bigint) then raise exception 'Select stakeholders assigned to this Goal'; end if;
       end if;
       execute format('insert into public.%I(%I,user_id) values($1,$2) on conflict do nothing',table_name,id_column) using rid,uid::bigint;
     end loop;
     execute format('update public.%I set "Stakeholder ID"=(select min(user_id) from public.%I where %I=$1) where %I=$1 and "Stakeholder ID" is distinct from (select min(user_id) from public.%I where %I=$1)',case kind when 'goals' then 'Goal_master' when 'indicators' then 'Indicator_master' else 'Initiative_master' end,table_name,id_column,case kind when 'goals' then 'Goal ID' when 'indicators' then 'Indicator ID' else 'Initiative ID' end,table_name,id_column) using rid;
   end loop;
 end if;

 -- Inheritance stays dynamic: only store explicit subsets. On a Goal owner change
 -- or a master move, remove overrides that are no longer inside the parent Goal.
 if op='configuration' or op='masters' then
   delete from public.v25_indicator_stakeholders a using public."Indicator_master" m
   where a.indicator_id=m."Indicator ID" and not exists(select 1 from public.v25_goal_stakeholders g where g.goal_id=m."Goal ID" and g.user_id=a.user_id)
   and ((op='configuration' and owners ? m."Goal ID") or (op='masters' and kind='indicators' and exists(select 1 from jsonb_array_elements(p_change->'records') x where x->>'Indicator ID'=m."Indicator ID")));
   delete from public.v25_initiative_stakeholders a using public."Initiative_master" m
   where a.initiative_id=m."Initiative ID" and not exists(select 1 from public.v25_goal_stakeholders g where g.goal_id=m."Goal ID" and g.user_id=a.user_id)
   and ((op='configuration' and owners ? m."Goal ID") or (op='masters' and kind='initiatives' and exists(select 1 from jsonb_array_elements(p_change->'records') x where x->>'Initiative ID'=m."Initiative ID")));
   update public."Indicator_master" m set "Stakeholder ID"=(select min(user_id) from public.v25_indicator_stakeholders a where a.indicator_id=m."Indicator ID")
   where ((op='configuration' and owners ? m."Goal ID") or (op='masters' and kind='indicators' and exists(select 1 from jsonb_array_elements(p_change->'records') x where x->>'Indicator ID'=m."Indicator ID")))
   and m."Stakeholder ID" is distinct from (select min(user_id) from public.v25_indicator_stakeholders a where a.indicator_id=m."Indicator ID");
   update public."Initiative_master" m set "Stakeholder ID"=(select min(user_id) from public.v25_initiative_stakeholders a where a.initiative_id=m."Initiative ID")
   where ((op='configuration' and owners ? m."Goal ID") or (op='masters' and kind='initiatives' and exists(select 1 from jsonb_array_elements(p_change->'records') x where x->>'Initiative ID'=m."Initiative ID")))
   and m."Stakeholder ID" is distinct from (select min(user_id) from public.v25_initiative_stakeholders a where a.initiative_id=m."Initiative ID");
 end if;

 -- Reuse existing validated import logic for inserts/upserts. Existing rows use their
 -- original primary key for updates, so editing an Action Item cannot create duplicates.
 rows:=coalesce(p_change->'dataRows','[]');
 if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>5000 then raise exception 'At most 5000 reporting rows are allowed'; end if;
 if jsonb_array_length(rows)>0 and kind not in ('indicators','initiatives') then raise exception 'Invalid reporting type'; end if;
 for r in select value from jsonb_array_elements(rows) loop
   entity:=case kind when 'indicators' then 'Indicator' else 'Initiative' end; rid:=r->>(entity||' ID');
   if kind='indicators' then select to_jsonb(i) into existing from public."Indicator_master" i where "Indicator ID"=rid; else select to_jsonb(i) into existing from public."Initiative_master" i where "Initiative ID"=rid; end if;
   if existing is null then raise exception 'Unknown reporting master'; end if;
   gid:=existing->>'Goal ID'; title:=existing->>(entity||' Name');
   if r->>'Goal ID' is distinct from gid then raise exception 'Reporting Goal does not match its master'; end if;
   if coalesce(r->>'Role','All') not in ('All','Admin') then raise exception 'Invalid reporting Role'; end if;
   r:=r||jsonb_build_object(entity||' Name',title,'Goal Name',(select "Goal Name" from public."Goal_master" where "Goal ID"=gid));
   key:=null; old_row:=null;
   if left(coalesce(r->>'__previewKey',''),1)='[' then key:=(r->>'__previewKey')::jsonb; end if;
   if kind='indicators' and key is not null then
     select to_jsonb(d) into old_row from public."Indicator_Data" d where "Indicator ID"=key->>0 and "Indicator Name"=key->>1 and "School Year"=key->>2 and "Category"=key->>3 and "Student Group"=key->>4;
   elsif kind='initiatives' and key is not null then
     select to_jsonb(d) into old_row from public."Initiative_Data" d where "Initiative ID"=key->>0 and "Initiative Name"=key->>1 and "Sub Initiative Name"=key->>2 and "Action Item"=key->>3;
   end if;
   if key is not null and old_row is null then raise exception using errcode='40001',message='Reporting row changed. Reload and try again.'; end if;
   if old_row is not null and old_row->>(entity||' ID') is distinct from rid then raise exception 'Reporting identity cannot change'; end if;
   if kind='initiatives' and nullif(r->>'Stakeholder ID','') is not null and r->>'Stakeholder ID' is distinct from old_row->>'Stakeholder ID' and not exists(select 1 from public.admin_users where id=(r->>'Stakeholder ID')::bigint and "Role"='Admin' and "Is Active") then raise exception 'Select an active district Admin'; end if;
   if kind='indicators' then
     if nullif(btrim(r->>'School Year'),'') is null or nullif(btrim(r->>'Category'),'') is null or nullif(btrim(r->>'Student Group'),'') is null then raise exception 'School year, category and student group are required'; end if;
     -- Do not copy demonstration targets into real rows when only actuals were edited.
     if old_row is not null and old_row->>'Category'='All' and old_row->>'Student Group'='All Students' and old_row->>'School' is null and old_row->>'Role'='All' then
       select coalesce(t.target_1,old_row->>'Target 1') into previous_target from (select 1) x left join public."Indicator_Target_Preview" t on t.indicator_id=rid and t.school_year=old_row->>'School Year';
       new_target:=nullif(r->>'Target 1','');
       if new_target is not distinct from previous_target then r:=r||jsonb_build_object('Target 1',old_row->>'Target 1');
       else update public."Indicator_Target_Preview" set target_1=new_target where indicator_id=rid and school_year=old_row->>'School Year'; end if;
     end if;
     if old_row is not null then
       update public."Indicator_Data" set "Value 1"=nullif(r->>'Value 1',''),"Value 2"=nullif(r->>'Value 2',''),"Value 3"=nullif(r->>'Value 3',''),"Target 1"=nullif(r->>'Target 1',''),"Target 2"=nullif(r->>'Target 2',''),"Target 3"=nullif(r->>'Target 3',''),"School"=nullif(r->>'School',''),"Role"=coalesce(r->>'Role',old_row->>'Role') where "Indicator ID"=key->>0 and "Indicator Name"=key->>1 and "School Year"=key->>2 and "Category"=key->>3 and "Student Group"=key->>4;
     else perform public.superadmin_bulk_upsert_data(p_token,'indicator',jsonb_build_array(r)); end if;
   else
     if nullif(btrim(r->>'Sub Initiative Name'),'') is null or nullif(btrim(r->>'Action Item'),'') is null then raise exception 'Sub-initiative and Action Item are required'; end if;
     if coalesce(r->>'Status','') not in ('','Not Started','Not Yet Started','In Progress','Done','On Hold') then raise exception 'Invalid initiative status'; end if;
     if r->>'Status'='Not Started' then r:=r||jsonb_build_object('Status','Not Yet Started'); end if;
     if old_row is not null then
       update public."Initiative_Data" set "Action Item"=btrim(r->>'Action Item'),"Start Date"=nullif(r->>'Start Date',''),"End Date"=nullif(r->>'End Date',''),"Status"=nullif(r->>'Status',''),"Target 1"=nullif(r->>'Target 1',''),"Target 2"=nullif(r->>'Target 2',''),"Target 3"=nullif(r->>'Target 3',''),"School"=nullif(r->>'School',''),"Role"=coalesce(r->>'Role',old_row->>'Role'),"Stakeholder ID"=nullif(r->>'Stakeholder ID','')::bigint where "Initiative ID"=key->>0 and "Initiative Name"=key->>1 and "Sub Initiative Name"=key->>2 and "Action Item"=key->>3;
     else perform public.superadmin_bulk_upsert_data(p_token,'initiative',jsonb_build_array(r)); end if;
   end if;
 end loop;
 if cardinality(affected_goals)>0 then update public."Goal_master" g set "Total Indicators"=(select count(*) from public."Indicator_master" i where i."Goal ID"=g."Goal ID" and i."Role"='All'),"Total Initiatives"=(select count(*) from public."Initiative_master" i where i."Goal ID"=g."Goal ID" and i."Role"='All') where g."Goal ID"=any(affected_goals); end if;
 update public."Initiative_master" i set "Total Sub Initiatives"=(select count(distinct "Sub Initiative Name") from public."Initiative_Data" d where d."Initiative ID"=i."Initiative ID") where i."Total Sub Initiatives" is distinct from (select count(distinct "Sub Initiative Name") from public."Initiative_Data" d where d."Initiative ID"=i."Initiative ID") and exists(select 1 from jsonb_array_elements(rows) x where x->>'Initiative ID'=i."Initiative ID");
 return public.v25_superadmin_snapshot(p_token);
end $$;

