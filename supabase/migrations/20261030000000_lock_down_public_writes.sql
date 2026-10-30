-- Migration: 20261030000000_lock_down_public_writes.sql
-- Description: Closes the "anyone with the public anon key can write" hole.
--   * Every app table: reads stay public (the website/dashboard need them), writes are limited to
--     logged-in admins (profiles.is_admin = true). The sync edge function uses the service-role key,
--     which bypasses RLS, so it keeps working.
--   * profiles: users could previously set is_admin = true on their own row. Removed.
--   * Storage buckets: uploads/deletes limited to admins.
-- Replaces the open policies from 002_public_access_and_profile_trigger.sql,
-- 20260721000002_grant_public_upsert_access.sql and 20260925000000_survey_tables.sql.

-- ----------------------------------------------------------------------------
-- 1. Admin check. SECURITY DEFINER so it works no matter what policies sit on profiles.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce((SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid()), false)
$$;

-- ----------------------------------------------------------------------------
-- 2. profiles: no self-service updates (the app never updates profiles; is_admin is set by hand
--    in the SQL editor). Users can still read their own row so the login check works.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- ----------------------------------------------------------------------------
-- 3. App tables: drop every non-SELECT policy (whatever its name, including any added from the
--    dashboard), keep/ensure public read, add one admin-only write policy.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  p record;
  public_read_tables text[] := ARRAY[
    'site_flags', 'app_pages', 'site_content', 'media_assets', 'readings_snapshots',
    'sensor_data_snapshots', 'deployments', 'device_master_data',
    'location_master', 'partner_master', 'well_master', 'device_master', 'device_assignment_history',
    'raw_sensor_data', 'pump_run_summary', 'daily_well_summary', 'weekly_monthly_well_summary',
    'daily_well_health_summary', 'district_daily_summary', 'weekly_monthly_district_summary',
    'alert_definitions', 'alert_logs', 'survey_master', 'survey_well', 'survey_reading'
  ];
  -- Admin-only for reads as well as writes.
  private_tables text[] := ARRAY['audit_logs'];
BEGIN
  FOREACH t IN ARRAY public_read_tables || private_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- "FOR ALL USING (true)" policies also granted reads, so they go too; public read is re-added below.
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND cmd <> 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;

    IF t = ANY (private_tables) THEN
      FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
      LOOP
        EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
      END LOOP;
    ELSIF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND cmd = 'SELECT'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        t || '_public_read', t
      );
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
      t || '_admin_write', t
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. Storage: media buckets stay publicly readable, writes admin-only.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "site_media_write_open" ON storage.objects;
DROP POLICY IF EXISTS "site_media_write_admin" ON storage.objects;
DROP POLICY IF EXISTS "deployments_media_write_open" ON storage.objects;
DROP POLICY IF EXISTS "partners_media_write_open" ON storage.objects;
DROP POLICY IF EXISTS "media_buckets_admin_write" ON storage.objects;

CREATE POLICY "media_buckets_admin_write"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id IN ('site-media', 'deployments-media', 'partners-media') AND public.is_admin())
WITH CHECK (bucket_id IN ('site-media', 'deployments-media', 'partners-media') AND public.is_admin());
