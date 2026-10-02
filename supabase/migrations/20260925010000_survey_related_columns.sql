-- Migration: 20260925010000_survey_related_columns.sql
-- Description: Follow-up to 20260925000000_survey_tables.sql — adds the columns on
-- well_master/device_master needed for the survey well popup (well type, per-well
-- GPS) and portable-device identity (device type, NGO ownership, friendly code).
-- Deliberately kept separate from the new-table migration so the survey tables can
-- be created and tested first, independently of altering these existing live tables.
-- Run this once the survey tables are confirmed working.

-- ============================================================================
-- 1. WELL MASTER — well type + per-well GPS
-- ============================================================================
-- Today only location_master has village-level coordinates; the survey well
-- popup needs per-well GPS, and "well type" has no existing column.
ALTER TABLE public.well_master ADD COLUMN IF NOT EXISTS well_type TEXT;
ALTER TABLE public.well_master ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE public.well_master ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);

-- ============================================================================
-- 2. DEVICE MASTER — portable device identity
-- ============================================================================

-- Distinguish permanently-installed sensors from portable survey devices.
-- Existing rows default to 'fixed'.
ALTER TABLE public.device_master ADD COLUMN IF NOT EXISTS device_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (device_type IN ('fixed', 'portable'));

-- Portable devices are owned by an NGO/organization rather than tied to one well
-- (a fixed device's "owner" is implicit via well_id -> well_master.partner_id; a
-- portable device visits many wells, so it needs its own owner link).
ALTER TABLE public.device_master ADD COLUMN IF NOT EXISTS partner_id TEXT
    REFERENCES public.partner_master(partner_id) ON DELETE SET NULL;

-- Human-friendly label field staff use for the physical unit (e.g. "PD-01"),
-- distinct from the generated DEV-XXXXXXXX id. Only meaningful for portable devices.
ALTER TABLE public.device_master ADD COLUMN IF NOT EXISTS portable_device_code TEXT UNIQUE;
