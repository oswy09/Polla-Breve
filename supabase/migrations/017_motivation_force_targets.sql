-- Migration 017 — force_targets en motivation_settings
-- Permite al admin forzar el modal motivacional a usuarios específicos
-- independientemente del gap de puntos.
-- force_targets: [] = nadie, ["all"] = todos, ["uuid1","uuid2"] = usuarios específicos

ALTER TABLE public.motivation_settings
  ADD COLUMN IF NOT EXISTS force_targets jsonb NOT NULL DEFAULT '[]'::jsonb;
