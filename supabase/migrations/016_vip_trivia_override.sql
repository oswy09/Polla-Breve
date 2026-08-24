-- ============================================================
-- Migration 016 — VIP Trivia Override
-- Permite al admin asignar una pregunta específica a un usuario
-- para una fecha determinada (reemplaza la pregunta aleatoria del día).
-- correct_index = -1 significa "siempre correcta" (pregunta bonus).
-- ============================================================

-- 1. Pregunta VIP 43: "El cordón de Ghiggia" (siempre correcta, es un bonus)
INSERT INTO public.trivia_questions (id, question, options, correct_index, note)
VALUES (
  43,
  '¿De qué color era el cordón del botín derecho de Alcides Ghiggia en la final del Mundial de 1950 (el famoso "Maracanazo")?',
  ARRAY['Blanco', 'Negro', 'Marrón', 'No tenía cordón'],
  -1,
  'jajajajajaja para que no te quejes de las preguntas... este era un bonus, así que automáticamente obtienes 0.5 pts... jajajaja'
)
ON CONFLICT (id) DO UPDATE
  SET question     = EXCLUDED.question,
      options      = EXCLUDED.options,
      correct_index = EXCLUDED.correct_index,
      note         = EXCLUDED.note;

-- 2. Tabla de overrides: el admin asigna pregunta específica a usuario + fecha
CREATE TABLE IF NOT EXISTS public.trivia_overrides (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id   integer     NOT NULL REFERENCES public.trivia_questions(id) ON DELETE CASCADE,
  override_date date        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, override_date)
);

-- 3. RLS
ALTER TABLE public.trivia_overrides ENABLE ROW LEVEL SECURITY;

-- El usuario puede leer su propio override (para que getDailyQuestion lo detecte)
DROP POLICY IF EXISTS "overrides own read" ON public.trivia_overrides;
CREATE POLICY "overrides own read" ON public.trivia_overrides
  FOR SELECT USING (auth.uid() = user_id);

-- Solo admin puede escribir
DROP POLICY IF EXISTS "overrides admin all" ON public.trivia_overrides;
CREATE POLICY "overrides admin all" ON public.trivia_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
