-- ============================================================
-- Not Me — Supabase Database Schema
-- Execute this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Profiles table (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  xp integer default 0,
  level integer default 1,
  games_played integer default 0,
  games_won integer default 0,
  created_at timestamptz default now(),
  is_admin boolean default false
);

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

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.game_history enable row level security;
alter table public.xp_log enable row level security;

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
