-- ============================================================
-- Migration 008 — Replace trivia questions (42 custom questions)
-- + Add optional "note" column for post-answer feedback
-- ============================================================

ALTER TABLE public.trivia_questions
  ADD COLUMN IF NOT EXISTS note text;

-- Replace all previous questions
DELETE FROM public.daily_responses;   -- clear answers that referenced old IDs
DELETE FROM public.trivia_questions;

INSERT INTO public.trivia_questions (id, question, options, correct_index, note) VALUES
(1,  '¿Quién es el jugador latino que ha anotado más goles en la historia de los mundiales?',
 ARRAY['Messi','Ronaldo Nazário','Maradona','Gabriel Batistuta'], 1, NULL),

(2,  '¿Cómo se llamó la mascota de la Copa Mundial de 1982 en España?',
 ARRAY['Fuleco','Pique','Barcelonita','Naranjito'], 3, NULL),

(3,  'En el Mundial de México 1986, Diego Maradona anotó un gol con la mano conocido como "la mano de Dios". ¿Contra qué equipo marcó ese famoso tanto?',
 ARRAY['Inglaterra','Italia','Brasil','México'], 0, NULL),

(4,  '¿Dónde se disputó la Copa Mundial de 1998?',
 ARRAY['Estados Unidos','Italia','Francia','Alemania'], 2, NULL),

(5,  '¿Quién fue el jugador que marcó el gol que le dio el triunfo a España en la final de la Copa del Mundo del 2010 en Sudáfrica?',
 ARRAY['Andrés Iniesta','Lionel Messi','Raúl González','James Rodríguez'], 0, NULL),

(6,  '¿Cuál es la selección que más títulos ha ganado en la Copa Mundial?',
 ARRAY['Alemania','Brasil','Inglaterra','España'], 1, NULL),

(7,  '¿Qué futbolista se adjudicó la Bota de Oro en el Mundial de la FIFA Brasil 2014 tras anotar 6 goles, incluyendo uno destacado frente a Uruguay?',
 ARRAY['Neymar Jr.','Lionel Messi','Thomas Müller','James Rodríguez'], 3, NULL),

(8,  '¿Qué selección nacional ostenta el título de campeón vigente de la Copa Mundial de la FIFA tras su victoria en Catar 2022?',
 ARRAY['Brasil','Argentina','Alemania','Francia'], 1, NULL),

(9,  '¿En cuántas ediciones de la Copa Mundial de la FIFA ha participado la selección de Colombia hasta la fecha?',
 ARRAY['4','5','6','7'], 2, NULL),

(10, '¿Cuál de los siguientes es el partido con mayor cantidad de goles anotados en la historia de los Mundiales de la FIFA?',
 ARRAY['Australia 31-0 Samoa Americana (2001)','Austria 7-5 Suiza (Suiza 1954)','Hungría 10-1 El Salvador (España 1982)','AS Adema 149-0 SO l''Emyrne (2002)'], 1, NULL),

(11, '¿Quién es el único futbolista en toda la historia que ha ganado tres Copas del Mundo de la FIFA como jugador?',
 ARRAY['Diego Maradona','Pelé','Lionel Messi','Cafú'], 1, NULL),

(12, '¿Qué selección nacional ostenta el récord de haber perdido la mayor cantidad de finales en la historia de las Copas del Mundo?',
 ARRAY['Argentina','Países Bajos (Holanda)','Alemania','Italia'], 2,
 'Aunque el mito popular señala a Países Bajos, la respuesta correcta es Alemania, que ha perdido 4 finales (1966, 1982, 1986 y 2002), compensadas con otras 4 victorias.'),

(13, '¿Cuál de las siguientes selecciones de fútbol NUNCA ha logrado clasificar a una Copa Mundial de la FIFA en toda su historia?',
 ARRAY['Bolivia','Venezuela','Cuba','Haití'], 1, NULL),

(14, '¿A qué confederación de fútbol pertenece actualmente la selección de Australia para disputar sus eliminatorias mundialistas?',
 ARRAY['OFC (Confederación de Fútbol de Oceanía)','AFC (Confederación Asiática de Fútbol)','UEFA (Unión de Federaciones Europeas de Fútbol)','CAF (Confederación Africana de Fútbol)'], 1,
 'Desde 2006 Australia compite en la AFC (Asia). Se cambiaron de confederación buscando un nivel más alto y plazas de clasificación directa al Mundial.'),

