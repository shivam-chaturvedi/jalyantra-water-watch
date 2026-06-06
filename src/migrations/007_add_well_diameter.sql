-- Add well_diameter_m column to device_master_data
-- Well Diameter (internal bore diameter in metres) is a new device-level field

alter table public.device_master_data
  add column if not exists well_diameter_m numeric;
