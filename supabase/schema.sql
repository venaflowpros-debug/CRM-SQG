-- Table prospects (CRM Souheil Ecom)
-- Exécuter dans l'éditeur SQL Supabase (nouvelle installation)

create extension if not exists "pgcrypto";

create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  sector text,
  address text,
  phone text,
  has_website text default 'non',
  needs text[] default '{}',
  status text not null default 'non_contacte',
  notes text default '',
  reminder_date date,
  call_notes jsonb default '[]'::jsonb,
  date_added timestamptz not null default now(),
  assigned text default '',
  contract_details jsonb default '{}'::jsonb,
  opening_hours jsonb default '{}'::jsonb,
  script text default '',
  attentes text default '',
  analyse text default '',
  instagram text default '',
  facebook text default '',
  website_url text default '',
  created_at timestamptz not null default now()
);

create index if not exists prospects_status_idx on public.prospects (status);
create index if not exists prospects_reminder_date_idx on public.prospects (reminder_date);
create index if not exists prospects_date_added_idx on public.prospects (date_added desc);

alter table public.prospects enable row level security;

drop policy if exists "prospects_anon_all" on public.prospects;
create policy "prospects_anon_all"
  on public.prospects
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- =============================================================================
-- MIGRATIONS SAFE (bases existantes — ALTER uniquement, aucune perte de données)
-- =============================================================================

alter table public.prospects
  add column if not exists contract_details jsonb default '{}'::jsonb,
  add column if not exists opening_hours jsonb default '{}'::jsonb,
  add column if not exists script text default '',
  add column if not exists attentes text default '',
  add column if not exists analyse text default '',
  add column if not exists instagram text default '',
  add column if not exists facebook text default '',
  add column if not exists website_url text default '',
  add column if not exists added_by text default '';

-- Utilisateurs (login simple — mot de passe en clair côté table, usage interne)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_anon_select" on public.users;
create policy "users_anon_select"
  on public.users
  for select
  to anon, authenticated
  using (true);

-- Comptes équipe (mot de passe commun initial : ecom2024 — à modifier en SQL si besoin)
insert into public.users (username, password)
values
  ('yanis', 'ecom2024'),
  ('souheil', 'ecom2024'),
  ('ilies', 'ecom2024'),
  ('aston', 'ecom2024')
on conflict (username) do nothing;

-- Realtime : activer dans Supabase → Database → Replication → prospects
-- ou exécuter (si la table n'est pas déjà dans la publication) :
-- alter publication supabase_realtime add table public.prospects;
