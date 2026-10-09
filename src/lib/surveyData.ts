import { supabase } from '@/lib/supabaseClient';

export interface SurveyReadingRow {
  id: string;
  surveyId: string;
  wellId: string;
  deviceId: string | null;
  depthMeters: number;
  readingSequence: number | null;
  readingTimestamp: string;
  latitude: number | null;
  longitude: number | null;
  surveyorNotes: string | null;
  surveyorName: string | null;
  surveyName?: string | null;
}

export interface SurveyWellPoint {
  wellId: string;
  wellName: string;
  village: string;
  district: string;
  lat: number;
  long: number;
  wellDepthMeters: number | null;
  wellDiameterMeters: number | null;
  pumpAttached: boolean | null;
  pumpType: string | null;
  wellStatus: string;
  lastSurveyId: string;
  lastSurveyName: string;
  organizationName: string;
  surveyorName: string | null;
  lastSurveyedOn: string | null;
  lastDepthMeters: number | null;
  previousDepthMeters: number | null;
  changeSincePrevious: number | null;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Portable devices send 0/0 or placeholder values without a GPS fix — only trust coordinates inside India. */
function plausibleCoordinate(lat: unknown, long: unknown): { lat: number; long: number } | null {
  const la = toNumber(lat);
  const lo = toNumber(long);
  if (la == null || lo == null || la < 6 || la > 37.5 || lo < 68 || lo > 98.5) return null;
  return { lat: la, long: lo };
}

/**
 * Surveyed wells, shaped for the map's second marker layer + well popup.
 * One row per well — the well's most recent survey wins for display, with the
 * survey before that (if any) used to compute "change since previous survey."
 * Fails soft: a Supabase error yields an empty list rather than throwing, so a
 * survey-data outage never blocks the live Firebase-driven map.
 */
export async function fetchSurveyedWells(): Promise<SurveyWellPoint[]> {
  try {
    const { data: surveyWellRows, error: surveyWellError } = await supabase
      .from('survey_well')
      .select(
        `survey_id, well_id, well_status, surveyed_at,
         survey_master ( survey_name, organization_name, surveyor_name ),
         well_master ( well_name, well_depth_meters, well_diameter_meters, pump_attached, pump_type,
           location_master ( village_city, district, latitude, longitude ) )`,
      );

    if (surveyWellError) throw surveyWellError;
    if (!surveyWellRows || surveyWellRows.length === 0) return [];

    const wellIds = Array.from(new Set(surveyWellRows.map((r: any) => r.well_id)));

    // select('*') so this keeps working whether or not 20261008000000_survey_portable_ingest.sql
    // (surveyor_name etc.) has been applied yet.
    const { data: readingRows, error: readingError } = await supabase
      .from('survey_reading')
      .select('*')
      .in('well_id', wellIds);

    if (readingError) throw readingError;

    // One reading per (well, survey) — a retake overwrites the earlier take (see
    // 20261008000000_survey_portable_ingest.sql). Older rows from before that rule are
    // collapsed the same way here: the latest timestamp wins.
    const readingByWellSurvey = new Map<string, any>();
    for (const r of readingRows || []) {
      const key = `${r.well_id}_${r.survey_id}`;
      const existing = readingByWellSurvey.get(key);
      if (!existing || r.reading_timestamp > existing.reading_timestamp) readingByWellSurvey.set(key, r);
    }

    // Pick the most-recently-surveyed visit per well as "latest," and the one
    // before it (if any) as "previous," for the depth-change figure.
    const visitsByWell = new Map<string, typeof surveyWellRows>();
    for (const row of surveyWellRows as any[]) {
      if (!readingByWellSurvey.has(`${row.well_id}_${row.survey_id}`)) continue; // not measured yet
      const list = visitsByWell.get(row.well_id) ?? [];
      list.push(row);
      visitsByWell.set(row.well_id, list);
    }

    const points: SurveyWellPoint[] = [];
    for (const [wellId, visits] of visitsByWell.entries()) {
      const sorted = [...visits].sort(
        (a: any, b: any) => new Date(b.surveyed_at ?? 0).getTime() - new Date(a.surveyed_at ?? 0).getTime(),
      );
      const latest = sorted[0] as any;
      const previous = sorted[1] as any | undefined;
      const well = latest.well_master;
      const location = well?.location_master;
      if (!well) continue;

      const latestReading = readingByWellSurvey.get(`${wellId}_${latest.survey_id}`);
      const previousReading = previous ? readingByWellSurvey.get(`${wellId}_${previous.survey_id}`) : undefined;

      const gps = plausibleCoordinate(latestReading?.latitude, latestReading?.longitude);
      const lat = gps?.lat ?? location?.latitude ?? null;
      const long = gps?.long ?? location?.longitude ?? null;
      if (lat == null || long == null) continue; // can't place it on the map without a position

      const lastDepthMeters = toNumber(latestReading?.depth_meters);
      const previousDepthMeters = toNumber(previousReading?.depth_meters);

      points.push({
        wellId,
        wellName: well.well_name ?? wellId,
        village: location?.village_city ?? 'Unknown',
        district: location?.district ?? 'Unknown',
        lat,
        long,
        wellDepthMeters: well.well_depth_meters ?? null,
        wellDiameterMeters: well.well_diameter_meters ?? null,
        pumpAttached: well.pump_attached ?? null,
        pumpType: well.pump_type ?? null,
        wellStatus: latest.well_status,
        lastSurveyId: latest.survey_id,
        lastSurveyName: latest.survey_master?.survey_name ?? latest.survey_id,
        organizationName: latest.survey_master?.organization_name ?? 'Unknown',
        surveyorName: latestReading?.surveyor_name ?? latest.survey_master?.surveyor_name ?? null,
        lastSurveyedOn: latest.surveyed_at ?? latestReading?.reading_timestamp ?? null,
        lastDepthMeters,
        previousDepthMeters,
        changeSincePrevious:
          lastDepthMeters != null && previousDepthMeters != null ? lastDepthMeters - previousDepthMeters : null,
      });
    }

    return points;
  } catch (err) {
    console.warn('[surveyData] fetchSurveyedWells failed, returning empty list:', err);
    return [];
  }
}

/** Every reading for one well, across all surveys — newest first. Used by "View history." */
export async function fetchSurveyReadingsForWell(wellId: string): Promise<SurveyReadingRow[]> {
  try {
    const { data, error } = await supabase
      .from('survey_reading')
      .select('*, survey_master(survey_name, surveyor_name)')
      .eq('well_id', wellId)
      .order('reading_timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      surveyId: r.survey_id,
      wellId: r.well_id,
      deviceId: r.device_id,
      depthMeters: r.depth_meters,
      readingSequence: r.reading_sequence,
      readingTimestamp: r.reading_timestamp,
      latitude: r.latitude,
      longitude: r.longitude,
      surveyorNotes: r.surveyor_notes,
      surveyorName: r.surveyor_name ?? r.survey_master?.surveyor_name ?? null,
      surveyName: r.survey_master?.survey_name ?? r.survey_id,
    }));
  } catch (err) {
    console.warn('[surveyData] fetchSurveyReadingsForWell failed, returning empty list:', err);
    return [];
  }
}

