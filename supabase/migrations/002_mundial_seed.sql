-- ============================================================
-- Migration 002 — Seed Mundial 2026 (48 equipos, 12 grupos)
-- Borra los partidos anteriores (Champions) e inserta los 104
-- partidos del Mundial 2026.
-- Run AFTER 001_mundial_schema.sql.
-- NOTE: Verifica los grupos y fechas contra el calendario oficial.
-- ============================================================

-- Limpiar partidos de Champions
DELETE FROM public.predictions;
DELETE FROM public.matches;

-- ──────────────────────────────
-- FASE DE GRUPOS (72 partidos)
-- Formato: 12 grupos × 6 partidos = 72
-- Jornada 1: Jun 11–14 | Jornada 2: Jun 18–21 | Jornada 3: Jun 25–27
-- ──────────────────────────────

INSERT INTO public.matches (home_team, away_team, logo_home, logo_away, match_date, status, predictions_locked, phase, group_name, ronda) VALUES

-- GRUPO A: USA, Bolivia, Ecuador, Panamá
('USA',     'Bolivia',  'https://a.espncdn.com/i/teamlogos/soccer/500/369.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/6360.png', '2026-06-11T18:00:00-05:00', 'pending', false, 'group', 'A', 'Grupo A · Jornada 1'),
('Ecuador', 'Panamá',   'https://a.espncdn.com/i/teamlogos/soccer/500/9853.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9785.png', '2026-06-11T21:00:00-05:00', 'pending', false, 'group', 'A', 'Grupo A · Jornada 1'),
('USA',     'Ecuador',  'https://a.espncdn.com/i/teamlogos/soccer/500/369.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/9853.png', '2026-06-18T18:00:00-05:00', 'pending', false, 'group', 'A', 'Grupo A · Jornada 2'),
('Bolivia', 'Panamá',   'https://a.espncdn.com/i/teamlogos/soccer/500/6360.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9785.png', '2026-06-18T21:00:00-05:00', 'pending', false, 'group', 'A', 'Grupo A · Jornada 2'),
('USA',     'Panamá',   'https://a.espncdn.com/i/teamlogos/soccer/500/369.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/9785.png', '2026-06-25T17:00:00-05:00', 'pending', false, 'group', 'A', 'Grupo A · Jornada 3'),
('Bolivia', 'Ecuador',  'https://a.espncdn.com/i/teamlogos/soccer/500/6360.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9853.png', '2026-06-25T17:00:00-05:00', 'pending', false, 'group', 'A', 'Grupo A · Jornada 3'),

-- GRUPO B: México, Jamaica, Venezuela, Honduras
('México',    'Jamaica',   'https://a.espncdn.com/i/teamlogos/soccer/500/1990.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9762.png', '2026-06-12T18:00:00-05:00', 'pending', false, 'group', 'B', 'Grupo B · Jornada 1'),
('Venezuela', 'Honduras',  'https://a.espncdn.com/i/teamlogos/soccer/500/2292.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9750.png', '2026-06-12T21:00:00-05:00', 'pending', false, 'group', 'B', 'Grupo B · Jornada 1'),
('México',    'Venezuela', 'https://a.espncdn.com/i/teamlogos/soccer/500/1990.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/2292.png', '2026-06-19T18:00:00-05:00', 'pending', false, 'group', 'B', 'Grupo B · Jornada 2'),
('Jamaica',   'Honduras',  'https://a.espncdn.com/i/teamlogos/soccer/500/9762.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9750.png', '2026-06-19T21:00:00-05:00', 'pending', false, 'group', 'B', 'Grupo B · Jornada 2'),
('México',    'Honduras',  'https://a.espncdn.com/i/teamlogos/soccer/500/1990.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9750.png', '2026-06-26T17:00:00-05:00', 'pending', false, 'group', 'B', 'Grupo B · Jornada 3'),
('Jamaica',   'Venezuela', 'https://a.espncdn.com/i/teamlogos/soccer/500/9762.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/2292.png', '2026-06-26T17:00:00-05:00', 'pending', false, 'group', 'B', 'Grupo B · Jornada 3'),

