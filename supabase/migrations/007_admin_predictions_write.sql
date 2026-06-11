-- ============================================================
-- Migration 007 — Admin write access to predictions
-- Fixes: admin cannot insert/update predictions for other users
-- ============================================================

-- Allow admin to INSERT predictions for any user
DROP POLICY IF EXISTS "predictions admin write" ON public.predictions;
CREATE POLICY "predictions admin write" ON public.predictions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Allow admin to UPDATE predictions for any user
DROP POLICY IF EXISTS "predictions admin update" ON public.predictions;
CREATE POLICY "predictions admin update" ON public.predictions
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Also allow admin to INSERT/UPDATE bonus_predictions for any user (for manual corrections)
DROP POLICY IF EXISTS "bonus admin write" ON public.bonus_predictions;
CREATE POLICY "bonus admin write" ON public.bonus_predictions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "bonus admin update" ON public.bonus_predictions;
CREATE POLICY "bonus admin update" ON public.bonus_predictions
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Allow users to delete their own daily responses (needed for resetDailyQuestion)
DROP POLICY IF EXISTS "responses own delete" ON public.daily_responses;
CREATE POLICY "responses own delete" ON public.daily_responses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
