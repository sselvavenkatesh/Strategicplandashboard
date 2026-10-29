-- Reuse district identities/sessions, with server-enforced resource scope.
create or replace function public.v25_admin_identity(p_token uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',u.id::text,'name',coalesce(nullif(u."Name",''),u."Email"),'email',u."Email")
 from public.admin_sessions s join public.admin_users u on u.id::text=s.user_id or (s.user_id !~ '^[0-9]+$' and u."User ID"::text=s.user_id)
 where s.token=p_token and s.expires_at>now() and u."Is Active" and u."Role"='Admin' limit 1
$$;
create or replace function public.v25_admin_can_manage(p_user bigint,p_kind text,p_id text) returns boolean
language sql stable security definer set search_path='' as $$
 select case p_kind when 'indicators' then exists(
  select 1 from public."Indicator_master" m join public.v25_goal_stakeholders g on g.goal_id=m."Goal ID" and g.user_id=p_user
  where m."Indicator ID"=p_id and (not exists(select 1 from public.v25_indicator_stakeholders a where a.indicator_id=p_id) or exists(select 1 from public.v25_indicator_stakeholders a where a.indicator_id=p_id and a.user_id=p_user)))
 when 'initiatives' then exists(
  select 1 from public."Initiative_master" m join public.v25_goal_stakeholders g on g.goal_id=m."Goal ID" and g.user_id=p_user
  where m."Initiative ID"=p_id and (not exists(select 1 from public.v25_initiative_stakeholders a where a.initiative_id=p_id) or exists(select 1 from public.v25_initiative_stakeholders a where a.initiative_id=p_id and a.user_id=p_user))) else false end
$$;
create or replace function public.v25_admin_snapshot(p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity jsonb; uid bigint; result jsonb;
begin
 identity:=public.v25_admin_identity(p_token);
 if identity is null then raise exception using errcode='28000',message='Invalid or expired Admin session'; end if;
 uid:=(identity->>'id')::bigint;
 if (select count(*) from public."District_Profile")<>1 then raise exception 'District routing is not configured'; end if;
 select jsonb_build_object(
 'profile',(select jsonb_build_object('School District Name',p."School District Name",'Strategic Plan Name',p."Strategic Plan Name",'Strategic Plan Duration',p."Strategic Plan Duration",'Mission Statement',p."Mission Statement",'Vision Statement',p."Vision Statement",'District Logo',p."District Logo",'Total Goals',p."Total Goals") from public."District_Profile" p limit 1),
 'goals',coalesce((select jsonb_agg(to_jsonb(g)-'Stakeholder ID' order by g."Goal ID") from public."Goal_master" g),'[]'),
 'indicators',coalesce((select jsonb_agg(to_jsonb(i)-'Stakeholder ID' order by i."Indicator ID") from public."Indicator_master" i where public.v25_admin_can_manage(uid,'indicators',i."Indicator ID")),'[]'),
 'initiatives',coalesce((select jsonb_agg(to_jsonb(i)-'Stakeholder ID' order by i."Initiative ID") from public."Initiative_master" i where public.v25_admin_can_manage(uid,'initiatives',i."Initiative ID")),'[]'),
 'indicatorData',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object('Target 1',coalesce(t.target_1,d."Target 1"),'__previewKey',jsonb_build_array(d."Indicator ID",d."Indicator Name",d."School Year",d."Category",d."Student Group")::text) order by d."Indicator ID",d."School Year",d."Category",d."Student Group") from public."Indicator_Data" d left join public."Indicator_Target_Preview" t on t.indicator_id=d."Indicator ID" and t.school_year=d."School Year" and d."Category"='All' and d."Student Group"='All Students' and d."School" is null and d."Role"='All' where public.v25_admin_can_manage(uid,'indicators',d."Indicator ID")),'[]'),
 'initiativeData',coalesce((select jsonb_agg((to_jsonb(d)-'Stakeholder ID')||jsonb_build_object('__previewKey',jsonb_build_array(d."Initiative ID",d."Initiative Name",d."Sub Initiative Name",d."Action Item")::text) order by d."Initiative ID",d."Sub Initiative Name",d."Action Item") from public."Initiative_Data" d where public.v25_admin_can_manage(uid,'initiatives',d."Initiative ID")),'[]'),
 'stakeholders','[]'::jsonb,
 'assignments',jsonb_build_object(
 'goals',coalesce((select jsonb_object_agg(goal_id,jsonb_build_array(uid::text)) from public.v25_goal_stakeholders where user_id=uid),'{}'),
 'indicators',coalesce((select jsonb_object_agg(indicator_id,jsonb_build_array(uid::text)) from public.v25_indicator_stakeholders where user_id=uid),'{}'),
 'initiatives',coalesce((select jsonb_object_agg(initiative_id,jsonb_build_array(uid::text)) from public.v25_initiative_stakeholders where user_id=uid),'{}'))
 ) into result;
 return result||jsonb_build_object('revision',md5(result::text||coalesce((select jsonb_agg(to_jsonb(t) order by t.indicator_id,t.school_year)::text from public."Indicator_Target_Preview" t where public.v25_admin_can_manage(uid,'indicators',t.indicator_id)),'[]')));
