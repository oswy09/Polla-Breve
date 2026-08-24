-- ============================================================
-- Migration 012 — Inicio automático de partidos
-- Cuando llega la hora programada de un partido, se le pone
-- marcador 0-0 y se cierran los pronósticos automáticamente.
-- No depende de ninguna API externa, solo compara con la hora.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule('auto-start-matches')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-start-matches');

SELECT cron.schedule(
  'auto-start-matches',
  '* * * * *',  -- cada minuto
  $$
  UPDATE public.matches
  SET home_score = 0,
      away_score = 0,
      predictions_locked = true
  WHERE match_date <= now()
    AND home_score IS NULL
    AND away_score IS NULL
    AND status != 'finalized';
  $$
);
