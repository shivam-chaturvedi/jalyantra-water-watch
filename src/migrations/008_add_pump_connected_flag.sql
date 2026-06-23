-- Pump vs non-pump device flag for chart/display logic

alter table public.device_master_data
  add column if not exists is_pump_connected boolean not null default true;
