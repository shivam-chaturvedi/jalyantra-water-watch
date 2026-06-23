import { useCallback, useEffect, useState } from 'react';
import { get, ref } from 'firebase/database';
import {
  FirebaseDevicesTree,
  FirebaseReadings,
  SensorReading,
  mergeReadingsWithDeviceRegistry,
  transformFirebaseReadings,
} from '@/lib/data';
import { database } from '@/lib/firebaseClient';

/** Live sensors from Firebase RTDB — for Admin device settings. */
export function useLiveDevices() {
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const readingsPath = (import.meta.env.VITE_FIREBASE_READINGS_PATH as string | undefined) ?? 'readings';
  const devicesPath = (import.meta.env.VITE_FIREBASE_DEVICES_PATH as string | undefined) ?? 'devices';

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [readingsSnapshot, devicesSnapshot] = await Promise.all([
        get(ref(database, readingsPath)),
        get(ref(database, devicesPath)),
      ]);
      const merged = mergeReadingsWithDeviceRegistry(
        transformFirebaseReadings((readingsSnapshot.val() ?? {}) as FirebaseReadings),
        (devicesSnapshot.val() ?? {}) as FirebaseDevicesTree,
      );
      setSensors(merged);
    } catch (err) {
      console.error('Failed to fetch live devices', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [readingsPath, devicesPath]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sensors, isLoading, error, refresh };
}
