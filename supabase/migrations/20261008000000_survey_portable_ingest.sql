-- Migration: 20261008000000_survey_portable_ingest.sql
-- Description: Portable JalYantra (Porta-*) ingestion into survey_reading.
--
-- 1. "Last reading wins": a surveyor who mis-aims the device just retakes, and the retake
--    overwrites the previous reading. So survey_reading now holds exactly ONE row per
--    (survey_id, well_id) — the latest — replacing the earlier "up to 3 QA readings, median
--    at query time" model. Sensor noise is already handled on-device (averageSampleCount).
-- 2. Columns for the fields the portable app actually sends (readings/Porta-01/{pushId}):
--    deviceId, siteName (village), testerName, testerCompany, testerData, averageSampleCount.
-- Run after 20260925000000_survey_tables.sql. Independent of 20260925010000.

-- ============================================================================
-- 1. Collapse existing rows to the latest reading per (survey, well)
-- ============================================================================
DELETE FROM public.survey_reading older
USING public.survey_reading newer
WHERE older.survey_id = newer.survey_id
  AND older.well_id = newer.well_id
  AND (older.reading_timestamp, older.id) < (newer.reading_timestamp, newer.id);

ALTER TABLE public.survey_reading
    DROP CONSTRAINT IF EXISTS survey_reading_well_id_device_id_reading_timestamp_key;

ALTER TABLE public.survey_reading
    ADD CONSTRAINT survey_reading_survey_well_key UNIQUE (survey_id, well_id);

-- ============================================================================
-- 2. Portable-app fields
-- ============================================================================
-- Raw Firebase deviceId (e.g. "Porta-01"). device_id stays the FK to device_master and is
-- only filled when the portable unit has been registered there.
ALTER TABLE public.survey_reading ADD COLUMN IF NOT EXISTS portable_device_id TEXT;
ALTER TABLE public.survey_reading ADD COLUMN IF NOT EXISTS site_name TEXT;          -- siteName (village as typed/picked on device)
ALTER TABLE public.survey_reading ADD COLUMN IF NOT EXISTS surveyor_name TEXT;      -- testerName
ALTER TABLE public.survey_reading ADD COLUMN IF NOT EXISTS surveyor_company TEXT;   -- testerCompany
ALTER TABLE public.survey_reading ADD COLUMN IF NOT EXISTS sample_count SMALLINT;   -- averageSampleCount
ALTER TABLE public.survey_reading ADD COLUMN IF NOT EXISTS firebase_key TEXT;       -- RTDB push id of the reading kept