-- GRUPO C: Canadá, Marruecos, Croacia, Bélgica
('Canadá',  'Marruecos', 'https://a.espncdn.com/i/teamlogos/soccer/500/10700.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3613.png', '2026-06-12T18:00:00-06:00', 'pending', false, 'group', 'C', 'Grupo C · Jornada 1'),
('Croacia', 'Bélgica',   'https://a.espncdn.com/i/teamlogos/soccer/500/3902.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/219.png',  '2026-06-12T21:00:00-06:00', 'pending', false, 'group', 'C', 'Grupo C · Jornada 1'),
('Canadá',  'Croacia',   'https://a.espncdn.com/i/teamlogos/soccer/500/10700.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3902.png', '2026-06-19T18:00:00-06:00', 'pending', false, 'group', 'C', 'Grupo C · Jornada 2'),
('Marruecos','Bélgica',  'https://a.espncdn.com/i/teamlogos/soccer/500/3613.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/219.png',  '2026-06-19T21:00:00-06:00', 'pending', false, 'group', 'C', 'Grupo C · Jornada 2'),
('Canadá',  'Bélgica',   'https://a.espncdn.com/i/teamlogos/soccer/500/10700.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/219.png',  '2026-06-26T17:00:00-06:00', 'pending', false, 'group', 'C', 'Grupo C · Jornada 3'),
('Marruecos','Croacia',  'https://a.espncdn.com/i/teamlogos/soccer/500/3613.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3902.png', '2026-06-26T17:00:00-06:00', 'pending', false, 'group', 'C', 'Grupo C · Jornada 3'),

-- GRUPO D: Argentina, Chile, Japón, Argelia
('Argentina', 'Chile',   'https://a.espncdn.com/i/teamlogos/soccer/500/2755.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3293.png', '2026-06-13T18:00:00-05:00', 'pending', false, 'group', 'D', 'Grupo D · Jornada 1'),
('Japón',    'Argelia',  'https://a.espncdn.com/i/teamlogos/soccer/500/3580.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3630.png', '2026-06-13T21:00:00-05:00', 'pending', false, 'group', 'D', 'Grupo D · Jornada 1'),
('Argentina', 'Japón',   'https://a.espncdn.com/i/teamlogos/soccer/500/2755.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3580.png', '2026-06-20T18:00:00-05:00', 'pending', false, 'group', 'D', 'Grupo D · Jornada 2'),
('Chile',    'Argelia',  'https://a.espncdn.com/i/teamlogos/soccer/500/3293.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3630.png', '2026-06-20T21:00:00-05:00', 'pending', false, 'group', 'D', 'Grupo D · Jornada 2'),
('Argentina', 'Argelia', 'https://a.espncdn.com/i/teamlogos/soccer/500/2755.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3630.png', '2026-06-27T17:00:00-05:00', 'pending', false, 'group', 'D', 'Grupo D · Jornada 3'),
('Chile',    'Japón',    'https://a.espncdn.com/i/teamlogos/soccer/500/3293.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3580.png', '2026-06-27T17:00:00-05:00', 'pending', false, 'group', 'D', 'Grupo D · Jornada 3'),

-- GRUPO E: Francia, Uruguay, Senegal, Países Bajos
('Francia',       'Uruguay',  'https://a.espncdn.com/i/teamlogos/soccer/500/577.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/2768.png', '2026-06-13T18:00:00-06:00', 'pending', false, 'group', 'E', 'Grupo E · Jornada 1'),
('Senegal',       'Países Bajos', 'https://a.espncdn.com/i/teamlogos/soccer/500/3618.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/660.png', '2026-06-13T21:00:00-06:00', 'pending', false, 'group', 'E', 'Grupo E · Jornada 1'),
('Francia',       'Senegal',  'https://a.espncdn.com/i/teamlogos/soccer/500/577.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3618.png', '2026-06-20T18:00:00-06:00', 'pending', false, 'group', 'E', 'Grupo E · Jornada 2'),
('Uruguay',       'Países Bajos', 'https://a.espncdn.com/i/teamlogos/soccer/500/2768.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/660.png', '2026-06-20T21:00:00-06:00', 'pending', false, 'group', 'E', 'Grupo E · Jornada 2'),
('Francia',       'Países Bajos', 'https://a.espncdn.com/i/teamlogos/soccer/500/577.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/660.png', '2026-06-27T17:00:00-06:00', 'pending', false, 'group', 'E', 'Grupo E · Jornada 3'),
('Uruguay',       'Senegal',  'https://a.espncdn.com/i/teamlogos/soccer/500/2768.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3618.png', '2026-06-27T17:00:00-06:00', 'pending', false, 'group', 'E', 'Grupo E · Jornada 3'),

