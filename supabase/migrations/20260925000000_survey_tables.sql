-- Migration: 20260925000000_survey_tables.sql
-- Description: Survey feature — survey_master, survey_well, survey_reading tables.
-- These reference well_master.well_id / device_master.device_id as they already
-- exist today (no changes to those tables required for this migration to run).
-- The well_type/latitude/longitude/device_type/partner_id/portable_device_code
-- columns needed for the survey well popup are a deliberately separate follow-up
-- migration — see 20260925010000_survey_related_columns.sql — so the new tables
-- can be created and tested independently of altering existing live tables.
-- Follows the same ID/audit/RLS conventions as 20260721000000_schema_and_metrics.sql
-- (Tables A-J).

-- ============================================================================
-- 1. SURVEY MASTER (one row per survey campaign)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.survey_master (
    survey_id TEXT PRIMARY KEY DEFAULT ('SUR-' || upper(substr(uuid_generate_v4()::text, 1, 8))),
    survey_name TEXT NOT NULL,
    survey_type TEXT NOT NULL CHECK (survey_type IN ('seasonal', 'quarterly', 'half_yearly', 'annual')),
    season TEXT CHECK (season IN ('pre_monsoon', 'post_monsoon', 'summer', 'winter')),
    survey_year INT NOT NULL,
    organization_name TEXT NOT NULL,
    project_name TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    device_id TEXT REFERENCES public.device_master(device_id) ON DELETE SET NULL,
    surveyor_name TEXT,
    surveyor_contact TEXT,
    status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'In Progress', 'Completed', 'Cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. SURVEY WELL (junction: which wells are in a survey, and per-well status)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.survey_well (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id TEXT NOT NULL REFERENCES public.survey_master(survey_id) ON DELETE CASCADE,
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    well_status TEXT NOT NULL DEFAULT 'Pending' CHECK (well_status IN ('Pending', 'Surveyed', 'Skipped')),
    surveyed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (survey_id, well_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_well_survey ON public.survey_well(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_well_well ON public.survey_well(well_id);

-- ============================================================================
-- 3. SURVEY READING (the actual depth measurement per well per survey)
-- ============================================================================
-- Up to 3 readings are taken per well per survey visit (QA against manual
-- positioning/holding error) — so this is NOT one row per well per survey.
-- The "official" depth for reporting is the median of a well's readings within
-- a survey, computed at query time (see docs/survey-feature-design.md §2.3),
-- not stored redundantly here.
CREATE TABLE IF NOT EXISTS public.survey_reading (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id TEXT NOT NULL REFERENCES public.survey_master(survey_id) ON DELETE CASCADE,
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    device_id TEXT REFERENCES public.device_master(device_id) ON DELETE SET NULL,
    depth_meters NUMERIC(8, 3) NOT NULL,
    reading_sequence SMALLINT, -- 1/2/3 — which of the QA repeat readings this is, if known
    reading_timestamp TIMESTAMPTZ NOT NULL,
    reading_date DATE GENERATED ALWAYS AS ((reading_timestamp AT TIME ZONE 'UTC')::date) STORED,
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    surveyor_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevents double-counting when "Fetch & Populate" re-syncs Firebase data the
    -- device only pushed once it regained internet connectivity (offline-capture
    -- case) — mirrors the (device_id, timestamp) unique constraint already used
    -- on raw_sensor_data for the same reason.
    UNIQUE (well_id, device_id, reading_timestamp)
);

CREATE INDEX IF NOT EXISTS idx_survey_reading_survey ON public.survey_reading(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_reading_well_time ON public.survey_reading(well_id, reading_timestamp DESC);

-- ============================================================================
-- 4. AUDIT LOGGING — extend the existing trigger function to cover survey_master
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_capture_master_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    r_key RECORD;
    v_rec_id TEXT;
    v_user TEXT := COALESCE(auth.uid()::text, 'SYSTEM');
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'location_master' THEN v_rec_id := NEW.location_id;
        ELSIF TG_TABLE_NAME = 'partner_master' THEN v_rec_id := NEW.partner_id;
        ELSIF TG_TABLE_NAME = 'well_master' THEN v_rec_id := NEW.well_id;
        ELSIF TG_TABLE_NAME = 'device_master' THEN v_rec_id := NEW.device_id;
        ELSIF TG_TABLE_NAME = 'device_assignment_history' THEN v_rec_id := NEW.assignment_id::text;
        ELSIF TG_TABLE_NAME = 'survey_master' THEN v_rec_id := NEW.survey_id;
        END IF;

        INSERT INTO public.audit_logs (table_name, record_id, action_type, edited_by, new_value)
        VALUES (TG_TABLE_NAME, v_rec_id, 'INSERT', v_user, row_to_json(NEW)::text);
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'location_master' THEN v_rec_id := NEW.location_id;
        ELSIF TG_TABLE_NAME = 'partner_master' THEN v_rec_id := NEW.partner_id;
        ELSIF TG_TABLE_NAME = 'well_master' THEN v_rec_id := NEW.well_id;
        ELSIF TG_TABLE_NAME = 'device_master' THEN v_rec_id := NEW.device_id;
        ELSIF TG_TABLE_NAME = 'device_assignment_history' THEN v_rec_id := NEW.assignment_id::text;
        ELSIF TG_TABLE_NAME = 'survey_master' THEN v_rec_id := NEW.survey_id;
        END IF;

        IF OLD.status = 'Active' AND NEW.status = 'Inactive' THEN
            INSERT INTO public.audit_logs (table_name, record_id, action_type, edited_by, old_value, new_value)
            VALUES (TG_TABLE_NAME, v_rec_id, 'SOFT_DELETE', v_user, 'Active', 'Inactive');
        END IF;

        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.audit_logs (table_name, record_id, field_name, old_value, new_value, action_type, edited_by)
            VALUES (TG_TABLE_NAME, v_rec_id, 'status', OLD.status::text, NEW.status::text, 'UPDATE', v_user);
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_audit_survey BEFORE INSERT OR UPDATE ON public.survey_master
    FOR EACH ROW EXECUTE FUNCTION public.fn_capture_master_audit_log();

-- ============================================================================
-- 5. RLS — matches the current permissive pattern on Tables A-J
-- (public read + public write; see 20260721000002_grant_public_upsert_access.sql).
-- Revisit once the auth/role question in docs/survey-feature-design.md §6.4 is
-- resolved, the same way it needs revisiting for the existing master tables.
-- ============================================================================
ALTER TABLE public.survey_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_well ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_reading ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Survey Master" ON public.survey_master FOR SELECT USING (true);
CREATE POLICY "Public Write Survey Master" ON public.survey_master FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Survey Well" ON public.survey_well FOR SELECT USING (true);
CREATE POLICY "Public Write Survey Well" ON public.survey_well FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Read Survey Reading" ON public.survey_reading FOR SELECT USING (true);
CREATE POLICY "Public Write Survey Reading" ON public.survey_reading FOR ALL USING (true) WITH CHECK (true);
