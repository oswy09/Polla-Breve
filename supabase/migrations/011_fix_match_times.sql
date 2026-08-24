-- ============================================================
-- Migration 011 — Corrige horas de partidos a partir del
-- fixture oficial (horas en Colombia, convertidas a UTC +5h)
-- ============================================================

-- Jornada 1
UPDATE matches SET match_date = '2026-06-11 19:00:00+00' WHERE home_team='Mexico' AND away_team='South Africa';
UPDATE matches SET match_date = '2026-06-12 02:00:00+00' WHERE home_team='South Korea' AND away_team='Czech Republic';
UPDATE matches SET match_date = '2026-06-12 19:00:00+00' WHERE home_team='Canada' AND away_team='Bosnia and Herzegovina';
UPDATE matches SET match_date = '2026-06-13 01:00:00+00' WHERE home_team='United States' AND away_team='Paraguay';
UPDATE matches SET match_date = '2026-06-13 19:00:00+00' WHERE home_team='Qatar' AND away_team='Switzerland';
UPDATE matches SET match_date = '2026-06-13 22:00:00+00' WHERE home_team='Brazil' AND away_team='Morocco';
UPDATE matches SET match_date = '2026-06-14 01:00:00+00' WHERE home_team='Haiti' AND away_team='Scotland';
UPDATE matches SET match_date = '2026-06-14 04:00:00+00' WHERE home_team='Australia' AND away_team='Turkey';
UPDATE matches SET match_date = '2026-06-14 17:00:00+00' WHERE home_team='Germany' AND away_team='Curaçao';
UPDATE matches SET match_date = '2026-06-14 20:00:00+00' WHERE home_team='Netherlands' AND away_team='Japan';
UPDATE matches SET match_date = '2026-06-14 23:00:00+00' WHERE home_team='Ivory Coast' AND away_team='Ecuador';
UPDATE matches SET match_date = '2026-06-15 02:00:00+00' WHERE home_team='Sweden' AND away_team='Tunisia';
UPDATE matches SET match_date = '2026-06-15 16:00:00+00' WHERE home_team='Spain' AND away_team='Cape Verde';
UPDATE matches SET match_date = '2026-06-15 19:00:00+00' WHERE home_team='Belgium' AND away_team='Egypt';
UPDATE matches SET match_date = '2026-06-15 22:00:00+00' WHERE home_team='Saudi Arabia' AND away_team='Uruguay';
UPDATE matches SET match_date = '2026-06-16 01:00:00+00' WHERE home_team='Iran' AND away_team='New Zealand';
UPDATE matches SET match_date = '2026-06-16 19:00:00+00' WHERE home_team='France' AND away_team='Senegal';
UPDATE matches SET match_date = '2026-06-16 22:00:00+00' WHERE home_team='Iraq' AND away_team='Norway';
UPDATE matches SET match_date = '2026-06-17 01:00:00+00' WHERE home_team='Argentina' AND away_team='Algeria';
UPDATE matches SET match_date = '2026-06-17 04:00:00+00' WHERE home_team='Austria' AND away_team='Jordan';
UPDATE matches SET match_date = '2026-06-17 17:00:00+00' WHERE home_team='Portugal' AND away_team='Democratic Republic of the Congo';
UPDATE matches SET match_date = '2026-06-17 20:00:00+00' WHERE home_team='England' AND away_team='Croatia';
UPDATE matches SET match_date = '2026-06-17 23:00:00+00' WHERE home_team='Ghana' AND away_team='Panama';
UPDATE matches SET match_date = '2026-06-18 02:00:00+00' WHERE home_team='Uzbekistan' AND away_team='Colombia';

