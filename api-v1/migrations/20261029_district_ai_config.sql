-- New district AI settings and audit helper; no strategic-plan records are changed.
create table if not exists public."District_AI_Config" (
 "District ID" text primary key references public."District_Profile"("District ID"),
 "Ollama Secret ID" uuid,
 "Ollama Model" text not null default 'gpt-oss:20b-cloud',
 "Updated At" timestamptz not null default now()
);
alter table public."District_AI_Config" enable row level security;
revoke all on public."District_AI_Config" from public,anon,authenticated,strategicuser_readonly;

create or replace function public.v25_superadmin_ai_settings(p_token uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare district text; result jsonb;
begin
 if not exists(select 1 from public.validate_superadmin_session(p_token)) then raise exception using errcode='28000',message='Invalid or expired Super Admin session';end if;
 if (select count(*) from public."District_Profile")<>1 then raise exception 'District routing is not configured';end if;
 select "District ID" into district from public."District_Profile";
 select jsonb_build_object('model',coalesce(c."Ollama Model",'gpt-oss:20b-cloud'),'keySaved',c."Ollama Secret ID" is not null) into result from public."District_Profile" p left join public."District_AI_Config" c on c."District ID"=p."District ID" where p."District ID"=district;
 return result;
end $$;

create or replace function public.v25_superadmin_save_ai_settings(p_token uuid,p_model text,p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare district text;secret_id uuid;model_name text:=btrim(coalesce(p_model,''));
begin
 if not exists(select 1 from public.validate_superadmin_session(p_token)) then raise exception using errcode='28000',message='Invalid or expired Super Admin session';end if;
 if (select count(*) from public."District_Profile")<>1 then raise exception 'District routing is not configured';end if;
 if length(model_name)<1 or length(model_name)>150 or model_name !~ '^[a-zA-Z0-9._:/-]+$' then raise exception 'Enter a valid Ollama model name';end if;
 if length(coalesce(p_key,''))>4000 then raise exception 'API key is too long';end if;
 select "District ID" into district from public."District_Profile";
 insert into public."District_AI_Config"("District ID") values(district) on conflict do nothing;
 select "Ollama Secret ID" into secret_id from public."District_AI_Config" where "District ID"=district for update;
 if nullif(btrim(p_key),'') is not null then
  if secret_id is null then secret_id:=vault.create_secret(btrim(p_key));else perform vault.update_secret(secret_id,btrim(p_key));end if;
 end if;
 if secret_id is null then raise exception 'Ollama API key is required';end if;
 update public."District_AI_Config" set "Ollama Secret ID"=secret_id,"Ollama Model"=model_name,"Updated At"=now() where "District ID"=district;
 return public.v25_superadmin_ai_settings(p_token);
end $$;

create or replace function public.v25_server_ai_credentials() returns table(model text,api_key text)
language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from public."District_Profile")<>1 then raise exception 'District routing is not configured';end if;
 return query select coalesce(c."Ollama Model",'gpt-oss:20b-cloud'),v.decrypted_secret
 from public."District_Profile" p left join public."District_AI_Config" c on c."District ID"=p."District ID"
 left join vault.decrypted_secrets v on v.id=c."Ollama Secret ID";
end $$;

create or replace function public.v25_log_ai_conversation(p_session uuid,p_user text,p_question text,p_answer text,p_scope boolean,p_sources jsonb,p_ms integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 if length(p_question)>1200 or length(p_answer)>100000 or jsonb_typeof(p_sources)<>'array' then raise exception 'Invalid AI audit fields';end if;
 insert into public."AI_Conversation_Log"("Session ID","User ID","Question","Response","In Scope","Data Sources Used","Response Time Ms") values(p_session,p_user,p_question,p_answer,p_scope,p_sources,greatest(0,p_ms));
end $$;

revoke all on function public.v25_superadmin_ai_settings(uuid),public.v25_superadmin_save_ai_settings(uuid,text,text),public.v25_server_ai_credentials(),public.v25_log_ai_conversation(uuid,text,text,text,boolean,jsonb,integer) from public,anon,authenticated;
grant execute on function public.v25_superadmin_ai_settings(uuid),public.v25_superadmin_save_ai_settings(uuid,text,text),public.v25_server_ai_credentials(),public.v25_log_ai_conversation(uuid,text,text,text,boolean,jsonb,integer) to strategicuser_readonly;
