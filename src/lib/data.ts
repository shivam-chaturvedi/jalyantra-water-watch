export interface FirebaseReadingEntry {
  collectedDate?: string;
  depth?: number;
  deviceId?: string;
  lat?: number;
  long?: number;
  district?: string;
  timestamp?: number;
}

export type FirebaseDeviceBatch = Record<string, FirebaseReadingEntry | null> | null;
export type FirebaseReadings = Record<string, FirebaseDeviceBatch> | null;

export interface SensorHistoryPoint {
  id: string;
  depth: number;
  collectedDate: string;
  timestamp: number;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  depth: number;
  collectedDate: string;
  lat: number;
  long: number;
  district: string;
  status: 'active' | 'offline';
  lastSync: string;
  history: SensorHistoryPoint[];
}

export interface District {
  name: string;
  avgDepth: number;
  sensorCount: number;
  criticalPercentage: number;
  change30Days: number;
  riskLevel: 'safe' | 'moderate' | 'warning' | 'critical';
  lat: number;
  long: number;
  history: DistrictHistoryPoint[];
}

export interface Alert {
  id: string;
  type: 'rapid_decline' | 'offline_sensor' | 'poor_recharge' | 'critical_threshold';
  district: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  timestamp: string;
}

export interface KPIStats {
  activeSensors: number;
  avgDepth: number;
  criticalPercentage: number;
  fastestDecliningDistrict: string;
  fastestDeclineRate: number;
}

export interface DistrictHistoryPoint {
  date: string;
  avgDepth: number;
  sensors: number;
}

type ExtendedHistoryPoint = SensorHistoryPoint & {
  lat: number;
  long: number;
  deviceId: string;
  district?: string;
};

const districtCenters = [
  { name: 'Mumbai', lat: 19.076, long: 72.8777 },
  { name: 'Pune', lat: 18.5204, long: 73.8567 },
  { name: 'Nashik', lat: 19.9975, long: 73.7898 },
  { name: 'Nagpur', lat: 21.1458, long: 79.0882 },
  { name: 'Aurangabad', lat: 19.8762, long: 75.3433 },
  { name: 'Solapur', lat: 17.6599, long: 75.9064 },
  { name: 'Kolhapur', lat: 16.705, long: 74.2433 },
  { name: 'Satara', lat: 17.6805, long: 74.0183 },
  { name: 'Sangli', lat: 16.8524, long: 74.5815 },
  { name: 'Ahmednagar', lat: 19.0948, long: 74.748 },
  { name: 'Jalgaon', lat: 21.0077, long: 75.5626 },
  { name: 'Dhule', lat: 20.9042, long: 74.7749 },
  { name: 'Nanded', lat: 19.1383, long: 77.321 },
  { name: 'Latur', lat: 18.4088, long: 76.5604 },
  { name: 'Beed', lat: 18.9892, long: 75.7601 },
  { name: 'Osmanabad', lat: 18.186, long: 76.04 },
  { name: 'Parbhani', lat: 19.2704, long: 76.7747 },
  { name: 'Hingoli', lat: 19.72, long: 77.15 },
  { name: 'Buldhana', lat: 20.5293, long: 76.1842 },
  { name: 'Akola', lat: 20.7002, long: 77.0082 },
  { name: 'Washim', lat: 20.112, long: 77.1461 },
  { name: 'Amravati', lat: 20.9374, long: 77.7796 },
  { name: 'Yavatmal', lat: 20.3899, long: 78.1307 },
  { name: 'Wardha', lat: 20.7453, long: 78.6023 },
  { name: 'Chandrapur', lat: 19.9615, long: 79.2961 },
  { name: 'Gadchiroli', lat: 20.1809, long: 80.0085 },
  { name: 'Bhandara', lat: 21.1669, long: 79.6536 },
  { name: 'Gondia', lat: 21.4624, long: 80.192 },
  { name: 'Ratnagiri', lat: 16.9944, long: 73.3 },
  { name: 'Sindhudurg', lat: 16.3489, long: 73.7556 },
  { name: 'Thane', lat: 19.2183, long: 72.9781 },
  { name: 'Palghar', lat: 19.6968, long: 72.7654 },
  { name: 'Raigad', lat: 18.5158, long: 73.1822 },
];

