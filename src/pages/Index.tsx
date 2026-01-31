import { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { KPICards } from '@/components/KPICards';
import { AlertsStrip } from '@/components/AlertsStrip';
import { GroundwaterMap } from '@/components/GroundwaterMap';
import { DistrictPanel } from '@/components/DistrictPanel';
import { SensorDetailModal } from '@/components/SensorDetailModal';
import { Footer } from '@/components/Footer';
import { useGroundwaterData } from '@/hooks/useGroundwaterData';
import { SensorReading, District, Alert } from '@/lib/mockData';
import { motion } from 'framer-motion';

const Index = () => {
  const {
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
  } = useGroundwaterData();

  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorReading | null>(null);
  const [isDistrictPanelOpen, setIsDistrictPanelOpen] = useState(false);
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);

  const handleSensorClick = (sensor: SensorReading) => {
    setSelectedSensor(sensor);
    setIsSensorModalOpen(true);
  };

  const handleDistrictClick = (district: District) => {
    setSelectedDistrict(district);
    setIsDistrictPanelOpen(true);
  };

  const handleAlertClick = (alert: Alert) => {
    // Find the district associated with the alert
    const district = districts.find(d => d.name === alert.district);
    if (district) {
      handleDistrictClick(district);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <NavBar
        selectedState={selectedState}
        dateRange={dateRange}
        isLive={isLive}
        lastUpdated={lastUpdated}
        onStateChange={setSelectedState}
        onDateRangeChange={setDateRange}
        onLiveToggle={setIsLive}
        onRefresh={refreshData}
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
              Real-time IoT sensor analytics for <span className="font-semibold text-foreground">{selectedState}</span>
            </p>
          </div>

          {/* KPI Cards */}
          <KPICards stats={kpiStats} isLoading={isLoading} />

          {/* Alerts Strip */}
          <AlertsStrip 
            alerts={alerts} 
            onAlertClick={handleAlertClick}
          />

          {/* Main Map Section */}
          <div className="jal-card-elevated p-0 overflow-hidden">
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
            <GroundwaterMap
              sensors={sensors}
              districts={districts}
              onSensorClick={handleSensorClick}
              onDistrictClick={handleDistrictClick}
            />
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
                  {districts.slice(0, 8).map((district) => (
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
      />

      {/* Sensor Detail Modal */}
      <SensorDetailModal
        sensor={selectedSensor}
        isOpen={isSensorModalOpen}
        onClose={() => setIsSensorModalOpen(false)}
      />
    </div>
  );
};

export default Index;
