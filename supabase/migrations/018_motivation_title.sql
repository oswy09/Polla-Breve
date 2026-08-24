ALTER TABLE public.motivation_settings
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '¡Está cerca!';
