-- JalYantra: Supabase schema, RLS, storage policies

-- Extensions
create extension if not exists "pgcrypto";

-- Profiles (admin gating)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Site flags (e.g., show/hide sections)
create table if not exists public.site_flags (
  key text primary key,
  value boolean not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_flags_set_updated_at on public.site_flags;
create trigger site_flags_set_updated_at
before update on public.site_flags
for each row execute function public.set_updated_at();

alter table public.site_flags enable row level security;

drop policy if exists "site_flags_read_all" on public.site_flags;
create policy "site_flags_read_all"
on public.site_flags
for select
to anon, authenticated
using (true);

drop policy if exists "site_flags_write_admin" on public.site_flags;
create policy "site_flags_write_admin"
on public.site_flags
for all
to anon, authenticated
using (true)
with check (true);

-- App pages (visibility / ordering)
create table if not exists public.app_pages (
  path text primary key,
  title text not null,
  is_enabled boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists app_pages_set_updated_at on public.app_pages;
create trigger app_pages_set_updated_at
before update on public.app_pages
for each row execute function public.set_updated_at();

alter table public.app_pages enable row level security;

drop policy if exists "app_pages_read_all" on public.app_pages;
create policy "app_pages_read_all"
on public.app_pages
for select
to anon, authenticated
using (true);

drop policy if exists "app_pages_write_admin" on public.app_pages;
create policy "app_pages_write_admin"
on public.app_pages
for all
to anon, authenticated
using (true)
with check (true);

-- Site content blobs (home page / other content as JSON)
create table if not exists public.site_content (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;

drop policy if exists "site_content_read_all" on public.site_content;
create policy "site_content_read_all"
on public.site_content
for select
to anon, authenticated
using (true);

drop policy if exists "site_content_write_admin" on public.site_content;
create policy "site_content_write_admin"
on public.site_content
for all
to anon, authenticated
using (true)
with check (true);

-- Media assets metadata (storage objects live in Storage)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'site-media',
  object_path text not null,
  mime_type text,
  size_bytes bigint,
  alt_text text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.media_assets enable row level security;

drop policy if exists "media_assets_read_all" on public.media_assets;
create policy "media_assets_read_all"
on public.media_assets
for select
to anon, authenticated
using (true);

drop policy if exists "media_assets_write_admin" on public.media_assets;
create policy "media_assets_write_admin"
on public.media_assets
for all
to anon, authenticated
using (true)
with check (true);

-- Data snapshots (to replace Firebase RTDB reads with JSON payloads)
create table if not exists public.readings_snapshots (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.readings_snapshots enable row level security;

drop policy if exists "readings_snapshots_read_all" on public.readings_snapshots;
create policy "readings_snapshots_read_all"
on public.readings_snapshots
for select
to anon, authenticated
using (true);

drop policy if exists "readings_snapshots_write_admin" on public.readings_snapshots;
create policy "readings_snapshots_write_admin"
on public.readings_snapshots
for all
to anon, authenticated
using (true)
with check (true);

create table if not exists public.sensor_data_snapshots (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

alter table public.sensor_data_snapshots enable row level security;

drop policy if exists "sensor_data_snapshots_read_all" on public.sensor_data_snapshots;
create policy "sensor_data_snapshots_read_all"
on public.sensor_data_snapshots
for select
to anon, authenticated
using (true);

drop policy if exists "sensor_data_snapshots_write_admin" on public.sensor_data_snapshots;
create policy "sensor_data_snapshots_write_admin"
on public.sensor_data_snapshots
for all
to anon, authenticated
using (true)
with check (true);

-- Storage bucket + policies
insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = excluded.public;

-- Anyone can read site media (public bucket already, but keep policies explicit)
drop policy if exists "site_media_read_all" on storage.objects;
create policy "site_media_read_all"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'site-media');

-- Only admins can upload/update/delete objects in site-media
drop policy if exists "site_media_write_admin" on storage.objects;
create policy "site_media_write_admin"
on storage.objects
for all
to anon, authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

-- Seed defaults
insert into public.site_flags (key, value)
values
  ('show_deployments', true),
  ('show_validation', false),
  ('show_image_carousel', true)
on conflict (key) do nothing;

insert into public.app_pages (path, title, is_enabled, sort_order)
values
  ('/', 'Home', true, 0),
  ('/dashboard', 'Dashboard', true, 10),
  ('/admin', 'Admin', true, 90)
on conflict (path) do nothing;

insert into public.site_content (key, data)
values
  ('home', '{}'::jsonb)
on conflict (key) do nothing;