-- Jornada 2
UPDATE matches SET match_date = '2026-06-18 16:00:00+00' WHERE home_team='Czech Republic' AND away_team='South Africa';
UPDATE matches SET match_date = '2026-06-18 19:00:00+00' WHERE home_team='Switzerland' AND away_team='Bosnia and Herzegovina';
UPDATE matches SET match_date = '2026-06-18 22:00:00+00' WHERE home_team='Canada' AND away_team='Qatar';
UPDATE matches SET match_date = '2026-06-19 01:00:00+00' WHERE home_team='Mexico' AND away_team='South Korea';
UPDATE matches SET match_date = '2026-06-19 19:00:00+00' WHERE home_team='United States' AND away_team='Australia';
UPDATE matches SET match_date = '2026-06-19 22:00:00+00' WHERE home_team='Scotland' AND away_team='Morocco';
UPDATE matches SET match_date = '2026-06-20 01:00:00+00' WHERE home_team='Brazil' AND away_team='Haiti';
UPDATE matches SET match_date = '2026-06-20 04:00:00+00' WHERE home_team='Turkey' AND away_team='Paraguay';
UPDATE matches SET match_date = '2026-06-20 19:00:00+00' WHERE home_team='Netherlands' AND away_team='Sweden';
UPDATE matches SET match_date = '2026-06-20 20:00:00+00' WHERE home_team='Germany' AND away_team='Ivory Coast';
UPDATE matches SET match_date = '2026-06-21 00:00:00+00' WHERE home_team='Ecuador' AND away_team='Curaçao';
UPDATE matches SET match_date = '2026-06-21 04:00:00+00' WHERE home_team='Tunisia' AND away_team='Japan';
UPDATE matches SET match_date = '2026-06-21 16:00:00+00' WHERE home_team='Spain' AND away_team='Saudi Arabia';
UPDATE matches SET match_date = '2026-06-21 19:00:00+00' WHERE home_team='Belgium' AND away_team='Iran';
UPDATE matches SET match_date = '2026-06-21 22:00:00+00' WHERE home_team='Uruguay' AND away_team='Cape Verde';
UPDATE matches SET match_date = '2026-06-22 01:00:00+00' WHERE home_team='New Zealand' AND away_team='Egypt';
UPDATE matches SET match_date = '2026-06-22 17:00:00+00' WHERE home_team='Argentina' AND away_team='Austria';
UPDATE matches SET match_date = '2026-06-22 21:00:00+00' WHERE home_team='France' AND away_team='Iraq';
UPDATE matches SET match_date = '2026-06-23 00:00:00+00' WHERE home_team='Norway' AND away_team='Senegal';
UPDATE matches SET match_date = '2026-06-23 03:00:00+00' WHERE home_team='Jordan' AND away_team='Algeria';
UPDATE matches SET match_date = '2026-06-23 17:00:00+00' WHERE home_team='Portugal' AND away_team='Uzbekistan';
UPDATE matches SET match_date = '2026-06-23 20:00:00+00' WHERE home_team='England' AND away_team='Ghana';
UPDATE matches SET match_date = '2026-06-23 23:00:00+00' WHERE home_team='Panama' AND away_team='Croatia';
UPDATE matches SET match_date = '2026-06-24 02:00:00+00' WHERE home_team='Colombia' AND away_team='Democratic Republic of the Congo';

-- Jornada 3
UPDATE matches SET match_date = '2026-06-24 19:00:00+00' WHERE home_team='Switzerland' AND away_team='Canada';
UPDATE matches SET match_date = '2026-06-24 19:00:00+00' WHERE home_team='Bosnia and Herzegovina' AND away_team='Qatar';
UPDATE matches SET match_date = '2026-06-24 22:00:00+00' WHERE home_team='Scotland' AND away_team='Brazil';
UPDATE matches SET match_date = '2026-06-24 22:00:00+00' WHERE home_team='Morocco' AND away_team='Haiti';
UPDATE matches SET match_date = '2026-06-25 01:00:00+00' WHERE home_team='Czech Republic' AND away_team='Mexico';
UPDATE matches SET match_date = '2026-06-25 01:00:00+00' WHERE home_team='South Africa' AND away_team='South Korea';
UPDATE matches SET match_date = '2026-06-25 20:00:00+00' WHERE home_team='Curaçao' AND away_team='Ivory Coast';
UPDATE matches SET match_date = '2026-06-25 20:00:00+00' WHERE home_team='Ecuador' AND away_team='Germany';
UPDATE matches SET match_date = '2026-06-25 23:00:00+00' WHERE home_team='Japan' AND away_team='Sweden';
UPDATE matches SET match_date = '2026-06-25 23:00:00+00' WHERE home_team='Tunisia' AND away_team='Netherlands';
UPDATE matches SET match_date = '2026-06-26 02:00:00+00' WHERE home_team='Turkey' AND away_team='United States';
UPDATE matches SET match_date = '2026-06-26 02:00:00+00' WHERE home_team='Paraguay' AND away_team='Australia';
UPDATE matches SET match_date = '2026-06-26 19:00:00+00' WHERE home_team='Norway' AND away_team='France';
UPDATE matches SET match_date = '2026-06-26 19:00:00+00' WHERE home_team='Senegal' AND away_team='Iraq';
UPDATE matches SET match_date = '2026-06-27 00:00:00+00' WHERE home_team='Cape Verde' AND away_team='Saudi Arabia';
UPDATE matches SET match_date = '2026-06-27 00:00:00+00' WHERE home_team='Uruguay' AND away_team='Spain';
UPDATE matches SET match_date = '2026-06-27 03:00:00+00' WHERE home_team='Egypt' AND away_team='Iran';
UPDATE matches SET match_date = '2026-06-27 03:00:00+00' WHERE home_team='New Zealand' AND away_team='Belgium';
UPDATE matches SET match_date = '2026-06-27 21:00:00+00' WHERE home_team='Panama' AND away_team='England';
UPDATE matches SET match_date = '2026-06-27 21:00:00+00' WHERE home_team='Croatia' AND away_team='Ghana';
UPDATE matches SET match_date = '2026-06-27 23:30:00+00' WHERE home_team='Colombia' AND away_team='Portugal';
UPDATE matches SET match_date = '2026-06-27 23:30:00+00' WHERE home_team='Democratic Republic of the Congo' AND away_team='Uzbekistan';
UPDATE matches SET match_date = '2026-06-28 02:00:00+00' WHERE home_team='Algeria' AND away_team='Austria';
UPDATE matches SET match_date = '2026-06-28 02:00:00+00' WHERE home_team='Jordan' AND away_team='Argentina';
