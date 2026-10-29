-- Preserve every existing hash. Newly set Admin passwords use bcrypt over a
-- SHA-256 prehash so letters, numbers, symbols and long input are not truncated.
create or replace function public.validate_admin_login(p_email text,p_password text)
returns table(user_id bigint,user_name text,user_email text,user_role text)
language sql security definer set search_path='' as $$
 select a.id,a."Name",a."Email",a."Role" from public.admin_users a
 where lower(btrim(a."Email"))=lower(btrim(p_email)) and a."Is Active"=true
 and a."Role" in ('Admin','SuperAdmin') and a."Password Hash" is not null
 and case when left(a."Password Hash",14)='sha256-bcrypt:' then
  extensions.crypt(encode(extensions.digest(p_password,'sha256'),'hex'),split_part(a."Password Hash",':',2))=split_part(a."Password Hash",':',2)
 else a."Password Hash"=extensions.crypt(p_password,a."Password Hash") end limit 1;
$$;
do $patch$ declare d text;begin
 d:=pg_get_functiondef('public.v25_superadmin_save_user(uuid,text,jsonb)'::regprocedure);
 d:=replace(d,$old$ if pw is not null and (length(pw)<12 or octet_length(pw)>72) then raise exception 'Password must be at least 12 characters and at most 72 bytes';end if;$old$,'');
 d:=replace(d,'extensions.crypt(pw,extensions.gen_salt(''bf''))','''sha256-bcrypt:''||extensions.crypt(encode(extensions.digest(pw,''sha256''),''hex''),extensions.gen_salt(''bf''))');
 execute d;
 d:=pg_get_functiondef('public.v25_superadmin_save(uuid,text,jsonb)'::regprocedure);
 if position('Google Client ID and Client Secret are required' in d)=0 then
 d:=replace(d,$marker$ if op='configuration' then$marker$,$replacement$
 if op='configuration' then
  if p_change->'profile'->>'Admin Signin Method'='Google' and (nullif(btrim(p_change->'profile'->>'Google Client ID'),'') is null or nullif(public.get_server_oauth_secret('google'),'') is null) then raise exception 'Google Client ID and Client Secret are required before selecting Google sign-in';end if;
  if p_change->'profile'->>'Admin Signin Method'='Microsoft' and (nullif(btrim(p_change->'profile'->>'Microsoft Client ID'),'') is null or nullif(btrim(p_change->'profile'->>'Microsoft Tenant ID'),'') is null or nullif(public.get_server_oauth_secret('microsoft'),'') is null) then raise exception 'Microsoft Client ID, Tenant ID and Client Secret are required before selecting Microsoft sign-in';end if;
 end if;
 if op='configuration' then$replacement$);
 execute d;
 end if;
end $patch$;
