-- ============================================================
-- Migration 015 — Recordatorio diario de partidos (configurable)
-- Fila única (id=1) editable desde el Admin: encender/apagar y
-- ajustar el mensaje. Placeholder soportado: {count}
-- ============================================================

CREATE TABLE IF NOT EXISTS public.daily_reminder_settings (
  id          integer      PRIMARY KEY DEFAULT 1,
  enabled     boolean      NOT NULL DEFAULT true,
  message     text         NOT NULL,
  updated_at  timestamptz  NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT daily_reminder_singleton CHECK (id = 1)
);

INSERT INTO public.daily_reminder_settings (id, enabled, message)
VALUES (
  1,
  true,
  '¡Desde hoy se juegan {count} partidos! No olvides pronosticar antes de que empiecen.'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.daily_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily reminder public read" ON public.daily_reminder_settings;
CREATE POLICY "daily reminder public read" ON public.daily_reminder_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "daily reminder admin write" ON public.daily_reminder_settings;
CREATE POLICY "daily reminder admin write" ON public.daily_reminder_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
