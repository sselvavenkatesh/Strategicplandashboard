-- Public demo reads and token-validated SuperAdmin RPCs are intentionally preserved.
-- Abort if the inspected read-only access model has changed.
DO $audit$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['District_Profile','Goal_master','Indicator_master','Indicator_Data','Initiative_master','Initiative_Data'] LOOP
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity) THEN
   RAISE EXCEPTION 'Expected RLS for %',t;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd IN ('ALL','INSERT','UPDATE','DELETE') AND roles && ARRAY['public','anon','authenticated']::name[]) THEN
   RAISE EXCEPTION 'Write policy requires separate review for %',t;
  END IF;
 END LOOP;
END $audit$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE
 public."District_Profile", public."Goal_master", public."Indicator_master",
 public."Indicator_Data", public."Initiative_master", public."Initiative_Data"
 FROM PUBLIC, anon, authenticated;

-- These helpers are not used by V2.4 browser code or the two active Edge Functions.
REVOKE EXECUTE ON FUNCTION public.get_server_oauth_secret(text), public.create_admin_session(text)
 FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_server_oauth_secret(text), public.create_admin_session(text)
 TO service_role;

DO $verify$
DECLARE t text; r text;
BEGIN
 FOREACH t IN ARRAY ARRAY['District_Profile','Goal_master','Indicator_master','Indicator_Data','Initiative_master','Initiative_Data'] LOOP
  FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
   IF NOT has_table_privilege(r,format('public.%I',t),'SELECT') THEN RAISE EXCEPTION 'Read grant lost for %.%',r,t; END IF;
   IF has_table_privilege(r,format('public.%I',t),'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN RAISE EXCEPTION 'Write grant remains for %.%',r,t; END IF;
  END LOOP;
 END LOOP;
 IF has_function_privilege('anon','public.get_server_oauth_secret(text)','EXECUTE')
 OR has_function_privilege('authenticated','public.get_server_oauth_secret(text)','EXECUTE')
 OR has_function_privilege('anon','public.create_admin_session(text)','EXECUTE')
 OR has_function_privilege('authenticated','public.create_admin_session(text)','EXECUTE') THEN RAISE EXCEPTION 'Server helper is still exposed'; END IF;
 IF NOT has_function_privilege('service_role','public.get_server_oauth_secret(text)','EXECUTE')
 OR NOT has_function_privilege('service_role','public.create_admin_session(text)','EXECUTE') THEN RAISE EXCEPTION 'Backend access lost'; END IF;
 IF NOT has_function_privilege('anon','public.update_superadmin_logo(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('anon','public.save_superadmin_configuration(uuid,jsonb,jsonb)','EXECUTE')
 OR NOT has_function_privilege('anon','public.delete_superadmin_goal(uuid,text)','EXECUTE')
 OR NOT has_function_privilege('anon','public.superadmin_bulk_upsert_data(uuid,text,jsonb)','EXECUTE')
 OR NOT has_function_privilege('anon','public.validate_admin_login(text,text)','EXECUTE')
 OR NOT has_function_privilege('anon','public.validate_superadmin_login(text,text)','EXECUTE') THEN RAISE EXCEPTION 'Existing app RPC access lost'; END IF;
END $verify$;