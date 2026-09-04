-- Admissions Market schema
-- Run this in Supabase: SQL Editor → New query → paste → Run

create extension if not exists "pgcrypto";

create table if not exists colleges (
  id text primary key,
  name text not null,
  status text not null default 'open'
    check (status in ('open', 'resolved-yes', 'resolved-no')),
  seed_yes integer not null default 50,
  seed_no integer not null default 50
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  balance integer not null default 100,
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  college_id text not null references colleges(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  amount integer not null check (amount > 0),
  payout_rate numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists bets_college_id_idx on bets(college_id);
create index if not exists bets_player_id_idx on bets(player_id);
create index if not exists bets_created_at_idx on bets(created_at desc);

-- Access only via Next.js API routes using the service role key
alter table colleges enable row level security;
alter table players enable row level security;
alter table bets enable row level security;
