# Polla Breve - PRD

## Original Problem Statement
Aplicación full-stack "Polla Breve" para pronósticos deportivos. MVP: 5 partidos de Champions League. Diseño premium, minimalista, con toques color morado.
- Autenticación con email/password (login + register), avatar con iniciales y nombre del usuario.
- Tabla `partidos`: id, equipo_local, equipo_visitante, logo_local, logo_visitante, fecha, estado (pendiente/finalizado), goles_real_local, goles_real_visitante.
- Tabla `apuestas/predictions` vinculada a user_id + partido_id.
- Usuarios logueados ingresan marcador (goles local/visitante) y guardan, con feedback "Guardado con éxito" (toast/checkmark).
- Tabla de Posiciones (Ranking): 3 pts marcador exacto, 2 pts ganador correcto, 1 pt acierto de goles de un equipo, 0 sin aciertos.

## User Personas
- **Jugador**: Crea cuenta, ingresa marcadores para los 5 partidos, ve el ranking en tiempo real.
- **Administrador**: Cierra partidos ingresando el resultado real, puede reabrir.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async) + bcrypt + PyJWT (httpOnly cookies samesite=none secure)
- **Frontend**: React 19 + react-router-dom 7 + Tailwind CSS + sonner (toasts) + lucide-react (iconos)
- **DB**: MongoDB collections: `users`, `matches`, `predictions` con UUID strings como IDs.

## Implemented (Feb 2026)
- [x] Auth completo: register, login, logout, /me con cookie httpOnly
- [x] Seed automático del admin y de 5 partidos Champions League al startup
- [x] CRUD de pronósticos (upsert por user+match)
- [x] Endpoint de ranking con cálculo de puntos (3/2/1/0)
- [x] Panel admin: finalizar / reabrir partido (protegido)
- [x] UI premium dark + morado (Outfit + Manrope, glassmorphism, score-inputs custom)
- [x] Toast "Guardado con éxito" + checkmark estado
- [x] Avatar con iniciales en morado, header con nombre y rol
- [x] data-testid en todos los elementos interactivos
- [x] 14/14 tests backend pasando

## Endpoints
- POST /api/auth/register, /login, /logout
- GET /api/auth/me
- GET /api/matches | PUT /api/matches/{id}/result | PUT /api/matches/{id}/reopen
- POST /api/predictions | GET /api/predictions/me
- GET /api/ranking

## Credenciales seed
- Admin: admin@pollabreve.com / Admin123!

## Backlog (P1/P2)
- P1: API real Football-Data.org para auto-poblar partidos y resultados en vivo
- P1: Ligas/grupos privados (invitaciones por código) para competir entre amigos
- P1: Notificaciones por email cuando se cierra un partido y se actualiza el ranking
- P2: Histórico por jornada y gráfica de evolución de puntos
- P2: OAuth Google (Emergent Auth)
- P2: Modo "doble puntos" en jornada final
- P2: Subida de avatar custom

## Next Tasks
1. Pedir feedback al usuario sobre el MVP en preview.
2. Validar si quiere integrar API en vivo o seguir con seed para demo.
3. Implementar grupos/ligas privadas si valida el flujo base.
