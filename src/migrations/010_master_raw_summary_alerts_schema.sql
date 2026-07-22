-- Migration: 010_master_raw_summary_alerts_schema.sql
-- Description: Creates Tables A through J (Master Tables, Audit Logs, Raw Sensor Data,
-- Derived Summaries, and Alerts) with audit triggers and static seed data for JalYantra.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- A. MASTER DATA TABLES & AUDIT LOGS
-- ============================================================================

-- 1. Location Master
CREATE TABLE IF NOT EXISTS public.location_master (
    location_id TEXT PRIMARY KEY DEFAULT ('LOC-' || upper(substr(uuid_generate_v4()::text, 1, 8))),
    village_city TEXT NOT NULL,
    taluka TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'Maharashtra',
    latitude NUMERIC(10, 8),
    longitude NUMERIC(11, 8),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Partner / Owner Master
CREATE TABLE IF NOT EXISTS public.partner_master (
    partner_id TEXT PRIMARY KEY DEFAULT ('PRT-' || upper(substr(uuid_generate_v4()::text, 1, 8))),
    partner_name TEXT NOT NULL,
    partner_type TEXT NOT NULL,
    location_id TEXT REFERENCES public.location_master(location_id) ON DELETE SET NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    point_of_contact_name TEXT,
    poc_phone TEXT,
    poc_email TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Well Master
CREATE TABLE IF NOT EXISTS public.well_master (
    well_id TEXT PRIMARY KEY DEFAULT ('WEL-' || upper(substr(uuid_generate_v4()::text, 1, 8))),
    location_id TEXT REFERENCES public.location_master(location_id) ON DELETE RESTRICT,
    partner_id TEXT REFERENCES public.partner_master(partner_id) ON DELETE SET NULL,
    well_name TEXT NOT NULL,
    well_depth_meters NUMERIC(8, 3) NOT NULL,
    well_diameter_meters NUMERIC(8, 3) NOT NULL,
    well_area_square_meters NUMERIC(10, 4) GENERATED ALWAYS AS (3.141592653589793 * POWER(well_diameter_meters / 2.0, 2)) STORED,
    pump_attached BOOLEAN NOT NULL DEFAULT TRUE,
    pump_type TEXT,
    pump_intake_level_meters NUMERIC(8, 3),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Device Master
CREATE TABLE IF NOT EXISTS public.device_master (
    device_id TEXT PRIMARY KEY DEFAULT ('DEV-' || upper(substr(uuid_generate_v4()::text, 1, 8))),
    well_id TEXT REFERENCES public.well_master(well_id) ON DELETE SET NULL,
    device_serial_number TEXT UNIQUE NOT NULL,
    imei_number TEXT,
    sim_number TEXT,
    sim_owner TEXT,
    installation_date DATE,
    start_stop_method TEXT NOT NULL DEFAULT 'automatic' CHECK (start_stop_method IN ('manual', 'automatic')),
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Device Assignment History
CREATE TABLE IF NOT EXISTS public.device_assignment_history (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES public.device_master(device_id) ON DELETE CASCADE,
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Reassigned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Centralized Audit Log Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    action_type TEXT NOT NULL CHECK (action_type IN ('INSERT', 'UPDATE', 'SOFT_DELETE', 'DELETE')),
    edited_by TEXT DEFAULT auth.uid()::text,
    edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    change_reason TEXT
);

-- Audit Trigger Function
CREATE OR REPLACE FUNCTION public.fn_capture_master_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_rec_id TEXT;
    v_user TEXT := COALESCE(auth.uid()::text, 'SYSTEM');
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF TG_TABLE_NAME = 'location_master' THEN v_rec_id := NEW.location_id;
        ELSIF TG_TABLE_NAME = 'partner_master' THEN v_rec_id := NEW.partner_id;
        ELSIF TG_TABLE_NAME = 'well_master' THEN v_rec_id := NEW.well_id;
        ELSIF TG_TABLE_NAME = 'device_master' THEN v_rec_id := NEW.device_id;
        ELSIF TG_TABLE_NAME = 'device_assignment_history' THEN v_rec_id := NEW.assignment_id::text;
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

DROP TRIGGER IF EXISTS trg_audit_location ON public.location_master;
CREATE TRIGGER trg_audit_location BEFORE INSERT OR UPDATE ON public.location_master FOR EACH ROW EXECUTE FUNCTION public.fn_capture_master_audit_log();

DROP TRIGGER IF EXISTS trg_audit_partner ON public.partner_master;
CREATE TRIGGER trg_audit_partner BEFORE INSERT OR UPDATE ON public.partner_master FOR EACH ROW EXECUTE FUNCTION public.fn_capture_master_audit_log();

DROP TRIGGER IF EXISTS trg_audit_well ON public.well_master;
CREATE TRIGGER trg_audit_well BEFORE INSERT OR UPDATE ON public.well_master FOR EACH ROW EXECUTE FUNCTION public.fn_capture_master_audit_log();

DROP TRIGGER IF EXISTS trg_audit_device ON public.device_master;
CREATE TRIGGER trg_audit_device BEFORE INSERT OR UPDATE ON public.device_master FOR EACH ROW EXECUTE FUNCTION public.fn_capture_master_audit_log();

-- ============================================================================
-- B. RAW SENSOR DATA TABLE (Immutable / Append-Only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.raw_sensor_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL REFERENCES public.device_master(device_id),
    well_id TEXT REFERENCES public.well_master(well_id),
    depth_meters NUMERIC(8, 3) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    reading_date DATE GENERATED ALWAYS AS ((timestamp AT TIME ZONE 'UTC')::date) STORED,
    uptime BIGINT,
    online_since TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT raw_sensor_device_time_unique UNIQUE (device_id, timestamp)
);

CREATE INDEX IF NOT EXISTS idx_raw_sensor_well_time ON public.raw_sensor_data(well_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_raw_sensor_device_time ON public.raw_sensor_data(device_id, timestamp DESC);

-- ============================================================================
-- C. PUMP RUN TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pump_run_summary (
    pump_run_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    run_date DATE NOT NULL,
    pump_start_time TIMESTAMPTZ NOT NULL,
    pump_stop_time TIMESTAMPTZ NOT NULL,
    pump_runtime_minutes NUMERIC(10, 2) NOT NULL,
    pump_start_depth_meters NUMERIC(8, 3) NOT NULL,
    pump_stop_depth_meters NUMERIC(8, 3) NOT NULL,
    water_level_drop_during_run_meters NUMERIC(8, 3) NOT NULL,
    pump_extraction_per_run_liters NUMERIC(12, 2) NOT NULL,
    is_first_run_of_day BOOLEAN NOT NULL DEFAULT FALSE,
    is_last_run_of_day BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pump_run_well_date ON public.pump_run_summary(well_id, run_date);

-- ============================================================================
-- D. DAILY WELL SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_well_summary (
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    daily_median_water_depth_meters NUMERIC(8, 3),
    daily_pump_runtime_minutes NUMERIC(10, 2) DEFAULT 0,
    daily_pump_run_count INT DEFAULT 0,
    daily_water_extraction_liters NUMERIC(12, 2) DEFAULT 0,
    daily_water_level_drop_meters NUMERIC(8, 3) DEFAULT 0,
    remaining_water_depth_meters NUMERIC(8, 3),
    remaining_water_volume_liters NUMERIC(14, 2),
    estimated_days_remaining NUMERIC(10, 2),
    recovery_amount_meters NUMERIC(8, 3),
    recovery_rate_meters_per_hour NUMERIC(8, 3),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (well_id, date)
);

-- ============================================================================
-- E. WEEKLY / MONTHLY WELL SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_monthly_well_summary (
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    calculation_date DATE NOT NULL,
    seven_day_depth_change_meters NUMERIC(8, 3),
    seven_day_water_extraction_liters NUMERIC(14, 2),
    avg_seven_day_extraction_liters NUMERIC(14, 2),
    thirty_day_depth_change_meters NUMERIC(8, 3),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (well_id, calculation_date)
);

-- ============================================================================
-- F. DAILY WELL HEALTH SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_well_health_summary (
    well_id TEXT NOT NULL REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    date DATE NOT NULL,
    well_health_status TEXT NOT NULL DEFAULT 'Green' CHECK (well_health_status IN ('Green', 'Amber', 'Red', 'Healthy', 'Stressed', 'Critical')),
    safety_buffer_meters NUMERIC(8, 3),
    dry_run_risk_boolean BOOLEAN NOT NULL DEFAULT FALSE,
    safe_pump_operation_boolean BOOLEAN NOT NULL DEFAULT TRUE,
    poor_recovery_boolean BOOLEAN NOT NULL DEFAULT FALSE,
    device_health_status TEXT NOT NULL DEFAULT 'Active' CHECK (device_health_status IN ('Active', 'Inactive')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (well_id, date)
);

-- ============================================================================
-- G. DISTRICT DAILY SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.district_daily_summary (
    district TEXT NOT NULL,
    date DATE NOT NULL,
    total_active_wells_per_district INT DEFAULT 0,
    total_daily_water_extraction_per_district_liters NUMERIC(16, 2) DEFAULT 0,
    total_daily_pump_runtime_per_district_minutes NUMERIC(12, 2) DEFAULT 0,
    avg_water_depth_per_district_meters NUMERIC(8, 3),
    avg_daily_pump_runtime_per_district_minutes NUMERIC(10, 2),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (district, date)
);

-- ============================================================================
-- H. WEEKLY / MONTHLY DISTRICT SUMMARY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.weekly_monthly_district_summary (
    district TEXT NOT NULL,
    calculation_date DATE NOT NULL,
    thirty_day_water_extraction_per_district_liters NUMERIC(16, 2) DEFAULT 0,
    avg_seven_day_depth_change_per_district_meters NUMERIC(8, 3),
    avg_thirty_day_depth_change_per_district_meters NUMERIC(8, 3),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (district, calculation_date)
);

-- ============================================================================
-- I. ALERTS DEFINITION TABLE & STATIC SEED DATA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alert_definitions (
    alert_code TEXT PRIMARY KEY,
    alert_name TEXT NOT NULL,
    alert_level TEXT NOT NULL CHECK (alert_level IN ('well', 'district', 'state')),
    alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'positive', 'neutral')),
    trigger_field TEXT NOT NULL,
    trigger_logic TEXT NOT NULL,
    expiry_logic TEXT NOT NULL,
    calculation_frequency TEXT NOT NULL DEFAULT 'End of Day',
    default_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.alert_definitions (
    alert_code, alert_name, alert_level, alert_type, trigger_field, trigger_logic, expiry_logic, calculation_frequency, default_message
) VALUES 
('LOW_WATER_LEVEL', 'Low Water Level', 'well', 'warning', 'dailyMedianWaterDepthMeters', 'dailyMedianWaterDepthMeters > 0.8 * wellDepthMeters', 'dailyMedianWaterDepthMeters < 0.75 * wellDepthMeters', 'End of Day', 'Water level is approaching critically low levels.'),
('DRY_RUN_RISK', 'Dry Run Risk', 'well', 'warning', 'safetyBufferMeters', 'safetyBufferMeters <= 1.0', 'safetyBufferMeters > 1.5', 'End of Day', 'High risk of pump dry running. Water buffer above intake is below 1 meter.'),
('UNSAFE_PUMP_OPERATION', 'Unsafe Pump Operation', 'well', 'warning', 'safetyBufferMeters', 'safetyBufferMeters <= 2.0 AND safetyBufferMeters > 1.0', 'safetyBufferMeters > 2.0', 'End of Day', 'Pump is operating with less than 2 meters safety buffer above intake level.'),
('POOR_RECOVERY', 'Poor Groundwater Recovery', 'well', 'warning', 'recoveryAmountMeters', 'recoveryAmountMeters < 0.1 AND hoursGap >= 24', 'recoveryAmountMeters >= 0.2', 'End of Day', 'Well exhibits minimal groundwater recovery (<0.1m) over a 24 hour rest period.'),
('HIGH_DISTRICT_EXTRACTION', 'High District Water Extraction', 'district', 'warning', 'totalDailyWaterExtractionPerDistrictLiters', 'totalDailyWaterExtractionPerDistrictLiters > 100000', 'totalDailyWaterExtractionPerDistrictLiters <= 80000', 'End of Day', 'District daily extraction volume exceeded 100,000 Liters.')
ON CONFLICT (alert_code) DO UPDATE SET
    alert_name = EXCLUDED.alert_name,
    alert_level = EXCLUDED.alert_level,
    alert_type = EXCLUDED.alert_type,
    trigger_field = EXCLUDED.trigger_field,
    trigger_logic = EXCLUDED.trigger_logic,
    expiry_logic = EXCLUDED.expiry_logic,
    calculation_frequency = EXCLUDED.calculation_frequency,
    default_message = EXCLUDED.default_message;

-- ============================================================================
-- J. ALERT LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.alert_logs (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_code TEXT NOT NULL REFERENCES public.alert_definitions(alert_code),
    well_id TEXT REFERENCES public.well_master(well_id) ON DELETE CASCADE,
    district TEXT,
    state TEXT,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'positive', 'neutral')),
    trigger_field TEXT NOT NULL,
    trigger_value TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expired_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_logs_well_status ON public.alert_logs(well_id, status);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE public.location_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.well_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pump_run_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_well_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_monthly_well_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_well_health_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.district_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_monthly_district_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_logs ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY "Public Read Locations 010" ON public.location_master FOR SELECT USING (true);
CREATE POLICY "Public Read Partners 010" ON public.partner_master FOR SELECT USING (true);
CREATE POLICY "Public Read Wells 010" ON public.well_master FOR SELECT USING (true);
CREATE POLICY "Public Read Devices 010" ON public.device_master FOR SELECT USING (true);
CREATE POLICY "Public Read Raw Data 010" ON public.raw_sensor_data FOR SELECT USING (true);
CREATE POLICY "Public Read Summaries 010" ON public.daily_well_summary FOR SELECT USING (true);
CREATE POLICY "Public Read Health 010" ON public.daily_well_health_summary FOR SELECT USING (true);
CREATE POLICY "Public Read District 010" ON public.district_daily_summary FOR SELECT USING (true);
CREATE POLICY "Public Read Alerts 010" ON public.alert_logs FOR SELECT USING (true);
CREATE POLICY "Service Insert Raw Data 010" ON public.raw_sensor_data FOR INSERT WITH CHECK (true);
