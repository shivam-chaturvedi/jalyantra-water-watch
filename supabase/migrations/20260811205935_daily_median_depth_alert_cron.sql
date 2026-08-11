-- ============================================================================
-- Cron job: log alert_logs entries when a well's daily median water depth
-- exceeds 2.6 meters. Logging only for now — no UI/alert display wired up.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

INSERT INTO public.alert_definitions (
  alert_code, alert_name, alert_level, alert_type,
  trigger_field, trigger_logic, expiry_logic,
  calculation_frequency, default_message
) VALUES (
  'HIGH_DAILY_MEDIAN_DEPTH',
  'High Daily Median Water Depth',
  'well',
  'warning',
  'daily_median_water_depth_meters',
  'daily_median_water_depth_meters > 2.6',
  'daily_median_water_depth_meters <= 2.6',
  'Hourly',
  'Daily median water depth exceeded 2.6 meters.'
)
ON CONFLICT (alert_code) DO NOTHING;

-- Scans today's daily_well_summary rows and logs one active alert per well per day.
-- SECURITY DEFINER so the pg_cron job (which runs outside any authenticated session)
-- can write to alert_logs regardless of RLS.
CREATE OR REPLACE FUNCTION public.fn_check_daily_median_depth_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.alert_logs (
    alert_code, well_id, district, state, alert_type, trigger_field, trigger_value, status, triggered_at
  )
  SELECT
    'HIGH_DAILY_MEDIAN_DEPTH',
    dws.well_id,
    lm.district,
    lm.state,
    'warning',
    'daily_median_water_depth_meters',
    dws.daily_median_water_depth_meters::text,
    'active',
    NOW()
  FROM public.daily_well_summary dws
  JOIN public.well_master wm ON wm.well_id = dws.well_id
  LEFT JOIN public.location_master lm ON lm.location_id = wm.location_id
  WHERE dws.daily_median_water_depth_meters > 2.6
    AND dws.date = CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM public.alert_logs al
      WHERE al.well_id = dws.well_id
        AND al.alert_code = 'HIGH_DAILY_MEDIAN_DEPTH'
        AND al.triggered_at::date = dws.date
    );
END;
$$;

-- Runs hourly; guarded so re-running this migration doesn't create a duplicate job.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'check-daily-median-depth-alert') THEN
    PERFORM cron.schedule(
      'check-daily-median-depth-alert',
      '0 * * * *',
      'SELECT public.fn_check_daily_median_depth_alerts();'
    );
  END IF;
END;
$$;
