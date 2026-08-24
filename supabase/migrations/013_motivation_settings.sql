-- ============================================================
-- Migration 013 — Mensaje motivacional configurable
-- Fila única (id=1) que el admin puede editar/apagar por SQL
-- para variar el mensaje día a día sin tocar código.
-- Placeholders soportados en "message": {gap}, {user_points}, {leader_points}
-- ============================================================

CREATE TABLE IF NOT EXISTS public.motivation_settings (
  id          integer      PRIMARY KEY DEFAULT 1,
  enabled     boolean      NOT NULL DEFAULT true,
  threshold   numeric      NOT NULL DEFAULT 10,
  message     text         NOT NULL,
  updated_at  timestamptz  NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT motivation_singleton CHECK (id = 1)
);

INSERT INTO public.motivation_settings (id, enabled, threshold, message)
VALUES (
  1,
  true,
  10,
  'Estás a escasos {gap} puntos del primer lugar. El líder ya está mirando el retrovisor con pánico y empezó a sudar frío. No bajes el ritmo, que esa punta está que se cae... Tú llevas {user_points} pts y el líder {leader_points} pts.'
)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.motivation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "motivation public read" ON public.motivation_settings;
CREATE POLICY "motivation public read" ON public.motivation_settings
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "motivation admin write" ON public.motivation_settings;
CREATE POLICY "motivation admin write" ON public.motivation_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
