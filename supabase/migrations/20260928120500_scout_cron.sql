-- ============================================================================
-- Møbelscout-jobber via pg_cron + pg_net (Supabase). Frekvensen er DATA:
-- pg_cron «tikker» (standard hvert 5. min), og hver kilde har egen interval_minutes.
-- Én tick henter per kilde × etterspurt kategori – aldri ett søk per Scout.
--
-- Aktivering i Supabase (én gang, med ekte verdier):
--   select scout.schedule_tick('https://kontorcompaniet.no/api/cron/scout-tick', '<CRON_SECRET>');
-- Endre tikk-frekvens:
--   select scout.schedule_tick('https://…', '<CRON_SECRET>', '*/10 * * * *');
-- ============================================================================

create or replace function scout.schedule_tick(endpoint text, secret text, schedule text default '*/5 * * * *')
returns void language plpgsql security definer set search_path = scout, public, pg_temp as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') or not exists (select 1 from pg_extension where extname = 'pg_net') then
    raise exception 'pg_cron og pg_net må være aktivert (Supabase → Database → Extensions)';
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'scout-tick';
  perform cron.schedule('scout-tick', schedule, format(
    $job$select net.http_post(url := %L, headers := jsonb_build_object('Authorization', 'Bearer ' || %L, 'Content-Type', 'application/json'), body := '{}'::jsonb, timeout_milliseconds := 55000)$job$,
    endpoint, secret));
  update scout.settings set value = to_jsonb(schedule) where key = 'tick_minutes';
end $$;
revoke all on function scout.schedule_tick(text, text, text) from public, anon, authenticated;
