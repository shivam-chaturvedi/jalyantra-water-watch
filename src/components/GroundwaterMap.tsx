import { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  SensorReading,
  District,
  formatLastSyncDate,
  getDepthRiskLevel,
  getRiskColorClass,
} from '@/lib/data';
import { SurveyWellPoint } from '@/lib/surveyData';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface GroundwaterMapProps {
  sensors: SensorReading[];
  districts: District[];
  surveyWells?: SurveyWellPoint[];
  onSensorClick?: (sensor: SensorReading) => void;
  onDistrictClick?: (district: District) => void;
  onSurveyWellClick?: (well: SurveyWellPoint) => void;
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
  points,
}: { points: { lat: number; long: number }[] }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxBounds(INDIA_BOUNDS);

    // Fit bounds to show all points (sensors + surveyed wells), but stay inside India.
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.long]));
      map.fitBounds(bounds.pad(0.2), { padding: [50, 50], maxZoom: 9 });
    } else {
      map.setView(INDIA_CENTER, DEFAULT_ZOOM);
    }
  }, [map, points]);

  return null;
}

// Depth-to-water risk colors — shared by fixed-well circles, survey-well diamonds and the
// legend, so a color always means the same depth band whichever shape it is drawn on.
// Keep in sync with --depth-* in src/index.css.
const riskColors = {
  safe: '#16a34a',
  moderate: '#eab308',
  warning: '#f97316',
  critical: '#dc2626',
};

const RISK_BANDS: { risk: keyof typeof riskColors; range: string; label: string }[] = [
  { risk: 'safe', range: '0–5 m', label: 'Safe' },
  { risk: 'moderate', range: '5–10 m', label: 'Moderate' },
  { risk: 'warning', range: '10–20 m', label: 'Warning' },
  { risk: 'critical', range: '>20 m', label: 'Critical' },
];

const surveyWellColor = (well: SurveyWellPoint) =>
  well.lastDepthMeters != null ? riskColors[getDepthRiskLevel(well.lastDepthMeters)] : '#94a3b8';

/** Fixed wells are registered as WEL-{deviceId} (see the Firebase -> Supabase sync). */
const fixedWellId = (sensor: SensorReading) => `WEL-${sensor.deviceId}`;

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

const circleHtml = (color: string, size: number) => `
  <div data-kind="fixed" style="
    width: ${size}px; height: ${size}px; background-color: ${color};
    border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border-radius: 9999px;
  "></div>`;

// Rotated square drawn slightly smaller than the circle so both read as the same visual weight.
const diamondHtml = (color: string, size: number) => `
  <div data-kind="survey" style="
    width: ${size - 2}px; height: ${size - 2}px; margin: 1px; background-color: ${color};
    border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: rotate(45deg);
  "></div>`;

// A fixed JalYantra well that was also measured in a survey: circle (live sensor) and
// diamond (survey reading) side by side, each in its own depth color. Clicking a half opens
// that half's details — see the data-kind lookup in the marker click handler.
function createPairedWellIcon(fixedColor: string, surveyColor: string, size: number = 14) {
  const gap = 3;
  const width = size * 2 + gap;
  return L.divIcon({
    className: 'custom-paired-well-marker',
    html: `<div style="display:flex;align-items:center;gap:${gap}px;">${circleHtml(fixedColor, size)}${diamondHtml(surveyColor, size)}</div>`,
    iconSize: [width, size],
    iconAnchor: [width / 2, size / 2],
  });
}