(15, '¿Quién es el máximo goleador de la Selección Colombia en la historia de las Copas Mundiales de la FIFA?',
 ARRAY['Radamel Falcao García','Carlos "El Pibe" Valderrama','James Rodríguez','Arnoldo Iguarán'], 2, NULL),

(16, '¿Quién fue el arquero titular que defendió la portería de la Selección Colombia durante el Mundial de Rusia 2018?',
 ARRAY['Faryd Mondragón','Camilo Vargas','David Ospina','René Higuita'], 2, NULL),

(17, '¿Cuál de las siguientes selecciones nacionales NUNCA se ha enfrentado a la Selección Colombia en la fase final de una Copa Mundial de la FIFA?',
 ARRAY['Camerún','México','Túnez','Senegal'], 1, NULL),

(18, '¿En cuál de las siguientes ediciones de la Copa Mundial de la FIFA la Selección Colombia vistió una camiseta de color rojo en sus partidos?',
 ARRAY['Italia 1990','Francia 1998','Brasil 2014','En ninguna, Colombia nunca ha usado rojo en un Mundial.'], 0, NULL),

(19, '¿En qué proceso de Eliminatorias Sudamericanas la Selección Colombia se quedó fuera del Mundial únicamente por un gol de diferencia en la tabla de posiciones?',
 ARRAY['Eliminatorias a Corea-Japón 2002','Eliminatorias a Alemania 2006','Eliminatorias a Sudáfrica 2010','Eliminatorias a Qatar 2022'], 0, NULL),

(20, '¿Qué es formalmente un Mundial de Fútbol y cada cuántos años se organiza su fase final?',
 ARRAY['Un torneo anual donde compiten los mejores clubes de Europa y Sudamérica.','El torneo oficial de la FIFA que reúne a las mejores selecciones nacionales del mundo cada 4 años.','Un campeonato juvenil organizado por el Comité Olímpico Internacional cada 2 años.','Un torneo de exhibición de selecciones que se juega únicamente en veranos europeos.'], 1, NULL),

(21, '¿Qué nombre recibe el partido que ostenta el récord absoluto con 16 tarjetas amarillas y 4 tarjetas rojas en un Mundial?',
 ARRAY['La batalla de Santiago (Chile vs. Italia, 1962)','La batalla de Núremberg (Portugal vs. Países Bajos, 2006)','La batalla de Berna (Brasil vs. Hungría, 1954)','La batalla de Lusail (Argentina vs. Países Bajos, 2022)'], 1, NULL),

(22, '¿Cuál ha sido el peor Mundial en la historia de la Selección Colombia por posición final y cantidad de derrotas?',
 ARRAY['Chile 1962','Estados Unidos 1994','Francia 1998','Italia 1990'], 1, NULL),

(23, '¿Qué selección clasificó al Mundial de Brasil 1950 pero se retiró porque la FIFA les prohibió jugar descalzos?',
 ARRAY['India','Escocia','Turquía','Paquistán'], 0, NULL),

(24, '¿Cuál de las siguientes artistas colombianas interpretó el "Waka Waka (Esto es África)", la canción oficial más famosa de un Mundial?',
 ARRAY['Karol G','Shakira','Greeicy Rendón','Fanny Lu'], 1, NULL),

(25, '¿De qué color es la camiseta secundaria (visitante) que usa la Selección Colombia cuando no puede usar la amarilla?',
 ARRAY['Verde','Azul','Negra','Naranja'], 1, NULL),

(26, '¿Cuál es la marca de bebida patrocinadora oficial de la Selección Colombia por décadas, famosa por sus comerciales en los Mundiales?',
 ARRAY['Coca-Cola','Cerveza Águila','Postobón','Pony Malta'], 1, NULL),

(27, '¿Cuál es actualmente el jugador más valioso y con mayor expectativa en la Selección Colombia según su mercado internacional?',
 ARRAY['James Rodríguez','Luis Díaz','Richard Ríos','Jhon Durán'], 1, NULL),