-- GRUPO F: España, Perú, Nigeria, Suiza
('España',  'Perú',    'https://a.espncdn.com/i/teamlogos/soccer/500/164.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3253.png', '2026-06-14T18:00:00-05:00', 'pending', false, 'group', 'F', 'Grupo F · Jornada 1'),
('Nigeria', 'Suiza',   'https://a.espncdn.com/i/teamlogos/soccer/500/3621.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3812.png', '2026-06-14T21:00:00-05:00', 'pending', false, 'group', 'F', 'Grupo F · Jornada 1'),
('España',  'Nigeria', 'https://a.espncdn.com/i/teamlogos/soccer/500/164.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3621.png', '2026-06-21T18:00:00-05:00', 'pending', false, 'group', 'F', 'Grupo F · Jornada 2'),
('Perú',    'Suiza',   'https://a.espncdn.com/i/teamlogos/soccer/500/3253.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3812.png', '2026-06-21T21:00:00-05:00', 'pending', false, 'group', 'F', 'Grupo F · Jornada 2'),
('España',  'Suiza',   'https://a.espncdn.com/i/teamlogos/soccer/500/164.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3812.png', '2026-06-28T17:00:00-05:00', 'pending', false, 'group', 'F', 'Grupo F · Jornada 3'),
('Perú',    'Nigeria', 'https://a.espncdn.com/i/teamlogos/soccer/500/3253.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3621.png', '2026-06-28T17:00:00-05:00', 'pending', false, 'group', 'F', 'Grupo F · Jornada 3'),

-- GRUPO G: Brasil, Colombia, Costa de Marfil, Camerún
('Brasil',          'Colombia',        'https://a.espncdn.com/i/teamlogos/soccer/500/2760.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3250.png', '2026-06-14T18:00:00-06:00', 'pending', false, 'group', 'G', 'Grupo G · Jornada 1'),
('Costa de Marfil', 'Camerún',         'https://a.espncdn.com/i/teamlogos/soccer/500/3609.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3606.png', '2026-06-14T21:00:00-06:00', 'pending', false, 'group', 'G', 'Grupo G · Jornada 1'),
('Brasil',          'Costa de Marfil', 'https://a.espncdn.com/i/teamlogos/soccer/500/2760.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3609.png', '2026-06-21T18:00:00-06:00', 'pending', false, 'group', 'G', 'Grupo G · Jornada 2'),
('Colombia',        'Camerún',         'https://a.espncdn.com/i/teamlogos/soccer/500/3250.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3606.png', '2026-06-21T21:00:00-06:00', 'pending', false, 'group', 'G', 'Grupo G · Jornada 2'),
('Brasil',          'Camerún',         'https://a.espncdn.com/i/teamlogos/soccer/500/2760.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3606.png', '2026-06-28T17:00:00-06:00', 'pending', false, 'group', 'G', 'Grupo G · Jornada 3'),
('Colombia',        'Costa de Marfil', 'https://a.espncdn.com/i/teamlogos/soccer/500/3250.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3609.png', '2026-06-28T17:00:00-06:00', 'pending', false, 'group', 'G', 'Grupo G · Jornada 3'),