// Diamond marker for surveyed wells — visually distinct shape (not just color) from
// the circular live-sensor markers, since these represent periodic visits, not a
// continuously-monitored device.
function createSurveyWellIcon(color: string, size: number = 14) {
  return L.divIcon({
    className: 'custom-survey-well-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${color};
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
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
  surveyWells = [],
  onSensorClick,
  onDistrictClick,
  onSurveyWellClick,
  zoomTarget,
}: GroundwaterMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const [clustered, setClustered] = useState<SensorReading[]>([]);
  const [clusteredSurveyWells, setClusteredSurveyWells] = useState<SurveyWellPoint[]>([]);
  const [stateBoundaries, setStateBoundaries] = useState<any>(null);

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
    mapRef.current?.panTo([sensor.lat, sensor.long], { animate: true });
    mapRef.current?.panBy([0, -80], { animate: true });
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

  const handleSurveyWellClick = (well: SurveyWellPoint) => {
    onSurveyWellClick?.(well);
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
    const groups = new Map<string, SurveyWellPoint[]>();
    surveyWells.forEach((well) => {
      const key = `${well.lat.toFixed(3)}-${well.long.toFixed(3)}`;
      const group = groups.get(key) ?? [];
      group.push(well);
      groups.set(key, group);
    });
    const merged = Array.from(groups.values()).flatMap((group) => group);
    setClusteredSurveyWells(merged);
  }, [surveyWells]);

  // Survey wells that are also a fixed installation are drawn on the fixed marker (paired
  // icon) instead of as a separate diamond, so one physical well is one marker.
  const surveyWellByFixedWellId = useMemo(
    () => new Map(surveyWells.map((well) => [well.wellId, well])),
    [surveyWells],
  );
  const pairedSurveyWellIds = useMemo(
    () => new Set(sensors.map(fixedWellId).filter((id) => surveyWellByFixedWellId.has(id))),
    [sensors, surveyWellByFixedWellId],
  );

  const allMapPoints = useMemo(
    () => [...sensors, ...surveyWells],
    [sensors, surveyWells],
  );

  useEffect(() => {
    if (!zoomTarget || !mapRef.current) return;
    mapRef.current.setView([zoomTarget.lat, zoomTarget.long], Math.max(mapRef.current.getZoom(), 12), {
      animate: true,
    });
  }, [zoomTarget]);

  // State boundaries GeoJSON loading disabled - CartoDB map already shows state names/boundaries visually
  // useEffect(() => {
  //   fetch('https://raw.githubusercontent.com/datameet/indian_maps/master/states/india_states.geojson')
  //     .then(res => res.json())
  //     .then(data => setStateBoundaries(data))
  //     .catch(err => console.error('Failed to load state boundaries:', err));
  // }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="map-container h-[500px] lg:h-[600px] relative"
    >
        <MapContainer
          ref={mapRef}
          center={INDIA_CENTER}
          zoom={DEFAULT_ZOOM}
          className="h-full w-full"
          zoomControl={true}
          maxBounds={INDIA_BOUNDS}
          maxBoundsViscosity={1}
          minZoom={4.5}
          maxZoom={13}
          style={{ borderRadius: '0.25rem' }}
        >
        <TileLayer
          attribution='&copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
          url={`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=${import.meta.env.VITE_CARTODB_BASEMAPS_API_KEY}`}
        />

        {stateBoundaries && (
          <GeoJSON
            data={stateBoundaries}
            style={() => ({
              color: '#8b5cf6',
              weight: 2,
              opacity: 0.7,
              fillOpacity: 0,
            })}
          />
        )}

        <MapController points={allMapPoints} />

        {/* Sensor Markers */}
        {clustered.map((sensor) => {
          const risk = getDepthRiskLevel(sensor.depth);
          const color = riskColors[risk];
          const pairedSurvey = surveyWellByFixedWellId.get(fixedWellId(sensor));
          const icon = pairedSurvey
            ? createPairedWellIcon(color, surveyWellColor(pairedSurvey), 14)
            : createLocationIcon(color, 14);

          return (
            <Marker
              key={sensor.id}
              position={[sensor.lat, sensor.long]}
              icon={icon}
              eventHandlers={{
                click: (event: L.LeafletMouseEvent) => {
                  event.target?.closeTooltip();
                  const clickedKind = (event.originalEvent?.target as HTMLElement | null)
                    ?.closest<HTMLElement>('[data-kind]')?.dataset.kind;
                  if (pairedSurvey && clickedKind === 'survey') handleSurveyWellClick(pairedSurvey);
                  else handleSensorClick(sensor);
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
                    {pairedSurvey && (
                      <div className="flex justify-between items-center gap-2 pt-2 border-t border-border">
                        <span className="text-muted-foreground shrink-0">Survey depth</span>
                        <span className="font-medium text-right text-foreground text-xs leading-tight">
                          {pairedSurvey.lastDepthMeters != null ? `${pairedSurvey.lastDepthMeters.toFixed(2)}m` : '—'}
                          {pairedSurvey.lastSurveyedOn ? ` · ${new Date(pairedSurvey.lastSurveyedOn).toLocaleDateString()}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span
                      className="text-xs text-accent font-semibold uppercase tracking-wide"
                    >
                      {pairedSurvey ? 'Click circle: sensor • diamond: survey →' : 'Click for Full Details →'}
                    </span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}

        {/* Surveyed Well Markers — periodic portable-device visits, no permanent sensor */}
        {clusteredSurveyWells.filter((well) => !pairedSurveyWellIds.has(well.wellId)).map((well) => {
          const color = surveyWellColor(well);
          const icon = createSurveyWellIcon(color, 14);

          return (
            <Marker
              key={well.wellId}
              position={[well.lat, well.long]}
              icon={icon}
              eventHandlers={{
                click: (event: L.LeafletMouseEvent) => {
                  event.target?.closeTooltip();
                  handleSurveyWellClick(well);
                },
                mouseover: (event: L.LeafletMouseEvent) => {
                  const marker = event.target as L.Marker | null;
                  raiseMarker(marker);
                  mapRef.current?.panTo([well.lat, well.long], { animate: true });
                  mapRef.current?.panBy([0, -80], { animate: true });
                  marker?.openTooltip();
                },
                mouseout: handleMarkerMouseOut,
              }}
            >
              <Tooltip className="jal-tooltip" direction="top" offset={[0, -10]}>
                <div className="min-w-[220px] p-1">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <span className="font-semibold text-sm text-foreground">{well.wellName}</span>
                    <span className="badge-squared text-white" style={{ backgroundColor: color }}>
                      SURVEY
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">District</span>
                      <span className="font-medium text-foreground">{well.district}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last depth</span>
                      <span className="font-bold text-xl text-foreground">
                        {well.lastDepthMeters != null ? `${well.lastDepthMeters.toFixed(2)}m` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground shrink-0">Last surveyed</span>
                      <span className="font-medium text-right text-foreground text-xs leading-tight">
                        {well.lastSurveyedOn ? new Date(well.lastSurveyedOn).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border">
                    <span className="text-xs text-accent font-semibold uppercase tracking-wide">
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
      <div className="absolute bottom-4 left-4 bg-card/98 backdrop-blur-sm border border-border p-3 sm:p-4 shadow-elevated z-10 pointer-events-none" style={{ borderRadius: '0.25rem' }}>
        <h4 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wider">Legend</h4>
        <div className="space-y-3">
          {([
            { title: 'Fixed monitoring wells — circles', shape: 'circle' },
            { title: 'Portable survey wells — diamonds', shape: 'diamond' },
          ] as const).map((group) => (
            <div key={group.shape} className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.title}</p>
              {RISK_BANDS.map((band) => (
                <div key={band.risk} className="flex items-center gap-2.5 text-xs">
                  <span
                    className="w-3 h-3 shrink-0 inline-flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <span
                      className={group.shape === 'circle' ? 'w-3 h-3 rounded-full' : 'w-2.5 h-2.5'}
                      style={{
                        backgroundColor: riskColors[band.risk],
                        transform: group.shape === 'diamond' ? 'rotate(45deg)' : undefined,
                      }}
                    />
                  </span>
                  <span className="text-muted-foreground">
                    {band.range} — <span className="font-medium text-foreground">{band.label}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
          <div className="flex items-center gap-2.5 text-xs pt-2 border-t border-border/60">
            <span className="inline-flex items-center gap-[3px] shrink-0" aria-hidden="true">
              <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span className="w-2 h-2 bg-muted-foreground" style={{ transform: 'rotate(45deg)' }} />
            </span>
            <span className="text-muted-foreground">Fixed well also surveyed</span>
          </div>
        </div>
      </div>

      {/* Sensor Count Badge - Squared */}
      <div className="absolute top-4 right-4 bg-card/98 backdrop-blur-sm border border-border px-4 py-2 shadow-elevated z-10 pointer-events-none space-y-1" style={{ borderRadius: '0.25rem' }}>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 bg-accent" style={{ borderRadius: '1px' }} />
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">{sensors.length}</span> sensors monitored
          </span>
        </div>
        {surveyWells.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-muted-foreground" style={{ transform: 'rotate(45deg)' }} />
            <span className="text-muted-foreground">
              <span className="font-bold text-foreground">{surveyWells.length}</span> wells surveyed
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
