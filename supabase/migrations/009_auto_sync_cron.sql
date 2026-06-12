-- ============================================================
-- Migration 009 — Auto-sync match results every 2 minutes
-- Uses pg_cron + pg_net to call the sync-results Edge Function
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove old job if exists
SELECT cron.unschedule('auto-sync-wc-results')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-sync-wc-results');

-- Schedule sync every 2 minutes, all day during tournament (June 11 – July 19 2026)
SELECT cron.schedule(
  'auto-sync-wc-results',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://REEMPLAZA_CON_TU_PROJECT_REF.supabase.co/functions/v1/sync-results',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer REEMPLAZA_CON_TU_SERVICE_ROLE_KEY"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
