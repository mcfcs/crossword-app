-- Krosalita — Multiplayer social batch (chat, reactions, leaderboard/fills,
-- spectator, kick/transfer-host, rematch). Apply after 0001_init.sql.

-- ============================================================
-- game_players: spectator flag + fill count + finish time
-- ============================================================
alter table public.game_players
  add column if not exists is_spectator boolean not null default false,
  add column if not exists fills int not null default 0,
  add column if not exists finished_at timestamptz;

-- ============================================================
-- Chat (persisted for late-joiners; live delivery is via Realtime broadcast)
-- ============================================================
create table if not exists public.game_chat (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  player_id  text not null,
  name       text not null,
  color      text not null,
  text       text not null,
  created_at timestamptz not null default now()
);
create index if not exists game_chat_game_idx on public.game_chat (game_id, created_at);

alter table public.game_chat enable row level security;
-- Guests have no JWT; the 5-digit code is the capability (same model as games).
drop policy if exists chat_read on public.game_chat;
create policy chat_read on public.game_chat for select using (true);
drop policy if exists chat_insert on public.game_chat;
create policy chat_insert on public.game_chat for insert with check (true);

-- ============================================================
-- RPCs
-- ============================================================
-- Fill-count bump (mirrors increment_score).
create or replace function public.increment_fills(p_game uuid, p_player text, p_delta int)
returns void language sql as $$
  update public.game_players set fills = fills + p_delta
  where game_id = p_game and player_id = p_player;
$$;

-- Reset scores/fills/finish on rematch.
create or replace function public.reset_game_players(p_game uuid)
returns void language sql as $$
  update public.game_players set score = 0, fills = 0, finished_at = null
  where game_id = p_game;
$$;
