begin;
do $$
declare sa bigint;tok uuid:=gen_random_uuid();s jsonb;r jsonb;u jsonb;uid bigint;email text:=gen_random_uuid()::text||'@example.invalid';ge text:=gen_random_uuid()::text||'@gmail.example.invalid';me text:=gen_random_uuid()::text||'@microsoft.example.invalid';pw text:=gen_random_uuid()::text;session_token uuid;gid text;
begin
 select id into sa from public.admin_users where "Role"='SuperAdmin' and "Is Active" limit 1;
 insert into public.superadmin_sessions(token,user_id,expires_at) values(tok,sa,now()+interval '5 minutes');
 s:=public.v25_superadmin_users(tok);
 if s::text like '%Password Hash%' or s::text like '%Client Secret%' then raise exception 'User listing leaked secrets';end if;
 r:=public.v25_superadmin_save_user(tok,s->>'revision',jsonb_build_object('name','User management rollback QA','email',email,'googleEmail',ge,'microsoftEmail',me,'active',true,'password',pw));
 select x into u from jsonb_array_elements(r->'users') x where x->>'email'=email;uid:=(u->>'id')::bigint;
 if uid is null then raise exception 'User was not created';end if;
 if not exists(select 1 from public.validate_admin_login(email,pw) where user_id=uid) then raise exception 'Password login failed';end if;
 if not exists(select 1 from public.v25_validate_sso_admin(upper(ge),'google') where user_id=uid) or not exists(select 1 from public.v25_validate_sso_admin(me,'microsoft') where user_id=uid) then raise exception 'Provider email mapping failed';end if;
 if exists(select 1 from public.v25_validate_sso_admin(ge,'microsoft')) or exists(select 1 from public.v25_validate_sso_admin(email,'google')) then raise exception 'Provider mapping accepted wrong identity';end if;
 begin perform public.v25_superadmin_save_user(tok,r->>'revision',jsonb_build_object('name','Duplicate QA','email',gen_random_uuid()::text||'@example.invalid','googleEmail',ge,'password',pw));raise exception 'Duplicate provider email accepted';exception when raise_exception then if sqlerrm='Duplicate provider email accepted' then raise;end if;end;
 session_token:=public.create_admin_session(uid::text);
 select "Goal ID" into gid from public."Goal_master" limit 1;
 insert into public.v25_goal_stakeholders(goal_id,user_id) values(gid,uid);
 r:=public.v25_superadmin_save_user(tok,r->>'revision',u||jsonb_build_object('name','Edited QA Admin','active',false));
 if exists(select 1 from public.admin_sessions where token=session_token) or exists(select 1 from public.v25_validate_sso_admin(ge,'google')) or exists(select 1 from public.validate_admin_login(email,pw)) then raise exception 'Disabled user retained access';end if;
 if not exists(select 1 from public.v25_goal_stakeholders where goal_id=gid and user_id=uid) then raise exception 'Disable removed assignments';end if;
 begin perform public.v25_superadmin_users(gen_random_uuid());raise exception 'Anonymous user management accepted';exception when invalid_authorization_specification then null;end;
 if has_function_privilege('anon','public.v25_superadmin_users(uuid)','EXECUTE') or has_function_privilege('authenticated','public.v25_superadmin_save_user(uuid,text,jsonb)','EXECUTE') then raise exception 'Browser role can manage users';end if;
end $$;
rollback;
select 'PASS: create/edit/disable, password login, provider-specific SSO emails, duplicate rejection, session revocation, assignment retention, session authorization and grants; all fixtures rolled back' as result;
