import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SensorReading, District, getDepthRiskLevel, getRiskColorClass } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GroundwaterMapProps {
  sensors: SensorReading[];
  districts: District[];
  onSensorClick?: (sensor: SensorReading) => void;
  onDistrictClick?: (district: District) => void;
}

// Maharashtra center coordinates
const MAHARASHTRA_CENTER: [number, number] = [19.7515, 75.7139];
const DEFAULT_ZOOM = 7;

// Custom hook to handle map events
function MapController({ 
  sensors, 
  districts,
  onSensorClick,
  onDistrictClick 
}: GroundwaterMapProps) {
  const map = useMap();

  useEffect(() => {
    // Fit bounds to show all sensors
    if (sensors.length > 0) {
      const bounds = L.latLngBounds(sensors.map(s => [s.lat, s.long]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, []);

  return null;
}

// Risk level colors for markers
const riskColors = {
  safe: '#22c55e',
  moderate: '#eab308',
  warning: '#f97316',
  critical: '#ef4444',
};

export function GroundwaterMap({ 
  sensors, 
  districts, 
  onSensorClick,
  onDistrictClick 
}: GroundwaterMapProps) {
  const [selectedSensor, setSelectedSensor] = useState<SensorReading | null>(null);

  const handleSensorClick = (sensor: SensorReading) => {
    setSelectedSensor(sensor);
    onSensorClick?.(sensor);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="map-container h-[500px] lg:h-[600px] relative"
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full rounded-lg"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController 
          sensors={sensors}
          districts={districts}
          onSensorClick={onSensorClick}
          onDistrictClick={onDistrictClick}
        />

        {/* Sensor Markers */}
        {sensors.map((sensor) => {
          const risk = getDepthRiskLevel(sensor.depth);
          const color = riskColors[risk];

          return (
            <CircleMarker
              key={sensor.id}
              center={[sensor.lat, sensor.long]}
              radius={8}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.9,
                color: '#fff',
                weight: 2,
              }}
              eventHandlers={{
                click: () => handleSensorClick(sensor),
              }}
            >
              <Popup>
                <div className="min-w-[200px] p-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">{sensor.deviceId}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium text-white",
                      getRiskColorClass(risk)
                    )}>
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">District:</span>
                      <span className="font-medium">{sensor.district}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Depth:</span>
                      <span className="font-bold text-lg">{sensor.depth}m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <span className={cn(
                        "font-medium",
                        sensor.status === 'active' ? 'text-depth-safe' : 'text-muted-foreground'
                      )}>
                        {sensor.status === 'active' ? '● Active' : '○ Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Sync:</span>
                      <span className="font-medium">
                        {new Date(sensor.lastSync).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border">
                    <button 
                      onClick={() => onSensorClick?.(sensor)}
                      className="text-xs text-accent hover:underline font-medium"
                    >
                      View Full Details →
                    </button>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg border border-border p-3 shadow-lg z-[1000]">
        <h4 className="text-xs font-semibold text-foreground mb-2">Depth Classification</h4>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-depth-safe" />
            <span className="text-muted-foreground">0-5m Safe</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-depth-moderate" />
            <span className="text-muted-foreground">5-10m Moderate</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-depth-warning" />
            <span className="text-muted-foreground">10-20m Warning</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 rounded-full bg-depth-critical" />
            <span className="text-muted-foreground">&gt;20m Critical</span>
          </div>
        </div>
      </div>

      {/* Sensor Count */}
      <div className="absolute top-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg border border-border px-3 py-2 shadow-lg z-[1000]">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">{sensors.length}</span> sensors active
          </span>
        </div>
      </div>
    </motion.div>
  );
}
