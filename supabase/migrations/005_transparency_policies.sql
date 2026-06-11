-- ============================================================
-- Migration 005 — Transparency Policies (RLS updates)
-- ============================================================

-- 1. Permitir que cualquier usuario autenticado lea predicciones de partidos bloqueados o finalizados
DROP POLICY IF EXISTS "predictions own read" ON public.predictions;
CREATE POLICY "predictions own read" ON public.predictions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.matches
      WHERE public.matches.id = predictions.match_id
        AND (
          public.matches.status = 'finalized'
          OR public.matches.predictions_locked = true
          OR (public.matches.home_score IS NOT NULL AND public.matches.away_score IS NOT NULL)
        )
    )
  );

-- 2. Permitir que cualquier usuario lea las predicciones bonus de otros una vez iniciado el torneo
DROP POLICY IF EXISTS "bonus own read" ON public.bonus_predictions;
CREATE POLICY "bonus own read" ON public.bonus_predictions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.matches
      WHERE (SELECT MIN(match_date) FROM public.matches) <= timezone('utc', now())
    )
  );
