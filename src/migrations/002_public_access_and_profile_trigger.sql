-- 002: Public access policies + ensure profiles auto-created for new auth users

-- Ensure profiles auto-created on auth.users insert
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

-- Backfill profiles for any existing auth users (safe to run multiple times)
insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
on conflict (id) do update set email = excluded.email;

-- Public (open) write policies requested: allow everyone (anon + authenticated) with check true.
-- NOTE: This makes these tables writable by anyone who has your anon key.

alter table public.site_flags enable row level security;
drop policy if exists "site_flags_write_admin" on public.site_flags;
drop policy if exists "site_flags_write_open" on public.site_flags;
create policy "site_flags_write_open"
on public.site_flags
for all
to anon, authenticated
using (true)
with check (true);

alter table public.app_pages enable row level security;
drop policy if exists "app_pages_write_admin" on public.app_pages;
drop policy if exists "app_pages_write_open" on public.app_pages;
create policy "app_pages_write_open"
on public.app_pages
for all
to anon, authenticated
using (true)
with check (true);

alter table public.site_content enable row level security;
drop policy if exists "site_content_write_admin" on public.site_content;
drop policy if exists "site_content_write_open" on public.site_content;
create policy "site_content_write_open"
on public.site_content
for all
to anon, authenticated
using (true)
with check (true);

alter table public.media_assets enable row level security;
drop policy if exists "media_assets_write_admin" on public.media_assets;
drop policy if exists "media_assets_write_open" on public.media_assets;
create policy "media_assets_write_open"
on public.media_assets
for all
to anon, authenticated
using (true)
with check (true);

alter table public.readings_snapshots enable row level security;
drop policy if exists "readings_snapshots_write_admin" on public.readings_snapshots;
drop policy if exists "readings_snapshots_write_open" on public.readings_snapshots;
create policy "readings_snapshots_write_open"
on public.readings_snapshots
for all
to anon, authenticated
using (true)
with check (true);

alter table public.sensor_data_snapshots enable row level security;
drop policy if exists "sensor_data_snapshots_write_admin" on public.sensor_data_snapshots;
drop policy if exists "sensor_data_snapshots_write_open" on public.sensor_data_snapshots;
create policy "sensor_data_snapshots_write_open"
on public.sensor_data_snapshots
for all
to anon, authenticated
using (true)
with check (true);

-- Storage open writes for site-media bucket
drop policy if exists "site_media_write_admin" on storage.objects;
drop policy if exists "site_media_write_open" on storage.objects;
create policy "site_media_write_open"
on storage.objects
for all
to anon, authenticated
using (bucket_id = 'site-media')
with check (bucket_id = 'site-media');

