import { useCallback, useEffect, useMemo, useState } from 'react';
import { get, onValue, ref } from 'firebase/database';
import {
  Alert,
  District,
  KPIStats,
  SensorReading,
  SensorHistoryPoint,
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
import { supabase } from '@/lib/supabaseClient';

const SUPABASE_DASHBOARD_RAW_LIMIT = 5000;

type RawSensorDataRow = {
  id: string;
  device_id: string;
  well_id: string | null;
  depth_meters: number;
  timestamp: string;
  uptime: number | null;
  online_since: string | null;
};

type DeviceMasterRow = {
  device_id: string;
  well_id: string | null;
};

type WellMasterRow = {
  well_id: string;
  location_id: string | null;
  well_name: string | null;
};

type LocationMasterRow = {
  location_id: string;
  district: string | null;
  latitude: number | null;
  longitude: number | null;
};

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

function calculateAndPublish(
  sensorData: SensorReading[],
  setRawSensors: (sensors: SensorReading[]) => void,
  setDistricts: (districts: District[]) => void,
  setAlerts: (alerts: Alert[]) => void,
  setKpiStats: (stats: KPIStats) => void,
  setLastUpdated: (date: Date) => void,
  setAvailableLocations: (locations: string[]) => void,
  setAvailableDates: (dates: string[]) => void,
) {
  const districtData = calculateDistrictStats(sensorData);
  const alertData = generateAlerts(districtData);
  const kpiData = calculateKPIStats(sensorData, districtData);

  setRawSensors(sensorData);
  setDistricts(districtData);
  setAlerts(alertData);
  setKpiStats(kpiData);
  setLastUpdated(new Date());

  const locationSet = new Set(sensorData.map((sensor) => sensor.district));
  setAvailableLocations(Array.from(locationSet).sort());

  const dateSet = new Set<string>();
  sensorData.forEach((sensor) => {
    sensor.history.forEach((point) => {
      if (point.collectedDate) dateSet.add(point.collectedDate);
    });
  });
  setAvailableDates(
    Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
  );
}

async function fetchSupabaseDashboardSensors(): Promise<SensorReading[]> {
  const [rawResult, deviceResult, wellResult, locationResult] = await Promise.all([
    supabase
      .from('raw_sensor_data')
      .select('id,device_id,well_id,depth_meters,timestamp,uptime,online_since')
      .order('timestamp', { ascending: false })
      .limit(SUPABASE_DASHBOARD_RAW_LIMIT),
    supabase.from('device_master').select('device_id,well_id'),
    supabase.from('well_master').select('well_id,location_id,well_name'),
    supabase.from('location_master').select('location_id,district,latitude,longitude'),
  ]);

  if (rawResult.error) throw rawResult.error;
  if (deviceResult.error) throw deviceResult.error;
  if (wellResult.error) throw wellResult.error;
  if (locationResult.error) throw locationResult.error;

  const rawRows = (rawResult.data ?? []) as RawSensorDataRow[];
  const deviceById = new Map(
    ((deviceResult.data ?? []) as DeviceMasterRow[]).map((row) => [row.device_id, row]),
  );
  const wellById = new Map(
    ((wellResult.data ?? []) as WellMasterRow[]).map((row) => [row.well_id, row]),
  );
  const locationById = new Map(
    ((locationResult.data ?? []) as LocationMasterRow[]).map((row) => [row.location_id, row]),
  );

  const byDevice = new Map<string, RawSensorDataRow[]>();
  for (const row of rawRows) {
    const rows = byDevice.get(row.device_id) ?? [];
    rows.push(row);
    byDevice.set(row.device_id, rows);
  }

  return Array.from(byDevice.entries())
    .map(([deviceId, rows]) => {
      const sorted = [...rows].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const latest = sorted[sorted.length - 1];
      if (!latest) return null;

      const wellId = latest.well_id ?? deviceById.get(deviceId)?.well_id ?? null;
      const well = wellId ? wellById.get(wellId) : null;
      const location = well?.location_id ? locationById.get(well.location_id) : null;
      const lat = Number(location?.latitude);
      const long = Number(location?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(long)) return null;

      const history: SensorHistoryPoint[] = sorted.map((row) => {
        const timestamp = new Date(row.timestamp).getTime();
        return {
          id: row.id,
          depth: Number(row.depth_meters),
          collectedDate: row.timestamp.slice(0, 10),
          collectedDateTime: row.timestamp,
          timestamp,
          ...(row.online_since ? { deviceOnlineSince: row.online_since } : {}),
          ...(row.uptime != null ? { uptimeSeconds: Number(row.uptime) } : {}),
        };
      });
      const latestTimestamp = new Date(latest.timestamp).getTime();

      return {
        id: deviceId,
        deviceId,
        depth: Math.round(Number(latest.depth_meters) * 100) / 100,
        collectedDate: latest.timestamp.slice(0, 10),
        lastCollectedDateTime: latest.timestamp,
        lat,
        long,
        district: location?.district || 'Unknown',
        status: Date.now() - latestTimestamp < 1000 * 60 * 60 * 24 * 30 ? 'active' : 'offline',
        lastSync: latest.timestamp,
        history,
      } satisfies SensorReading;
    })
    .filter((sensor): sensor is SensorReading => sensor !== null)
    .sort((a, b) => a.deviceId.localeCompare(b.deviceId, undefined, { numeric: true }));
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
      calculateAndPublish(
        sensorData,
        setRawSensors,
        setDistricts,
        setAlerts,
        setKpiStats,
        setLastUpdated,
        setAvailableLocations,
        setAvailableDates,
      );
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    fetchSupabaseDashboardSensors()
      .then((sensorData) => {
        if (cancelled || sensorData.length === 0) return;
        calculateAndPublish(
          sensorData,
          setRawSensors,
          setDistricts,
          setAlerts,
          setKpiStats,
          setLastUpdated,
          setAvailableLocations,
          setAvailableDates,
        );
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to bootstrap dashboard from Supabase', error);
      });
    return () => {
      cancelled = true;
    };
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
    setIsLoading((current) => (rawSensors.length > 0 ? false : current));
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
  }, [processSnapshot, rawSensors.length, readingsPath, devicesPath]);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    if (!isLive) return;
    const readingsRef = ref(database, readingsPath);
    const devicesRef = ref(database, devicesPath);

    let latestReadings: FirebaseReadings = null;
    let latestDevices: FirebaseDevicesTree = null;
    let hasReadingsSnapshot = false;
    let hasDevicesSnapshot = false;

    const publish = () => {
      if (!hasReadingsSnapshot || !hasDevicesSnapshot) return;
      if (!latestReadings || Object.keys(latestReadings).length === 0) return;
      processSnapshot(latestReadings, latestDevices);
    };

    const unsubscribeReadings = onValue(
      readingsRef,
      (snapshot) => {
        latestReadings = (snapshot.val() ?? {}) as FirebaseReadings;
        hasReadingsSnapshot = true;
        publish();
      },
      (error) => console.error('Realtime readings subscription error', error),
    );

    const unsubscribeDevices = onValue(
      devicesRef,
      (snapshot) => {
        latestDevices = (snapshot.val() ?? {}) as FirebaseDevicesTree;
        hasDevicesSnapshot = true;
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
