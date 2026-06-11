-- ============================================================
-- Migration 003 — pg_cron: auto-sync y auto-lock
-- Requiere que pg_cron esté habilitado en tu proyecto Supabase
-- (Settings → Database → Extensions → pg_cron ✓)
-- Y que net (pg_net) esté habilitado para HTTP desde SQL.
-- ============================================================

-- ── 1. Lock automático de pronósticos ────────────────────────────────────────
-- Cierra pronósticos 5 minutos antes del kick-off.
-- Corre cada minuto — es una query liviana, sin llamadas HTTP.
SELECT cron.schedule(
  'lock-predictions-before-kickoff',
  '* * * * *',
  $$
    UPDATE public.matches
    SET predictions_locked = true
    WHERE status = 'pending'
      AND predictions_locked = false
      AND match_date <= (now() AT TIME ZONE 'UTC') + interval '5 minutes';
  $$
);

-- ── 2. Sync de resultados vía Edge Function ───────────────────────────────────
-- Llama a la Edge Function sync-results cada 5 minutos.
-- Reemplaza 'TU-PROJECT-REF' con el ref de tu proyecto Supabase
-- (lo ves en Settings → General → Reference ID).
-- Reemplaza 'TU-SERVICE-ROLE-KEY' con tu service_role key
-- (Settings → API → service_role).
--
-- IMPORTANTE: No commitees este archivo con las keys reales.
-- Usa variables de entorno o Vault de Supabase para las keys.
SELECT cron.schedule(
  'sync-mundial-results',
  '*/5 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://TU-PROJECT-REF.supabase.co/functions/v1/sync-results',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer TU-SERVICE-ROLE-KEY'
      ),
      body    := '{}'::jsonb
    );
  $$
);

-- ── Para ver los crons registrados: ──────────────────────────────────────────
-- SELECT * FROM cron.job;

-- ── Para ver el historial de ejecuciones: ────────────────────────────────────
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- ── Para pausar sync durante la noche (opcional, ahorra llamadas API): ───────
-- SELECT cron.unschedule('sync-mundial-results');
-- Luego volver a activar con el SELECT cron.schedule(...) de arriba.
