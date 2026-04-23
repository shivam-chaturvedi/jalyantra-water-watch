/** Known RTDB fields; Firebase may include additional keys — those are preserved in `rtdbExport`. */
export interface FirebaseReadingEntry {
  collectedDate?: string;
  collectedDateTime?: string;
  depth?: number;
  deviceId?: string;
  lat?: number;
  long?: number;
  district?: string;
  lastSeen?: string;
  deviceOnlineSince?: string;
  timestamp?: number;
  triggerSource?: string;
  uptimeSeconds?: number;
  siteName?: string;
  remarks?: string;
  averageSampleCount?: number;
  installerCompany?: string;
  installerName?: string;
  installerPhone?: string;
}

export type RtdbCsvRow = Record<string, string | number | boolean | null>;

/** Flatten one RTDB reading for CSV: every primitive (and JSON for nested) + `firebasePushId` = child key under device batch. */
export function rtdbReadingToExportRow(firebasePushId: string, entry: Record<string, unknown> | null | undefined): RtdbCsvRow {
  const out: RtdbCsvRow = {};
  if (entry && typeof entry === 'object') {
    for (const [k, v] of Object.entries(entry)) {
      if (v === undefined) continue;
      if (v === null) {
        out[k] = null;
        continue;
      }
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        out[k] = v;
        continue;
      }
      try {
        out[k] = JSON.stringify(v);
      } catch {
        out[k] = String(v);
      }
    }
  }
  out.firebasePushId = firebasePushId;
  return out;
}

/** One CSV row per history point — uses stored RTDB snapshot when present. */
export function sensorHistoryPointsToCsvRows(points: SensorHistoryPoint[]): RtdbCsvRow[] {
  return points.map((p) =>
    p.rtdbExport != null ? { ...p.rtdbExport } : historyPointFallbackCsvRow(p),
  );
}

function historyPointFallbackCsvRow(p: SensorHistoryPoint): RtdbCsvRow {
  const row: RtdbCsvRow = {
    firebasePushId: p.id,
    collectedDate: p.collectedDate,
    depth: p.depth,
  };
  if (p.collectedDateTime != null) row.collectedDateTime = p.collectedDateTime;
  if (p.deviceOnlineSince != null) row.deviceOnlineSince = p.deviceOnlineSince;
  if (p.triggerSource != null) row.triggerSource = p.triggerSource;
  if (p.uptimeSeconds != null) row.uptimeSeconds = p.uptimeSeconds;
  return row;
}

/** Latest reading per sensor for dashboard export (RTDB columns only when snapshot exists). */
export function sensorsDashboardExportRows(sensors: SensorReading[]): RtdbCsvRow[] {
  return sensors.map((s) =>
    s.latestRtdbExport != null ? { ...s.latestRtdbExport } : sensorSummaryFallbackCsvRow(s),
  );
}

function sensorSummaryFallbackCsvRow(s: SensorReading): RtdbCsvRow {
  const row: RtdbCsvRow = {
    deviceId: s.deviceId,
    collectedDate: s.collectedDate,
    depth: s.depth,
    lat: s.lat,
    long: s.long,
  };
  if (s.lastCollectedDateTime != null) row.collectedDateTime = s.lastCollectedDateTime;
  return row;
}

const PLAUSIBLE_MS_MIN = Date.UTC(2020, 0, 1);
const PLAUSIBLE_MS_MAX = Date.UTC(2038, 0, 1);

function tryParseInstant(s: string | undefined): number | null {
  if (!s?.trim()) return null;
  const t = Date.parse(s.trim());
  return Number.isNaN(t) ? null : t;
}

/** RTDB child key is sometimes a Unix time: `1773752363` (s) or ms (13 digits). Uses path’s last segment. */
export function instantFromRtdbChildKey(childKey: string): number | null {
  const segment = childKey.includes('/') ? (childKey.split('/').pop() ?? childKey) : childKey;
  if (!/^\d{10,13}$/.test(segment)) return null;
  const n = Number(segment);
  if (!Number.isFinite(n)) return null;
  const ms = n < 1e12 ? n * 1000 : n;
  if (ms >= PLAUSIBLE_MS_MIN && ms <= PLAUSIBLE_MS_MAX) return ms;
  return null;
}

function isLikelyReadingRow(obj: Record<string, unknown>): boolean {
  return (
    typeof obj.depth === 'number' &&
    typeof obj.lat === 'number' &&
    typeof obj.long === 'number'
  );
}

