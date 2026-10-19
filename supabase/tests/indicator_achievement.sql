-- Run only while the documented preview fixture matches the live actuals.
-- Temporary changes are confined to preview targets and rolled back.
begin;
do $$ declare r jsonb; begin
  r:=public.fn_indicator_achievement_summary(true);
  assert (r#>>'{overall,achieved}')::int=4,'Baseline achieved';
  assert (r#>>'{overall,eligible}')::int=7,'Baseline eligible';
  assert (r#>>'{overall,percent}')::numeric=57.1,'Pooled overall';
  update public."Indicator_Target_Preview" set target_1='39.53%' where indicator_id='ID1';
  r:=public.fn_indicator_achievement_summary(true);
  assert (r#>>'{goals,0,indicators,0,achieved}')::boolean,'Equality counts as achieved';
  update public."Indicator_Target_Preview" set target_1='20%' where indicator_id='ID7';
  r:=public.fn_indicator_achievement_summary(true);
  assert not (r#>>'{goals,2,indicators,0,achieved}')::boolean,'Negative nature is lower-is-better';
  update public."Indicator_Target_Preview" set target_1='N/A';
  r:=public.fn_indicator_achievement_summary(true);
  assert (r#>>'{overall,eligible}')::int=0,'Invalid targets excluded';
  assert r#>'{overall,percent}'='null'::jsonb,'Empty denominator is NULL';
  update public."Indicator_Target_Preview" set target_1='0';
  r:=public.fn_indicator_achievement_summary(true);
  assert (r#>>'{overall,eligible}')::int=7,'Zero is a valid target';
end $$;
rollback;
