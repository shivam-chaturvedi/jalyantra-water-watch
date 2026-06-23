import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, onValue, ref } from 'firebase/database';
import {
  Alert,
  District,
  KPIStats,
  SensorReading,
  FirebaseReadings,
  FirebaseDevicesTree,
  transformFirebaseReadings,
  mergeReadingsWithDeviceRegistry,
  calculateDistrictStats,
  generateAlerts,
  calculateKPIStats,
} from '@/lib/data';
import { database } from '@/lib/firebaseClient';
import { fetchAllDeviceMasterData, type DeviceMasterData } from '@/lib/siteAdmin';

function applyDeviceMasterFlags(
  sensors: SensorReading[],
  masterById: Map<string, DeviceMasterData>,
): SensorReading[] {
  return sensors.map((sensor) => {
    const master = masterById.get(sensor.deviceId);
    if (!master) return sensor;
    return {
      ...sensor,
      isPumpConnected: master.is_pump_connected,
    };
  });
}

interface UseGroundwaterDataReturn {
  sensors: SensorReading[];
  districts: District[];
  alerts: Alert[];
  kpiStats: KPIStats | null;
  totalReadings: number;
  totalWaterMonitored: number;
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: Date | null;
  availableLocations: string[];
  availableDates: string[];
  setIsLive: (live: boolean) => void;
  refreshData: () => void;
}

export function useGroundwaterData(): UseGroundwaterDataReturn {
  const [rawSensors, setRawSensors] = useState<SensorReading[]>([]);
  const [deviceMasterById, setDeviceMasterById] = useState<Map<string, DeviceMasterData>>(new Map());
  const [districts, setDistricts] = useState<District[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [kpiStats, setKpiStats] = useState<KPIStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const readingsPath = (import.meta.env.VITE_FIREBASE_READINGS_PATH as string | undefined) ?? 'readings';
  const devicesPath = (import.meta.env.VITE_FIREBASE_DEVICES_PATH as string | undefined) ?? 'devices';

  const sensors = useMemo(
    () => applyDeviceMasterFlags(rawSensors, deviceMasterById),
    [rawSensors, deviceMasterById],
  );

  const processSnapshot = useCallback(
    (readings: FirebaseReadings, devices: FirebaseDevicesTree) => {
      const sensorData = mergeReadingsWithDeviceRegistry(
        transformFirebaseReadings(readings),
        devices,
      );
    const districtData = calculateDistrictStats(sensorData);
    const alertData = generateAlerts(districtData);
    const kpiData = calculateKPIStats(sensorData, districtData);

    setRawSensors(sensorData);
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

  useEffect(() => {
    fetchAllDeviceMasterData()
      .then((rows) => {
        setDeviceMasterById(new Map(rows.map((row) => [row.device_id, row])));
      })
      .catch((error) => {
        console.error('Failed to fetch device master data', error);
      });
  }, []);

  const fetchLatest = useCallback(async () => {
    setIsLoading(true);
    try {
      const [readingsSnapshot, devicesSnapshot] = await Promise.all([
        get(ref(database, readingsPath)),
        get(ref(database, devicesPath)),
      ]);
      processSnapshot(
        (readingsSnapshot.val() ?? {}) as FirebaseReadings,
        (devicesSnapshot.val() ?? {}) as FirebaseDevicesTree,
      );
    } catch (error) {
      console.error('Failed to fetch Firebase readings', error);
      setIsLoading(false);
    }
  }, [processSnapshot, readingsPath, devicesPath]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (!isLive) return;
    const readingsRef = ref(database, readingsPath);
    const devicesRef = ref(database, devicesPath);

    let latestReadings: FirebaseReadings = {};
    let latestDevices: FirebaseDevicesTree = {};

    const publish = () => processSnapshot(latestReadings, latestDevices);

    const unsubscribeReadings = onValue(
      readingsRef,
      (snapshot) => {
        latestReadings = (snapshot.val() ?? {}) as FirebaseReadings;
        publish();
      },
      (error) => console.error('Realtime readings subscription error', error),
    );

    const unsubscribeDevices = onValue(
      devicesRef,
      (snapshot) => {
        latestDevices = (snapshot.val() ?? {}) as FirebaseDevicesTree;
        publish();
      },
      (error) => console.error('Realtime devices subscription error', error),
    );

    return () => {
      unsubscribeReadings();
      unsubscribeDevices();
    };
  }, [isLive, processSnapshot, readingsPath, devicesPath]);

  const refreshData = useCallback(() => {
    fetchLatest();
  }, [fetchLatest]);

  return {
    sensors,
    districts,
    alerts,
    kpiStats,
    totalReadings: kpiStats?.totalReadings ?? 0,
    totalWaterMonitored: kpiStats?.totalWaterMonitored ?? 0,
    isLoading,
    isLive,
    lastUpdated,
    availableLocations,
    availableDates,
    setIsLive,
    refreshData,
  };
}
