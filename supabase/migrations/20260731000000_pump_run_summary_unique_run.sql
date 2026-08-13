-- Migration: 20260731000000_pump_run_summary_unique_run.sql
-- Description: Prevent duplicate pump run rows when Firebase-to-Supabase sync is re-run.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pump_run_summary_well_start_stop_unique'
    ) THEN
        ALTER TABLE public.pump_run_summary
        ADD CONSTRAINT pump_run_summary_well_start_stop_unique
        UNIQUE (well_id, pump_start_time, pump_stop_time);
    END IF;
END $$;