-- GRUPO H: Portugal, Corea del Sur, Australia, Ghana
('Portugal',      'Corea del Sur', 'https://a.espncdn.com/i/teamlogos/soccer/500/574.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3583.png', '2026-06-15T18:00:00-05:00', 'pending', false, 'group', 'H', 'Grupo H · Jornada 1'),
('Australia',     'Ghana',         'https://a.espncdn.com/i/teamlogos/soccer/500/3577.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3612.png', '2026-06-15T21:00:00-05:00', 'pending', false, 'group', 'H', 'Grupo H · Jornada 1'),
('Portugal',      'Australia',     'https://a.espncdn.com/i/teamlogos/soccer/500/574.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3577.png', '2026-06-22T18:00:00-05:00', 'pending', false, 'group', 'H', 'Grupo H · Jornada 2'),
('Corea del Sur', 'Ghana',         'https://a.espncdn.com/i/teamlogos/soccer/500/3583.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3612.png', '2026-06-22T21:00:00-05:00', 'pending', false, 'group', 'H', 'Grupo H · Jornada 2'),
('Portugal',      'Ghana',         'https://a.espncdn.com/i/teamlogos/soccer/500/574.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3612.png', '2026-06-29T17:00:00-05:00', 'pending', false, 'group', 'H', 'Grupo H · Jornada 3'),
('Corea del Sur', 'Australia',     'https://a.espncdn.com/i/teamlogos/soccer/500/3583.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3577.png', '2026-06-29T17:00:00-05:00', 'pending', false, 'group', 'H', 'Grupo H · Jornada 3'),

-- GRUPO I: Inglaterra, Arabia Saudita, Serbia, Dinamarca
('Inglaterra',    'Arabia Saudita', 'https://a.espncdn.com/i/teamlogos/soccer/500/4716.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3591.png', '2026-06-15T18:00:00-06:00', 'pending', false, 'group', 'I', 'Grupo I · Jornada 1'),
('Serbia',        'Dinamarca',      'https://a.espncdn.com/i/teamlogos/soccer/500/9759.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3526.png', '2026-06-15T21:00:00-06:00', 'pending', false, 'group', 'I', 'Grupo I · Jornada 1'),
('Inglaterra',    'Serbia',         'https://a.espncdn.com/i/teamlogos/soccer/500/4716.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9759.png', '2026-06-22T18:00:00-06:00', 'pending', false, 'group', 'I', 'Grupo I · Jornada 2'),
('Arabia Saudita','Dinamarca',      'https://a.espncdn.com/i/teamlogos/soccer/500/3591.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3526.png', '2026-06-22T21:00:00-06:00', 'pending', false, 'group', 'I', 'Grupo I · Jornada 2'),
('Inglaterra',    'Dinamarca',      'https://a.espncdn.com/i/teamlogos/soccer/500/4716.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3526.png', '2026-06-29T17:00:00-06:00', 'pending', false, 'group', 'I', 'Grupo I · Jornada 3'),
('Arabia Saudita','Serbia',         'https://a.espncdn.com/i/teamlogos/soccer/500/3591.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/9759.png', '2026-06-29T17:00:00-06:00', 'pending', false, 'group', 'I', 'Grupo I · Jornada 3'),

-- GRUPO J: Alemania, Escocia, Turquía, Polonia
('Alemania', 'Escocia', 'https://a.espncdn.com/i/teamlogos/soccer/500/516.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3568.png', '2026-06-16T18:00:00-05:00', 'pending', false, 'group', 'J', 'Grupo J · Jornada 1'),
('Turquía',  'Polonia', 'https://a.espncdn.com/i/teamlogos/soccer/500/1318.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3543.png', '2026-06-16T21:00:00-05:00', 'pending', false, 'group', 'J', 'Grupo J · Jornada 1'),
('Alemania', 'Turquía', 'https://a.espncdn.com/i/teamlogos/soccer/500/516.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/1318.png', '2026-06-23T18:00:00-05:00', 'pending', false, 'group', 'J', 'Grupo J · Jornada 2'),
('Escocia',  'Polonia', 'https://a.espncdn.com/i/teamlogos/soccer/500/3568.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3543.png', '2026-06-23T21:00:00-05:00', 'pending', false, 'group', 'J', 'Grupo J · Jornada 2'),
('Alemania', 'Polonia', 'https://a.espncdn.com/i/teamlogos/soccer/500/516.png',  'https://a.espncdn.com/i/teamlogos/soccer/500/3543.png', '2026-06-30T17:00:00-05:00', 'pending', false, 'group', 'J', 'Grupo J · Jornada 3'),
('Escocia',  'Turquía', 'https://a.espncdn.com/i/teamlogos/soccer/500/3568.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/1318.png', '2026-06-30T17:00:00-05:00', 'pending', false, 'group', 'J', 'Grupo J · Jornada 3'),

