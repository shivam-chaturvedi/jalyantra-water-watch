import { useCallback, useEffect, useState } from 'react';
import { get, onValue, ref } from 'firebase/database';
import {
  Alert,
  District,
  KPIStats,
  SensorReading,
  FirebaseReadings,
  transformFirebaseReadings,
  calculateDistrictStats,
  generateAlerts,
  calculateKPIStats,
} from '@/lib/data';
import { database } from '@/lib/firebaseClient';

interface UseGroundwaterDataReturn {
  sensors: SensorReading[];
  districts: District[];
  alerts: Alert[];
  kpiStats: KPIStats | null;
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: Date | null;
  availableLocations: string[];
  availableDates: string[];
  setIsLive: (live: boolean) => void;
  refreshData: () => void;
}

export function useGroundwaterData(): UseGroundwaterDataReturn {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpiStats, setKpiStats] = useState<KPIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const readingsPath = (import.meta.env.VITE_FIREBASE_READINGS_PATH as string | undefined) ?? 'readings';

  const processSnapshot = useCallback((value: FirebaseReadings) => {
    const sensorData = transformFirebaseReadings(value);
    const districtData = calculateDistrictStats(sensorData);
    const alertData = generateAlerts(districtData);
    const kpiData = calculateKPIStats(sensorData, districtData);

    setSensors(sensorData);
    setDistricts(districtData);
    setAlerts(alertData);
    setKpiStats(kpiData);
    setLastUpdated(new Date());
    setIsLoading(false);

    const locationSet = new Set(sensorData.map((sensor) => sensor.district));
    setAvailableLocations(Array.from(locationSet).sort());

    const dateSet = new Set<string>();
    sensorData.forEach((sensor) => {
      sensor.history.forEach((point) => {
        if (point.collectedDate) {
          dateSet.add(point.collectedDate);
        }
      });
    });
    setAvailableDates(
      Array.from(dateSet)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
    );
  }, []);

  const fetchLatest = useCallback(async () => {
    setIsLoading(true);
    try {
      const snapshot = await get(ref(database, readingsPath));
      processSnapshot((snapshot.val() ?? {}) as FirebaseReadings);
    } catch (error) {
      console.error('Failed to fetch Firebase readings', error);
      setIsLoading(false);
    }
  }, [processSnapshot, readingsPath]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (!isLive) return;
    const readingsRef = ref(database, readingsPath);
    const unsubscribe = onValue(
      readingsRef,
      (snapshot) => {
        processSnapshot((snapshot.val() ?? {}) as FirebaseReadings);
      },
      (error) => {
        console.error('Realtime subscription error', error);
      },
    );

    return () => unsubscribe();
  }, [isLive, processSnapshot, readingsPath]);

  const refreshData = useCallback(() => {
    fetchLatest();
  }, [fetchLatest]);

  return {
    sensors,
    districts,
    alerts,
    kpiStats,
    isLoading,
    isLive,
    lastUpdated,
    availableLocations,
    availableDates,
    setIsLive,
    refreshData,
  };
}
