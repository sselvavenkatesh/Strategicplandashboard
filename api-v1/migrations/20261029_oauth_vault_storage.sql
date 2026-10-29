alter table public."District_Auth_Config" add column if not exists "Google Secret ID" uuid;
alter table public."District_Auth_Config" add column if not exists "Microsoft Secret ID" uuid;
revoke all on public."District_Auth_Config" from public,anon,authenticated,strategicuser_readonly;
alter table public."District_Auth_Config" enable row level security;

create or replace function public.save_district_oauth_secrets(p_token uuid,p_google_secret text,p_microsoft_secret text) returns void
language plpgsql security definer set search_path='' as $$
declare district text;g uuid;m uuid;
begin
 if not exists(select 1 from public.validate_superadmin_session(p_token)) then raise exception using errcode='28000',message='Invalid or expired Super Admin session';end if;
 if length(coalesce(p_google_secret,''))>4000 or length(coalesce(p_microsoft_secret,''))>4000 then raise exception 'Client secret is too long';end if;
 select "District ID" into district from public."District_Profile" limit 1;
 insert into public."District_Auth_Config"("District ID") values(district) on conflict do nothing;
 select "Google Secret ID","Microsoft Secret ID" into g,m from public."District_Auth_Config" where "District ID"=district for update;
 if nullif(btrim(p_google_secret),'') is not null then
  if g is null then g:=vault.create_secret(p_google_secret);else perform vault.update_secret(g,p_google_secret);end if;
 end if;
 if nullif(btrim(p_microsoft_secret),'') is not null then
  if m is null then m:=vault.create_secret(p_microsoft_secret);else perform vault.update_secret(m,p_microsoft_secret);end if;
 end if;
 update public."District_Auth_Config" set "Google Secret ID"=g,"Microsoft Secret ID"=m,"Updated At"=now() where "District ID"=district;
end $$;

do $$ declare r record;g uuid;m uuid;begin
 for r in select * from public."District_Auth_Config" loop
  g:=r."Google Secret ID";m:=r."Microsoft Secret ID";
  if g is null and nullif(r."Google Client Secret",'') is not null then g:=vault.create_secret(r."Google Client Secret");end if;
  if m is null and nullif(r."Microsoft Client Secret",'') is not null then m:=vault.create_secret(r."Microsoft Client Secret");end if;
  update public."District_Auth_Config" set "Google Secret ID"=g,"Microsoft Secret ID"=m,"Google Client Secret"=null,"Microsoft Client Secret"=null where "District ID"=r."District ID";
 end loop;
end $$;

create or replace function public.get_server_oauth_secret(p_provider text) returns text
language plpgsql security definer set search_path='' as $$
declare secret_id uuid;result text;
begin
 if p_provider='google' then select "Google Secret ID" into secret_id from public."District_Auth_Config" limit 1;
 elsif p_provider='microsoft' then select "Microsoft Secret ID" into secret_id from public."District_Auth_Config" limit 1;
 else raise exception 'Unsupported provider';end if;
 select decrypted_secret into result from vault.decrypted_secrets where id=secret_id;
 return result;
end $$;

do $patch$ declare d text;begin
 d:=pg_get_functiondef('public.get_admin_auth_config()'::regprocedure);
 if position('Google Secret ID' in d)=0 then
  d:=replace(d,'nullif(c."Google Client Secret",'''') is not null','c."Google Secret ID" is not null');
  d:=replace(d,'nullif(c."Microsoft Client Secret",'''') is not null','c."Microsoft Secret ID" is not null');
  if position('Google Secret ID' in d)=0 then raise exception 'Unexpected authentication status function';end if;
  execute d;
 end if;
end $patch$;
revoke all on function public.get_server_oauth_secret(text),public.save_district_oauth_secrets(uuid,text,text) from public,anon,authenticated;
grant execute on function public.get_server_oauth_secret(text),public.save_district_oauth_secrets(uuid,text,text) to strategicuser_readonly;