(28, '¿Cuál es la superestrella del fútbol mundial, famoso por su número 10, que es el capitán de la Selección de Argentina?',
 ARRAY['Cristiano Ronaldo','Lionel Messi','Neymar Jr.','Kylian Mbappé'], 1, NULL),

(29, '¿Cómo se llama el famoso futbolista portugués conocido como "CR7", que celebra sus goles saltando y gritando "¡SIUUU!"?',
 ARRAY['Lionel Messi','Kylian Mbappé','Cristiano Ronaldo','Neymar Jr.'], 2, NULL),

(30, 'El Mundial de 2026 es histórico porque se organiza en tres países. ¿Cuáles son los 3 países anfitriones?',
 ARRAY['Brasil, México y Canadá','Estados Unidos, México y Canadá','Estados Unidos, México y Costa Rica','Catar, Arabia Saudita y Canadá'], 1, NULL),

(31, '¿Cuántos arqueros (porteros) está obligado a llevar cada selección en su lista oficial de convocados para un Mundial de Fútbol?',
 ARRAY['2 arqueros','3 arqueros','4 arqueros','5 arqueros'], 1, NULL),

(32, '¿Quién fue el legendario número 10 y capitán de la Selección Colombia durante la histórica década de los años 90?',
 ARRAY['Freddy Rincón','Carlos "El Pibe" Valderrama','Faustino "El Tino" Asprilla','Adolfo "El Tren" Valencia'], 1, NULL),

(33, '¿A qué famosa selección europea se le asignó el apodo de "La Naranja Mecánica" por su uniforme de color naranja brillante?',
 ARRAY['Alemania','Países Bajos (Holanda)','Bélgica','España'], 1, NULL),

(34, '¿Cuál fue la primera selección del mundo en asegurar su cupo para el Mundial de 2026?',
 ARRAY['Argentina','Francia','Japón','Brasil'], 2, NULL),

(35, '¿Cuál de las siguientes opciones contiene tres países que hacen su debut absoluto en este Mundial?',
 ARRAY['Jamaica, Honduras y Panamá','Catar, Islandia y Angola','Cabo Verde, Curazao y Uzbekistán','Haití, Irak y Noruega'], 2, NULL),

(36, '¿Qué selección africana fue la gran revelación del Mundial Corea-Japón 2002 al derrotar al campeón vigente (Francia) en el partido inaugural?',
 ARRAY['Camerún','Senegal','Nigeria','Ghana'], 1, NULL),

(37, '¿Cuáles son los únicos tres países de Sudamérica que han logrado coronarse campeones mundiales?',
 ARRAY['Brasil, Argentina y Colombia','Brasil, Argentina y Uruguay','Argentina, Uruguay y Chile','Brasil, Uruguay y Chile'], 1, NULL),

(38, 'La recordada jugada del gol anulado "Era gol de Yepes". ¿Contra qué país perdió Colombia ese famoso partido?',
 ARRAY['Alemania','Brasil','Perú','Austria'], 1, NULL),

(39, 'El Mundial de 2026 se celebra en tres países. ¿Cuántas mascotas oficiales tiene esta Copa del Mundo en total?',
 ARRAY['1 mascota','2 mascotas','3 mascotas','4 mascotas'], 2, NULL),

(40, 'Este Mundial tuvo los horarios más locos: tocaba madrugar a las 4:00 a.m. o 6:00 a.m. a ver los partidos. ¿A cuál Copa del Mundo nos referimos?',
 ARRAY['Qatar 2022','Corea-Japón 2002','Italia 1990','Sudáfrica 2010'], 1, NULL),

(41, '¿En qué Copa del Mundo se aplicó por primera vez la regla del fuera de lugar (offside)?',
 ARRAY['En el primer Mundial de la historia (Uruguay 1930)','En Inglaterra 1966','En México 1970','En Estados Unidos 1994'], 0, NULL),

(42, '¿En qué Copa del Mundo se utilizaron por primera vez las tarjetas amarillas y rojas?',
 ARRAY['Uruguay 1930','Inglaterra 1966','México 1970','Alemania 1974'], 2, NULL)

ON CONFLICT (id) DO UPDATE SET
  question     = EXCLUDED.question,
  options      = EXCLUDED.options,
  correct_index = EXCLUDED.correct_index,
  note         = EXCLUDED.note;
