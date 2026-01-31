import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SensorReading, District, getDepthRiskLevel, getRiskColorClass } from '@/lib/data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Crosshair } from 'lucide-react';

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
}: { sensors: SensorReading[] }) {
  const map = useMap();

  useEffect(() => {
    // Fit bounds to show all sensors
    if (sensors.length > 0) {
      const bounds = L.latLngBounds(sensors.map(s => [s.lat, s.long]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, sensors]);

  return null;
}

// Risk level colors for markers - Professional palette
const riskColors = {
  safe: '#2d8a5e',
  moderate: '#d4940a',
  warning: '#e86830',
  critical: '#c43d3d',
};

// Create square marker icon
function createSquareIcon(color: string, size: number = 12) {
  return L.divIcon({
    className: 'custom-square-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border-radius: 2px;
        transform: rotate(45deg);
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function GroundwaterMap({ 
  sensors, 
  districts, 
  onSensorClick,
  onDistrictClick 
}: GroundwaterMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  const recenterMap = () => {
    const map = mapRef.current;
    if (!map || sensors.length === 0) return;

    const latLngs = sensors
      .map((sensor) => (typeof sensor.lat === 'number' && typeof sensor.long === 'number' ? [sensor.lat, sensor.long] as [number, number] : null))
      .filter((coords): coords is [number, number] => coords !== null);

    if (latLngs.length === 0) return;

    map.invalidateSize();

    const bounds = L.latLngBounds(latLngs);

    if (bounds.isValid()) {
      map.flyToBounds(bounds, { padding: [70, 70], duration: 0.8 });
      return;
    }

    const avgLat = latLngs.reduce((sum, [lat]) => sum + lat, 0) / latLngs.length;
    const avgLng = latLngs.reduce((sum, [, lng]) => sum + lng, 0) / latLngs.length;
    map.flyTo([avgLat, avgLng], DEFAULT_ZOOM, { duration: 0.8 });
  };

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
        className="h-full w-full"
        zoomControl={true}
        style={{ borderRadius: '0.25rem' }}
        whenCreated={(map) => {
          mapRef.current = map;
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController sensors={sensors} />

        {/* Sensor Markers - Square Design */}
        {sensors.map((sensor) => {
          const risk = getDepthRiskLevel(sensor.depth);
          const color = riskColors[risk];
          const icon = createSquareIcon(color, 14);

          return (
            <Marker
              key={sensor.id}
              position={[sensor.lat, sensor.long]}
              icon={icon}
              eventHandlers={{
                click: () => handleSensorClick(sensor),
              }}
            >
              <Popup>
                <div className="min-w-[220px] p-1">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <span className="font-semibold text-sm text-foreground">{sensor.deviceId}</span>
                    <span className={cn(
                      "badge-squared text-white",
                      getRiskColorClass(risk)
                    )}>
                      {risk.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">District</span>
                      <span className="font-medium text-foreground">{sensor.district}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Depth</span>
                      <span className="font-bold text-xl text-foreground">{sensor.depth}m</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <span className={cn(
                        "font-medium flex items-center gap-1.5",
                        sensor.status === 'active' ? 'text-depth-safe' : 'text-muted-foreground'
                      )}>
                        <span className={cn(
                          "w-1.5 h-1.5",
                          sensor.status === 'active' ? 'bg-depth-safe' : 'bg-muted-foreground'
                        )} style={{ borderRadius: '1px' }} />
                        {sensor.status === 'active' ? 'Active' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Sync</span>
                      <span className="font-medium font-mono text-foreground">
                        {new Date(sensor.lastSync).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <button 
                      onClick={() => onSensorClick?.(sensor)}
                      className="text-xs text-accent hover:text-accent/80 font-semibold uppercase tracking-wide transition-colors"
                    >
                      View Full Details →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Recenter Button */}
      <div className="absolute bottom-4 right-4 z-[1000]">
        <button
          onClick={recenterMap}
          className="flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wide rounded-full border border-border bg-card/90 text-foreground shadow-elevated hover:bg-card transition"
        >
          <Crosshair className="w-4 h-4" />
          Recenter
        </button>
      </div>

      {/* Map Legend - Professional Squared Design */}
      <div className="absolute bottom-4 left-4 bg-card/98 backdrop-blur-sm border border-border p-4 shadow-elevated z-[1000]" style={{ borderRadius: '0.25rem' }}>
        <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Depth Classification</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-safe" style={{ borderRadius: '2px', transform: 'rotate(45deg)' }} />
            <span className="text-muted-foreground">0-5m <span className="font-medium text-foreground">Safe</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-moderate" style={{ borderRadius: '2px', transform: 'rotate(45deg)' }} />
            <span className="text-muted-foreground">5-10m <span className="font-medium text-foreground">Moderate</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-warning" style={{ borderRadius: '2px', transform: 'rotate(45deg)' }} />
            <span className="text-muted-foreground">10-20m <span className="font-medium text-foreground">Warning</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-critical" style={{ borderRadius: '2px', transform: 'rotate(45deg)' }} />
            <span className="text-muted-foreground">&gt;20m <span className="font-medium text-foreground">Critical</span></span>
          </div>
        </div>
      </div>

      {/* Sensor Count Badge - Squared */}
      <div className="absolute top-4 right-4 bg-card/98 backdrop-blur-sm border border-border px-4 py-2 shadow-elevated z-[1000]" style={{ borderRadius: '0.25rem' }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 bg-accent" style={{ borderRadius: '1px' }} />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">{sensors.length}</span> sensors active
          </span>
        </div>
      </div>
    </motion.div>
  );
}
