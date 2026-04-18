-- ============================================================
-- Not Me — Supabase Database Schema
-- Execute this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Profiles table (auto-created on signup via trigger)
-- NOTE: `username` is a display name only — it is NOT unique. Users are
-- identified by `id` (UUID). Two accounts can share a display name, just
-- like two guests can type the same pseudo in the lobby; the game has no
-- lookup path that depends on username uniqueness.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  avatar_url text,
  xp integer default 0,
  level integer default 1,
  games_played integer default 0,
  games_won integer default 0,
  created_at timestamptz default now(),
  is_admin boolean default false
);

-- Drop the legacy UNIQUE constraint if it still exists on a live DB.
-- Safe to re-run; no-op after first execution.
alter table public.profiles drop constraint if exists profiles_username_key;

-- Add avatar_url on existing deployments. Safe to re-run.
alter table public.profiles add column if not exists avatar_url text;

-- 2. Game history
create table if not exists public.game_history (
  id uuid primary key default gen_random_uuid(),
  winner text,
  day_count integer,
  player_count integer,
  duration_ms integer,
  roles jsonb,
  created_at timestamptz default now()
);

-- 3. XP log
create table if not exists public.xp_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  amount integer,
  reason text,
  game_id uuid references public.game_history(id) on delete set null,
  created_at timestamptz default now()
);

-- 4. Post-game survey responses
-- Anonymous allowed: user_id can be null so guests can leave feedback too.
-- rating is 1..5, comment is short free-text, answers is a jsonb bag so
-- we can evolve the questionnaire without DDL every time.
create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  rating integer,
  comment text,
  answers jsonb,
  game_length_days integer,
  player_count integer,
  winning_team text,
  language text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.game_history enable row level security;
alter table public.xp_log enable row level security;
alter table public.surveys enable row level security;

-- Profiles: anyone can read, only owner can update (except is_admin)
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- Game history: anyone can read, authenticated can insert
create policy "Game history is viewable by everyone"
  on public.game_history for select using (true);

create policy "Authenticated users can insert game history"
  on public.game_history for insert with check (auth.role() = 'authenticated');

-- XP log: users can read own, authenticated can insert
create policy "Users can view own XP log"
  on public.xp_log for select using (auth.uid() = user_id);

create policy "Authenticated users can insert XP log"
  on public.xp_log for insert with check (auth.uid() = user_id);

-- Surveys: anyone (incl. guest) can submit. Only the admin dashboard reads.
-- user_id must match auth.uid() when signed-in; guests submit with null.
drop policy if exists "Anyone can submit a survey" on public.surveys;
create policy "Anyone can submit a survey"
  on public.surveys for insert
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Admins can view all surveys" on public.surveys;
create policy "Admins can view all surveys"
  on public.surveys for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============================================================
-- Auto-create profile on signup (trigger)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Avatars storage bucket (public read, owner-only write)
-- ============================================================
-- Run once to provision the `avatars` bucket. The bucket is public so
-- <img src="..."> works without signed URLs. Writes are scoped to the
-- user's own folder: objects live at `<user_id>/avatar-<ts>.<ext>`, and
-- the policies below only let `auth.uid()` touch files whose first path
-- segment matches their ID.
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do update set public = true;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