const STATUS_FRESH_THRESHOLD_MS = 1000 * 60 * 60 * 6;

function getSensorStatusFromTimestamp(timestamp: number): 'active' | 'offline' {
  return Date.now() - timestamp < STATUS_FRESH_THRESHOLD_MS ? 'active' : 'offline';
}

function matchDistrictName(lat?: number, long?: number): string {
  if (lat == null || long == null) return 'Unknown';

  let closest = districtCenters[0];
  let minDistance = Number.POSITIVE_INFINITY;

  districtCenters.forEach((center) => {
    const dx = lat - center.lat;
    const dy = long - center.long;
    const distance = dx * dx + dy * dy;
    if (distance < minDistance) {
      minDistance = distance;
      closest = center;
    }
  });

  return closest.name;
}

function getDistrictCoordinates(districtName: string) {
  const match = districtCenters.find((center) => center.name === districtName);
  if (match) return { lat: match.lat, long: match.long };
  return { lat: 19.7515, long: 75.7139 };
}

function sanitizeDepth(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 10) / 10;
}

export function transformFirebaseReadings(raw: FirebaseReadings): SensorReading[] {
  if (!raw) return [];

  return Object.entries(raw)
    .map(([deviceKey, batch]) => {
      if (!batch) return null;

      const historyPoints = Object.entries(batch)
        .map(([entryId, entry]) => {
          if (!entry) return null;

          const timestamp =
            typeof entry.timestamp === 'number'
              ? entry.timestamp
              : entry.collectedDate
                ? new Date(entry.collectedDate).getTime()
                : Date.now();

          if (entry.depth == null || entry.lat == null || entry.long == null) return null;

          return {
            id: entryId,
            depth: sanitizeDepth(entry.depth),
            collectedDate:
              entry.collectedDate || new Date(timestamp).toISOString().split('T')[0],
            timestamp,
            lat: entry.lat,
            long: entry.long,
            deviceId: entry.deviceId || deviceKey,
            district: entry.district,
          };
        })
        .filter((point): point is ExtendedHistoryPoint => point !== null)
        .sort((a, b) => a.timestamp - b.timestamp);

      if (!historyPoints.length) return null;

      const latest = historyPoints[historyPoints.length - 1];
      const deviceId = latest.deviceId || deviceKey;
      const districtName = latest.district || matchDistrictName(latest.lat, latest.long);
      const status = getSensorStatusFromTimestamp(latest.timestamp);

      return {
        id: deviceKey,
        deviceId,
        depth: latest.depth,
        collectedDate: latest.collectedDate,
        lat: latest.lat,
        long: latest.long,
        district: districtName,
        status,
        lastSync: new Date(latest.timestamp).toISOString(),
        history: historyPoints.map(({ id, depth, collectedDate, timestamp }) => ({ id, depth, collectedDate, timestamp })),
      };
    })
    .filter((sensor): sensor is SensorReading => sensor !== null);
}

