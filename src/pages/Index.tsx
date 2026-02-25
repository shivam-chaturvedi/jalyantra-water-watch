import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { KPICards } from '@/components/KPICards';
import { AlertsStrip } from '@/components/AlertsStrip';
import { GroundwaterMap } from '@/components/GroundwaterMap';
import { DistrictPanel } from '@/components/DistrictPanel';
import { SensorDetailModal } from '@/components/SensorDetailModal';
import { Footer } from '@/components/Footer';
import { useGroundwaterData } from '@/hooks/useGroundwaterData';
import { SensorReading, District, Alert } from '@/lib/data';
import { downloadDataAsCsv } from '@/lib/csv';
import { SensorHistoryModal } from '@/components/SensorHistoryModal';
import { motion } from 'framer-motion';
import { onValue, ref, set } from 'firebase/database';
import { database } from '@/lib/firebaseClient';
import { useAuth } from '@/contexts/AuthContext';

const LOCATION_ALL_KEY = 'all-locations';
const DATE_ALL_KEY = 'all-dates';

const Index = () => {
  const {
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
  } = useGroundwaterData();

  const { user, logOut, actionLoading } = useAuth();
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorReading | null>(null);
  const [isDistrictPanelOpen, setIsDistrictPanelOpen] = useState(false);
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [historySensor, setHistorySensor] = useState<SensorReading | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>(LOCATION_ALL_KEY);
  const [selectedDate, setSelectedDate] = useState<string>(DATE_ALL_KEY);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const [sensorDataSnapshot, setSensorDataSnapshot] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const sensorDataRef = ref(database, 'sensorData');
    const unsubscribe = onValue(sensorDataRef, (snapshot) => {
      setSensorDataSnapshot(snapshot.val());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    const testRef = ref(database, 'sensorData/test');
    set(testRef, {
      updatedBy: user.uid,
      updatedAt: new Date().toISOString(),
      heartbeat: Date.now(),
    }).catch((error) => {
      console.error('Unable to write /sensorData/test', error);
    });
  }, [user]);

  useEffect(() => {
    if (selectedLocation === LOCATION_ALL_KEY) return;
    if (!availableLocations.includes(selectedLocation)) {
      setSelectedLocation(LOCATION_ALL_KEY);
    }
  }, [availableLocations, selectedLocation]);

  useEffect(() => {
    if (selectedDate === DATE_ALL_KEY) return;
    if (!availableDates.includes(selectedDate)) {
      setSelectedDate(DATE_ALL_KEY);
    }
  }, [availableDates, selectedDate]);

  const handleSensorClick = (sensor: SensorReading) => {
    setSelectedSensor(sensor);
    setIsSensorModalOpen(true);
  };

  const handleViewHistory = useCallback((sensor: SensorReading) => {
    setHistorySensor(sensor);
    setIsHistoryOpen(true);
  }, []);

  const handleDistrictClick = (district: District) => {
    setSelectedDistrict(district);
    setIsDistrictPanelOpen(true);
  };

  const locationLabel = selectedLocation === LOCATION_ALL_KEY ? 'All Locations' : selectedLocation;

  const handleAlertClick = (alert: Alert) => {
    // Find the district associated with the alert
    const district = districts.find(d => d.name === alert.district);
    if (district) {
      setSelectedLocation(alert.district);
      handleDistrictClick(district);
    }
  };

  const locationFilter = selectedLocation === LOCATION_ALL_KEY ? null : selectedLocation;
  const dateFilter = selectedDate === DATE_ALL_KEY ? null : selectedDate;

  const sensorDataEntryCount = useMemo(() => {
    if (!sensorDataSnapshot) return 0;
    return Object.keys(sensorDataSnapshot).length;
  }, [sensorDataSnapshot]);

  const filteredSensors = useMemo(() => {
    return sensors.filter((sensor) => {
      const matchesLocation = locationFilter ? sensor.district === locationFilter : true;
      const matchesDate = dateFilter
        ? sensor.history.some((point) => point.collectedDate === dateFilter)
        : true;
      return matchesLocation && matchesDate;
    });
  }, [sensors, locationFilter, dateFilter]);

  const filteredDistricts = useMemo(() => {
    if (!locationFilter) return districts;
    return districts.filter((district) => district.name === locationFilter);
  }, [districts, locationFilter]);

  const filteredAlerts = useMemo(() => {
    if (!locationFilter) return alerts;
    return alerts.filter((alert) => alert.district === locationFilter);
  }, [alerts, locationFilter]);

  const handleViewAllSensors = useCallback(() => {
    setSelectedLocation(LOCATION_ALL_KEY);
    setSelectedDate(DATE_ALL_KEY);
    setSelectedDistrict(null);
    setIsDistrictPanelOpen(false);
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('Logout failed', error);
    }
  }, [logOut]);

  const handleExportAllSensors = useCallback(() => {
    if (!filteredSensors.length) return;

    downloadDataAsCsv(
      'jalyantra-sensor-readings.csv',
      filteredSensors.map((sensor) => ({
        'Device ID': sensor.deviceId,
        District: sensor.district,
        Depth: sensor.depth,
        Status: sensor.status,
        'Last Sync': sensor.lastSync,
        Latitude: sensor.lat,
        Longitude: sensor.long,
      }))
    );
  }, [filteredSensors]);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <NavBar
        selectedLocation={selectedLocation}
        locationOptions={availableLocations}
        selectedDate={selectedDate}
        dateOptions={availableDates}
        isLive={isLive}
        lastUpdated={lastUpdated}
        onLocationChange={setSelectedLocation}
        onDateChange={setSelectedDate}
        onLiveToggle={setIsLive}
        onRefresh={refreshData}
        onExport={handleExportAllSensors}
        activeSensors={kpiStats?.activeSensors ?? 0}
        userEmail={user?.email ?? null}
        onLogout={handleLogout}
        logoutLoading={actionLoading}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                Groundwater Monitoring Dashboard
              </h1>
              <span className="badge-squared bg-accent text-accent-foreground text-[10px]">
                BETA
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time IoT sensor analytics for <span className="font-semibold text-foreground">{locationLabel}</span>
            </p>
          </div>

          {/* KPI Cards */}
          <KPICards stats={kpiStats} isLoading={isLoading} />

          {/* Alerts Strip */}
          <AlertsStrip 
            alerts={filteredAlerts} 
            onAlertClick={handleAlertClick}
          />

          {/* Main Map Section */}
          <div ref={mapSectionRef} className="jal-card-elevated overflow-visible">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Interactive Sensor Map</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click markers for readings • Zoom to expand clusters
                </p>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                Layer: Sensor Network
              </div>
            </div>
          <div className="overflow-hidden">
            <GroundwaterMap
              sensors={filteredSensors}
              districts={filteredDistricts}
              onSensorClick={handleSensorClick}
              onDistrictClick={handleDistrictClick}
            />
          </div>
        </div>

        {/* Sensor Data Mirror */}
        <div className="jal-card-elevated overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Realtime sensorData</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Reading /sensorData and writing /sensorData/test</p>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              Entries: {sensorDataEntryCount}
            </span>
          </div>
          <div className="p-4 space-y-2">
            {sensorDataSnapshot ? (
              <pre className="max-h-40 overflow-auto rounded border border-border bg-background/60 p-3 text-[11px] font-mono text-foreground">
                {JSON.stringify(sensorDataSnapshot, null, 2)}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">Waiting for data under /sensorData to appear.</p>
            )}
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Heartbeat pushes happen automatically after auth changes.
            </p>
          </div>
        </div>

        {/* District Quick Overview */}
        <div className="jal-card">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">District Overview</h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Click row for details
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th className="text-center">Avg Depth</th>
                    <th className="text-center">Sensors</th>
                    <th className="text-center">30D Change</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDistricts.slice(0, 8).map((district) => (
                    <tr 
                      key={district.name}
                      onClick={() => handleDistrictClick(district)}
                      className="cursor-pointer"
                    >
                      <td className="font-medium text-foreground">{district.name}</td>
                      <td className="text-center">
                        <span className={`font-bold font-mono ${
                          district.riskLevel === 'critical' ? 'text-depth-critical' :
                          district.riskLevel === 'warning' ? 'text-depth-warning' :
                          district.riskLevel === 'moderate' ? 'text-depth-moderate' :
                          'text-depth-safe'
                        }`}>
                          {district.avgDepth}m
                        </span>
                      </td>
                      <td className="text-center text-muted-foreground font-mono">
                        {district.sensorCount}
                      </td>
                      <td className="text-center">
                        <span className={`font-mono font-medium ${
                          district.change30Days < 0 ? 'text-depth-critical' : 'text-depth-safe'
                        }`}>
                          {district.change30Days > 0 ? '+' : ''}{district.change30Days}m
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`badge-squared text-white text-[10px] ${
                          district.riskLevel === 'critical' ? 'bg-depth-critical' :
                          district.riskLevel === 'warning' ? 'bg-depth-warning' :
                          district.riskLevel === 'moderate' ? 'bg-depth-moderate' :
                          'bg-depth-safe'
                        }`}>
                          {district.riskLevel.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <Footer />

      {/* District Panel (Slide-in) */}
        <DistrictPanel
          district={selectedDistrict}
          isOpen={isDistrictPanelOpen}
          onClose={() => setIsDistrictPanelOpen(false)}
          onViewAllSensors={handleViewAllSensors}
        />

      {/* Sensor Detail Modal */}
      <SensorDetailModal
        sensor={selectedSensor}
        isOpen={isSensorModalOpen}
        onClose={() => setIsSensorModalOpen(false)}
        onViewHistory={() => {
          if (!selectedSensor) return;
          handleViewHistory(selectedSensor);
        }}
      />
      <SensorHistoryModal
        sensor={historySensor}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
};

export default Index;
