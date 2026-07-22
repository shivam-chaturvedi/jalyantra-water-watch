-- Migration: 011_add_raw_sensor_data_unique_constraint.sql
-- Description: Adds a unique constraint on (device_id, timestamp) for raw_sensor_data
-- to support upsert with conflict resolution and avoid 409 errors on duplicate telemetry syncs.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'raw_sensor_device_time_unique'
    ) THEN
        ALTER TABLE public.raw_sensor_data
        ADD CONSTRAINT raw_sensor_device_time_unique UNIQUE (device_id, timestamp);
    END IF;
END $$;