export function calculateDistrictStats(readings: SensorReading[]): District[] {
  const districtMap = new Map<string, SensorReading[]>();

  readings.forEach((reading) => {
    const districtSensors = districtMap.get(reading.district) ?? [];
    districtSensors.push(reading);
    districtMap.set(reading.district, districtSensors);
  });

  const districts: District[] = [];

  districtMap.forEach((districtReadings, districtName) => {
    const avgDepth =
      districtReadings.reduce((sum, reading) => sum + reading.depth, 0) / districtReadings.length;

    const earliestAvg =
      districtReadings.reduce((sum, reading) => sum + (reading.history[0]?.depth ?? reading.depth), 0) /
      districtReadings.length;

    const criticalCount = districtReadings.filter((reading) => reading.depth > 20).length;

    const change30Days = Math.round((avgDepth - earliestAvg) * 10) / 10;
    const criticalPercentage = Math.round((criticalCount / districtReadings.length) * 100);

    const timeline = new Map<string, { sum: number; count: number }>();
    districtReadings.forEach((reading) => {
      reading.history.forEach((point) => {
        const dateKey = point.collectedDate || new Date(point.timestamp).toISOString().split('T')[0];
        const entry = timeline.get(dateKey) ?? { sum: 0, count: 0 };
        entry.sum += point.depth;
        entry.count += 1;
        timeline.set(dateKey, entry);
      });
    });

    const history: DistrictHistoryPoint[] = Array.from(timeline.entries())
      .map(([date, entry]) => ({
        date,
        avgDepth: Math.round((entry.sum / entry.count) * 10) / 10,
        sensors: entry.count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let riskLevel: District['riskLevel'] = 'safe';
    if (avgDepth > 20) riskLevel = 'critical';
    else if (avgDepth > 10) riskLevel = 'warning';
    else if (avgDepth > 5) riskLevel = 'moderate';

    const coords = getDistrictCoordinates(districtName);

    districts.push({
      name: districtName,
      avgDepth: Math.round(avgDepth * 10) / 10,
      sensorCount: districtReadings.length,
      criticalPercentage,
      change30Days,
      riskLevel,
      lat: coords.lat,
      long: coords.long,
      history,
    });
  });

  return districts;
}

export function generateAlerts(districts: District[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date().toISOString();

  const decliningDistricts = districts.filter((d) => d.change30Days < -1);
  decliningDistricts.forEach((district) => {
    alerts.push({
      id: `alert-decline-${district.name}`,
      type: 'rapid_decline',
      district: district.name,
      message: `Rapid drop of ${Math.abs(district.change30Days)}m in recent readings`,
      severity: district.change30Days < -2 ? 'critical' : 'warning',
      timestamp: now,
    });
  });

  const criticalDistricts = districts.filter((d) => d.riskLevel === 'critical');
  criticalDistricts.forEach((district) => {
    alerts.push({
      id: `alert-critical-${district.name}`,
      type: 'critical_threshold',
      district: district.name,
      message: `Average depth at ${district.avgDepth}m - Critical zone`,
      severity: 'critical',
      timestamp: now,
    });
  });

  if (alerts.length < 3 && districts.length) {
    alerts.push({
      id: 'alert-offline-fallback',
      type: 'offline_sensor',
      district: districts[0].name,
      message: 'Sensors are being monitored continuously — no critical alerts at this time.',
      severity: 'info',
      timestamp: now,
    });
  }

  return alerts.slice(0, 5);
}

export function getDepthRiskLevel(depth: number): 'safe' | 'moderate' | 'warning' | 'critical' {
  if (depth <= 5) return 'safe';
  if (depth <= 10) return 'moderate';
  if (depth <= 20) return 'warning';
  return 'critical';
}

export function getRiskColorClass(risk: 'safe' | 'moderate' | 'warning' | 'critical'): string {
  switch (risk) {
    case 'safe':
      return 'bg-depth-safe';
    case 'moderate':
      return 'bg-depth-moderate';
    case 'warning':
      return 'bg-depth-warning';
    case 'critical':
      return 'bg-depth-critical';
  }
}

export function getRiskTextColorClass(risk: 'safe' | 'moderate' | 'warning' | 'critical'): string {
  switch (risk) {
    case 'safe':
      return 'text-depth-safe';
    case 'moderate':
      return 'text-depth-moderate';
    case 'warning':
      return 'text-depth-warning';
    case 'critical':
      return 'text-depth-critical';
  }
}

export function calculateKPIStats(readings: SensorReading[], districts: District[]): KPIStats {
  const activeSensors = readings.filter((reading) => reading.status === 'active').length;
  const avgDepth =
    readings.length === 0
      ? 0
      : readings.reduce((sum, reading) => sum + reading.depth, 0) / readings.length;
  const criticalDistricts = districts.filter((district) => district.riskLevel === 'critical').length;
  const criticalPercentage = districts.length ? Math.round((criticalDistricts / districts.length) * 100) : 0;
  const fastestDeclining =
    districts.length > 0
      ? districts.reduce((prev, district) => (district.change30Days < prev.change30Days ? district : prev), districts[0])
      : null;

  return {
    activeSensors,
    avgDepth: Math.round(avgDepth * 10) / 10,
    criticalPercentage,
    fastestDecliningDistrict: fastestDeclining?.name || 'N/A',
    fastestDeclineRate: fastestDeclining ? Math.abs(fastestDeclining.change30Days) : 0,
  };
}
