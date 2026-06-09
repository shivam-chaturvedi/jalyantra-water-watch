import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SensorReading,
  District,
  formatLastSyncDate,
  getDepthRiskLevel,
  getRiskColorClass,
} from '@/lib/data';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GroundwaterMapProps {
  sensors: SensorReading[];
  districts: District[];
  onSensorClick?: (sensor: SensorReading) => void;
  onDistrictClick?: (district: District) => void;
  zoomTarget?: { lat: number; long: number } | null;
}

// India-focused default view
const INDIA_CENTER: [number, number] = [22.5, 79.0];
const DEFAULT_ZOOM = 5.2;
const INDIA_BOUNDS: L.LatLngBoundsExpression = [
  [6.0, 68.0],
  [37.5, 98.5],
];

// Custom hook to handle map events
function MapController({
  sensors,
}: { sensors: SensorReading[] }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(INDIA_BOUNDS);

    // Fit bounds to show all sensors, but stay inside India.
    if (sensors.length > 0) {
      const bounds = L.latLngBounds(sensors.map(s => [s.lat, s.long]));
      map.fitBounds(bounds.pad(0.2), { padding: [50, 50], maxZoom: 9 });
    } else {
      map.setView(INDIA_CENTER, DEFAULT_ZOOM);
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

// Simple location marker used on the map for each sensor.
function createLocationIcon(color: string, size: number = 14) {
  return L.divIcon({
    className: 'custom-location-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        border-radius: 9999px;
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
  onDistrictClick,
  zoomTarget,
}: GroundwaterMapProps) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [clustered, setClustered] = useState<SensorReading[]>([]);

  const raiseMarker = (marker: L.Marker | null) => {
    if (!marker) return;
    marker.setZIndexOffset(1000);
    marker.bringToFront();
  };

  const resetMarkerZIndex = (marker: L.Marker | null) => {
    if (!marker) return;
    marker.setZIndexOffset(0);
  };

  const handleMarkerMouseOver = (sensor: SensorReading) => (event: L.LeafletMouseEvent) => {
    const marker = event.target as L.Marker | null;
    raiseMarker(marker);
    mapInstance?.panTo([sensor.lat, sensor.long], { animate: true });
    mapInstance?.panBy([0, -80], { animate: true });
    marker?.openTooltip();
  };

  const handleMarkerMouseOut = (event: L.LeafletMouseEvent) => {
    const marker = event.target as L.Marker | null;
    resetMarkerZIndex(marker);
    marker?.closeTooltip();
  };

  const handleSensorClick = (sensor: SensorReading) => {
    onSensorClick?.(sensor);
  };

  useEffect(() => {
    const groups = new Map<string, SensorReading[]>();
    sensors.forEach((sensor) => {
      const key = `${sensor.lat.toFixed(3)}-${sensor.long.toFixed(3)}`;
      const group = groups.get(key) ?? [];
      group.push(sensor);
      groups.set(key, group);
    });
    const merged = Array.from(groups.values()).flatMap((group) => group);
    setClustered(merged);
  }, [sensors]);

  useEffect(() => {
    if (!zoomTarget || !mapInstance) return;
    mapInstance.setView([zoomTarget.lat, zoomTarget.long], Math.max(mapInstance.getZoom(), 12), {
      animate: true,
    });
  }, [zoomTarget, mapInstance]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="map-container h-[500px] lg:h-[600px] relative"
    >
        <MapContainer
          center={INDIA_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          zoomControl={true}
          whenCreated={setMapInstance}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1}
          minZoom={4.5}
          maxZoom={13}
          style={{ borderRadius: '0.25rem' }}
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        <MapController sensors={sensors} />

        {/* Sensor Markers */}
        {clustered.map((sensor) => {
          const risk = getDepthRiskLevel(sensor.depth);
          const color = riskColors[risk];
          const icon = createLocationIcon(color, 14);

          return (
            <Marker
              key={sensor.id}
              position={[sensor.lat, sensor.long]}
              icon={icon}
              eventHandlers={{
                click: (event: L.LeafletMouseEvent) => {
                  event.target?.closeTooltip();
                  handleSensorClick(sensor);
                },
                mouseover: handleMarkerMouseOver(sensor),
                mouseout: handleMarkerMouseOut,
              }}
            >
              <Tooltip className="jal-tooltip" direction="top" offset={[0, -10]}>
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
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Last sync</span>
                      <span className="font-medium text-right text-foreground text-xs leading-tight">
                        {formatLastSyncDate(sensor)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span
                      className="text-xs text-accent font-semibold uppercase tracking-wide"
                    >
                      Click for Full Details →
                    </span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-card/98 backdrop-blur-sm border border-border p-4 shadow-elevated z-10 pointer-events-none" style={{ borderRadius: '0.25rem' }}>
        <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wider">Legend</h4>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Location markers</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-safe rounded-full" />
            <span className="text-muted-foreground">0-5m <span className="font-medium text-foreground">Safe</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-moderate rounded-full" />
            <span className="text-muted-foreground">5-10m <span className="font-medium text-foreground">Moderate</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-warning rounded-full" />
            <span className="text-muted-foreground">10-20m <span className="font-medium text-foreground">Warning</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="w-3 h-3 bg-depth-critical rounded-full" />
            <span className="text-muted-foreground">&gt;20m <span className="font-medium text-foreground">Critical</span></span>
          </div>
        </div>
      </div>

      {/* Sensor Count Badge - Squared */}
      <div className="absolute top-4 right-4 bg-card/98 backdrop-blur-sm border border-border px-4 py-2 shadow-elevated z-10 pointer-events-none" style={{ borderRadius: '0.25rem' }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 bg-accent" style={{ borderRadius: '1px' }} />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">{sensors.length}</span> sensors monitored
          </span>
        </div>
      </div>
    </motion.div>
  );
}
