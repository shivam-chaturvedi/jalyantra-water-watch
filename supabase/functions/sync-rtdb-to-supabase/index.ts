// Supabase Edge Function: sync-rtdb-to-supabase
// Description: Fetches telemetry from Firebase RTDB REST API,
// populates Supabase Master Tables (A), Raw Sensor Data (B), Derived Well & District Summaries (C-H),
// and Alert Logs (I-J). Master fields are Firebase-only — no hardcoded dimension/location defaults.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_FIREBASE_RTDB_URL = "https://water-sensor-a14d5-default-rtdb.asia-southeast1.firebasedatabase.app";
const DEFAULT_FIREBASE_API_KEY = "AIzaSyBefKppOOhTLAwIfzbxXOAQ4iOgJLL_EGA";

const DISTRICT_CENTERS = [
  { name: "Mumbai", lat: 19.076, long: 72.95 },
  { name: "Pune", lat: 18.5204, long: 73.8567 },
  { name: "Nashik", lat: 19.9975, long: 73.7898 },
  { name: "Nagpur", lat: 21.1458, long: 79.0882 },
  { name: "Aurangabad", lat: 19.8762, long: 75.3433 },
  { name: "Akola", lat: 20.7002, long: 77.0082 },
  { name: "Washim", lat: 20.112, long: 77.1461 },
  { name: "Amravati", lat: 20.9374, long: 77.7796 },
  { name: "Raigad", lat: 18.5158, long: 73.1822 },
  { name: "Thane", lat: 19.2183, long: 72.9781 },
  { name: "Palghar", lat: 19.6968, long: 72.7654 },
];

function matchDistrictName(lat: number, long: number): string {
  let closest = DISTRICT_CENTERS[0];
  let minDistance = Number.POSITIVE_INFINITY;
  for (const center of DISTRICT_CENTERS) {
    const dx = lat - center.lat;
    const dy = long - center.long;
    const distance = dx * dx + dy * dy;
    if (distance < minDistance) {
      minDistance = distance;
      closest = center;
    }
  }
  return closest.name;
}