export interface LatestSurveySnapshot {
  surveyId: string;
  surveyName: string;
  startDate: string | null;
  endDate: string | null;
  villagesCovered: number;
  wellsSurveyed: number;
  averageDepthMeters: number | null;
}

/**
 * The most recently Completed survey, for the dashboard's "Latest Survey Snapshot".
 * Moves on by itself: a survey becomes Completed either automatically (portable sync finds no
 * Pending wells left) or from Admin → Surveys → "Mark completed". Planned/In Progress surveys
 * are never shown, so a half-done survey cannot replace the last finished one.
 */
export async function fetchLatestSurveySnapshot(): Promise<LatestSurveySnapshot | null> {
  try {
    const { data: survey, error: surveyError } = await supabase
      .from('survey_master')
      .select('survey_id, survey_name, actual_start_date, actual_end_date')
      .eq('status', 'Completed')
      .order('actual_end_date', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (surveyError) throw surveyError;
    if (!survey) return null;

    const { data: readings, error: readingError } = await supabase
      .from('survey_reading')
      .select('well_id, depth_meters, reading_timestamp, well_master ( location_id )')
      .eq('survey_id', survey.survey_id);
    if (readingError) throw readingError;

    const latestByWell = new Map<string, any>();
    for (const r of readings || []) {
      const existing = latestByWell.get(r.well_id);
      if (!existing || r.reading_timestamp > existing.reading_timestamp) latestByWell.set(r.well_id, r);
    }
    const rows = Array.from(latestByWell.values());
    const depths = rows.map((r) => toNumber(r.depth_meters)).filter((d): d is number => d != null);
    const readingDates = rows.map((r) => String(r.reading_timestamp).slice(0, 10)).sort();

    return {
      surveyId: survey.survey_id,
      surveyName: survey.survey_name,
      startDate: readingDates[0] ?? survey.actual_start_date ?? null,
      endDate: readingDates[readingDates.length - 1] ?? survey.actual_end_date ?? null,
      villagesCovered: new Set(rows.map((r) => r.well_master?.location_id).filter(Boolean)).size,
      wellsSurveyed: rows.length,
      averageDepthMeters: depths.length ? depths.reduce((sum, d) => sum + d, 0) / depths.length : null,
    };
  } catch (err) {
    console.warn('[surveyData] fetchLatestSurveySnapshot failed:', err);
    return null;
  }
}

export interface SurveyReadingListRow {
  id: string;
  wellId: string;
  wellName: string;
  village: string;
  district: string;
  depthMeters: number | null;
  readingTimestamp: string;
  surveyId: string;
  surveyName: string;
  surveyorName: string | null;
  portableDeviceId: string | null;
}

/**
 * Every stored survey reading across all surveys, newest first — one row per (survey, well),
 * since a retake overwrites the earlier take. Feeds the dashboard's Survey Readings table.
 */
export async function fetchAllSurveyReadings(): Promise<SurveyReadingListRow[]> {
  try {
    const { data, error } = await supabase
      .from('survey_reading')
      .select('*, survey_master ( survey_name, surveyor_name ), well_master ( well_name, location_master ( village_city, district ) )')
      .order('reading_timestamp', { ascending: false });
    if (error) throw error;

    return (data || []).map((r: any) => ({
      id: r.id,
      wellId: r.well_id,
      wellName: r.well_master?.well_name ?? r.well_id,
      village: r.well_master?.location_master?.village_city ?? r.site_name ?? 'Unknown',
      district: r.well_master?.location_master?.district ?? 'Unknown',
      depthMeters: toNumber(r.depth_meters),
      readingTimestamp: r.reading_timestamp,
      surveyId: r.survey_id,
      surveyName: r.survey_master?.survey_name ?? r.survey_id,
      surveyorName: r.surveyor_name ?? r.survey_master?.surveyor_name ?? null,
      portableDeviceId: r.portable_device_id ?? r.device_id ?? null,
    }));
  } catch (err) {
    console.warn('[surveyData] fetchAllSurveyReadings failed, returning empty list:', err);
    return [];
  }
}
