-- New backend-only operational tables. No reporting rows or passwords are changed.
create table public.v25_api_limits(scope text not null,subject_hash text not null,bucket bigint not null,hits integer not null,expires_at timestamptz not null,primary key(scope,subject_hash,bucket));
create index v25_api_limits_expiry on public.v25_api_limits(expires_at);
create table public.v25_ai_leases(id uuid primary key,expires_at timestamptz not null);
alter table public.v25_api_limits enable row level security;
alter table public.v25_ai_leases enable row level security;
revoke all on public.v25_api_limits,public.v25_ai_leases from public,anon,authenticated,strategicuser_readonly;
create function public.v25_take_api_limit(p_scope text,p_subject text,p_limit integer,p_seconds integer) returns boolean
language plpgsql security definer set search_path=pg_catalog,public as $$
declare used integer; slot bigint;
begin
 if p_scope not in ('login-ip','login-account','ai-ip','ai-global','telemetry') or p_subject !~ '^[0-9a-f]{64}$' or p_limit not between 1 and 10000 or p_seconds not between 1 and 3600 then raise exception 'Invalid API limit'; end if;
 slot=floor(extract(epoch from now())/p_seconds)::bigint;
 delete from public.v25_api_limits where expires_at<now();
 insert into public.v25_api_limits as l(scope,subject_hash,bucket,hits,expires_at) values(p_scope,p_subject,slot,1,to_timestamp((slot+1)*p_seconds))
 on conflict(scope,subject_hash,bucket) do update set hits=l.hits+1 where l.hits<p_limit returning hits into used;
 return used is not null;
end $$;
create function public.v25_acquire_ai_lease() returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare lease uuid;
begin
 perform pg_advisory_xact_lock(2510301800);
 delete from public.v25_ai_leases where expires_at<now();
 if (select count(*) from public.v25_ai_leases)>=4 then return null; end if;
 lease=gen_random_uuid();insert into public.v25_ai_leases values(lease,now()+interval '150 seconds');return lease;
end $$;
create function public.v25_release_ai_lease(p_id uuid) returns void language sql security definer set search_path=pg_catalog,public as $$delete from public.v25_ai_leases where id=p_id$$;
revoke all on function public.v25_take_api_limit(text,text,integer,integer),public.v25_acquire_ai_lease(),public.v25_release_ai_lease(uuid) from public,anon,authenticated;
grant execute on function public.v25_take_api_limit(text,text,integer,integer),public.v25_acquire_ai_lease(),public.v25_release_ai_lease(uuid) to strategicuser_readonly;
-- Profile credentials are accessible only through validated backend functions.
revoke all on public.admin_users from anon,authenticated;
