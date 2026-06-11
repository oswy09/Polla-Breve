# Polla Breve

Version simplificada para desplegar solo el frontend en Netlify usando Supabase como auth + base de datos.

## Stack

- Frontend: React + CRACO
- Hosting: Netlify
- Backend propio: no requerido
- Datos y auth: Supabase

## Variables de entorno

En Netlify configura las variables del archivo [frontend/.env.example](frontend/.env.example):

- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`

## Configuración de Supabase

1. Crea un proyecto nuevo en Supabase.
2. En `Authentication > Providers > Email`, desactiva `Confirm email` para mantener el flujo básico actual.
3. Abre el SQL Editor y ejecuta [supabase/schema.sql](supabase/schema.sql).
4. Crea un usuario normal desde la app o desde `Authentication > Users`.
5. Para volverlo admin, ejecuta:

```sql
update public.profiles
set role = 'admin', paid = true
where email = 'tu-correo@dominio.com';
```

## Deploy en Netlify

1. Importa la carpeta `frontend` como proyecto en Netlify.
2. Agrega las variables de entorno de Supabase.
3. Build command: `npm run build`
4. Publish directory: `build`
5. Verifica que Netlify detecte [frontend/netlify.toml](frontend/netlify.toml) para redirecciones SPA.
6. Deploy.

## Desarrollo local

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

## Notas

- El panel admin sigue disponible, pero ahora opera directo contra Supabase.
- El borrado de usuario es baja lógica: se oculta el perfil y se eliminan sus pronósticos.
- La carpeta `backend` ya no es necesaria para el deploy de esta versión.
