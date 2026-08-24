-- Migration 019 — Propagación automática del bracket
-- Cuando un partido se finaliza, el ganador aparece automáticamente
-- en el siguiente partido del bracket (Cuartos → Semifinal → Final)

-- 1. Agregar columnas de bracket
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS winner_next_match_id UUID REFERENCES public.matches(id),
  ADD COLUMN IF NOT EXISTS winner_next_slot     TEXT CHECK (winner_next_slot IN ('home','away')),
  ADD COLUMN IF NOT EXISTS loser_next_match_id  UUID REFERENCES public.matches(id),
  ADD COLUMN IF NOT EXISTS loser_next_slot      TEXT CHECK (loser_next_slot  IN ('home','away'));

-- 2. Mapeo Octavos de Final → Cuartos de Final
-- Canadá vs Marruecos  → Cuartos Jul-09 (local)
UPDATE public.matches SET winner_next_match_id = '40e2b4a5-ac2d-4d5b-bc48-bec4c5f16857', winner_next_slot = 'home'
WHERE id = 'cb531582-1b87-41a3-afd6-d3de434bb414';

-- Paraguay vs Francia  → Cuartos Jul-09 (visitante)
UPDATE public.matches SET winner_next_match_id = '40e2b4a5-ac2d-4d5b-bc48-bec4c5f16857', winner_next_slot = 'away'
WHERE id = '4cf9d4be-5d08-46e7-8476-9c7f9c2c08f4';

-- Brasil vs Noruega    → Cuartos Jul-10 (local)
UPDATE public.matches SET winner_next_match_id = '31e36556-3e2d-4726-8caf-7ffc8d34e96e', winner_next_slot = 'home'
WHERE id = '43242e3a-76fa-4646-944b-04eb49cc4b69';

-- México vs Inglaterra → Cuartos Jul-10 (visitante)
UPDATE public.matches SET winner_next_match_id = '31e36556-3e2d-4726-8caf-7ffc8d34e96e', winner_next_slot = 'away'
WHERE id = '9fe06bb9-f325-4a26-b9eb-77bdfeed4813';

-- Portugal vs España   → Cuartos Jul-11 17:00 (local)
UPDATE public.matches SET winner_next_match_id = 'c264d850-4ac9-4b2e-968c-c9bac6bd6a87', winner_next_slot = 'home'
WHERE id = '68dcf13a-ce36-47ac-9259-f3e4d91d4dfe';

-- EE.UU. vs Bélgica   → Cuartos Jul-11 17:00 (visitante)
UPDATE public.matches SET winner_next_match_id = 'c264d850-4ac9-4b2e-968c-c9bac6bd6a87', winner_next_slot = 'away'
WHERE id = 'c0cf3027-2c0e-4f9b-b17a-7dfa4985a8b7';

-- Argentina vs Egipto → Cuartos Jul-11 20:00 (local)
UPDATE public.matches SET winner_next_match_id = '3a66c07c-c4e9-4644-ae92-02708e44ec86', winner_next_slot = 'home'
WHERE id = '576eb573-1b34-4ca5-aa64-2fbf6ee082d1';

-- Suiza vs Colombia   → Cuartos Jul-11 20:00 (visitante)
UPDATE public.matches SET winner_next_match_id = '3a66c07c-c4e9-4644-ae92-02708e44ec86', winner_next_slot = 'away'
WHERE id = '6c3222b9-0b12-4679-9d94-0b73ce61975f';

-- 3. Mapeo Cuartos de Final → Semifinal
-- Cuartos Jul-09 → Semifinal Jul-14 (local)
UPDATE public.matches SET winner_next_match_id = '061aa87a-4a92-4a00-bacc-9cf08269fe58', winner_next_slot = 'home'
WHERE id = '40e2b4a5-ac2d-4d5b-bc48-bec4c5f16857';

-- Cuartos Jul-10 → Semifinal Jul-14 (visitante)
UPDATE public.matches SET winner_next_match_id = '061aa87a-4a92-4a00-bacc-9cf08269fe58', winner_next_slot = 'away'
WHERE id = '31e36556-3e2d-4726-8caf-7ffc8d34e96e';

