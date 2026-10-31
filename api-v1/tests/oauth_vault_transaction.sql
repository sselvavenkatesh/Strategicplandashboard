begin;
do $$
declare sa bigint;tok uuid:=gen_random_uuid();g text:=gen_random_uuid()::text;m text:=gen_random_uuid()::text;
begin
 select id into sa from public.admin_users where "Role"='SuperAdmin' and "Is Active" limit 1;
 insert into public.superadmin_sessions(token,user_id,expires_at) values(tok,sa,now()+interval '5 minutes');
 perform public.save_district_oauth_secrets(tok,g,m);
 if public.get_server_oauth_secret('google') is distinct from g or public.get_server_oauth_secret('microsoft') is distinct from m then raise exception 'Vault round trip failed';end if;
 perform public.save_district_oauth_secrets(tok,null,null);
 if public.get_server_oauth_secret('google') is distinct from g then raise exception 'Blank save cleared a stored secret';end if;
 if exists(select 1 from public."District_Auth_Config" where "Google Client Secret" is not null or "Microsoft Client Secret" is not null) then raise exception 'Secret stored in plaintext configuration';end if;
 if has_table_privilege('anon','public."District_Auth_Config"','SELECT') or has_table_privilege('authenticated','public."District_Auth_Config"','SELECT') or has_function_privilege('anon','public.get_server_oauth_secret(text)','EXECUTE') or has_function_privilege('authenticated','public.get_server_oauth_secret(text)','EXECUTE') or has_table_privilege('anon','vault.decrypted_secrets','SELECT') or has_table_privilege('authenticated','vault.decrypted_secrets','SELECT') then raise exception 'Browser role has secret access';end if;
 begin perform public.save_district_oauth_secrets(gen_random_uuid(),g,m);raise exception 'Unauthenticated secret write accepted';exception when invalid_authorization_specification then null;end;
end $$;
rollback;
select 'PASS: Vault encrypted storage, server-only retrieval, blank retention, no plaintext configuration, browser access denied and authenticated writes; all fixtures rolled back' as result;
