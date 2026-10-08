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

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
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

    const { data: readingRows, error: readingError } = await supabase
      .from('survey_reading')
      .select('survey_id, well_id, depth_meters, reading_timestamp, latitude, longitude')
      .in('well_id', wellIds);

    if (readingError) throw readingError;

    // Group readings by well_id + survey_id so each (well, survey) visit collapses
    // to one median depth + averaged GPS fix, matching the "3 QA readings" workflow.
    const readingsByWellSurvey = new Map<string, { depths: number[]; lats: number[]; longs: number[] }>();
    for (const r of readingRows || []) {
      const key = `${r.well_id}_${r.survey_id}`;
      const group = readingsByWellSurvey.get(key) ?? { depths: [], lats: [], longs: [] };
      if (typeof r.depth_meters === 'number') group.depths.push(r.depth_meters);
      if (typeof r.latitude === 'number') group.lats.push(r.latitude);
      if (typeof r.longitude === 'number') group.longs.push(r.longitude);
      readingsByWellSurvey.set(key, group);
    }

    // Pick the most-recently-surveyed visit per well as "latest," and the one
    // before it (if any) as "previous," for the depth-change figure.
    const visitsByWell = new Map<string, typeof surveyWellRows>();
    for (const row of surveyWellRows as any[]) {
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

      const latestReadings = readingsByWellSurvey.get(`${wellId}_${latest.survey_id}`);
      const previousReadings = previous
        ? readingsByWellSurvey.get(`${wellId}_${previous.survey_id}`)
        : undefined;

      const lat = average(latestReadings?.lats ?? []) ?? location?.latitude ?? null;
      const long = average(latestReadings?.longs ?? []) ?? location?.longitude ?? null;
      if (lat == null || long == null) continue; // can't place it on the map without a position

      const lastDepthMeters = median(latestReadings?.depths ?? []);
      const previousDepthMeters = previousReadings ? median(previousReadings.depths) : null;

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
        surveyorName: latest.survey_master?.surveyor_name ?? null,
        lastSurveyedOn: latest.surveyed_at,
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
      .select('id, survey_id, well_id, device_id, depth_meters, reading_sequence, reading_timestamp, latitude, longitude, surveyor_notes, survey_master(survey_name)')
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
      surveyName: r.survey_master?.survey_name ?? r.survey_id,
    }));
  } catch (err) {
    console.warn('[surveyData] fetchSurveyReadingsForWell failed, returning empty list:', err);
    return [];
  }
}
