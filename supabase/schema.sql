-- Table prospects (CRM Souheil Ecom)
-- Exécuter dans l'éditeur SQL Supabase

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
  created_at timestamptz not null default now()
);

-- Si la table existe déjà :
-- alter table public.prospects add column if not exists contract_details jsonb default '{}'::jsonb;

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
