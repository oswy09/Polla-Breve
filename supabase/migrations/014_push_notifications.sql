-- ============================================================
-- Migration 014 — Notificaciones push
-- Guarda las suscripciones push de cada usuario (Web Push API)
-- para poder enviarles notificaciones desde el Admin aunque
-- tengan el navegador cerrado.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push sub own insert" ON public.push_subscriptions;
CREATE POLICY "push sub own insert" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push sub own delete" ON public.push_subscriptions;
CREATE POLICY "push sub own delete" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push sub own read" ON public.push_subscriptions;
CREATE POLICY "push sub own read" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
