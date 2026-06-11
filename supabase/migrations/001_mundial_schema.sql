-- ============================================================
-- Migration 001 — Mundial 2026
-- Renames columns to English, adds phase/group, new tables
-- Run this in the Supabase SQL editor ONCE on your project.
-- ============================================================

-- ──────────────────────────────
-- 1. matches — rename columns
-- ──────────────────────────────
ALTER TABLE public.matches RENAME COLUMN equipo_local         TO home_team;
ALTER TABLE public.matches RENAME COLUMN equipo_visitante     TO away_team;
ALTER TABLE public.matches RENAME COLUMN logo_local           TO logo_home;
ALTER TABLE public.matches RENAME COLUMN logo_visitante       TO logo_away;
ALTER TABLE public.matches RENAME COLUMN fecha                TO match_date;
ALTER TABLE public.matches RENAME COLUMN goles_real_local     TO home_score;
ALTER TABLE public.matches RENAME COLUMN goles_real_visitante TO away_score;
ALTER TABLE public.matches RENAME COLUMN pronosticos_cerrados TO predictions_locked;
ALTER TABLE public.matches RENAME COLUMN estado               TO status;

-- 2. Borrar constraint viejo ANTES de cambiar valores
ALTER TABLE public.matches DROP CONSTRAINT IF EXISTS matches_estado_check;

-- 3. Actualizar valores primero (IMPORTANTE: antes del nuevo constraint)
UPDATE public.matches SET status = 'pending'   WHERE status = 'pendiente';
UPDATE public.matches SET status = 'finalized' WHERE status = 'finalizado';

-- 4. Agregar nuevo constraint ya con valores correctos
ALTER TABLE public.matches
  ADD CONSTRAINT matches_status_check
  CHECK (status IN ('pending', 'finalized'));

-- 5. Add phase and group_name
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS phase text
    CHECK (phase IN ('group','R32','R16','QF','SF','3rd','F'));

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS group_name text;

UPDATE public.matches SET phase = 'SF' WHERE ronda ILIKE 'Semifinal%';
UPDATE public.matches SET phase = 'F'  WHERE ronda ILIKE 'Final%';

-- Indexes
CREATE INDEX IF NOT EXISTS matches_phase_idx      ON public.matches (phase);
CREATE INDEX IF NOT EXISTS matches_match_date_idx ON public.matches (match_date);
CREATE INDEX IF NOT EXISTS matches_status_idx     ON public.matches (status);

-- ──────────────────────────────
-- 6. predictions — rename columns
-- ──────────────────────────────
ALTER TABLE public.predictions RENAME COLUMN goles_local     TO pred_home;
ALTER TABLE public.predictions RENAME COLUMN goles_visitante TO pred_away;

ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_goles_local_check;
ALTER TABLE public.predictions DROP CONSTRAINT IF EXISTS predictions_goles_visitante_check;
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_pred_home_check CHECK (pred_home BETWEEN 0 AND 20);
ALTER TABLE public.predictions
  ADD CONSTRAINT predictions_pred_away_check CHECK (pred_away BETWEEN 0 AND 20);

ALTER TABLE public.predictions
  ADD COLUMN IF NOT EXISTS points_earned integer;

-- ──────────────────────────────
-- 7. bonus_predictions (new)
-- ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.bonus_predictions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text        NOT NULL CHECK (type IN ('champion', 'top_scorer')),
  value         text        NOT NULL,
  points_earned integer,
  submitted_at  timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, type)
);
CREATE INDEX IF NOT EXISTS bonus_predictions_user_idx ON public.bonus_predictions (user_id);

-- ──────────────────────────────
-- 8. scoring_rules (new)
-- ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  exact_result        integer     NOT NULL DEFAULT 3,
  correct_winner      integer     NOT NULL DEFAULT 2,
  correct_draw        integer     NOT NULL DEFAULT 2,
  champion_bonus      integer     NOT NULL DEFAULT 10,
  top_scorer_bonus    integer     NOT NULL DEFAULT 5,
  updated_at          timestamptz NOT NULL DEFAULT timezone('utc', now())
);

INSERT INTO public.scoring_rules (exact_result, correct_winner, correct_draw, champion_bonus, top_scorer_bonus)
SELECT 3, 2, 2, 10, 5
WHERE NOT EXISTS (SELECT 1 FROM public.scoring_rules);

-- ──────────────────────────────
-- 9. RLS for new tables
-- ──────────────────────────────
ALTER TABLE public.bonus_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bonus own read"    ON public.bonus_predictions;
CREATE POLICY "bonus own read" ON public.bonus_predictions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "bonus own insert"  ON public.bonus_predictions;
CREATE POLICY "bonus own insert" ON public.bonus_predictions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "bonus own update"  ON public.bonus_predictions;
CREATE POLICY "bonus own update" ON public.bonus_predictions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "scoring rules read"         ON public.scoring_rules;
CREATE POLICY "scoring rules read" ON public.scoring_rules
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "scoring rules admin write"  ON public.scoring_rules;
CREATE POLICY "scoring rules admin write" ON public.scoring_rules
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ──────────────────────────────
-- 10. Update predictions RLS with new column names
-- ──────────────────────────────
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
          OR (public.matches.home_score IS NOT NULL AND public.matches.away_score IS NOT NULL)
        )
    )
  );