-- GRUPO K: Italia, Albania, Egipto, Irán
('Italia',  'Albania', 'https://a.espncdn.com/i/teamlogos/soccer/500/4701.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3499.png', '2026-06-16T18:00:00-06:00', 'pending', false, 'group', 'K', 'Grupo K · Jornada 1'),
('Egipto',  'Irán',    'https://a.espncdn.com/i/teamlogos/soccer/500/3609.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3573.png', '2026-06-16T21:00:00-06:00', 'pending', false, 'group', 'K', 'Grupo K · Jornada 1'),
('Italia',  'Egipto',  'https://a.espncdn.com/i/teamlogos/soccer/500/4701.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3609.png', '2026-06-23T18:00:00-06:00', 'pending', false, 'group', 'K', 'Grupo K · Jornada 2'),
('Albania', 'Irán',    'https://a.espncdn.com/i/teamlogos/soccer/500/3499.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3573.png', '2026-06-23T21:00:00-06:00', 'pending', false, 'group', 'K', 'Grupo K · Jornada 2'),
('Italia',  'Irán',    'https://a.espncdn.com/i/teamlogos/soccer/500/4701.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3573.png', '2026-06-30T17:00:00-06:00', 'pending', false, 'group', 'K', 'Grupo K · Jornada 3'),
('Albania', 'Egipto',  'https://a.espncdn.com/i/teamlogos/soccer/500/3499.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3609.png', '2026-06-30T17:00:00-06:00', 'pending', false, 'group', 'K', 'Grupo K · Jornada 3'),

-- GRUPO L: Qatar, Eslovenia, Sudáfrica, Nueva Zelanda
('Qatar',       'Eslovenia',    'https://a.espncdn.com/i/teamlogos/soccer/500/3572.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3808.png', '2026-06-17T18:00:00-05:00', 'pending', false, 'group', 'L', 'Grupo L · Jornada 1'),
('Sudáfrica',   'Nueva Zelanda','https://a.espncdn.com/i/teamlogos/soccer/500/3628.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3587.png', '2026-06-17T21:00:00-05:00', 'pending', false, 'group', 'L', 'Grupo L · Jornada 1'),
('Qatar',       'Sudáfrica',    'https://a.espncdn.com/i/teamlogos/soccer/500/3572.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3628.png', '2026-06-24T18:00:00-05:00', 'pending', false, 'group', 'L', 'Grupo L · Jornada 2'),
('Eslovenia',   'Nueva Zelanda','https://a.espncdn.com/i/teamlogos/soccer/500/3808.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3587.png', '2026-06-24T21:00:00-05:00', 'pending', false, 'group', 'L', 'Grupo L · Jornada 2'),
('Qatar',       'Nueva Zelanda','https://a.espncdn.com/i/teamlogos/soccer/500/3572.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3587.png', '2026-07-01T17:00:00-05:00', 'pending', false, 'group', 'L', 'Grupo L · Jornada 3'),
('Eslovenia',   'Sudáfrica',    'https://a.espncdn.com/i/teamlogos/soccer/500/3808.png', 'https://a.espncdn.com/i/teamlogos/soccer/500/3628.png', '2026-07-01T17:00:00-05:00', 'pending', false, 'group', 'L', 'Grupo L · Jornada 3');

