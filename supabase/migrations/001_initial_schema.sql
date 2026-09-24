-- Astro Vega - schema inicial para Supabase
-- Aplicar via Supabase CLI/migrations. Dados privados por usuário autenticado.

create extension if not exists pgcrypto;

create table if not exists public.practitioner_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  professional_title text not null default '',
  email text not null default '',
  phone text not null default '',
  website text not null default '',
  footer_text text not null default '',
  app_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  birth_date date,
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_owner_idx on public.clients(owner_id);
create index if not exists clients_owner_name_idx on public.clients(owner_id, name);

create table if not exists public.charts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  subject_name text not null,
  birth_date date,
  local_time time,
  location_name text not null default '',
  timezone_name text not null default '',
  latitude double precision,
  longitude double precision,
  classic_result jsonb not null,
  modern_result jsonb not null,
  comparison_result jsonb not null,
  schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists charts_owner_created_idx on public.charts(owner_id, created_at desc);
create index if not exists charts_client_idx on public.charts(client_id);

alter table public.practitioner_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.charts enable row level security;

revoke all on table public.practitioner_profiles from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.charts from anon, authenticated;
grant select, insert, update, delete on table public.practitioner_profiles to authenticated;
grant select, insert, update, delete on table public.clients to authenticated;
grant select, insert, update, delete on table public.charts to authenticated;

create policy "practitioner_profiles_select_own"
on public.practitioner_profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "practitioner_profiles_insert_own"
on public.practitioner_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "practitioner_profiles_update_own"
on public.practitioner_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "practitioner_profiles_delete_own"
on public.practitioner_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "clients_select_own"
on public.clients for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "clients_insert_own"
on public.clients for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "clients_update_own"
on public.clients for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "clients_delete_own"
on public.clients for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "charts_select_own"
on public.charts for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "charts_insert_own"
on public.charts for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "charts_update_own"
on public.charts for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "charts_delete_own"
on public.charts for delete to authenticated
using ((select auth.uid()) = owner_id);
