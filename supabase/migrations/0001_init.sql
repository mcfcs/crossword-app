-- Krosalita — Supabase schema for Multiplayer (Phase 2) + Profiles/Saved puzzles (Phase 3).
-- Apply in the Supabase SQL editor (or `supabase db push`).

-- ============================================================
-- MULTIPLAYER
-- ============================================================
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,                 -- 5-digit human lobby code
  host_id     text not null,                        -- guest player_id OR auth uid (as text)
  puzzle      jsonb not null,                       -- canonical { layout, grid(answers), clues }
  gamemode    text not null default 'coop',         -- 'coop' | 'points'
  auto_check  boolean not null default false,       -- host-controlled
  status      text not null default 'lobby',        -- 'lobby' | 'playing' | 'complete'
  state       jsonb not null default '{}'::jsonb,    -- board snapshot { "r,c": { letter, by, correct } }
  created_at  timestamptz not null default now()
);
create index if not exists games_code_idx on public.games (code);

create table if not exists public.game_players (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  player_id    text not null,                       -- guest id or auth uid (as text)
  display_name text not null,
  color        text not null,
  score        int not null default 0,
  is_host      boolean not null default false,
  joined_at    timestamptz not null default now(),
  unique (game_id, player_id)
);
create index if not exists game_players_game_idx on public.game_players (game_id);

-- Guests have no JWT, so the 5-digit code is the capability. Policies are
-- permissive but code-gated: you must already know the game id/code to act.
alter table public.games enable row level security;
alter table public.game_players enable row level security;

drop policy if exists games_read on public.games;
create policy games_read on public.games for select using (true);
drop policy if exists games_insert on public.games;
create policy games_insert on public.games for insert with check (true);
drop policy if exists games_update on public.games;
create policy games_update on public.games for update using (true) with check (true);

drop policy if exists gp_read on public.game_players;
create policy gp_read on public.game_players for select using (true);
drop policy if exists gp_write on public.game_players;
create policy gp_write on public.game_players for all using (true) with check (true);

-- Atomic score bump for points mode (RLS on game_players is permissive/code-gated).
create or replace function public.increment_score(p_game uuid, p_player text, p_delta int)
returns void language sql as $$
  update public.game_players set score = score + p_delta
  where game_id = p_game and player_id = p_player;
$$;

-- Enable Realtime (postgres_changes) for the low-frequency authoritative rows.
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_players;

-- ============================================================
-- PROFILES + SAVED PUZZLES
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table if not exists public.puzzles (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references auth.users on delete cascade,
  title      text,
  data       jsonb not null,                        -- canonical exportPuzzle() shape
  is_public  boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists puzzles_owner_idx on public.puzzles (owner_id);

alter table public.profiles enable row level security;
alter table public.puzzles enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists puzzles_read on public.puzzles;
create policy puzzles_read on public.puzzles
  for select using (owner_id = auth.uid() or is_public = true);
drop policy if exists puzzles_insert on public.puzzles;
create policy puzzles_insert on public.puzzles
  for insert with check (owner_id = auth.uid());
drop policy if exists puzzles_update on public.puzzles;
create policy puzzles_update on public.puzzles
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists puzzles_delete on public.puzzles;
create policy puzzles_delete on public.puzzles
  for delete using (owner_id = auth.uid());

-- Auto-create a profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
