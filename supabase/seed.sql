-- Seed Static Data for Alert Definitions Table

INSERT INTO public.alert_definitions (
    alert_code,
    alert_name,
    alert_level,
    alert_type,
    trigger_field,
    trigger_logic,
    expiry_logic,
    calculation_frequency,
    default_message
) VALUES 
(
    'LOW_WATER_LEVEL',
    'Low Water Level',
    'well',
    'warning',
    'dailyMedianWaterDepthMeters',
    'dailyMedianWaterDepthMeters > 0.8 * wellDepthMeters',
    'dailyMedianWaterDepthMeters < 0.75 * wellDepthMeters',
    'End of Day',
    'Water level is approaching critically low levels.'
),
(
    'DRY_RUN_RISK',
    'Dry Run Risk',
    'well',
    'warning',
    'safetyBufferMeters',
    'safetyBufferMeters <= 1.0',
    'safetyBufferMeters > 1.5',
    'End of Day',
    'High risk of pump dry running. Water buffer above intake is below 1 meter.'
),
(
    'UNSAFE_PUMP_OPERATION',
    'Unsafe Pump Operation',
    'well',
    'warning',
    'safetyBufferMeters',
    'safetyBufferMeters <= 2.0 AND safetyBufferMeters > 1.0',
    'safetyBufferMeters > 2.0',
    'End of Day',
    'Pump is operating with less than 2 meters safety buffer above intake level.'
),
(
    'POOR_RECOVERY',
    'Poor Groundwater Recovery',
    'well',
    'warning',
    'recoveryAmountMeters',
    'recoveryAmountMeters < 0.1 AND hoursGap >= 24',
    'recoveryAmountMeters >= 0.2',
    'End of Day',
    'Well exhibits minimal groundwater recovery (<0.1m) over a 24 hour rest period.'
),
(
    'HIGH_DISTRICT_EXTRACTION',
    'High District Water Extraction',
    'district',
    'warning',
    'totalDailyWaterExtractionPerDistrictLiters',
    'totalDailyWaterExtractionPerDistrictLiters > 100000',
    'totalDailyWaterExtractionPerDistrictLiters <= 80000',
    'End of Day',
    'District daily extraction volume exceeded 100,000 Liters.'
)
ON CONFLICT (alert_code) DO UPDATE SET
    alert_name = EXCLUDED.alert_name,
    alert_level = EXCLUDED.alert_level,
    alert_type = EXCLUDED.alert_type,
    trigger_field = EXCLUDED.trigger_field,
    trigger_logic = EXCLUDED.trigger_logic,
    expiry_logic = EXCLUDED.expiry_logic,
    calculation_frequency = EXCLUDED.calculation_frequency,
    default_message = EXCLUDED.default_message;
