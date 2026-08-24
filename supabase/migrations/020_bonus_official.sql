-- Guarda los resultados oficiales del bonus (campeón, subcampeón, etc.)
CREATE TABLE IF NOT EXISTS public.bonus_official (
  type          text PRIMARY KEY,
  official_value text NOT NULL,
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.bonus_official ENABLE ROW LEVEL SECURITY;

-- Admin puede leer y escribir
CREATE POLICY "bonus_official admin all" ON public.bonus_official
  FOR ALL TO authenticated USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