const MAX_READING_NEST_DEPTH = 8;

function expandReadingLeaves(
  node: unknown,
  keyPrefix: string,
  depth: number,
): { leafKey: string; entry: Record<string, unknown> }[] {
  if (depth > MAX_READING_NEST_DEPTH || !node || typeof node !== 'object' || Array.isArray(node)) return [];
  const o = node as Record<string, unknown>;
  const out: { leafKey: string; entry: Record<string, unknown> }[] = [];
  for (const [k, v] of Object.entries(o)) {
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue;
    const vo = v as Record<string, unknown>;
    const path = keyPrefix ? `${keyPrefix}/${k}` : k;
    if (isLikelyReadingRow(vo)) {
      out.push({ leafKey: path, entry: vo });
    } else {
      out.push(...expandReadingLeaves(vo, path, depth + 1));
    }
  }
  return out;
}

/** One device batch: either a map of readings, a single reading object, or nested folders of readings. */
function leavesForDeviceBatch(
  batchKey: string,
  batch: FirebaseDeviceBatch,
): { leafKey: string; entry: Record<string, unknown> }[] {
  if (!batch || typeof batch !== 'object') return [];
  const b = batch as Record<string, unknown>;
  if (isLikelyReadingRow(b)) {
    return [{ leafKey: batchKey, entry: b }];
  }
  return expandReadingLeaves(b, '', 0);
}

/**
 * Sample instant for ordering & charts. Uses `collectedDateTime`, `collectedDate`, RTDB **child key** when it is Unix
 * epoch (common in your DB), then other fields.
 */
export function readingInstantMs(entry: FirebaseReadingEntry, rtdbChildKey?: string): number {
  let t = tryParseInstant(entry.collectedDateTime);
  if (t != null) return t;

  const cd = entry.collectedDate?.trim();
  if (cd && !/^\d{4}-\d{2}-\d{2}$/.test(cd)) {
    t = tryParseInstant(cd);
    if (t != null) return t;
  }

  if (rtdbChildKey) {
    t = instantFromRtdbChildKey(rtdbChildKey);
    if (t != null) return t;
  }

  if (cd) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(cd)) {
      const noon = Date.parse(`${cd}T12:00:00`);
      if (!Number.isNaN(noon)) return noon;
    }
    t = tryParseInstant(cd);
    if (t != null) return t;
  }

  t = tryParseInstant(entry.lastSeen);
  if (t != null) return t;

  t = tryParseInstant(entry.deviceOnlineSince);
  if (t != null) return t;

  if (typeof entry.timestamp === 'number' && Number.isFinite(entry.timestamp)) {
    let ms = entry.timestamp;
    if (ms > 0 && ms < 1e12) ms *= 1000;
    if (ms >= PLAUSIBLE_MS_MIN && ms <= PLAUSIBLE_MS_MAX) return ms;
  }

  return Date.now();
}

/** Last sync line: show the actual sample date/time (no “As of …” / “Xh ago”). */
export function formatLastSyncDate(
  sensor: Pick<SensorReading, 'collectedDate' | 'lastSync' | 'lastCollectedDateTime'>,
): string {
  const iso = sensor.lastCollectedDateTime?.trim();
  if (iso) {
    const ms = Date.parse(iso);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return iso;
  }

  const raw = sensor.collectedDate?.trim();
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const ms = Date.parse(`${raw}T12:00:00`);
      if (Number.isFinite(ms)) {
        return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });
      }
      return raw;
    }
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return raw;
  }

  const t = new Date(sensor.lastSync).getTime();
  if (Number.isFinite(t)) {
    return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  }

  return '—';
}

export type FirebaseDeviceBatch = Record<string, FirebaseReadingEntry | null> | null;
export type FirebaseReadings = Record<string, FirebaseDeviceBatch> | null;

export interface SensorHistoryPoint {
  id: string;
  depth: number;
  collectedDate: string;
  /** From Firebase `collectedDateTime` when present — used for chart tooltips. */
  collectedDateTime?: string;
  timestamp: number;
  /** Same power-on session across ~1 min samples within one pump run. */
  deviceOnlineSince?: string;
  triggerSource?: string;
  uptimeSeconds?: number;
  /** Full flattened RTDB row for dynamic CSV (all columns the device sent). */
  rtdbExport?: RtdbCsvRow;
}

