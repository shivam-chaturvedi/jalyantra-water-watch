-- Migration: 20260721000002_grant_public_upsert_access.sql
-- Description: Grants INSERT, UPDATE, and ALL write policies on master, telemetry,
-- summary, and alert tables for direct client app sync.

DROP POLICY IF EXISTS "Public Write Locations 012" ON public.location_master;
CREATE POLICY "Public Write Locations 012" ON public.location_master FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Partners 012" ON public.partner_master;
CREATE POLICY "Public Write Partners 012" ON public.partner_master FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Wells 012" ON public.well_master;
CREATE POLICY "Public Write Wells 012" ON public.well_master FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Devices 012" ON public.device_master;
CREATE POLICY "Public Write Devices 012" ON public.device_master FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Device Assignment 012" ON public.device_assignment_history;
CREATE POLICY "Public Write Device Assignment 012" ON public.device_assignment_history FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Audit Logs 012" ON public.audit_logs;
CREATE POLICY "Public Write Audit Logs 012" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Raw Data 012" ON public.raw_sensor_data;
CREATE POLICY "Public Write Raw Data 012" ON public.raw_sensor_data FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Pump Run 012" ON public.pump_run_summary;
CREATE POLICY "Public Write Pump Run 012" ON public.pump_run_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Daily Summary 012" ON public.daily_well_summary;
CREATE POLICY "Public Write Daily Summary 012" ON public.daily_well_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Weekly Monthly Summary 012" ON public.weekly_monthly_well_summary;
CREATE POLICY "Public Write Weekly Monthly Summary 012" ON public.weekly_monthly_well_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Daily Health 012" ON public.daily_well_health_summary;
CREATE POLICY "Public Write Daily Health 012" ON public.daily_well_health_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write District Summary 012" ON public.district_daily_summary;
CREATE POLICY "Public Write District Summary 012" ON public.district_daily_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Weekly Monthly District 012" ON public.weekly_monthly_district_summary;
CREATE POLICY "Public Write Weekly Monthly District 012" ON public.weekly_monthly_district_summary FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Alert Defs 012" ON public.alert_definitions;
CREATE POLICY "Public Write Alert Defs 012" ON public.alert_definitions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Write Alert Logs 012" ON public.alert_logs;
CREATE POLICY "Public Write Alert Logs 012" ON public.alert_logs FOR ALL USING (true) WITH CHECK (true);
