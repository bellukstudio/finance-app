-- Aktifkan pg_cron di Dashboard Supabase (Database > Extensions) lebih dulu.
create extension if not exists pg_cron;
-- 00:05 WIB = 17:05 UTC
select cron.schedule('run-recurring','5 17 * * *',$$select run_recurring()$$);
