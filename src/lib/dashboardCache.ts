import { SensorReading, District, Alert, KPIStats } from './data';

interface CachedSensorData extends Omit<SensorReading, 'history'> {
  history: SensorReading['history'];
}

interface CachedDashboardData {
  sensors: CachedSensorData[];
  districts: District[];
  alerts: Alert[];
  kpiStats: KPIStats;
  timestamp: number;
  version: number;
}

const CACHE_KEY = 'jalyantra-dashboard-cache';
const CACHE_MAX_AGE_MINUTES = 30;

/**
 * Save dashboard data to sessionStorage for instant loading on refresh
 */
export function saveDashboardCache(data: CachedDashboardData): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save dashboard cache:', error);
  }
}

/**
 * Load dashboard data from sessionStorage
 */
export function loadDashboardCache(): CachedDashboardData | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn('Failed to load dashboard cache:', error);
    return null;
  }
}

/**
 * Check if cached data is still valid (not older than max age)
 */
export function isCacheValid(cache: CachedDashboardData | null): boolean {
  if (!cache) return false;
  const cacheAgeMinutes = (Date.now() - cache.timestamp) / (1000 * 60);
  return cacheAgeMinutes < CACHE_MAX_AGE_MINUTES;
}

/**
 * Clear all cached dashboard data
 */
export function clearDashboardCache(): void {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear dashboard cache:', error);
  }
}
