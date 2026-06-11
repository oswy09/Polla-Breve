create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  paid boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  equipo_local text not null,
  equipo_visitante text not null,
  logo_local text not null,
  logo_visitante text not null,
  fecha timestamptz not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'finalizado')),
  pronosticos_cerrados boolean not null default false,
  goles_real_local integer check (goles_real_local between 0 and 20),
  goles_real_visitante integer check (goles_real_visitante between 0 and 20),
  ronda text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  goles_local integer not null check (goles_local between 0 and 20),
  goles_visitante integer not null check (goles_visitante between 0 and 20),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, match_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  message text not null check (char_length(trim(message)) between 1 and 400),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, role, paid, active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    false,
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(public.profiles.name, excluded.name);

  return new;
end;
$$;

create or replace function public.is_admin(check_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user and role = 'admin' and active = true
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_prediction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin(auth.uid()) then
    new.role = old.role;
    new.paid = old.paid;
    new.active = old.active;
  end if;
  return new;
end;
$$;

drop trigger if exists set_prediction_updated_at on public.predictions;
create trigger set_prediction_updated_at
before update on public.predictions
for each row execute procedure public.set_prediction_updated_at();

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
before update on public.profiles
for each row execute procedure public.protect_profile_fields();

create or replace view public.public_profiles as
select id, name, role, paid, active, created_at
from public.profiles;

alter table public.profiles enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles admin all" on public.profiles;
create policy "profiles admin all"
on public.profiles
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

grant select on public.public_profiles to authenticated;

drop policy if exists "matches public read" on public.matches;
create policy "matches public read"
on public.matches
for select
to authenticated
using (true);

drop policy if exists "matches admin write" on public.matches;
create policy "matches admin write"
on public.matches
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "predictions own read" on public.predictions;
create policy "predictions own read"
on public.predictions
for select
to authenticated
using (
  auth.uid() = user_id
  or public.is_admin(auth.uid())
  or exists (
    select 1
    from public.matches
    where public.matches.id = predictions.match_id
      and (
        public.matches.estado = 'finalizado'
        or (public.matches.goles_real_local is not null and public.matches.goles_real_visitante is not null)
      )
  )
);

drop policy if exists "predictions own write" on public.predictions;
create policy "predictions own write"
on public.predictions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "predictions own update" on public.predictions;
create policy "predictions own update"
on public.predictions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "predictions admin delete" on public.predictions;
create policy "predictions admin delete"
on public.predictions
for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "chat authenticated read" on public.chat_messages;
create policy "chat authenticated read"
on public.chat_messages
for select
to authenticated
using (true);

drop policy if exists "chat authenticated write" on public.chat_messages;
create policy "chat authenticated write"
on public.chat_messages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "chat admin delete" on public.chat_messages;
create policy "chat admin delete"
on public.chat_messages
for delete
to authenticated
using (public.is_admin(auth.uid()));

update public.profiles
set role = 'admin'
where email = 'ichacon@breve.com'
  and active = true;

insert into public.matches (equipo_local, equipo_visitante, logo_local, logo_visitante, fecha, ronda)
select *
from (
  values
    (
      'Paris Saint-Germain',
      'Bayern Munich',
      'https://a.espncdn.com/i/teamlogos/soccer/500/160.png',
      'https://a.espncdn.com/i/teamlogos/soccer/500/132.png',
      '2026-04-28T19:00:00+00:00'::timestamptz,
      'Semifinal · Ida'
    ),
    (
      'Atlético Madrid',
      'Arsenal',
      'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
      'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
      '2026-04-29T19:00:00+00:00'::timestamptz,
      'Semifinal · Ida'
    ),
    (
      'Bayern Munich',
      'Paris Saint-Germain',
      'https://a.espncdn.com/i/teamlogos/soccer/500/132.png',
      'https://a.espncdn.com/i/teamlogos/soccer/500/160.png',
      '2026-05-06T19:00:00+00:00'::timestamptz,
      'Semifinal · Vuelta'
    ),
    (
      'Arsenal',
      'Atlético Madrid',
      'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
      'https://a.espncdn.com/i/teamlogos/soccer/500/1068.png',
      '2026-05-05T19:00:00+00:00'::timestamptz,
      'Semifinal · Vuelta'
    ),
    (
      'Paris Saint-Germain',
      'Arsenal',
      'https://a.espncdn.com/i/teamlogos/soccer/500/160.png',
      'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
      '2026-05-30T16:00:00+00:00'::timestamptz,
      'Final · Puskás Aréna, Budapest'
    )
) as seed(equipo_local, equipo_visitante, logo_local, logo_visitante, fecha, ronda)
where not exists (select 1 from public.matches);

update public.matches
set
  equipo_local = 'Paris Saint-Germain',
  equipo_visitante = 'Arsenal',
  logo_local = 'https://a.espncdn.com/i/teamlogos/soccer/500/160.png',
  logo_visitante = 'https://a.espncdn.com/i/teamlogos/soccer/500/359.png',
  fecha = '2026-05-30T16:00:00+00:00'::timestamptz
where ronda ilike 'Final%';

comment on view public.public_profiles is 'Safe subset of user profile data for ranking, stats and leaderboard queries from the frontend.';