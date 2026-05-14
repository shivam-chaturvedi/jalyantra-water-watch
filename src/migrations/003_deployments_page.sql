-- 003: Deployments page content + storage bucket

-- Deployment reports/pages (content stored as JSON, editable from admin)
create table if not exists public.deployments (
  slug text primary key,
  title text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists deployments_set_updated_at on public.deployments;
create trigger deployments_set_updated_at
before update on public.deployments
for each row execute function public.set_updated_at();

alter table public.deployments enable row level security;

-- Public read/write (requested)
drop policy if exists "deployments_read_all" on public.deployments;
create policy "deployments_read_all"
on public.deployments
for select
to anon, authenticated
using (true);

drop policy if exists "deployments_write_open" on public.deployments;
create policy "deployments_write_open"
on public.deployments
for all
to anon, authenticated
using (true)
with check (true);

-- Ensure deployments route exists in page toggles
insert into public.app_pages (path, title, is_enabled, sort_order)
values ('/deployments', 'Deployments', true, 20)
on conflict (path) do nothing;

-- Seed one deployment (empty JSON; content managed from admin)
insert into public.deployments (slug, title, data)
values ('alibaug-raigad', 'Alibaug, Raigad', '{}'::jsonb)
on conflict (slug) do nothing;

-- Storage bucket for deployment assets (images/videos/pdfs)
insert into storage.buckets (id, name, public)
values ('deployments-media', 'deployments-media', true)
on conflict (id) do update set public = excluded.public;

-- Public read
drop policy if exists "deployments_media_read_all" on storage.objects;
create policy "deployments_media_read_all"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'deployments-media');

-- Public write (requested)
drop policy if exists "deployments_media_write_open" on storage.objects;
create policy "deployments_media_write_open"
on storage.objects
for all
to anon, authenticated
using (bucket_id = 'deployments-media')
with check (bucket_id = 'deployments-media');

