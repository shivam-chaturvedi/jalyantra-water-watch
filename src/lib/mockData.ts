// Mock data for JalYantra - Simulating Firebase Realtime Database structure
// This provides realistic Maharashtra groundwater sensor data

export interface SensorReading {
  id: string;
  deviceId: string;
  depth: number;
  collectedDate: string;
  lat: number;
  long: number;
  district: string;
  taluka?: string;
  status: 'active' | 'offline';
  lastSync: string;
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
}

export interface Alert {
  id: string;
  type: 'rapid_decline' | 'offline_sensor' | 'poor_recharge' | 'critical_threshold';
  district: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  timestamp: string;
}

// Maharashtra districts with approximate coordinates
const maharashtraDistricts = [
  { name: 'Mumbai', lat: 19.076, long: 72.8777 },
  { name: 'Pune', lat: 18.5204, long: 73.8567 },
  { name: 'Nashik', lat: 19.9975, long: 73.7898 },
  { name: 'Nagpur', lat: 21.1458, long: 79.0882 },
  { name: 'Aurangabad', lat: 19.8762, long: 75.3433 },
  { name: 'Solapur', lat: 17.6599, long: 75.9064 },
  { name: 'Kolhapur', lat: 16.7050, long: 74.2433 },
  { name: 'Satara', lat: 17.6805, long: 74.0183 },
  { name: 'Sangli', lat: 16.8524, long: 74.5815 },
  { name: 'Ahmednagar', lat: 19.0948, long: 74.7480 },
  { name: 'Jalgaon', lat: 21.0077, long: 75.5626 },
  { name: 'Dhule', lat: 20.9042, long: 74.7749 },
  { name: 'Nanded', lat: 19.1383, long: 77.3210 },
  { name: 'Latur', lat: 18.4088, long: 76.5604 },
  { name: 'Beed', lat: 18.9892, long: 75.7601 },
  { name: 'Osmanabad', lat: 18.1860, long: 76.0400 },
  { name: 'Parbhani', lat: 19.2704, long: 76.7747 },
  { name: 'Hingoli', lat: 19.7200, long: 77.1500 },
  { name: 'Buldhana', lat: 20.5293, long: 76.1842 },
  { name: 'Akola', lat: 20.7002, long: 77.0082 },
  { name: 'Washim', lat: 20.1120, long: 77.1461 },
  { name: 'Amravati', lat: 20.9374, long: 77.7796 },
  { name: 'Yavatmal', lat: 20.3899, long: 78.1307 },
  { name: 'Wardha', lat: 20.7453, long: 78.6022 },
  { name: 'Chandrapur', lat: 19.9615, long: 79.2961 },
  { name: 'Gadchiroli', lat: 20.1809, long: 80.0085 },
  { name: 'Bhandara', lat: 21.1669, long: 79.6536 },
  { name: 'Gondia', lat: 21.4624, long: 80.1920 },
  { name: 'Ratnagiri', lat: 16.9944, long: 73.3000 },
  { name: 'Sindhudurg', lat: 16.3489, long: 73.7556 },
  { name: 'Thane', lat: 19.2183, long: 72.9781 },
  { name: 'Palghar', lat: 19.6968, long: 72.7654 },
  { name: 'Raigad', lat: 18.5158, long: 73.1822 },
];