-- Cuartos Jul-11 17:00 → Semifinal Jul-15 (local)
UPDATE public.matches SET winner_next_match_id = 'd11f09ba-ea13-4f36-b090-0941e56decd2', winner_next_slot = 'home'
WHERE id = 'c264d850-4ac9-4b2e-968c-c9bac6bd6a87';

-- Cuartos Jul-11 20:00 → Semifinal Jul-15 (visitante)
UPDATE public.matches SET winner_next_match_id = 'd11f09ba-ea13-4f36-b090-0941e56decd2', winner_next_slot = 'away'
WHERE id = '3a66c07c-c4e9-4644-ae92-02708e44ec86';

-- 4. Mapeo Semifinal → Final (ganador) y Tercer Puesto (perdedor)
-- Semifinal Jul-14
UPDATE public.matches SET
  winner_next_match_id = 'd030af71-3f98-4b26-85a0-294e4812b959', winner_next_slot = 'home',
  loser_next_match_id  = '08985628-d6a5-45e6-adb2-65bda6eae5bc', loser_next_slot  = 'home'
WHERE id = '061aa87a-4a92-4a00-bacc-9cf08269fe58';

-- Semifinal Jul-15
UPDATE public.matches SET
  winner_next_match_id = 'd030af71-3f98-4b26-85a0-294e4812b959', winner_next_slot = 'away',
  loser_next_match_id  = '08985628-d6a5-45e6-adb2-65bda6eae5bc', loser_next_slot  = 'away'
WHERE id = 'd11f09ba-ea13-4f36-b090-0941e56decd2';

-- 5. Función del trigger
CREATE OR REPLACE FUNCTION public.propagate_bracket_winner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_winner_team TEXT;
  v_winner_logo TEXT;
  v_loser_team  TEXT;
  v_loser_logo  TEXT;
  v_next_id     UUID;
  v_next_slot   TEXT;
  v_loser_id    UUID;
  v_loser_slot  TEXT;
BEGIN
  -- Solo actuar cuando el status cambia a 'finalized'
  IF NEW.status = 'finalized' AND (OLD.status IS DISTINCT FROM 'finalized') THEN

    IF COALESCE(NEW.home_score, 0) > COALESCE(NEW.away_score, 0) THEN
      v_winner_team := NEW.home_team;  v_winner_logo := NEW.logo_home;
      v_loser_team  := NEW.away_team;  v_loser_logo  := NEW.logo_away;
    ELSIF COALESCE(NEW.away_score, 0) > COALESCE(NEW.home_score, 0) THEN
      v_winner_team := NEW.away_team;  v_winner_logo := NEW.logo_away;
      v_loser_team  := NEW.home_team;  v_loser_logo  := NEW.logo_home;
    ELSE
      -- Empate en tiempo regular (penales): no actualizar automáticamente
      -- El admin debe actualizar el siguiente partido manualmente
      RETURN NEW;
    END IF;

    -- Propagar ganador al siguiente partido
    SELECT winner_next_match_id, winner_next_slot
    INTO v_next_id, v_next_slot
    FROM public.matches WHERE id = NEW.id;

    IF v_next_id IS NOT NULL THEN
      IF v_next_slot = 'home' THEN
        UPDATE public.matches SET home_team = v_winner_team, logo_home = v_winner_logo WHERE id = v_next_id;
      ELSE
        UPDATE public.matches SET away_team = v_winner_team, logo_away = v_winner_logo WHERE id = v_next_id;
      END IF;
    END IF;

    -- Propagar perdedor (solo Semifinales → Tercer Puesto)
    SELECT loser_next_match_id, loser_next_slot
    INTO v_loser_id, v_loser_slot
    FROM public.matches WHERE id = NEW.id;

    IF v_loser_id IS NOT NULL THEN
      IF v_loser_slot = 'home' THEN
        UPDATE public.matches SET home_team = v_loser_team, logo_home = v_loser_logo WHERE id = v_loser_id;
      ELSE
        UPDATE public.matches SET away_team = v_loser_team, logo_away = v_loser_logo WHERE id = v_loser_id;
      END IF;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- 6. Crear el trigger
DROP TRIGGER IF EXISTS trg_bracket_propagation ON public.matches;
CREATE TRIGGER trg_bracket_propagation
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_bracket_winner();
