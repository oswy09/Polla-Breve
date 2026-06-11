-- ============================================================
-- Migration 006 — daily_responses transparency policy
-- ============================================================

DROP POLICY IF EXISTS "responses own read" ON public.daily_responses;
CREATE POLICY "responses own read" ON public.daily_responses
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_admin(auth.uid())
    OR true
  );