// Generate random sensor readings around a district
function generateSensorReadings(district: typeof maharashtraDistricts[0], count: number): SensorReading[] {
  const readings: SensorReading[] = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const depth = Math.random() * 25 + 2; // 2-27m depth range
    const latOffset = (Math.random() - 0.5) * 0.3;
    const longOffset = (Math.random() - 0.5) * 0.3;
    const hoursAgo = Math.floor(Math.random() * 24);
    const lastSyncTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    
    readings.push({
      id: `${district.name.toLowerCase().replace(/\s/g, '-')}-${i + 1}`,
      deviceId: `JY-${district.name.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      depth: Math.round(depth * 10) / 10,
      collectedDate: now.toISOString().split('T')[0],
      lat: district.lat + latOffset,
      long: district.long + longOffset,
      district: district.name,
      status: Math.random() > 0.1 ? 'active' : 'offline',
      lastSync: lastSyncTime.toISOString(),
    });
  }
  
  return readings;
}

// Generate all sensor readings
export function generateAllSensorData(): SensorReading[] {
  const allReadings: SensorReading[] = [];
  
  maharashtraDistricts.forEach(district => {
    const sensorCount = Math.floor(Math.random() * 8) + 3; // 3-10 sensors per district
    allReadings.push(...generateSensorReadings(district, sensorCount));
  });
  
  return allReadings;
}

// Calculate district statistics from sensor readings
export function calculateDistrictStats(readings: SensorReading[]): District[] {
  const districtMap = new Map<string, SensorReading[]>();
  
  readings.forEach(reading => {
    const existing = districtMap.get(reading.district) || [];
    existing.push(reading);
    districtMap.set(reading.district, existing);
  });
  
  const districts: District[] = [];
  
  districtMap.forEach((districtReadings, districtName) => {
    const avgDepth = districtReadings.reduce((sum, r) => sum + r.depth, 0) / districtReadings.length;
    const criticalCount = districtReadings.filter(r => r.depth > 20).length;
    const criticalPercentage = (criticalCount / districtReadings.length) * 100;
    const change30Days = (Math.random() - 0.3) * 3; // -1.5 to +2.1 meter change
    
    let riskLevel: District['riskLevel'] = 'safe';
    if (avgDepth > 20) riskLevel = 'critical';
    else if (avgDepth > 10) riskLevel = 'warning';
    else if (avgDepth > 5) riskLevel = 'moderate';
    
    const districtInfo = maharashtraDistricts.find(d => d.name === districtName);
    
    districts.push({
      name: districtName,
      avgDepth: Math.round(avgDepth * 10) / 10,
      sensorCount: districtReadings.length,
      criticalPercentage: Math.round(criticalPercentage),
      change30Days: Math.round(change30Days * 10) / 10,
      riskLevel,
      lat: districtInfo?.lat || 19.0,
      long: districtInfo?.long || 76.0,
    });
  });
  
  return districts;
}

// Generate alerts based on sensor data
export function generateAlerts(districts: District[]): Alert[] {
  const alerts: Alert[] = [];
  const now = new Date();
  
  // Find districts with rapid decline
  const decliningDistricts = districts.filter(d => d.change30Days < -1);
  decliningDistricts.forEach(d => {
    alerts.push({
      id: `alert-decline-${d.name}`,
      type: 'rapid_decline',
      district: d.name,
      message: `Rapid drop of ${Math.abs(d.change30Days)}m in 28 days`,
      severity: d.change30Days < -2 ? 'critical' : 'warning',
      timestamp: now.toISOString(),
    });
  });
  
  // Critical threshold alerts
  const criticalDistricts = districts.filter(d => d.riskLevel === 'critical');
  criticalDistricts.forEach(d => {
    alerts.push({
      id: `alert-critical-${d.name}`,
      type: 'critical_threshold',
      district: d.name,
      message: `Average depth at ${d.avgDepth}m - Critical zone`,
      severity: 'critical',
      timestamp: now.toISOString(),
    });
  });
  
  // Add some info alerts
  if (alerts.length < 3) {
    alerts.push({
      id: 'alert-recharge-1',
      type: 'poor_recharge',
      district: 'Marathwada',
      message: 'Poor recharge despite recent rainfall',
      severity: 'info',
      timestamp: now.toISOString(),
    });
  }
  
  return alerts.slice(0, 5); // Max 5 alerts
}

// Get depth risk level
export function getDepthRiskLevel(depth: number): 'safe' | 'moderate' | 'warning' | 'critical' {
  if (depth <= 5) return 'safe';
  if (depth <= 10) return 'moderate';
  if (depth <= 20) return 'warning';
  return 'critical';
}

// Get risk color class
export function getRiskColorClass(risk: 'safe' | 'moderate' | 'warning' | 'critical'): string {
  switch (risk) {
    case 'safe': return 'bg-depth-safe';
    case 'moderate': return 'bg-depth-moderate';
    case 'warning': return 'bg-depth-warning';
    case 'critical': return 'bg-depth-critical';
  }
}

// Get risk text color class
export function getRiskTextColorClass(risk: 'safe' | 'moderate' | 'warning' | 'critical'): string {
  switch (risk) {
    case 'safe': return 'text-depth-safe';
    case 'moderate': return 'text-depth-moderate';
    case 'warning': return 'text-depth-warning';
    case 'critical': return 'text-depth-critical';
  }
}

// Calculate KPI stats
export interface KPIStats {
  activeSensors: number;
  avgDepth: number;
  criticalPercentage: number;
  fastestDecliningDistrict: string;
  fastestDeclineRate: number;
}

export function calculateKPIStats(readings: SensorReading[], districts: District[]): KPIStats {
  const activeSensors = readings.filter(r => r.status === 'active').length;
  const avgDepth = readings.reduce((sum, r) => sum + r.depth, 0) / readings.length;
  const criticalDistricts = districts.filter(d => d.riskLevel === 'critical').length;
  const criticalPercentage = (criticalDistricts / districts.length) * 100;
  
  const fastestDeclining = districts.reduce((fastest, d) => 
    d.change30Days < fastest.change30Days ? d : fastest
  , districts[0]);
  
  return {
    activeSensors,
    avgDepth: Math.round(avgDepth * 10) / 10,
    criticalPercentage: Math.round(criticalPercentage),
    fastestDecliningDistrict: fastestDeclining.name,
    fastestDeclineRate: Math.abs(fastestDeclining.change30Days),
  };
}
