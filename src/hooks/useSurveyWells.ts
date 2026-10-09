import { useCallback, useEffect, useState } from 'react';
import {
  fetchAllSurveyReadings,
  fetchLatestSurveySnapshot,
  fetchSurveyedWells,
  LatestSurveySnapshot,
  SurveyReadingListRow,
  SurveyWellPoint,
} from '@/lib/surveyData';

/**
 * Surveyed-well points for the dashboard map's second marker layer, the latest Completed
 * survey's snapshot, and every stored survey reading (for the Survey Readings table).
 * Fetched once from Supabase (not realtime — survey visits are periodic, unlike the
 * Firebase live-sensor feed), with a manual refresh for after a new survey sync.
 */
export function useSurveyWells() {
  const [surveyWells, setSurveyWells] = useState<SurveyWellPoint[]>([]);
  const [snapshot, setSnapshot] = useState<LatestSurveySnapshot | null>(null);
  const [allReadings, setAllReadings] = useState<SurveyReadingListRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    Promise.all([fetchSurveyedWells(), fetchLatestSurveySnapshot(), fetchAllSurveyReadings()])
      .then(([wells, latest, readings]) => {
        setSurveyWells(wells);
        setSnapshot(latest);
        setAllReadings(readings);
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { surveyWells, snapshot, allReadings, isLoading, refresh };
}
