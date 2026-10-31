begin;
do $$
declare sa bigint;tok uuid:=gen_random_uuid();s jsonb;r jsonb;u jsonb;uid bigint;e text:=gen_random_uuid()::text||'@example.invalid';pw text:='a';long_pw text:=repeat('Aa1!@',100);
begin
 select id into sa from public.admin_users where "Role"='SuperAdmin' and "Is Active" limit 1;
 insert into public.superadmin_sessions(token,user_id,expires_at) values(tok,sa,now()+interval '5 minutes');
 s:=public.v25_superadmin_users(tok);
 r:=public.v25_superadmin_save_user(tok,s->>'revision',jsonb_build_object('name','Password rollback QA','email',e,'password',pw));
 select x into u from jsonb_array_elements(r->'users')x where x->>'email'=e;uid:=(u->>'id')::bigint;
 if not exists(select 1 from public.validate_admin_login(e,pw) where user_id=uid) then raise exception 'Short password failed';end if;
 r:=public.v25_superadmin_save_user(tok,r->>'revision',u||jsonb_build_object('password',long_pw));
 if not exists(select 1 from public.validate_admin_login(e,long_pw) where user_id=uid) or exists(select 1 from public.validate_admin_login(e,long_pw||'x')) then raise exception 'Long password was truncated or rejected';end if;
 -- Force missing provider settings only within this rolled-back transaction.
 update public."District_Auth_Config" set "Google Secret ID"=null,"Microsoft Secret ID"=null;
 s:=public.v25_superadmin_snapshot(tok);
 begin perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',(s->'profile')||jsonb_build_object('Admin Signin Method','Google','Google Client ID',''),'goals',s->'goals'));raise exception 'Incomplete Google setup accepted';exception when raise_exception then if sqlerrm='Incomplete Google setup accepted' or position('required' in sqlerrm)=0 then raise;end if;end;
 begin perform public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',(s->'profile')||jsonb_build_object('Admin Signin Method','Microsoft','Microsoft Client ID','qa','Microsoft Tenant ID',''),'goals',s->'goals'));raise exception 'Incomplete Microsoft setup accepted';exception when raise_exception then if sqlerrm='Incomplete Microsoft setup accepted' or position('required' in sqlerrm)=0 then raise;end if;end;
 perform public.save_district_oauth_secrets(tok,gen_random_uuid()::text,gen_random_uuid()::text);
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',(s->'profile')||jsonb_build_object('Admin Signin Method','Google','Google Client ID','qa.apps.googleusercontent.com'),'goals',s->'goals'));
 if not exists(select 1 from public.get_admin_auth_config() where signin_method='Google' and google_configured) then raise exception 'Complete Google configuration was not accepted';end if;
 s:=public.v25_superadmin_save(tok,s->>'revision',jsonb_build_object('action','configuration','profile',(s->'profile')||jsonb_build_object('Admin Signin Method','Microsoft','Microsoft Client ID','qa','Microsoft Tenant ID','qa-tenant'),'goals',s->'goals'));
 if not exists(select 1 from public.get_admin_auth_config() where signin_method='Microsoft' and microsoft_configured) then raise exception 'Complete Microsoft configuration was not accepted';end if;
end $$;
rollback;
select 'PASS: short and long mixed-character passwords, no truncation, incomplete provider rejection and complete provider configuration; all fixtures rolled back' as result;