function optionalPositive(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

// Noise floor for pump-run detection — matches the PUMP_START_RISE_M reasoning in src/lib/pumpEvents.ts
const PUMP_MIN_RUN_DROP_M = 0.05;
const PUMP_MIN_RUN_DURATION_MS = 60_000;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("MY_SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || "https://uzeibmfyloeuawforucs.supabase.co";
    const supabaseServiceKey = Deno.env.get("MY_SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("MY_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY") || "";
    const firebaseRtdbUrl = Deno.env.get("FIREBASE_RTDB_URL") || Deno.env.get("VITE_FIREBASE_DATABASE_URL") || DEFAULT_FIREBASE_RTDB_URL;
    const firebaseApiKey = Deno.env.get("FIREBASE_API_KEY") || Deno.env.get("VITE_FIREBASE_API_KEY") || DEFAULT_FIREBASE_API_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await req.json().catch(() => ({}));

    const targetRtdbUrl = body.firebaseRtdbUrl || firebaseRtdbUrl;
    console.log(`Syncing RTDB data from ${targetRtdbUrl}`);

    // 1. Fetch devices and readings nodes from Firebase
    const authQuery = firebaseApiKey ? `?auth=${firebaseApiKey}` : "";
    const [devicesRes, readingsRes] = await Promise.all([
      fetch(`${targetRtdbUrl}/devices.json${authQuery}`).catch(() => null),
      fetch(`${targetRtdbUrl}/readings.json${authQuery}`).catch(() => null),
    ]);

    const devicesData = devicesRes && devicesRes.ok ? await devicesRes.json() : {};
    const readingsData = readingsRes && readingsRes.ok ? await readingsRes.json() : {};

    let syncedDevicesCount = 0;
    let syncedReadingsCount = 0;

    // Seed Static Alert Definitions (Table I)
    await supabase.from("alert_definitions").upsert([
      { alert_code: "LOW_WATER_LEVEL", alert_name: "Low Water Level", alert_level: "well", alert_type: "warning", trigger_field: "dailyMedianWaterDepthMeters", trigger_logic: "dailyMedianWaterDepthMeters > 0.8 * wellDepthMeters", expiry_logic: "dailyMedianWaterDepthMeters < 0.75 * wellDepthMeters", calculation_frequency: "End of Day", default_message: "Water level is approaching critically low levels." },
      { alert_code: "DRY_RUN_RISK", alert_name: "Dry Run Risk", alert_level: "well", alert_type: "warning", trigger_field: "safetyBufferMeters", trigger_logic: "safetyBufferMeters <= 1.0", expiry_logic: "safetyBufferMeters > 1.5", calculation_frequency: "End of Day", default_message: "High risk of pump dry running. Water buffer above intake is below 1 meter." },
      { alert_code: "UNSAFE_PUMP_OPERATION", alert_name: "Unsafe Pump Operation", alert_level: "well", alert_type: "warning", trigger_field: "safetyBufferMeters", trigger_logic: "safetyBufferMeters <= 2.0 AND safetyBufferMeters > 1.0", expiry_logic: "safetyBufferMeters > 2.0", calculation_frequency: "End of Day", default_message: "Pump is operating with less than 2 meters safety buffer." },
      { alert_code: "POOR_RECOVERY", alert_name: "Poor Groundwater Recovery", alert_level: "well", alert_type: "warning", trigger_field: "recoveryAmountMeters", trigger_logic: "recoveryAmountMeters < 0.1 AND hoursGap >= 24", expiry_logic: "recoveryAmountMeters >= 0.2", calculation_frequency: "End of Day", default_message: "Well exhibits minimal groundwater recovery (<0.1m)." },
    ], { onConflict: "alert_code" });

    // 2. Sync Devices into Location, Well, and Device Master tables (A) — Firebase-only
    const wellDepthMap = new Map<string, number>();
    const wellDiameterMap = new Map<string, number>();
    const wellPumpIntakeMap = new Map<string, number>();
    const wellDistrictMap = new Map<string, string>();
    const wellStateMap = new Map<string, string>();

    // Dedup LOW_WATER_LEVEL alerts by (well_id, underlying reading date) so re-running the sync over
    // the same historical window never raises a second alert for a day already logged.
    const { data: existingLowWaterAlerts } = await supabase
      .from("alert_logs")
      .select("well_id, triggered_at")
      .eq("alert_code", "LOW_WATER_LEVEL");
    const lowWaterAlertedDates = new Set<string>(
      (existingLowWaterAlerts || []).map((a: any) => `${a.well_id}_${String(a.triggered_at).slice(0, 10)}`)
    );

    const { data: existingWells } = await supabase
      .from("well_master")
      .select("well_id, well_depth_meters, well_diameter_meters, pump_intake_level_meters, location_id");
    const existingWellById = new Map<string, any>((existingWells || []).map((w: any) => [w.well_id, w]));
    for (const w of existingWells || []) {
      const depth = optionalPositive(w.well_depth_meters);
      const diameter = optionalPositive(w.well_diameter_meters);
      const intake = optionalPositive(w.pump_intake_level_meters);
      if (depth != null) wellDepthMap.set(w.well_id, depth);
      if (diameter != null) wellDiameterMap.set(w.well_id, diameter);
      if (intake != null) wellPumpIntakeMap.set(w.well_id, intake);
    }

    const { data: existingLocations } = await supabase
      .from("location_master")
      .select("location_id, district, state");
    const locationById = new Map<string, any>((existingLocations || []).map((l: any) => [l.location_id, l]));
    for (const w of existingWells || []) {
      const loc = locationById.get(w.location_id);
      if (loc?.district) wellDistrictMap.set(w.well_id, loc.district);
      if (loc?.state) wellStateMap.set(w.well_id, loc.state);
    }

    if (devicesData && typeof devicesData === "object") {
      for (const [deviceKey, devNode] of Object.entries(devicesData)) {
        const meta = (devNode as any)?.meta || {};
        const deviceId = String(meta.deviceId || deviceKey).trim();
        if (!deviceId) continue;

        const lat = optionalNumber(meta.lat);
        const long = optionalNumber(meta.long ?? meta.lng);
        if (lat == null || long == null) {
          console.warn(`Skipping device ${deviceId}: meta.lat/long missing`);
          continue;
        }

        const district =
          String(meta.district || meta.districtName || "").trim() || matchDistrictName(lat, long);
        const state = String(meta.state || "").trim();
        const wellId = `WEL-${deviceId}`;
        // Reuse the well's own curated location_id if it already exists — recomputing a generic
        // district guess here would create a second, unused location row disconnected from the well.
        const existingWell = existingWellById.get(wellId);
        const locationId = existingWell?.location_id || `LOC-${district.toUpperCase().replace(/\s+/g, "-")}`;

        const firebaseWellDepth = optionalPositive(meta.wellDepth ?? meta.wellDepthMeters);
        const firebaseWellDiameter = optionalPositive(
          meta.wellDiameter ?? meta.wellDiameterMeters ?? meta.diameter,
        );
        const firebasePumpIntake = optionalPositive(meta.pumpIntakeLevelMeters ?? meta.pumpIntake);

        if (firebaseWellDepth != null) wellDepthMap.set(wellId, firebaseWellDepth);
        if (firebaseWellDiameter != null) wellDiameterMap.set(wellId, firebaseWellDiameter);
        if (firebasePumpIntake != null) wellPumpIntakeMap.set(wellId, firebasePumpIntake);
        wellDistrictMap.set(wellId, district);
        if (state) wellStateMap.set(wellId, state);

        // Only create a new location for a device that actually resolves to a real well — either
        // one that already exists, or one with real Firebase depth/diameter data to create now.
        // Otherwise Firebase devices with no curated well (test devices, decommissioned units,
        // not-yet-onboarded units) leave behind orphaned generic-district location rows forever.
        const wellExists = !!existingWell;
        const wellWillBeReady = wellExists || (firebaseWellDepth != null && firebaseWellDiameter != null);

        // location_id, village_city, taluka, district, state are set once at creation and must
        // never change afterward — the sync only ever INSERTs a new location, never updates these.
        const locationExists = locationById.has(locationId);
        if (!locationExists) {
          if (wellWillBeReady) {
            const locationPayload: Record<string, unknown> = {
              location_id: locationId,
              village_city: String(meta.siteName || "").trim() || district,
              taluka: String(meta.taluka || "").trim() || district,
              district,
              latitude: lat,
              longitude: long,
              status: "Active",
            };
            if (state) locationPayload.state = state;
            await supabase.from("location_master").insert(locationPayload);
            locationById.set(locationId, { location_id: locationId, district, state });
          } else {
            console.warn(`Skipping new location_master for ${locationId}: device ${deviceId} has no known/creatable well`);
          }
        } else {
          await supabase.from("location_master").update({ latitude: lat, longitude: long, status: "Active" }).eq("location_id", locationId);
        }

        // location_id, well_name, well_depth_meters, well_diameter_meters are locked once a well
        // exists — only pump metadata/status may be refreshed here; edit the rest via the SQL editor.
        let wellReady = wellExists;
        if (wellExists) {
          const wellUpdatePatch: Record<string, unknown> = { status: "Active" };
          if (firebasePumpIntake != null) wellUpdatePatch.pump_intake_level_meters = firebasePumpIntake;
          if (meta.pumpAttached !== undefined) wellUpdatePatch.pump_attached = Boolean(meta.pumpAttached);
          if (meta.pumpType) wellUpdatePatch.pump_type = String(meta.pumpType);
          await supabase.from("well_master").update(wellUpdatePatch).eq("well_id", wellId);
        } else if (firebaseWellDepth != null && firebaseWellDiameter != null) {
          const wellInsertPayload: Record<string, unknown> = {
            well_id: wellId,
            location_id: locationId,
            well_name: String(meta.siteName || "").trim() || `Well ${deviceId}`,
            well_depth_meters: firebaseWellDepth,
            well_diameter_meters: firebaseWellDiameter,
            status: "Active",
          };
          if (firebasePumpIntake != null) wellInsertPayload.pump_intake_level_meters = firebasePumpIntake;
          if (meta.pumpAttached !== undefined) wellInsertPayload.pump_attached = Boolean(meta.pumpAttached);
          if (meta.pumpType) wellInsertPayload.pump_type = String(meta.pumpType);
          await supabase.from("well_master").insert(wellInsertPayload);
          existingWellById.set(wellId, {
            well_id: wellId,
            location_id: locationId,
            well_depth_meters: firebaseWellDepth,
            well_diameter_meters: firebaseWellDiameter,
          });
          wellReady = true;
        } else {
          console.warn(
            `Skipping new well_master for ${wellId}: Firebase meta missing wellDepth/wellDiameter`,
          );
        }

        const devicePayload: Record<string, unknown> = {
          device_serial_number: deviceId,
          status: "Active",
        };
        if (wellReady) devicePayload.well_id = wellId;
        if (meta.startStopMethod) devicePayload.start_stop_method = String(meta.startStopMethod);

        const { data: existingDevice } = await supabase
          .from("device_master")
          .select("device_id")
          .eq("device_id", deviceId)
          .maybeSingle();
        if (existingDevice) {
          await supabase.from("device_master").update(devicePayload).eq("device_id", deviceId);
        } else {
          await supabase.from("device_master").insert({ device_id: deviceId, ...devicePayload });
        }

        syncedDevicesCount++;
      }
    }

    // 3. Process Telemetry & Store Raw Data (B)
    if (readingsData && typeof readingsData === "object") {
      const wellReadingsByDate = new Map<string, Map<string, { depth: number; timestampMs: number }[]>>();
      const districtDailyAgg = new Map<
        string,
        { wells: Set<string>; depthSum: number; depthCount: number; extraction: number; runtime: number }
      >();
      const rawRowsToInsert: Record<string, unknown>[] = [];
      let minReadingMs = Number.POSITIVE_INFINITY;
      let maxReadingMs = Number.NEGATIVE_INFINITY;

      for (const [batchKey, batchNode] of Object.entries(readingsData)) {
        if (!batchNode || typeof batchNode !== "object") continue;

        const deviceId = batchKey;
        const wellId = `WEL-${deviceId}`;

        const entries = Object.entries(batchNode as Record<string, any>);
        for (const [rKey, r] of entries) {
          if (!r || typeof r !== "object") continue;
          const depth = Number(r.depth);
          if (isNaN(depth) || depth <= 0 || depth > 100) continue;

          let timestamp = r.collectedDateTime || r.collectedDate;
          if (!timestamp || String(timestamp).includes("UNSYNCED") || String(timestamp).includes("uptime")) {
            const numKey = Number(rKey);
            if (!isNaN(numKey) && numKey > 1000000000) {
              const ms = numKey < 1e12 ? numKey * 1000 : numKey;
              timestamp = new Date(ms).toISOString();
            } else {
              continue; // no invented "now" timestamps
            }
          }

          const readingTimestamp = new Date(timestamp).toISOString();
          const readingTimeMs = Date.parse(readingTimestamp);
          if (Number.isNaN(readingTimeMs)) continue;
          const readingDate = readingTimestamp.split("T")[0];

          rawRowsToInsert.push({
            device_id: deviceId,
            well_id: existingWellById.has(wellId) ? wellId : null,
            depth_meters: depth,
            timestamp: readingTimestamp,
            uptime: r.uptimeSeconds || null,
            online_since: r.deviceOnlineSince ? new Date(r.deviceOnlineSince).toISOString() : null,
          });
          if (readingTimeMs < minReadingMs) minReadingMs = readingTimeMs;
          if (readingTimeMs > maxReadingMs) maxReadingMs = readingTimeMs;

          if (!wellReadingsByDate.has(wellId)) wellReadingsByDate.set(wellId, new Map());
          const dateMap = wellReadingsByDate.get(wellId)!;
          if (!dateMap.has(readingDate)) dateMap.set(readingDate, []);
          dateMap.get(readingDate)!.push({ depth, timestampMs: readingTimeMs });

          // Capture district from Firebase reading when present
          const readingDistrict = String(r.district || "").trim();
          if (readingDistrict && !wellDistrictMap.has(wellId)) {
            wellDistrictMap.set(wellId, readingDistrict);
          }
        }
      }

      // Bulk upsert raw telemetry — dedupe in memory first, then only check for existing rows within
      // the actual timestamp range being synced (not the whole table, which only grows over time).
      const uniqueRowsMap = new Map<string, Record<string, unknown>>();
      for (const row of rawRowsToInsert) {
        const key = `${row.device_id}_${row.timestamp}`;
        if (!uniqueRowsMap.has(key)) uniqueRowsMap.set(key, row);
      }
      const deduplicatedRows = Array.from(uniqueRowsMap.values());

      if (deduplicatedRows.length > 0) {
        const { data: existingRecords } = await supabase
          .from("raw_sensor_data")
          .select("device_id, timestamp")
          .gte("timestamp", new Date(minReadingMs).toISOString())
          .lte("timestamp", new Date(maxReadingMs).toISOString());
        const existingKeysSet = new Set((existingRecords || []).map((r: any) => `${r.device_id}_${r.timestamp}`));
        const rowsToUpsert = deduplicatedRows.filter((r) => !existingKeysSet.has(`${r.device_id}_${r.timestamp}`));

        for (let i = 0; i < rowsToUpsert.length; i += 200) {
          const chunk = rowsToUpsert.slice(i, i + 200);
          await supabase.from("raw_sensor_data").upsert(chunk, { onConflict: "device_id,timestamp", ignoreDuplicates: true });
        }
        syncedReadingsCount += rowsToUpsert.length;
      }

      // 3.5. Detect Pump Runs from Raw Depth Readings & Insert into pump_run_summary (C)
      // NOTE: This ADDS new rows only. It does not touch or delete any existing pump_run_summary rows.
      for (const [wellId, dateMap] of wellReadingsByDate.entries()) {
        const wellDiameterForRuns = wellDiameterMap.get(wellId);
        const wellAreaForRuns =
          wellDiameterForRuns != null ? 3.14159265 * Math.pow(wellDiameterForRuns / 2, 2) : null;

        for (const [dateStr, readings] of dateMap.entries()) {
          const sorted = [...readings].sort((a, b) => a.timestampMs - b.timestampMs);
          if (sorted.length < 2) continue;

          const runs: { startIdx: number; endIdx: number }[] = [];
          let runStart: number | null = null;
          for (let idx = 1; idx < sorted.length; idx++) {
            const diff = sorted[idx].depth - sorted[idx - 1].depth;
            if (diff >= 0.02) {
              if (runStart === null) runStart = idx - 1;
            } else {
              if (runStart !== null) {
                runs.push({ startIdx: runStart, endIdx: idx - 1 });
                runStart = null;
              }
            }
          }
          if (runStart !== null) {
            runs.push({ startIdx: runStart, endIdx: sorted.length - 1 });
          }

          // Filter out sensor-noise blips: a real pump cycle causes a cumulative rise of at least
          // PUMP_MIN_RUN_DROP_M and lasts at least PUMP_MIN_RUN_DURATION_MS.
          const validRuns = runs.filter((run) => {
            const startPoint = sorted[run.startIdx];
            const endPoint = sorted[run.endIdx];
            const drop = endPoint.depth - startPoint.depth;
            const durationMs = endPoint.timestampMs - startPoint.timestampMs;
            return drop >= PUMP_MIN_RUN_DROP_M && durationMs >= PUMP_MIN_RUN_DURATION_MS;
          });

          if (validRuns.length === 0) continue;

          const rowsForDate = validRuns.map((run, idx) => {
            const startPoint = sorted[run.startIdx];
            const endPoint = sorted[run.endIdx];
            const drop = Math.max(0, endPoint.depth - startPoint.depth);
            const runtimeMinutes = Math.max(0, (endPoint.timestampMs - startPoint.timestampMs) / 60000);
            const extractionLiters = wellAreaForRuns != null ? wellAreaForRuns * drop * 1000.0 : 0;
            return {
              well_id: wellId,
              run_date: dateStr,
              pump_start_time: new Date(startPoint.timestampMs).toISOString(),
              pump_stop_time: new Date(endPoint.timestampMs).toISOString(),
              pump_runtime_minutes: runtimeMinutes,
              pump_start_depth_meters: startPoint.depth,
              pump_stop_depth_meters: endPoint.depth,
              water_level_drop_during_run_meters: drop,
              pump_extraction_per_run_liters: extractionLiters,
              is_first_run_of_day: idx === 0,
              is_last_run_of_day: idx === validRuns.length - 1,
              updated_at: new Date().toISOString(),
            };
          });

          if (rowsForDate.length > 0) {
            await supabase.from("pump_run_summary").upsert(rowsForDate, { onConflict: "well_id,pump_start_time,pump_stop_time" });
          }
        }
      }

      // Pull real pump run data — this is the single source of truth for run counts/runtime/extraction
      const { data: pumpRunRows } = await supabase
        .from("pump_run_summary")
        .select("well_id, run_date, pump_runtime_minutes, pump_extraction_per_run_liters, water_level_drop_during_run_meters");
      const pumpRunsByWellDate = new Map<string, { count: number; runtime: number; extraction: number; drop: number }>();
      for (const row of pumpRunRows || []) {
        const key = `${row.well_id}_${row.run_date}`;
        const agg = pumpRunsByWellDate.get(key) || { count: 0, runtime: 0, extraction: 0, drop: 0 };
        agg.count += 1;
        agg.runtime += Number(row.pump_runtime_minutes) || 0;
        agg.extraction += Number(row.pump_extraction_per_run_liters) || 0;
        agg.drop += Number(row.water_level_drop_during_run_meters) || 0;
        pumpRunsByWellDate.set(key, agg);
      }

      // 4. Compute Derived Metrics (D, E, F, J) — no hardcoded well depth/diameter
      for (const [wellId, dateMap] of wellReadingsByDate.entries()) {
        if (!existingWellById.has(wellId)) continue;

        const sortedDates = Array.from(dateMap.keys()).sort();
        const wellDepth = wellDepthMap.get(wellId);
        const wellDiameter = wellDiameterMap.get(wellId);
        const pumpIntake = wellPumpIntakeMap.get(wellId);
        const wellArea = wellDiameter != null ? 3.14159265 * Math.pow(wellDiameter / 2, 2) : null;
        const district = wellDistrictMap.get(wellId);
        const state = wellStateMap.get(wellId);

        const dailyExtractionHistory: number[] = [];
        const dailyMedianByDate = new Map<string, number>();
        for (let i = 0; i < sortedDates.length; i++) {
          const dateStr = sortedDates[i];
          const depths = dateMap.get(dateStr)!.map((r) => r.depth).sort((a, b) => a - b);
          const mid = Math.floor(depths.length / 2);
          const medianDepth = depths.length % 2 !== 0 ? depths[mid] : (depths[mid - 1] + depths[mid]) / 2;
          dailyMedianByDate.set(dateStr, medianDepth);

          const remainingDepth = wellDepth != null ? wellDepth - medianDepth : null;
          const remainingVolumeLiters =
            remainingDepth != null && wellArea != null ? wellArea * remainingDepth * 1000.0 : null;
          const safetyBuffer =
            remainingDepth != null && pumpIntake != null ? remainingDepth - pumpIntake : null;
          const dryRunRisk = safetyBuffer != null ? safetyBuffer <= 1.0 : false;
          const safePumpOp = safetyBuffer != null ? safetyBuffer > pumpIntake! : true;
          const lowWaterLevel = wellDepth != null ? medianDepth > 0.8 * wellDepth : false;

          // Use actual pump run data — no re-derivation, no fabrication
          const runAgg = pumpRunsByWellDate.get(`${wellId}_${dateStr}`) || { count: 0, runtime: 0, extraction: 0, drop: 0 };
          const dailyPumpRunCount = runAgg.count;
          const dailyPumpRuntimeMinutes = runAgg.runtime;
          const dailyWaterExtractionLiters = runAgg.extraction;
          const totalDropMeters = runAgg.drop;
          dailyExtractionHistory.push(dailyWaterExtractionLiters);
          const last7 = dailyExtractionHistory.slice(-7);
          const sevenDayWaterExtractionLiters = last7.reduce((a, b) => a + b, 0);
          const avgSevenDayExtractionLiters = sevenDayWaterExtractionLiters / last7.length;

          // Weekly/Monthly Well Summary (E) — populated every day so daily_well_summary below reads
          // avg_seven_day_extraction_liters back from this same table, not a private local copy.
          const weeklyPayload: Record<string, unknown> = {
            well_id: wellId,
            calculation_date: dateStr,
            seven_day_water_extraction_liters: sevenDayWaterExtractionLiters,
            avg_seven_day_extraction_liters: avgSevenDayExtractionLiters,
            updated_at: new Date().toISOString(),
          };
          if (i >= 7) {
            const date7Ago = sortedDates[i - 7];
            const depth7Ago = dailyMedianByDate.get(date7Ago);
            if (depth7Ago != null) {
              const change7Days = medianDepth - depth7Ago;
              weeklyPayload.seven_day_depth_change_meters = change7Days;
              weeklyPayload.thirty_day_depth_change_meters = change7Days * 4.0;
            }
          }
          await supabase.from("weekly_monthly_well_summary").upsert(weeklyPayload, { onConflict: "well_id, calculation_date" });

          await supabase.from("daily_well_summary").upsert({
            well_id: wellId,
            date: dateStr,
            daily_median_water_depth_meters: medianDepth,
            daily_pump_run_count: dailyPumpRunCount,
            daily_pump_runtime_minutes: dailyPumpRuntimeMinutes,
            daily_water_extraction_liters: dailyWaterExtractionLiters,
            daily_water_level_drop_meters: totalDropMeters,
            remaining_water_depth_meters: remainingDepth,
            remaining_water_volume_liters: remainingVolumeLiters,
            estimated_days_remaining:
              remainingVolumeLiters != null && avgSevenDayExtractionLiters > 0
                ? remainingVolumeLiters / avgSevenDayExtractionLiters
                : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: "well_id, date" });

          let healthStatus = "Green";
          if (dryRunRisk) healthStatus = "Red";
          else if (!safePumpOp) healthStatus = "Amber";

          await supabase.from("daily_well_health_summary").upsert({
            well_id: wellId,
            date: dateStr,
            well_health_status: healthStatus,
            safety_buffer_meters: safetyBuffer,
            dry_run_risk_boolean: dryRunRisk,
            safe_pump_operation_boolean: safePumpOp,
            device_health_status: "Active",
            updated_at: new Date().toISOString(),
          }, { onConflict: "well_id, date" });

          if (dryRunRisk && safetyBuffer != null) {
            await supabase.from("alert_logs").insert({
              alert_code: "DRY_RUN_RISK",
              well_id: wellId,
              district: district || null,
              state: state || null,
              alert_type: "warning",
              trigger_field: "safetyBufferMeters",
              trigger_value: `${safetyBuffer.toFixed(2)}m`,
              status: "active",
              triggered_at: new Date().toISOString(),
            });
          }

          if (lowWaterLevel) {
            const alertKey = `${wellId}_${dateStr}`;
            if (!lowWaterAlertedDates.has(alertKey)) {
              await supabase.from("alert_logs").insert({
                alert_code: "LOW_WATER_LEVEL",
                well_id: wellId,
                district: district || null,
                state: state || null,
                alert_type: "warning",
                trigger_field: "dailyMedianWaterDepthMeters",
                trigger_value: `${medianDepth.toFixed(2)}m`,
                status: "active",
                triggered_at: new Date(`${dateStr}T12:00:00.000Z`).toISOString(),
              });
              lowWaterAlertedDates.add(alertKey);
            }
          }

          if (district) {
            const aggKey = `${district}__${dateStr}`;
            const agg = districtDailyAgg.get(aggKey) || {
              wells: new Set<string>(),
              depthSum: 0,
              depthCount: 0,
              extraction: 0,
              runtime: 0,
            };
            agg.wells.add(wellId);
            agg.depthSum += medianDepth;
            agg.depthCount += 1;
            districtDailyAgg.set(aggKey, agg);
          }
        }
      }

      // 5. Per-district summaries from real aggregates only
      for (const [aggKey, agg] of districtDailyAgg.entries()) {
        const [districtName, dateStr] = aggKey.split("__");
        await supabase.from("district_daily_summary").upsert({
          district: districtName,
          date: dateStr,
          total_active_wells_per_district: agg.wells.size,
          avg_water_depth_per_district_meters: agg.depthCount > 0 ? agg.depthSum / agg.depthCount : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "district, date" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Supabase tables updated from Firebase RTDB (no hardcoded master defaults).",
        syncedDevices: syncedDevicesCount,
        syncedReadings: syncedReadingsCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
