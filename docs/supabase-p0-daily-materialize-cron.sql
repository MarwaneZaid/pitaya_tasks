-- Cron pg_cron + pg_net pour daily-materialize (déjà appliqué sur dailydo-saas).
-- Schedule : 10 4 * * * (04:10 UTC ≈ 06:10 Europe/Paris en été)
--
-- Job name : dailydo-daily-materialize
-- URL : https://jgesheqrpskfygaxdncl.supabase.co/functions/v1/daily-materialize
-- Header : x-cron-secret = CRON_SECRET (même secret que push-reminders)

-- Recréer / mettre à jour (idempotent) :
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'dailydo-daily-materialize';
-- SELECT cron.schedule(
--   'dailydo-daily-materialize',
--   '10 4 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://jgesheqrpskfygaxdncl.supabase.co/functions/v1/daily-materialize',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', current_setting('app.settings.cron_secret', true)
--     ),
--     body := '{}'::jsonb,
--     timeout_milliseconds := 60000
--   );
--   $$
-- );

SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'dailydo-daily-materialize';
