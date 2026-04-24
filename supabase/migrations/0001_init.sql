-- Second Guess — initial schema
-- Run this once in your Supabase project (SQL Editor) or via `supabase db push`.

create extension if not exists "pgcrypto";

-- ───────────────────────── tables ─────────────────────────

create table if not exists games (
  id              uuid primary key default gen_random_uuid(),
  code            char(4) not null,
  host_secret     uuid not null default gen_random_uuid(),
  status          text not null default 'lobby'
                    check (status in ('lobby','active','finished')),
  current_round   int not null default 0,
  theme           text not null default 'baby_shower',
  created_at      timestamptz not null default now(),
  ended_at        timestamptz
);

-- Allow code reuse across finished games but not across active ones.
create unique index if not exists games_code_active_idx
  on games (code) where status <> 'finished';

create table if not exists questions (
  id              uuid primary key default gen_random_uuid(),
  game_id         uuid not null references games(id) on delete cascade,
  position        int not null,
  prompt          text not null,
  state           text not null default 'pending'
                    check (state in ('pending','open','closed','reviewing','revealed')),
  opened_at       timestamptz,
  closed_at       timestamptz,
  unique (game_id, position)
);
create index if not exists questions_game_id_idx on questions (game_id);

create table if not exists players (
  id              uuid primary key,
  game_id         uuid not null references games(id) on delete cascade,
  name            text not null,
  avatar          text not null default '🐰',
  joined_at       timestamptz not null default now(),
  last_seen_at    timestamptz not null default now()
);
create unique index if not exists players_game_name_idx
  on players (game_id, lower(name));
create index if not exists players_game_id_idx on players (game_id);

create table if not exists answers (
  id              uuid primary key default gen_random_uuid(),
  question_id     uuid not null references questions(id) on delete cascade,
  player_id       uuid not null references players(id) on delete cascade,
  raw_text        text not null,
  normalized      text not null,
  group_key       text,
  submitted_at    timestamptz not null default now(),
  unique (question_id, player_id)
);
create index if not exists answers_question_id_idx on answers (question_id);

create table if not exists round_scores (
  question_id     uuid not null references questions(id) on delete cascade,
  player_id       uuid not null references players(id) on delete cascade,
  points          int not null,
  rank_group      int,
  primary key (question_id, player_id)
);
create index if not exists round_scores_question_id_idx on round_scores (question_id);

-- ───────────────────────── helpers ─────────────────────────

create or replace view player_totals as
  select p.id as player_id, p.game_id, coalesce(sum(rs.points), 0) as total_points
  from players p
  left join round_scores rs on rs.player_id = p.id
  group by p.id, p.game_id;

-- Atomically rank groups for a question and write round_scores.
create or replace function finalize_question(p_question_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_state text;
begin
  select state into v_state from questions where id = p_question_id;
  if v_state is null then
    raise exception 'no question %', p_question_id;
  end if;
  -- only finalize if currently closed or reviewing
  if v_state not in ('closed','reviewing') then
    return;
  end if;

  delete from round_scores where question_id = p_question_id;

  with groups as (
    select coalesce(group_key, normalized) as gkey, count(*) as cnt
    from answers
    where question_id = p_question_id
    group by coalesce(group_key, normalized)
  ),
  ranked as (
    select gkey, cnt,
           dense_rank() over (order by cnt desc, gkey asc) as rk
    from groups
  )
  insert into round_scores (question_id, player_id, points, rank_group)
  select p_question_id,
         a.player_id,
         case r.rk when 2 then 3 when 3 then 2 when 4 then 1 else 0 end,
         r.rk::int
  from answers a
  join ranked r on r.gkey = coalesce(a.group_key, a.normalized)
  where a.question_id = p_question_id;

  update questions set state = 'revealed' where id = p_question_id;
end;
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table games          enable row level security;
alter table questions      enable row level security;
alter table players        enable row level security;
alter table answers        enable row level security;
alter table round_scores   enable row level security;

-- Anyone with the anon key can read. We rely on the random 4-letter code +
-- random host_secret as the only thing protecting a game; this is acceptable
-- for an ephemeral party game played in the same room.
create policy games_read         on games        for select using (true);
create policy questions_read     on questions    for select using (true);
create policy players_read       on players      for select using (true);
create policy answers_read       on answers      for select using (true);
create policy round_scores_read  on round_scores for select using (true);

-- Writes: clients can insert/update by knowing the relevant ids/secrets.
-- We don't have authenticated users, so these policies are permissive at the
-- DB level; the app enforces the rules (e.g. host actions require the
-- host_secret being passed to RPCs / functions). For a stricter setup, move
-- mutations to Edge Functions and lock these down.
create policy games_insert        on games        for insert with check (true);
create policy games_update        on games        for update using (true) with check (true);

create policy questions_insert    on questions    for insert with check (true);
create policy questions_update    on questions    for update using (true) with check (true);
create policy questions_delete    on questions    for delete using (true);

create policy players_insert      on players      for insert with check (true);
create policy players_update      on players      for update using (true) with check (true);

create policy answers_insert      on answers      for insert with check (true);
create policy answers_update      on answers      for update using (true) with check (true);

create policy round_scores_insert on round_scores for insert with check (true);
create policy round_scores_update on round_scores for update using (true) with check (true);

-- ───────────────────────── realtime ─────────────────────────

-- Enable realtime CDC on the gameplay tables.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'games'
  ) then
    execute 'alter publication supabase_realtime add table games, questions, players, answers, round_scores';
  end if;
end $$;
