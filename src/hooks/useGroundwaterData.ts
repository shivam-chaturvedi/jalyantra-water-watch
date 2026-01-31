import { useState, useEffect, useCallback } from 'react';
import {
  SensorReading,
  District,
  Alert,
  KPIStats,
  generateAllSensorData,
  calculateDistrictStats,
  generateAlerts,
  calculateKPIStats,
} from '@/lib/mockData';

interface UseGroundwaterDataReturn {
  sensors: SensorReading[];
  districts: District[];
  alerts: Alert[];
  kpiStats: KPIStats | null;
  isLoading: boolean;
  isLive: boolean;
  lastUpdated: Date | null;
  selectedState: string;
  dateRange: string;
  setSelectedState: (state: string) => void;
  setDateRange: (range: string) => void;
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
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [dateRange, setDateRange] = useState('last30');

  const loadData = useCallback(() => {
    setIsLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const sensorData = generateAllSensorData();
      const districtData = calculateDistrictStats(sensorData);
      const alertData = generateAlerts(districtData);
      const kpiData = calculateKPIStats(sensorData, districtData);
      
      setSensors(sensorData);
      setDistricts(districtData);
      setAlerts(alertData);
      setKpiStats(kpiData);
      setLastUpdated(new Date());
      setIsLoading(false);
    }, 500);
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh when live mode is enabled
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [isLive, loadData]);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    sensors,
    districts,
    alerts,
    kpiStats,
    isLoading,
    isLive,
    lastUpdated,
    selectedState,
    dateRange,
    setSelectedState,
    setDateRange,
    setIsLive,
    refreshData,
  };
}
