-- CUTOVER ONLY: run after V2.5 is verified live through FastAPI.
-- V2.4 browser clients will intentionally lose direct DB/API access.
-- No tables, district rows, users, passwords or Vault secrets are deleted.
begin;
-- Preserve only functions referenced by the application backend before retiring
-- browser EXECUTE defaults. Existing explicit backend function grants remain.
grant execute on function public.validate_admin_login(text,text),public.validate_sso_admin(text),public.validate_superadmin_login(text,text),public.log_dashboard_access(uuid,text,text,text,text,text,text,text,text) to strategicuser_readonly;
revoke all on all tables in schema public from public,anon,authenticated;
-- Revoke API access from browser roles and the PUBLIC default, retaining existing
-- explicit backend grants. Inspect the function inventory before applying.
do $cutover$
declare routine record;
 required_names text[]=array['consume_admin_oauth_state','create_admin_oauth_state','create_admin_session','delete_superadmin_goal','fn_indicator_achievement_summary','fn_indicator_key_values','fn_indicator_student_groups','fn_indicator_year_history','fn_initiative_progress','fn_subinitiative_progress','get_admin_auth_config','get_server_oauth_secret','is_feature_enabled','log_dashboard_access','revoke_admin_session','save_district_oauth_secrets','save_superadmin_configuration','superadmin_bulk_upsert_data','update_superadmin_logo','v25_acquire_ai_lease','v25_admin_identity','v25_admin_save','v25_admin_snapshot','v25_log_ai_conversation','v25_release_ai_lease','v25_server_ai_credentials','v25_superadmin_ai_settings','v25_superadmin_logout','v25_superadmin_save','v25_superadmin_save_ai_settings','v25_superadmin_save_user','v25_superadmin_snapshot','v25_superadmin_users','v25_take_api_limit','v25_validate_sso_admin','validate_admin_login','validate_admin_session','validate_sso_admin','validate_superadmin_login','validate_superadmin_session'];
begin
 for routine in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' loop
  if split_part(routine.signature::text,'(',1) = any(required_names) or split_part(routine.signature::text,'(',1) = any(array(select 'public.'||n from unnest(required_names) n)) then
   execute format('grant execute on function %s to strategicuser_readonly',routine.signature);
  end if;
  execute format('revoke execute on function %s from public,anon,authenticated',routine.signature);
 end loop;
end $cutover$;
commit;
