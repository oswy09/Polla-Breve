-- ============================================================
-- Migration 004 — Bonus & Trivia Diaria
-- ============================================================

-- 1. Modificar tipos de bonus permitidos
ALTER TABLE public.bonus_predictions DROP CONSTRAINT IF EXISTS bonus_predictions_type_check;
ALTER TABLE public.bonus_predictions 
  ADD CONSTRAINT bonus_predictions_type_check 
  CHECK (type IN ('champion', 'runner_up', 'top_scorer', 'best_player', 'best_goalkeeper'));

-- 2. Crear tabla de preguntas de trivia
CREATE TABLE IF NOT EXISTS public.trivia_questions (
  id            integer     PRIMARY KEY,
  question      text        NOT NULL,
  options       text[]      NOT NULL,
  correct_index integer     NOT NULL
);

-- 3. Crear tabla de respuestas de trivia
CREATE TABLE IF NOT EXISTS public.daily_responses (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id    integer     NOT NULL REFERENCES public.trivia_questions(id) ON DELETE CASCADE,
  selected_index integer     NOT NULL,
  is_correct     boolean     NOT NULL,
  answered_date  date        NOT NULL DEFAULT (timezone('utc', now()))::date,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (user_id, answered_date)
);

-- Habilitar RLS
ALTER TABLE public.trivia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_responses   ENABLE ROW LEVEL SECURITY;

