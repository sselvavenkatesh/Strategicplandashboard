alter table public.admin_users add column if not exists "Google Email" text;
alter table public.admin_users add column if not exists "Microsoft Email" text;

create or replace function public.v25_superadmin_users(p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; rev text;
begin
 if not exists(select 1 from public.validate_superadmin_session(p_token)) then raise exception using errcode='28000',message='Invalid or expired Super Admin session';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id::text,'name',"Name",'email',"Email",'googleEmail',"Google Email",'microsoftEmail',"Microsoft Email",'active',"Is Active") order by id),'[]'),md5(coalesce(string_agg(id::text||':'||xmin::text,',' order by id),'')) into result,rev from public.admin_users where "Role"='Admin';
 return jsonb_build_object('users',result,'revision',rev);
end $$;

create or replace function public.v25_superadmin_save_user(p_token uuid,p_revision text,p_user jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare current_state jsonb; uid bigint; n text:=btrim(p_user->>'name'); e text:=lower(btrim(p_user->>'email')); ge text:=nullif(lower(btrim(p_user->>'googleEmail')),''); me text:=nullif(lower(btrim(p_user->>'microsoftEmail')),''); pw text:=nullif(p_user->>'password',''); active boolean:=coalesce((p_user->>'active')::boolean,true); legacy text;
begin
 if not exists(select 1 from public.validate_superadmin_session(p_token)) then raise exception using errcode='28000',message='Invalid or expired Super Admin session';end if;
 perform pg_advisory_xact_lock(hashtext('v25-superadmin-workspace'));
 lock table public.admin_users in share row exclusive mode;
 current_state:=public.v25_superadmin_users(p_token);
 if current_state->>'revision' is distinct from p_revision then raise exception using errcode='40001',message='Users changed. Reload and try again.';end if;
 if coalesce(n,'')='' or length(n)>150 then raise exception 'Enter a name of at most 150 characters';end if;
 if coalesce(e,'') !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(e)>254 or (ge is not null and (ge !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(ge)>254)) or (me is not null and (me !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(me)>254)) then raise exception 'Enter valid email addresses';end if;
 if pw is not null and (length(pw)<12 or octet_length(pw)>72) then raise exception 'Password must be at least 12 characters and at most 72 bytes';end if;
 uid:=nullif(p_user->>'id','')::bigint;
 if uid is not null and not exists(select 1 from public.admin_users where id=uid and "Role"='Admin') then raise exception 'Only district Admin accounts can be managed here';end if;
 if exists(select 1 from public.admin_users a where a.id is distinct from uid and (lower(btrim(a."Email"))=e or (a."Role"='Admin' and (lower(btrim(coalesce(nullif(a."Google Email",''),a."Email")))=coalesce(ge,e) or lower(btrim(coalesce(nullif(a."Microsoft Email",''),a."Email")))=coalesce(me,e))))) then raise exception 'An account already uses one of these email addresses';end if;
 if uid is null then
  if pw is null and ge is null and me is null then raise exception 'Provide a password or an SSO email for a new Admin';end if;
  select coalesce(max(id),0)+1 into uid from public.admin_users;
  insert into public.admin_users(id,"User ID","Name","Email","Role","Is Active","Google Email","Microsoft Email","Password Hash") values(uid,'User'||uid::text,n,e,'Admin',active,ge,me,case when pw is not null then extensions.crypt(pw,extensions.gen_salt('bf')) end);
 else
  select "User ID" into legacy from public.admin_users where id=uid;
  update public.admin_users set "Name"=n,"Email"=e,"Google Email"=ge,"Microsoft Email"=me,"Is Active"=active,"Password Hash"=case when pw is null then "Password Hash" else extensions.crypt(pw,extensions.gen_salt('bf')) end where id=uid and "Role"='Admin';
  delete from public.admin_sessions where user_id=uid::text or (legacy is not null and user_id=legacy);
 end if;
 return public.v25_superadmin_users(p_token);
end $$;

create or replace function public.v25_validate_sso_admin(p_email text,p_provider text)
returns table(user_id bigint,user_name text,user_email text,user_role text)
language sql security definer set search_path='' as $$
 select id,"Name","Email","Role" from (
  select a.*,count(*) over() as matches from public.admin_users a
  where a."Role"='Admin' and a."Is Active"=true and p_provider in ('google','microsoft')
  and lower(btrim(case p_provider when 'google' then coalesce(nullif(a."Google Email",''),a."Email") when 'microsoft' then coalesce(nullif(a."Microsoft Email",''),a."Email") end))=lower(btrim(p_email))
 ) matched where matches=1;
$$;
revoke all on function public.v25_superadmin_users(uuid),public.v25_superadmin_save_user(uuid,text,jsonb),public.v25_validate_sso_admin(text,text) from public,anon,authenticated;
grant execute on function public.v25_superadmin_users(uuid),public.v25_superadmin_save_user(uuid,text,jsonb),public.v25_validate_sso_admin(text,text) to strategicuser_readonly;
