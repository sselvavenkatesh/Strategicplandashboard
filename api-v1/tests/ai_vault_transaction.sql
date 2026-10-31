begin;
do $$
declare sa bigint;tok uuid:=gen_random_uuid();secret text:=gen_random_uuid()::text;r jsonb;c record;sid uuid:=gen_random_uuid();
begin
 select id into sa from public.admin_users where "Role"='SuperAdmin' and "Is Active" limit 1;
 insert into public.superadmin_sessions(token,user_id,expires_at) values(tok,sa,now()+interval '5 minutes');
 r:=public.v25_superadmin_save_ai_settings(tok,'gpt-oss:20b-cloud',secret);
 if r->>'keySaved'<>'true' or r::text like '%'||secret||'%' or r ? 'apiKey' then raise exception 'AI settings exposed a key or did not save';end if;
 select * into c from public.v25_server_ai_credentials();
 if c.api_key is distinct from secret or c.model<>'gpt-oss:20b-cloud' then raise exception 'District Vault lookup failed';end if;
 perform public.v25_superadmin_save_ai_settings(tok,'gpt-oss:20b-cloud',null);
 select * into c from public.v25_server_ai_credentials();if c.api_key is distinct from secret then raise exception 'Blank save cleared key';end if;
 begin perform public.v25_superadmin_save_ai_settings(gen_random_uuid(),'gpt-oss:20b-cloud','invalid');raise exception 'Invalid session accepted';exception when invalid_authorization_specification then null;end;
 if has_table_privilege('anon','public."District_AI_Config"','SELECT') or has_table_privilege('authenticated','public."District_AI_Config"','SELECT') or has_table_privilege('strategicuser_readonly','public."District_AI_Config"','SELECT') then raise exception 'AI configuration table is exposed';end if;
 if has_function_privilege('anon','public.v25_server_ai_credentials()','EXECUTE') or has_function_privilege('authenticated','public.v25_server_ai_credentials()','EXECUTE') or has_function_privilege('anon','public.v25_superadmin_save_ai_settings(uuid,text,text)','EXECUTE') then raise exception 'Browser role can retrieve or replace API key';end if;
 if not has_function_privilege('strategicuser_readonly','public.v25_server_ai_credentials()','EXECUTE') then raise exception 'Backend cannot retrieve district credential';end if;
 perform public.v25_log_ai_conversation(sid,sa::text,'District rollback AI test','Private rollback test answer',true,'["Goal_master"]',12);
 if not exists(select 1 from public."AI_Conversation_Log" where "Session ID"=sid and "User ID"=sa::text) then raise exception 'AI audit not saved';end if;
end $$;
set local role anon;
do $$begin if exists(select 1 from public."AI_Conversation_Log") then raise exception 'Public can read AI conversations';end if;end $$;
reset role;
rollback;
select 'District Vault save/retain, masked settings, invalid session, restricted privileges and private audit isolation passed; all changes rolled back' as result;
