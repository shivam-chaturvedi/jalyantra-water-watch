import { useCallback, useEffect, useState } from 'react';
import { fetchSurveyedWells, SurveyWellPoint } from '@/lib/surveyData';

/**
 * Surveyed-well points for the dashboard map's second marker layer. Fetched once
 * from Supabase (not realtime — survey visits are periodic, unlike the Firebase
 * live-sensor feed), with a manual refresh for after a new survey sync.
 */
export function useSurveyWells() {
  const [surveyWells, setSurveyWells] = useState<SurveyWellPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchSurveyedWells()
      .then(setSurveyWells)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { surveyWells, isLoading, refresh };
}
