import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { KPICards } from '@/components/KPICards';
import { AlertsStrip } from '@/components/AlertsStrip';
import { GroundwaterMap } from '@/components/GroundwaterMap';
import { DistrictPanel } from '@/components/DistrictPanel';
import { SensorDetailModal } from '@/components/SensorDetailModal';
import { Footer } from '@/components/Footer';
import { useGroundwaterData } from '@/hooks/useGroundwaterData';
import { SensorReading, District, Alert, sensorsDashboardExportRows, isPumpConnectedDevice } from '@/lib/data';
import { downloadDataAsCsv } from '@/lib/csv';
import { SensorHistoryModal } from '@/components/SensorHistoryModal';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const LOCATION_ALL_KEY = 'all-locations';
const WELL_ALL_KEY = 'all-wells';
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
    setIsLive,
    refreshData,
  } = useGroundwaterData();

  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorReading | null>(null);
  const [isDistrictPanelOpen, setIsDistrictPanelOpen] = useState(false);
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [historySensor, setHistorySensor] = useState<SensorReading | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDistrictName, setSelectedDistrictName] = useState<string>(LOCATION_ALL_KEY);
  const [selectedWell, setSelectedWell] = useState<string>(WELL_ALL_KEY);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedDistrictName === LOCATION_ALL_KEY) return;
    if (!availableLocations.includes(selectedDistrictName)) setSelectedDistrictName(LOCATION_ALL_KEY);
  }, [availableLocations, selectedDistrictName]);

  useEffect(() => {
    if (selectedWell === WELL_ALL_KEY) return;
    const sensor = sensors.find((item) => item.deviceId === selectedWell);
    if (!sensor) return;
    setSelectedSensor(sensor);
    setIsSensorModalOpen(true);
  }, [sensors, selectedWell]);

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

  const locationLabel = selectedDistrictName === LOCATION_ALL_KEY ? 'All Districts' : selectedDistrictName;

  const handleAlertClick = (alert: Alert) => {
    // Find the district associated with the alert
    const district = districts.find(d => d.name === alert.district);
    if (district) {
      setSelectedDistrictName(alert.district);
      handleDistrictClick(district);
    }
  };

  const locationFilter = selectedDistrictName === LOCATION_ALL_KEY ? null : selectedDistrictName;
  const wellFilter = selectedWell === WELL_ALL_KEY ? null : selectedWell;
  const filteredSensors = useMemo(() => {
    return sensors.filter((sensor) => {
      const matchesLocation = locationFilter ? sensor.district === locationFilter : true;
      const matchesWell = wellFilter ? sensor.deviceId === wellFilter : true;
      return matchesLocation && matchesWell;
    });
  }, [sensors, locationFilter, wellFilter]);

  const filteredDistricts = useMemo(() => {
    if (!locationFilter) return districts;
    return districts.filter((district) => district.name === locationFilter);
  }, [districts, locationFilter]);

  const filteredAlerts = useMemo(() => {
    if (!locationFilter) return alerts;
    return alerts.filter((alert) => alert.district === locationFilter);
  }, [alerts, locationFilter]);

  const handleViewAllSensors = useCallback(() => {
    setSelectedDistrictName(LOCATION_ALL_KEY);
    setSelectedWell(WELL_ALL_KEY);
    setSelectedDistrict(null);
    setIsDistrictPanelOpen(false);
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const wellRows = useMemo(() => {
    return filteredSensors.map((sensor) => ({
      well: sensor.deviceId,
      village: sensor.district,
      district: sensor.district,
      health: sensor.depth > 20 ? 'Critical' : sensor.depth > 10 ? 'Stressed' : 'Healthy',
      trend: `${sensor.depth.toFixed(1)}m`,
      waterLeft: `${Math.max(1, Math.round(30 - sensor.depth))} days`,
      device: sensor.status === 'active' ? 'Active' : 'Inactive',
    }));
  }, [filteredSensors]);

  // Build time-series chart data: last 14 unique dates, one value per sensor
  const depthTrendData = useMemo(() => {
    const dateSet = new Set<string>();
    filteredSensors.forEach((s) => {
      s.history.forEach((p) => { if (p.collectedDate) dateSet.add(p.collectedDate); });
    });
    const dates = Array.from(dateSet).sort().slice(-14);
    const displaySensors = filteredSensors;
    return dates.map((date) => {
      const row: Record<string, string | number> = { date };
      displaySensors.forEach((s) => {
        const pts = s.history.filter((p) => p.collectedDate === date);
        if (pts.length) {
          const depths = pts.map((p) => p.depth);
          if (isPumpConnectedDevice(s)) {
            row[s.deviceId] = Math.round((depths.reduce((sum, p) => sum + p, 0) / depths.length) * 10) / 10;
          } else {
            const sorted = [...depths].sort((a, b) => a - b);
            const mid = Math.floor(sorted.length / 2);
            const median =
              sorted.length % 2 === 1
                ? sorted[mid]!
                : (sorted[mid - 1]! + sorted[mid]!) / 2;
            row[s.deviceId] = Math.round(median * 10) / 10;
          }
        }
      });
      return row;
    });
  }, [filteredSensors]);
  const depthTrendMax = useMemo(() => {
    const depths = depthTrendData.flatMap((row) =>
      Object.entries(row)
        .filter(([key, value]) => key !== 'date' && typeof value === 'number' && Number.isFinite(value))
        .map(([, value]) => value as number),
    );
    return depths.length ? Math.max(...depths) : 16;
  }, [depthTrendData]);
  const depthTrendUpperBound = Math.max(16, Math.ceil(depthTrendMax / 2) * 2);
  const depthTrendTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let value = 2; value <= depthTrendUpperBound; value += 2) ticks.push(value);
    if (ticks.length === 0) ticks.push(2, depthTrendUpperBound);
    return ticks;
  }, [depthTrendUpperBound]);

  const chartColors = ['#0f766e', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#f97316'];

  const handleExportAllSensors = useCallback(() => {
    if (!filteredSensors.length) return;

    downloadDataAsCsv('jalyantra-sensor-readings.csv', sensorsDashboardExportRows(filteredSensors));
  }, [filteredSensors]);

  return (
    <>
      <div className="h-[32px] w-full bg-background" aria-hidden="true" />
      <div className="min-h-screen bg-background">
        {/* Navigation Bar */}
        <NavBar
          selectedDistrict={selectedDistrictName}
          selectedWell={selectedWell}
          districtOptions={availableLocations}
          wellOptions={Array.from(new Set(sensors.map((s) => s.deviceId))).sort()}
          isLive={isLive}
          lastUpdated={lastUpdated}
          onLocationChange={setSelectedDistrictName}
          onWellChange={setSelectedWell}
          onLiveToggle={setIsLive}
          onRefresh={refreshData}
          onExport={handleExportAllSensors}
          activeSensors={kpiStats?.activeSensors ?? 0}
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
            zoomTarget={selectedDistrict ? { lat: selectedDistrict.lat, long: selectedDistrict.long } : null}
          />
        </div>
        </div>

      {/* Depth Trends Chart */}
      <div className="jal-card">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Depth Trends</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Groundwater depth over time — all devices, last 14 days</p>
          </div>
        </div>
        {depthTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={depthTrendData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickFormatter={(v: string) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    width={46}
                    domain={[2, depthTrendUpperBound]}
                    ticks={depthTrendTicks}
                    tickFormatter={(v: number) => `${v}m`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}m`, name]}
                    labelFormatter={(label: string) => `Date: ${label}`}
                  />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {filteredSensors.map((s, i) => (
                <Line
                  key={s.deviceId}
                  type="monotone"
                  dataKey={s.deviceId}
                  stroke={chartColors[i % chartColors.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            No historical data available for the current selection.
          </div>
        )}
      </div>

      <div className="jal-card overflow-x-auto">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Well Insights</h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Click a well in the dropdown or map for details
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="professional-table">
            <thead>
              <tr>
                <th>Well Tag/Name</th>
                <th className="text-center">Village</th>
                <th className="text-center">District</th>
                <th className="text-center">Health</th>
                <th className="text-center">Trend</th>
                <th className="text-center">Water Left</th>
                <th className="text-center">Device</th>
              </tr>
            </thead>
            <tbody>
              {wellRows.map((row) => (
                <tr
                  key={row.well}
                  onClick={() => {
                    const sensor = sensors.find((item) => item.deviceId === row.well) ?? null;
                    if (!sensor) return;
                    setSelectedSensor(sensor);
                    setIsSensorModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <td className="font-medium text-foreground">{row.well}</td>
                  <td className="text-center text-muted-foreground">{row.village}</td>
                  <td className="text-center text-muted-foreground">{row.district}</td>
                  <td className="text-center">{row.health}</td>
                  <td className="text-center font-mono">{row.trend}</td>
                  <td className="text-center font-mono">{row.waterLeft}</td>
                  <td className="text-center">{row.device}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="jal-card overflow-x-auto">
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
                <th className="text-center">30-Day Water Drawn</th>
                <th className="text-center">30-Day Trend</th>
                <th className="text-center">Critical Wells</th>
                <th className="text-center">Action</th>
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
                    <span
                      className={`font-bold font-mono ${
                        district.riskLevel === 'critical'
                          ? 'text-depth-critical'
                          : district.riskLevel === 'warning'
                            ? 'text-depth-warning'
                            : district.riskLevel === 'moderate'
                              ? 'text-depth-moderate'
                              : 'text-depth-safe'
                      }`}
                    >
                      {district.avgDepth}m
                    </span>
                  </td>
                  <td className="text-center text-muted-foreground font-mono">
                    {district.sensorCount}
                  </td>
                  <td className="text-center font-mono">{Math.abs(district.change30Days).toFixed(1)}m</td>
                  <td className="text-center font-mono">{district.change30Days > 0 ? 'Up' : 'Down'}</td>
                  <td className="text-center font-mono">{district.criticalPercentage}%</td>
                  <td className="text-center">
                    <button
                      className="text-teal-600 font-semibold uppercase text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDistrictClick(district);
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  </main>

      <Footer />

      <DistrictPanel
        district={selectedDistrict}
        isOpen={isDistrictPanelOpen}
        onClose={() => setIsDistrictPanelOpen(false)}
        onViewAllSensors={handleViewAllSensors}
      />

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
    </>
  );
};

export default Index;
