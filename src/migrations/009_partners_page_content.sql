-- 009: Partners page CMS content + storage bucket for partner media

-- Ensure Partners route exists in page toggles
insert into public.app_pages (path, title, is_enabled, sort_order)
values ('/partners', 'Partners', true, 25)
on conflict (path) do nothing;

-- Seed partners page content (media URLs managed from Admin)
insert into public.site_content (key, data)
values (
  'partners',
  jsonb_build_object(
    'featuredPartner', jsonb_build_object(
      'interviewVideoUrl', '',
      'galleryImages', jsonb_build_array('', '', '', '')
    )
  )
)
on conflict (key) do nothing;

-- Storage bucket for Partners page assets (images/videos)
insert into storage.buckets (id, name, public)
values ('partners-media', 'partners-media', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "partners_media_read_all" on storage.objects;
create policy "partners_media_read_all"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'partners-media');

drop policy if exists "partners_media_write_open" on storage.objects;
create policy "partners_media_write_open"
on storage.objects
for all
to anon, authenticated
using (bucket_id = 'partners-media')
with check (bucket_id = 'partners-media');
