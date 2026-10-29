-- Match existing reporting keys, preserve legacy names, and verify affected rows.
create or replace function public.v25_admin_save(p_token uuid,p_revision text,p_kind text,p_rows jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare identity jsonb; uid bigint; state jsonb; r jsonb; m jsonb; old_row jsonb; source_key jsonb; rid text; gid text; title text; goal_title text; entity text; previous_target text; new_target text; affected_rows bigint;
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
   -- Names in historic reporting rows may differ from the current master label.
   -- Without a source key, resolve only an unambiguous immutable-ID/reporting-key match.
   if p_kind='indicators' then
    select count(*) into affected_rows from public."Indicator_Data" d where "Indicator ID"=rid and "School Year"=r->>'School Year' and "Category"=r->>'Category' and "Student Group"=r->>'Student Group';
    if affected_rows>1 then raise exception using errcode='40001',message='Multiple reporting rows match. Reload and check the reporting keys.';end if;
    select to_jsonb(d) into old_row from public."Indicator_Data" d where "Indicator ID"=rid and "School Year"=r->>'School Year' and "Category"=r->>'Category' and "Student Group"=r->>'Student Group';
   else
    select count(*) into affected_rows from public."Initiative_Data" d where "Initiative ID"=rid and "Sub Initiative Name"=r->>'Sub Initiative Name' and "Action Item"=r->>'Action Item';
    if affected_rows>1 then raise exception using errcode='40001',message='Multiple reporting rows match. Reload and check the reporting keys.';end if;
    select to_jsonb(d) into old_row from public."Initiative_Data" d where "Initiative ID"=rid and "Sub Initiative Name"=r->>'Sub Initiative Name' and "Action Item"=r->>'Action Item';
   end if;
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
    update public."Indicator_Data" set "Value 1"=nullif(r->>'Value 1',''),"Value 2"=nullif(r->>'Value 2',''),"Value 3"=nullif(r->>'Value 3',''),"Target 1"=nullif(r->>'Target 1',''),"Target 2"=nullif(r->>'Target 2',''),"Target 3"=nullif(r->>'Target 3','') where "Indicator ID"=rid and "Indicator Name"=old_row->>'Indicator Name' and "School Year"=old_row->>'School Year' and "Category"=old_row->>'Category' and "Student Group"=old_row->>'Student Group';
    get diagnostics affected_rows = row_count;
    if affected_rows<>1 then raise exception using errcode='40001',message='No reporting row was saved. Reload and try again.';end if;
   else
    insert into public."Indicator_Data"("Goal ID","Goal Name","Indicator ID","Indicator Name","School Year","Category","Student Group","Value 1","Value 2","Value 3","Target 1","Target 2","Target 3","Role","School") values(gid,goal_title,rid,title,r->>'School Year',r->>'Category',r->>'Student Group',nullif(r->>'Value 1',''),nullif(r->>'Value 2',''),nullif(r->>'Value 3',''),nullif(r->>'Target 1',''),nullif(r->>'Target 2',''),nullif(r->>'Target 3',''),m->>'Role',nullif(r->>'School',''));
   end if;
  else
   if nullif(btrim(r->>'Sub Initiative Name'),'') is null or nullif(btrim(r->>'Action Item'),'') is null then raise exception 'Sub-initiative and Action Item are required'; end if;
   if coalesce(r->>'Status','') not in ('','Not Started','Not Yet Started','In Progress','Done','On Hold') then raise exception 'Invalid initiative status'; end if;
   if r->>'Status'='Not Started' then r:=r||jsonb_build_object('Status','Not Yet Started'); end if;
   if old_row is not null then
    if r->>'Sub Initiative Name' is distinct from old_row->>'Sub Initiative Name' then raise exception 'Existing sub-initiative names are view only'; end if;
    update public."Initiative_Data" set "Action Item"=btrim(r->>'Action Item'),"Start Date"=nullif(r->>'Start Date',''),"End Date"=nullif(r->>'End Date',''),"Status"=nullif(r->>'Status',''),"Target 1"=nullif(r->>'Target 1',''),"Target 2"=nullif(r->>'Target 2',''),"Target 3"=nullif(r->>'Target 3','') where "Initiative ID"=rid and "Initiative Name"=old_row->>'Initiative Name' and "Sub Initiative Name"=old_row->>'Sub Initiative Name' and "Action Item"=old_row->>'Action Item';
    get diagnostics affected_rows = row_count;
    if affected_rows<>1 then raise exception using errcode='40001',message='No reporting row was saved. Reload and try again.';end if;
   else
    insert into public."Initiative_Data"("Goal ID","Goal Name","Initiative ID","Initiative Name","Sub Initiative Name","Action Item","Start Date","End Date","Status","Target 1","Target 2","Target 3","Role","School") values(gid,goal_title,rid,title,btrim(r->>'Sub Initiative Name'),btrim(r->>'Action Item'),nullif(r->>'Start Date',''),nullif(r->>'End Date',''),nullif(r->>'Status',''),nullif(r->>'Target 1',''),nullif(r->>'Target 2',''),nullif(r->>'Target 3',''),m->>'Role',nullif(r->>'School',''));
   end if;
  end if;
 end loop;
 if p_kind='initiatives' then update public."Initiative_master" i set "Total Sub Initiatives"=(select count(distinct "Sub Initiative Name") from public."Initiative_Data" d where d."Initiative ID"=i."Initiative ID") where exists(select 1 from jsonb_array_elements(p_rows) x where x->>'Initiative ID'=i."Initiative ID") and i."Total Sub Initiatives" is distinct from (select count(distinct "Sub Initiative Name") from public."Initiative_Data" d where d."Initiative ID"=i."Initiative ID"); end if;
 return public.v25_admin_snapshot(p_token);
end $$;
