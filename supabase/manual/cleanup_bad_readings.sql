-- Manual, one-off clean-up of bad rows found in the Oct 2026 code review.
-- NOT a migration — run by hand in the Supabase SQL editor, AFTER the fixed sync code is deployed.
-- Every DELETE is inside a transaction that ends in ROLLBACK. Check the counts, then change the
-- final ROLLBACK to COMMIT and run again.

-- 0. Back up the raw table first (once).
CREATE TABLE IF NOT EXISTS public.raw_sensor_data_backup_20261030 AS
SELECT * FROM public.raw_sensor_data;

BEGIN;

-- 1. Copies stored 5h30m late: the old server sync read IST device times as UTC. The late copy is
--    the one with an identical reading (same device, same depth) exactly 5h30m EARLIER.
SELECT count(*) AS late_copies
FROM public.raw_sensor_data late
WHERE EXISTS (
  SELECT 1 FROM public.raw_sensor_data ok
  WHERE ok.device_id = late.device_id
    AND ok.timestamp = late.timestamp - interval '5 hours 30 minutes'
    AND ok.depth_meters = late.depth_meters
);

DELETE FROM public.raw_sensor_data late
WHERE EXISTS (
  SELECT 1 FROM public.raw_sensor_data ok
  WHERE ok.device_id = late.device_id
    AND ok.timestamp = late.timestamp - interval '5 hours 30 minutes'
    AND ok.depth_meters = late.depth_meters
);

-- 2. Readings stamped "now" by the old Admin sync. Devices send whole seconds, so a timestamp with
--    milliseconds can only have come from the sync's own clock.
SELECT count(*) AS now_stamped
FROM public.raw_sensor_data
WHERE extract(milliseconds FROM timestamp)::numeric % 1000 <> 0;

DELETE FROM public.raw_sensor_data
WHERE extract(milliseconds FROM timestamp)::numeric % 1000 <> 0;

-- 3. Depths deeper than the well itself.
SELECT r.well_id, count(*) AS deeper_than_well
FROM public.raw_sensor_data r
JOIN public.well_master w ON w.well_id = r.well_id
WHERE w.well_depth_meters IS NOT NULL AND r.depth_meters > w.well_depth_meters
GROUP BY r.well_id;

DELETE FROM public.raw_sensor_data r
USING public.well_master w
WHERE w.well_id = r.well_id
  AND w.well_depth_meters IS NOT NULL
  AND r.depth_meters > w.well_depth_meters;

-- 4. Demo wells shown as live.
UPDATE public.well_master SET status = 'Inactive' WHERE well_id LIKE 'WEL-DEMO%';

-- 5. Any remaining server-only rows that are still 5h30m late have no twin to match against and
--    are not removed here. Re-importing the affected period from Firebase with the fixed sync
--    (step 6) writes correct copies; compare counts per day before deleting further.

ROLLBACK;  -- change to COMMIT once the counts above look right

-- 6. Afterwards, rebuild the derived tables by running the fixed sync over the full history
--    (Admin page → "Last 365 Days" → Fetch & Populate; data starts Mar 2026), so pump_run_summary,
--    daily/weekly summaries and alert_logs are recomputed from clean readings.