-- RLS Políticas para trivia_questions
DROP POLICY IF EXISTS "trivia public read" ON public.trivia_questions;
CREATE POLICY "trivia public read" ON public.trivia_questions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trivia admin all" ON public.trivia_questions;
CREATE POLICY "trivia admin all" ON public.trivia_questions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Políticas para daily_responses
DROP POLICY IF EXISTS "responses own read" ON public.daily_responses;
CREATE POLICY "responses own read" ON public.daily_responses
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "responses own insert" ON public.daily_responses;
CREATE POLICY "responses own insert" ON public.daily_responses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Sembrar 30 preguntas de trivia sobre mundiales
INSERT INTO public.trivia_questions (id, question, options, correct_index) VALUES
(1, '¿Qué selección ganó el primer Mundial en 1930?', ARRAY['Uruguay', 'Argentina', 'Brasil', 'Italia'], 0),
(2, '¿Qué país ha ganado más Copas del Mundo?', ARRAY['Brasil', 'Alemania', 'Italia', 'Argentina'], 0),
(3, '¿Quién es el máximo goleador histórico de los Mundiales?', ARRAY['Miroslav Klose', 'Ronaldo Nazário', 'Gerd Müller', 'Pelé'], 0),
(4, '¿En qué Mundial anotó Diego Maradona el famoso gol de ''La Mano de Dios''?', ARRAY['España 1982', 'México 1986', 'Italia 1990', 'USA 1994'], 1),
(5, '¿Qué jugador ha disputado más partidos en la historia de los Mundiales?', ARRAY['Lionel Messi', 'Lothar Matthäus', 'Miroslav Klose', 'Paolo Maldini'], 0),
(6, '¿Quién es el jugador más joven en ganar un Mundial?', ARRAY['Pelé', 'Kylian Mbappé', 'Giuseppe Bergomi', 'Ronaldo'], 0),
(7, '¿Qué selección africana fue la primera en llegar a una semifinal (Qatar 2022)?', ARRAY['Marruecos', 'Camerún', 'Senegal', 'Ghana'], 0),
(8, '¿En qué país se celebró el Mundial de 1998?', ARRAY['Francia', 'Italia', 'Estados Unidos', 'Japón'], 0),
(9, '¿Quién anotó el gol de la victoria de España en la final de Sudáfrica 2010?', ARRAY['Andrés Iniesta', 'David Villa', 'Xavi Hernández', 'Carles Puyol'], 0),
(10, '¿Qué país organizó el Mundial de 2014?', ARRAY['Brasil', 'Sudáfrica', 'Rusia', 'Alemania'], 0),
(11, '¿Qué portero tiene el récord de más minutos sin recibir gol en un Mundial?', ARRAY['Walter Zenga', 'Iker Casillas', 'Gianluigi Buffon', 'Oliver Kahn'], 0),
(12, '¿Quién fue el goleador del Mundial de Rusia 2018?', ARRAY['Harry Kane', 'Antoine Griezmann', 'Kylian Mbappé', 'Romelu Lukaku'], 0),
(13, '¿Qué selección fue subcampeona en el Mundial de Rusia 2018?', ARRAY['Croacia', 'Francia', 'Bélgica', 'Inglaterra'], 0),
(14, '¿Qué país jugará como anfitrión junto a USA y México en 2026?', ARRAY['Canadá', 'Costa Rica', 'Panamá', 'Honduras'], 0),
(15, '¿Qué selección ha perdido más finales de la Copa del Mundo?', ARRAY['Alemania', 'Argentina', 'Países Bajos', 'Italia'], 0),
(16, '¿Quién fue el director técnico de Argentina en el Mundial de Qatar 2022?', ARRAY['Lionel Scaloni', 'Jorge Sampaoli', 'Alejandro Sabella', 'Diego Maradona'], 0),
(17, '¿Cuántas selecciones participarán en el Mundial de 2026?', ARRAY['48', '32', '36', '40'], 0),
(18, '¿Qué selección ganó el Mundial de Alemania 2006?', ARRAY['Italia', 'Francia', 'Alemania', 'Portugal'], 0),
(19, '¿Cuál de estos jugadores emblemáticos nunca ganó un Mundial?', ARRAY['Johan Cruyff', 'Zinedine Zidane', 'Ronaldinho', 'Romário'], 0),
(20, '¿Qué país organizó el primer Mundial en Asia en 2002?', ARRAY['Corea del Sur y Japón', 'China', 'Catar', 'Arabia Saudita'], 0),
(21, '¿Quién tiene el récord de más goles anotados en un solo Mundial (13 goles)?', ARRAY['Just Fontaine', 'Sándor Kocsis', 'Gerd Müller', 'Ademir'], 0),
(22, '¿Qué país asiático llegó a semifinales en el Mundial de 2002?', ARRAY['Corea del Sur', 'Japón', 'Arabia Saudita', 'Irán'], 0),
(23, '¿Quién fue elegido Mejor Jugador (Balón de Oro) en Qatar 2022?', ARRAY['Lionel Messi', 'Kylian Mbappé', 'Luka Modrić', 'Antoine Griezmann'], 0),
(24, '¿Qué país del Caribe participó en el Mundial de Alemania 2006?', ARRAY['Trinidad y Tobago', 'Jamaica', 'Haití', 'Cuba'], 0),
(25, '¿En qué Mundial se usó el VAR por primera vez?', ARRAY['Rusia 2018', 'Brasil 2014', 'Qatar 2022', 'Sudáfrica 2010'], 0),
(26, '¿Quién anotó el gol de Alemania en la final de Brasil 2014?', ARRAY['Mario Götze', 'Thomas Müller', 'Miroslav Klose', 'Toni Kroos'], 0),
(27, '¿Qué selección ganó el Mundial de 1966 en su propio país?', ARRAY['Inglaterra', 'Alemania Federal', 'Portugal', 'Unión Soviética'], 0),
(28, '¿Qué mascota representó al Mundial de Estados Unidos 1994?', ARRAY['Striker', 'Footix', 'Zakumi', 'Fuleco'], 0),
(29, '¿Quién fue el goleador del Mundial de Sudáfrica 2010?', ARRAY['Thomas Müller', 'David Villa', 'Wesley Sneijder', 'Diego Forlán'], 0),
(30, '¿Qué selección de Oceanía clasificó invicta pero eliminada en grupos de Sudáfrica 2010?', ARRAY['Nueva Zelanda', 'Australia', 'Fiyi', 'Tahití'], 0)
ON CONFLICT (id) DO NOTHING;
