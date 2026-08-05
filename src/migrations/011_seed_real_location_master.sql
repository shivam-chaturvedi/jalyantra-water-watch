-- Seed real location data from JalYantra location master spreadsheet
INSERT INTO public.location_master (location_id, village_city, taluka, district, state, latitude, longitude, status)
VALUES
  ('LOC-GULBHELI', 'Gulbheli', 'Motala', 'Buldhana', 'Maharashtra', 20.60, 76.13, 'Active'),
  ('LOC-PANHERA', 'Panhera', 'Malakpur', 'Buldhana', 'Maharashtra', 20.65, 76.08, 'Active'),
  ('LOC-GIROLI', 'Giroli', 'Motala', 'Buldhana', 'Maharashtra', 20.23, 77.48, 'Active'),
  ('LOC-KINHOLA', 'Kinhola', 'Motala', 'Buldhana', 'Maharashtra', 20.66, 76.07, 'Active'),
  ('LOC-TAKLI', 'Takli', 'Motala', 'Buldhana', 'Maharashtra', 20.76, 76.09, 'Inactive'),
  ('LOC-ZIRADPADA', 'Zirad', 'Alibag', 'Raigad', 'Maharashtra', 18.75, 72.90, 'Active'),
  ('LOC-ZIRAD', 'Zirad', 'Alibag', 'Raigad', 'Maharashtra', 18.76, 72.89, 'Active'),
  ('LOC-BHOIR', 'Zirad', 'Alibag', 'Raigad', 'Maharashtra', 18.75, 72.89, 'Active'),
  ('LOC-GOREWADA', 'Nagpur', 'Nagpur', 'Nagpur', 'Maharashtra', 21.20, 79.05, 'Active'),
  ('LOC-SHAKARDHARA', 'Nagpur', 'Nagpur', 'Nagpur', 'Maharashtra', 21.12, 79.11, 'Active')
ON CONFLICT (location_id) DO UPDATE SET
  village_city = EXCLUDED.village_city, taluka = EXCLUDED.taluka, district = EXCLUDED.district,
  state = EXCLUDED.state, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, status = EXCLUDED.status;

-- Map wells to their correct real location (7 of 9 confirmed; WEL-05 pending confirmation, see Change Log doc)
UPDATE public.well_master SET location_id = 'LOC-GULBHELI' WHERE well_id = 'WEL-11';
UPDATE public.well_master SET location_id = 'LOC-PANHERA' WHERE well_id = 'WEL-12';
UPDATE public.well_master SET location_id = 'LOC-GIROLI' WHERE well_id = 'WEL-13';
UPDATE public.well_master SET location_id = 'LOC-KINHOLA' WHERE well_id = 'WEL-14';
UPDATE public.well_master SET location_id = 'LOC-BHOIR' WHERE well_id = 'WEL-09';
UPDATE public.well_master SET location_id = 'LOC-SHAKARDHARA' WHERE well_id = 'WEL-06';
UPDATE public.well_master SET location_id = 'LOC-ZIRADPADA' WHERE well_id = 'WEL-07';
