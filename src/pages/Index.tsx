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
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Groundwater Monitoring Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time IoT sensor analytics for {selectedState}
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
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Interactive Sensor Map</h2>
              <p className="text-sm text-muted-foreground">
                Click on sensor markers for detailed readings • Zoom for cluster expansion
              </p>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">District Overview</h2>
              <span className="text-xs text-muted-foreground">
                Click row for details
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-3 font-medium text-muted-foreground">District</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Avg Depth</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Sensors</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">30D Change</th>
                    <th className="pb-3 font-medium text-muted-foreground text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.slice(0, 8).map((district) => (
                    <tr 
                      key={district.name}
                      onClick={() => handleDistrictClick(district)}
                      className="border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 font-medium text-foreground">{district.name}</td>
                      <td className="py-3 text-center">
                        <span className={`font-semibold ${
                          district.riskLevel === 'critical' ? 'text-depth-critical' :
                          district.riskLevel === 'warning' ? 'text-depth-warning' :
                          district.riskLevel === 'moderate' ? 'text-depth-moderate' :
                          'text-depth-safe'
                        }`}>
                          {district.avgDepth}m
                        </span>
                      </td>
                      <td className="py-3 text-center text-muted-foreground">
                        {district.sensorCount}
                      </td>
                      <td className="py-3 text-center">
                        <span className={
                          district.change30Days < 0 ? 'text-depth-critical' : 'text-depth-safe'
                        }>
                          {district.change30Days > 0 ? '+' : ''}{district.change30Days}m
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${
                          district.riskLevel === 'critical' ? 'bg-depth-critical' :
                          district.riskLevel === 'warning' ? 'bg-depth-warning' :
                          district.riskLevel === 'moderate' ? 'bg-depth-moderate' :
                          'bg-depth-safe'
                        }`}>
                          {district.riskLevel.charAt(0).toUpperCase() + district.riskLevel.slice(1)}
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