-- ──────────────────────────────
-- OCTAVOS DE FINAL R32 (16 partidos) — equipos TBD
-- Jul 2–7
-- ──────────────────────────────
INSERT INTO public.matches (home_team, away_team, logo_home, logo_away, match_date, status, predictions_locked, phase, ronda) VALUES
('1A', '2B', '', '', '2026-07-02T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1C', '2D', '', '', '2026-07-02T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1B', '2A', '', '', '2026-07-03T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1D', '2C', '', '', '2026-07-03T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1E', '2F', '', '', '2026-07-04T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1G', '2H', '', '', '2026-07-04T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1F', '2E', '', '', '2026-07-05T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1H', '2G', '', '', '2026-07-05T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1I', '2J', '', '', '2026-07-06T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1K', '2L', '', '', '2026-07-06T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1J', '2I', '', '', '2026-07-07T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('1L', '2K', '', '', '2026-07-07T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('3º mejor', '3º mejor', '', '', '2026-07-08T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('3º mejor', '3º mejor', '', '', '2026-07-08T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('3º mejor', '3º mejor', '', '', '2026-07-09T18:00:00Z', 'pending', false, 'R32', 'Octavos de Final'),
('3º mejor', '3º mejor', '', '', '2026-07-09T22:00:00Z', 'pending', false, 'R32', 'Octavos de Final');

-- ──────────────────────────────
-- CUARTOS DE FINAL (8 partidos) — Jul 11–13
-- ──────────────────────────────
INSERT INTO public.matches (home_team, away_team, logo_home, logo_away, match_date, status, predictions_locked, phase, ronda) VALUES
('G1 R32', 'G2 R32', '', '', '2026-07-11T18:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G3 R32', 'G4 R32', '', '', '2026-07-11T22:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G5 R32', 'G6 R32', '', '', '2026-07-12T18:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G7 R32', 'G8 R32', '', '', '2026-07-12T22:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G9 R32',  'G10 R32', '', '', '2026-07-13T18:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G11 R32', 'G12 R32', '', '', '2026-07-13T22:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G13 R32', 'G14 R32', '', '', '2026-07-14T18:00:00Z', 'pending', false, 'R16', 'Cuartos de Final'),
('G15 R32', 'G16 R32', '', '', '2026-07-14T22:00:00Z', 'pending', false, 'R16', 'Cuartos de Final');

-- ──────────────────────────────
-- SEMIFINALES (4 partidos) — Jul 15–16
-- ──────────────────────────────
INSERT INTO public.matches (home_team, away_team, logo_home, logo_away, match_date, status, predictions_locked, phase, ronda) VALUES
('SF1', 'SF2', '', '', '2026-07-15T18:00:00Z', 'pending', false, 'QF', 'Cuartos de Final'),
('SF3', 'SF4', '', '', '2026-07-15T22:00:00Z', 'pending', false, 'QF', 'Cuartos de Final'),
('SF5', 'SF6', '', '', '2026-07-16T18:00:00Z', 'pending', false, 'QF', 'Cuartos de Final'),
('SF7', 'SF8', '', '', '2026-07-16T22:00:00Z', 'pending', false, 'QF', 'Cuartos de Final');

-- ──────────────────────────────
-- SEMIFINALES (2 partidos) — Jul 18–19
-- ──────────────────────────────
INSERT INTO public.matches (home_team, away_team, logo_home, logo_away, match_date, status, predictions_locked, phase, ronda) VALUES
('Semifinalista 1', 'Semifinalista 2', '', '', '2026-07-18T18:00:00Z', 'pending', false, 'SF', 'Semifinal'),
('Semifinalista 3', 'Semifinalista 4', '', '', '2026-07-19T18:00:00Z', 'pending', false, 'SF', 'Semifinal');

-- ──────────────────────────────
-- 3ER PUESTO + FINAL — Jul 22 + 26
-- ──────────────────────────────
INSERT INTO public.matches (home_team, away_team, logo_home, logo_away, match_date, status, predictions_locked, phase, ronda) VALUES
('3er Lugar A', '3er Lugar B', '', '', '2026-07-25T15:00:00Z', 'pending', false, '3rd', 'Tercer Puesto'),
('Finalista 1',  'Finalista 2',  '', '', '2026-07-26T15:00:00Z', 'pending', false, 'F',   'Final · MetLife Stadium, Nueva York');