export interface SensorReading {
  id: string;
  deviceId: string;
  depth: number;
  collectedDate: string;
  /** Latest sample’s `collectedDateTime` from Firebase when provided. */
  lastCollectedDateTime?: string;
  lat: number;
  long: number;
  district: string;
  status: 'active' | 'offline';
  lastSync: string;
  /** Latest reading’s flattened RTDB fields for dashboard CSV. */
  latestRtdbExport?: RtdbCsvRow;
  history: SensorHistoryPoint[];
  validationFlags?: string[];
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
  totalSensors: number;
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

const MUMBAI_COORDINATES = { lat: 19.076, long: 72.8777 };

const districtCenters = [
  { name: 'Mumbai', lat: 19.076, long: 72.95 },
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

const STATUS_FRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 30; // 30 days for demo purposes

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

/** Keep 0.01 m precision internally; coarser display rounding is applied only on pump drawdown charts. */
function sanitizeDepth(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
}

const MIN_PLAUSIBLE_DEPTH = 0;
const MAX_PLAUSIBLE_DEPTH = 60;
const MAX_SUDDEN_JUMP_METERS = 1.5;
const MAX_SUDDEN_JUMP_WINDOW_MS = 5 * 60 * 1000;

function isPlausibleDepth(depth: number): boolean {
  return depth >= MIN_PLAUSIBLE_DEPTH && depth <= MAX_PLAUSIBLE_DEPTH;
}

function formatTimeLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function detectSuddenAnomalies(points: ExtendedHistoryPoint[]): string[] {
  const anomalies: string[] = [];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const dt = curr.timestamp - prev.timestamp;
    if (dt <= 0 || dt > MAX_SUDDEN_JUMP_WINDOW_MS) continue;
    const delta = Math.abs(curr.depth - prev.depth);
    if (delta >= MAX_SUDDEN_JUMP_METERS) {
      anomalies.push(
        `Sudden change of ${delta.toFixed(2)}m between ${formatTimeLabel(prev.timestamp)} and ${formatTimeLabel(
          curr.timestamp,
        )}`,
      );
    }
  }
  return anomalies;
}

function filterPlausibleHistoryPoints(points: ExtendedHistoryPoint[]): ExtendedHistoryPoint[] {
  return points.filter((point) => isPlausibleDepth(point.depth));
}

function sortHistoryPoints(a: ExtendedHistoryPoint, b: ExtendedHistoryPoint): number {
  const dt = a.timestamp - b.timestamp;
  if (dt !== 0) return dt;
  return a.id.localeCompare(b.id);
}

/** Multiple RTDB paths can reference the same `deviceId` (e.g. flat push keys); merge into one sensor. */
function mergeSensorsByDeviceId(sensors: SensorReading[]): SensorReading[] {
  const map = new Map<string, SensorReading>();
  for (const s of sensors) {
    const key = s.deviceId;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...s, history: [...s.history], id: key });
      continue;
    }
    existing.history = [...existing.history, ...s.history].sort(sortHistoryPoints);
    const latest = existing.history[existing.history.length - 1];
    existing.depth = latest.depth;
    existing.collectedDate = latest.collectedDate;
    existing.lastCollectedDateTime = latest.collectedDateTime ?? existing.lastCollectedDateTime;
    existing.lat = latest.lat;
    existing.long = latest.long;
    existing.district = matchDistrictName(latest.lat, latest.long);
    existing.status = getSensorStatusFromTimestamp(latest.timestamp);
    existing.lastSync = new Date(latest.timestamp).toISOString();
    existing.latestRtdbExport = latest.rtdbExport ? { ...latest.rtdbExport } : existing.latestRtdbExport;
    if (s.validationFlags?.length) {
      const existingFlags = existing.validationFlags ?? [];
      existing.validationFlags = Array.from(new Set([...existingFlags, ...s.validationFlags]));
    }
  }
  return Array.from(map.values());
}