end $$;
create or replace function public.v25_admin_save(p_token uuid,p_revision text,p_kind text,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity jsonb; uid bigint; state jsonb; r jsonb; m jsonb; old_row jsonb; source_key jsonb; rid text; gid text; title text; goal_title text; entity text; previous_target text; new_target text;
begin
 identity:=public.v25_admin_identity(p_token);
 if identity is null then raise exception using errcode='28000',message='Invalid or expired Admin session'; end if;
 uid:=(identity->>'id')::bigint;
 if p_kind not in ('indicators','initiatives') or p_kind is null then raise exception 'Invalid reporting type'; end if;
 if jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows)>5000 then raise exception 'At most 5000 reporting rows are allowed'; end if;
 perform pg_advisory_xact_lock(hashtext('v25-superadmin-workspace'));
 lock table public."Indicator_master",public."Initiative_master",public."Indicator_Data",public."Initiative_Data",public."Indicator_Target_Preview",public.v25_goal_stakeholders,public.v25_indicator_stakeholders,public.v25_initiative_stakeholders in share row exclusive mode;
 state:=public.v25_admin_snapshot(p_token);
 if p_revision is distinct from state->>'revision' then raise exception using errcode='40001',message='Data or assignments changed. Reload and try again.'; end if;
 entity:=case p_kind when 'indicators' then 'Indicator' else 'Initiative' end;
 for r in select value from jsonb_array_elements(p_rows) loop
  rid:=r->>(entity||' ID');
  if not public.v25_admin_can_manage(uid,p_kind,rid) then raise exception using errcode='42501',message='This item is not assigned to you. Reload your assigned data.'; end if;
  if p_kind='indicators' then select to_jsonb(i) into m from public."Indicator_master" i where "Indicator ID"=rid;
  else select to_jsonb(i) into m from public."Initiative_master" i where "Initiative ID"=rid; end if;
  gid:=m->>'Goal ID';title:=m->>(entity||' Name');
  select "Goal Name" into goal_title from public."Goal_master" where "Goal ID"=gid;
  if r->>'Goal ID' is distinct from gid or r->>(entity||' Name') is distinct from title then raise exception 'Master definitions are view only. Reload and check the file.'; end if;
  source_key:=null;old_row:=null;
  if left(coalesce(r->>'__previewKey',''),1)='[' then
   source_key:=(r->>'__previewKey')::jsonb;
   if source_key->>0 is distinct from rid then raise exception using errcode='42501',message='Reporting identity cannot change'; end if;
   if p_kind='indicators' then select to_jsonb(d) into old_row from public."Indicator_Data" d where "Indicator ID"=source_key->>0 and "Indicator Name"=source_key->>1 and "School Year"=source_key->>2 and "Category"=source_key->>3 and "Student Group"=source_key->>4;
   else select to_jsonb(d) into old_row from public."Initiative_Data" d where "Initiative ID"=source_key->>0 and "Initiative Name"=source_key->>1 and "Sub Initiative Name"=source_key->>2 and "Action Item"=source_key->>3; end if;
   if old_row is null then raise exception using errcode='40001',message='Reporting row changed. Reload and try again.'; end if;
  else
   if p_kind='indicators' then select to_jsonb(d) into old_row from public."Indicator_Data" d where "Indicator ID"=rid and "Indicator Name"=title and "School Year"=r->>'School Year' and "Category"=r->>'Category' and "Student Group"=r->>'Student Group';
   else select to_jsonb(d) into old_row from public."Initiative_Data" d where "Initiative ID"=rid and "Initiative Name"=title and "Sub Initiative Name"=r->>'Sub Initiative Name' and "Action Item"=r->>'Action Item'; end if;
  end if;
  if r ? 'Stakeholder ID' then raise exception 'Stakeholder assignments are Super Admin only'; end if;
  if old_row is not null then
   if r->>'Role' is distinct from old_row->>'Role' or nullif(r->>'School','') is distinct from nullif(old_row->>'School','') then raise exception 'Role and school are view only for existing data'; end if;
  elsif coalesce(r->>'Role',m->>'Role') is distinct from m->>'Role' then raise exception 'New data must use its master Role'; end if;
  if p_kind='indicators' then
   if nullif(btrim(r->>'School Year'),'') is null or nullif(btrim(r->>'Category'),'') is null or nullif(btrim(r->>'Student Group'),'') is null then raise exception 'School year, category and student group are required'; end if;
   if old_row is not null then
    if r->>'School Year' is distinct from old_row->>'School Year' or r->>'Category' is distinct from old_row->>'Category' or r->>'Student Group' is distinct from old_row->>'Student Group' then raise exception 'Reporting keys are view only. Upload a new row for a new reporting period.'; end if;
    if old_row->>'Category'='All' and old_row->>'Student Group'='All Students' and old_row->>'School' is null and old_row->>'Role'='All' then
     select coalesce(t.target_1,old_row->>'Target 1') into previous_target from (select 1) x left join public."Indicator_Target_Preview" t on t.indicator_id=rid and t.school_year=old_row->>'School Year';
     new_target:=nullif(r->>'Target 1','');
     if new_target is not distinct from previous_target then r:=r||jsonb_build_object('Target 1',old_row->>'Target 1');
     else update public."Indicator_Target_Preview" set target_1=new_target where indicator_id=rid and school_year=old_row->>'School Year'; end if;
    end if;
    update public."Indicator_Data" set "Value 1"=nullif(r->>'Value 1',''),"Value 2"=nullif(r->>'Value 2',''),"Value 3"=nullif(r->>'Value 3',''),"Target 1"=nullif(r->>'Target 1',''),"Target 2"=nullif(r->>'Target 2',''),"Target 3"=nullif(r->>'Target 3','') where "Indicator ID"=rid and "Indicator Name"=title and "School Year"=old_row->>'School Year' and "Category"=old_row->>'Category' and "Student Group"=old_row->>'Student Group';
   else
    insert into public."Indicator_Data"("Goal ID","Goal Name","Indicator ID","Indicator Name","School Year","Category","Student Group","Value 1","Value 2","Value 3","Target 1","Target 2","Target 3","Role","School") values(gid,goal_title,rid,title,r->>'School Year',r->>'Category',r->>'Student Group',nullif(r->>'Value 1',''),nullif(r->>'Value 2',''),nullif(r->>'Value 3',''),nullif(r->>'Target 1',''),nullif(r->>'Target 2',''),nullif(r->>'Target 3',''),m->>'Role',nullif(r->>'School',''));
   end if;
  else
   if nullif(btrim(r->>'Sub Initiative Name'),'') is null or nullif(btrim(r->>'Action Item'),'') is null then raise exception 'Sub-initiative and Action Item are required'; end if;
   if coalesce(r->>'Status','') not in ('','Not Started','Not Yet Started','In Progress','Done','On Hold') then raise exception 'Invalid initiative status'; end if;
   if r->>'Status'='Not Started' then r:=r||jsonb_build_object('Status','Not Yet Started'); end if;
   if old_row is not null then
    if r->>'Sub Initiative Name' is distinct from old_row->>'Sub Initiative Name' then raise exception 'Existing sub-initiative names are view only'; end if;
    update public."Initiative_Data" set "Action Item"=btrim(r->>'Action Item'),"Start Date"=nullif(r->>'Start Date',''),"End Date"=nullif(r->>'End Date',''),"Status"=nullif(r->>'Status',''),"Target 1"=nullif(r->>'Target 1',''),"Target 2"=nullif(r->>'Target 2',''),"Target 3"=nullif(r->>'Target 3','') where "Initiative ID"=rid and "Initiative Name"=title and "Sub Initiative Name"=old_row->>'Sub Initiative Name' and "Action Item"=old_row->>'Action Item';
   else
    insert into public."Initiative_Data"("Goal ID","Goal Name","Initiative ID","Initiative Name","Sub Initiative Name","Action Item","Start Date","End Date","Status","Target 1","Target 2","Target 3","Role","School") values(gid,goal_title,rid,title,btrim(r->>'Sub Initiative Name'),btrim(r->>'Action Item'),nullif(r->>'Start Date',''),nullif(r->>'End Date',''),nullif(r->>'Status',''),nullif(r->>'Target 1',''),nullif(r->>'Target 2',''),nullif(r->>'Target 3',''),m->>'Role',nullif(r->>'School',''));
   end if;
  end if;
 end loop;
 if p_kind='initiatives' then update public."Initiative_master" i set "Total Sub Initiatives"=(select count(distinct "Sub Initiative Name") from public."Initiative_Data" d where d."Initiative ID"=i."Initiative ID") where exists(select 1 from jsonb_array_elements(p_rows) x where x->>'Initiative ID'=i."Initiative ID") and i."Total Sub Initiatives" is distinct from (select count(distinct "Sub Initiative Name") from public."Initiative_Data" d where d."Initiative ID"=i."Initiative ID"); end if;
 return public.v25_admin_snapshot(p_token);
end $$;
revoke all on function public.v25_admin_identity(uuid),public.v25_admin_can_manage(bigint,text,text),public.v25_admin_snapshot(uuid),public.v25_admin_save(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.v25_admin_identity(uuid),public.v25_admin_snapshot(uuid),public.v25_admin_save(uuid,text,text,jsonb) to strategicuser_readonly;
