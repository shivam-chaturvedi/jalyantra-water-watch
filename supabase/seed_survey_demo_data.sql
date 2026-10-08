-- Seed data for UI development — NOT a schema migration, run manually once.
-- Self-contained demo survey: 1 location, 1 NGO, 3 wells, 1 survey, 3 QA readings
-- per well (9 total). Everything uses a 'DEMO' id suffix so it's easy to find and
-- remove later (deleting the survey_master/well_master rows cascades to the rest):
--   DELETE FROM public.survey_master WHERE survey_id = 'SUR-DEMO0001';
--   DELETE FROM public.well_master WHERE well_id LIKE 'WEL-DEMO%';
--   DELETE FROM public.partner_master WHERE partner_id = 'PRT-DEMO0001';
--   DELETE FROM public.location_master WHERE location_id = 'LOC-DEMO0001';
--
-- Does NOT depend on the follow-up migration (20260925010000_survey_related_columns.sql)
-- — no well_type/latitude/longitude on well_master, no device_type/portable_device_code
-- on device_master, and survey_reading.device_id is left NULL throughout.

INSERT INTO public.location_master (location_id, village_city, taluka, district, state, latitude, longitude, status)
VALUES ('LOC-DEMO0001', 'Demo Village', 'Demo Taluka', 'Pune', 'Maharashtra', 18.5204, 73.8567, 'Active')
ON CONFLICT (location_id) DO NOTHING;

INSERT INTO public.partner_master (partner_id, partner_name, partner_type, location_id, status)
VALUES ('PRT-DEMO0001', 'Krushivikas (Demo)', 'NGO', 'LOC-DEMO0001', 'Active')
ON CONFLICT (partner_id) DO NOTHING;

INSERT INTO public.well_master (well_id, location_id, partner_id, well_name, well_depth_meters, well_diameter_meters, pump_attached, status)
VALUES
  ('WEL-DEMO0001', 'LOC-DEMO0001', 'PRT-DEMO0001', 'Demo Well 1', 45.0, 0.30, true,  'Active'),
  ('WEL-DEMO0002', 'LOC-DEMO0001', 'PRT-DEMO0001', 'Demo Well 2', 38.5, 0.25, false, 'Active'),
  ('WEL-DEMO0003', 'LOC-DEMO0001', 'PRT-DEMO0001', 'Demo Well 3', 52.0, 0.30, true,  'Active')
ON CONFLICT (well_id) DO NOTHING;

INSERT INTO public.survey_master (
  survey_id, survey_name, survey_type, season, survey_year, organization_name, project_name,
  planned_start_date, planned_end_date, actual_start_date, actual_end_date,
  surveyor_name, surveyor_contact, status, notes
) VALUES (
  'SUR-DEMO0001', 'Pre-Monsoon Survey 2027 (Demo)', 'seasonal', 'pre_monsoon', 2027, 'Krushivikas', 'JalYantra Groundwater Monitoring',
  '2027-03-01', '2027-03-15', '2027-03-02', '2027-03-14',
  'Demo Surveyor', '+91-9000000000', 'Completed', 'Dummy data for UI development'
) ON CONFLICT (survey_id) DO NOTHING;

INSERT INTO public.survey_well (survey_id, well_id, well_status, surveyed_at)
VALUES
  ('SUR-DEMO0001', 'WEL-DEMO0001', 'Surveyed', '2027-03-02T10:00:00Z'),
  ('SUR-DEMO0001', 'WEL-DEMO0002', 'Surveyed', '2027-03-02T11:30:00Z'),
  ('SUR-DEMO0001', 'WEL-DEMO0003', 'Surveyed', '2027-03-03T09:15:00Z')
ON CONFLICT (survey_id, well_id) DO NOTHING;

-- 3 QA readings per well (reading_sequence 1/2/3), small jitter between them —
-- mirrors the real "take 3 readings per site" workflow confirmed earlier.
INSERT INTO public.survey_reading (survey_id, well_id, device_id, depth_meters, reading_sequence, reading_timestamp, latitude, longitude, surveyor_notes)
VALUES
  ('SUR-DEMO0001', 'WEL-DEMO0001', NULL, 12.40, 1, '2027-03-02T10:00:00Z', 18.5201, 73.8561, 'Demo reading 1'),
  ('SUR-DEMO0001', 'WEL-DEMO0001', NULL, 12.35, 2, '2027-03-02T10:02:00Z', 18.5201, 73.8561, 'Demo reading 2'),
  ('SUR-DEMO0001', 'WEL-DEMO0001', NULL, 12.45, 3, '2027-03-02T10:04:00Z', 18.5201, 73.8561, 'Demo reading 3'),

  ('SUR-DEMO0001', 'WEL-DEMO0002', NULL,  9.10, 1, '2027-03-02T11:30:00Z', 18.5215, 73.8572, 'Demo reading 1'),
  ('SUR-DEMO0001', 'WEL-DEMO0002', NULL,  9.05, 2, '2027-03-02T11:32:00Z', 18.5215, 73.8572, 'Demo reading 2'),
  ('SUR-DEMO0001', 'WEL-DEMO0002', NULL,  9.15, 3, '2027-03-02T11:34:00Z', 18.5215, 73.8572, 'Demo reading 3'),

  ('SUR-DEMO0001', 'WEL-DEMO0003', NULL, 20.80, 1, '2027-03-03T09:15:00Z', 18.5190, 73.8550, 'Demo reading 1'),
  ('SUR-DEMO0001', 'WEL-DEMO0003', NULL, 20.75, 2, '2027-03-03T09:17:00Z', 18.5190, 73.8550, 'Demo reading 2'),
  ('SUR-DEMO0001', 'WEL-DEMO0003', NULL, 20.85, 3, '2027-03-03T09:19:00Z', 18.5190, 73.8550, 'Demo reading 3')
ON CONFLICT (well_id, device_id, reading_timestamp) DO NOTHING;