function historyPointToSensorPayload(
  historyPoints: ExtendedHistoryPoint[],
  batchKey: string,
): SensorReading | null {
  if (!historyPoints.length) return null;
  const plausibleHistory = filterPlausibleHistoryPoints(historyPoints);
  const historyForSensor = plausibleHistory.length ? plausibleHistory : historyPoints;
  const latest = historyForSensor[historyForSensor.length - 1];
  const deviceId = latest.deviceId || batchKey;
  const districtName = latest.district || matchDistrictName(latest.lat, latest.long);
  const status = getSensorStatusFromTimestamp(latest.timestamp);
  const validationFlags: string[] = [];
  const invalidDepthCount = historyPoints.length - plausibleHistory.length;
  if (invalidDepthCount > 0) {
    validationFlags.push(
      `Filtered ${invalidDepthCount} readings outside ${MIN_PLAUSIBLE_DEPTH}–${MAX_PLAUSIBLE_DEPTH}m range`,
    );
  }
  const anomalyMessages = detectSuddenAnomalies(historyForSensor);
  validationFlags.push(...anomalyMessages);

  return {
    id: batchKey,
    deviceId,
    depth: latest.depth,
    collectedDate: latest.collectedDate,
    ...(latest.collectedDateTime ? { lastCollectedDateTime: latest.collectedDateTime } : {}),
    lat: latest.lat,
    long: latest.long,
    district: districtName,
    status,
    lastSync: new Date(latest.timestamp).toISOString(),
    ...(latest.rtdbExport ? { latestRtdbExport: { ...latest.rtdbExport } } : {}),
    ...(validationFlags.length ? { validationFlags } : {}),
    history: historyForSensor.map(
      ({
        id,
        depth,
        collectedDate,
        collectedDateTime,
        timestamp,
        deviceOnlineSince,
        triggerSource,
        uptimeSeconds,
        rtdbExport,
      }) => ({
        id,
        depth,
        collectedDate,
        ...(collectedDateTime ? { collectedDateTime } : {}),
        timestamp,
        ...(deviceOnlineSince ? { deviceOnlineSince } : {}),
        ...(triggerSource ? { triggerSource } : {}),
        ...(uptimeSeconds != null ? { uptimeSeconds } : {}),
        ...(rtdbExport ? { rtdbExport: { ...rtdbExport } } : {}),
      }),
    ),
  };
}

export function transformFirebaseReadings(raw: FirebaseReadings): SensorReading[] {
  if (!raw) return [];

  const unmerged = Object.entries(raw)
    .map(([batchKey, batch]) => {
      const leaves = leavesForDeviceBatch(batchKey, batch);
      if (!leaves.length) return null;

      const historyPoints = leaves
        .map(({ leafKey, entry }) => {
          const en = entry as FirebaseReadingEntry;
          const timestamp = readingInstantMs(en, leafKey);
          if (en.depth == null || en.lat == null || en.long == null) return null;

          const collectedDateTime = en.collectedDateTime?.trim();
          const rtdbExport = rtdbReadingToExportRow(leafKey, entry);
          const deviceOnlineSince =
            typeof en.deviceOnlineSince === 'string' && en.deviceOnlineSince.trim()
              ? en.deviceOnlineSince.trim()
              : undefined;
          const triggerSource =
            typeof en.triggerSource === 'string' && en.triggerSource.trim()
              ? en.triggerSource.trim()
              : undefined;
          const uptimeSeconds =
            typeof en.uptimeSeconds === 'number' && Number.isFinite(en.uptimeSeconds)
              ? en.uptimeSeconds
              : undefined;

          return {
            id: leafKey,
            depth: sanitizeDepth(en.depth),
            collectedDate: en.collectedDate || new Date(timestamp).toISOString().split('T')[0],
            ...(collectedDateTime ? { collectedDateTime } : {}),
            timestamp,
            lat: en.lat,
            long: en.long,
            deviceId: en.deviceId || batchKey,
            district: en.district,
            ...(deviceOnlineSince ? { deviceOnlineSince } : {}),
            ...(triggerSource ? { triggerSource } : {}),
            ...(uptimeSeconds != null ? { uptimeSeconds } : {}),
            rtdbExport,
          };
        })
        .filter((point): point is ExtendedHistoryPoint => point !== null)
        .sort(sortHistoryPoints);

      return historyPointToSensorPayload(historyPoints, batchKey);
    })
    .filter((sensor): sensor is SensorReading => sensor !== null);

  return mergeSensorsByDeviceId(unmerged);
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
    totalSensors: readings.length,
    avgDepth: Math.round(avgDepth * 10) / 10,
    criticalPercentage,
    fastestDecliningDistrict: fastestDeclining?.name || 'N/A',
    fastestDeclineRate: fastestDeclining ? Math.abs(fastestDeclining.change30Days) : 0,
  };
}
