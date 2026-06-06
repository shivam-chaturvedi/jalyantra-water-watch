-- Device master data (installation-time/static fields)

create table if not exists public.device_master_data (
  device_id text primary key,
  well_depth_m numeric,
  pump_intake_level_m numeric,
  pump_diameter_in numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists device_master_data_set_updated_at on public.device_master_data;
create trigger device_master_data_set_updated_at
before update on public.device_master_data
for each row execute function public.set_updated_at();

alter table public.device_master_data enable row level security;

drop policy if exists "device_master_data_read_all" on public.device_master_data;
create policy "device_master_data_read_all"
on public.device_master_data
for select
to anon, authenticated
using (true);

drop policy if exists "device_master_data_write_admin" on public.device_master_data;
create policy "device_master_data_write_admin"
on public.device_master_data
for all
to anon, authenticated
using (true)
with check (true);

