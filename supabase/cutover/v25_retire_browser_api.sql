-- Run after V2.5 is live. Retire browser access; retain the backend's existing
-- effective function and table privileges, including view helper dependencies.
-- No business rows, accounts, passwords or Vault secrets are changed.
begin;
create temporary table v25_function_acl_before on commit drop as
select p.oid,has_function_privilege('strategicuser_readonly',p.oid,'EXECUTE') as allowed from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public';
create temporary table v25_table_acl_before on commit drop as
select c.oid,privilege,has_table_privilege('strategicuser_readonly',c.oid,privilege) as allowed
from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
where n.nspname='public' and c.relkind in ('r','p','v','m','f');
do $cutover$
declare item record;
begin
 for item in select b.*,p.oid::regprocedure as signature from v25_function_acl_before b join pg_proc p on p.oid=b.oid loop
  if item.allowed then execute format('grant execute on function %s to strategicuser_readonly',item.signature);end if;
  execute format('revoke execute on function %s from public,anon,authenticated',item.signature);
 end loop;
 for item in select b.*,c.oid::regclass as relation from v25_table_acl_before b join pg_class c on c.oid=b.oid where b.allowed loop
  execute format('grant %s on table %s to strategicuser_readonly',item.privilege,item.relation);
 end loop;
 revoke all on all tables in schema public from public,anon,authenticated;
 if exists(select 1 from v25_function_acl_before b where b.allowed is distinct from has_function_privilege('strategicuser_readonly',b.oid,'EXECUTE')) then raise exception 'Backend function privilege changed';end if;
 if exists(select 1 from v25_table_acl_before b where b.allowed is distinct from has_table_privilege('strategicuser_readonly',b.oid,b.privilege)) then raise exception 'Backend table privilege changed';end if;
 if exists(select 1 from v25_function_acl_before b where has_function_privilege('anon',b.oid,'EXECUTE') or has_function_privilege('authenticated',b.oid,'EXECUTE')) then raise exception 'Browser function still executable';end if;
 if exists(select 1 from v25_table_acl_before b where has_table_privilege('anon',b.oid,b.privilege) or has_table_privilege('authenticated',b.oid,b.privilege)) then raise exception 'Browser table grant remains';end if;
end $cutover$;
commit;
