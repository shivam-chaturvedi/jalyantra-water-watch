import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Activity, Clock, Download, Signal, Thermometer, BarChart3 } from 'lucide-react';
import { SensorReading, getDepthRiskLevel, getRiskColorClass, getRiskTextColorClass } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { downloadDataAsCsv } from '@/lib/csv';

interface SensorDetailModalProps {
  sensor: SensorReading | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SensorDetailModal({ sensor, isOpen, onClose }: SensorDetailModalProps) {
  if (!sensor) return null;

  const risk = getDepthRiskLevel(sensor.depth);
  const chartData = sensor.history.length
    ? sensor.history.map((point) => ({
        time: point.collectedDate,
        depth: point.depth,
      }))
    : [{ time: sensor.collectedDate, depth: sensor.depth }];
  const lastSyncTime = new Date(sensor.lastSync);
  const hoursAgo = Math.round((Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60));

  const handleDownloadHistory = () => {
    const historyRows =
      sensor.history.length > 0
        ? sensor.history.map((point) => ({
            Timestamp: new Date(point.timestamp).toISOString(),
            Date: point.collectedDate,
            Depth: point.depth,
          }))
        : [
            {
              Timestamp: sensor.lastSync,
              Date: sensor.collectedDate,
              Depth: sensor.depth,
            },
          ];

    downloadDataAsCsv(`${sensor.deviceId}-history.csv`, historyRows);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 bottom-6 -translate-x-1/2 w-full max-w-3xl bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden max-h-[85vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="gradient-header p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Signal className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{sensor.deviceId}</h2>
                    <div className="flex items-center gap-2 text-sm text-white/80">
                      <MapPin className="w-3 h-3" />
                      <span>{sensor.district}</span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onClose}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-5">
              {/* Status & Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="jal-card text-center">
                  <Activity className={cn(
                    "w-5 h-5 mx-auto mb-2",
                    sensor.status === 'active' ? "text-depth-safe" : "text-muted-foreground"
                  )} />
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className={cn(
                    "font-semibold text-sm",
                    sensor.status === 'active' ? "text-depth-safe" : "text-muted-foreground"
                  )}>
                    {sensor.status === 'active' ? 'Active' : 'Offline'}
                  </p>
                </div>

                <div className="jal-card text-center">
                  <Thermometer className="w-5 h-5 mx-auto mb-2 text-accent" />
                  <p className="text-xs text-muted-foreground mb-1">Current Depth</p>
                  <p className={cn("font-bold text-lg", getRiskTextColorClass(risk))}>
                    {sensor.depth}m
                  </p>
                </div>

                <div className="jal-card text-center">
                  <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground mb-1">Last Sync</p>
                  <p className="font-semibold text-sm text-foreground">
                    {hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`}
                  </p>
                </div>

                <div className="jal-card text-center">
                  <div className={cn(
                    "w-5 h-5 mx-auto mb-2 rounded-full",
                    getRiskColorClass(risk)
                  )} />
                  <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                  <p className={cn("font-semibold text-sm capitalize", getRiskTextColorClass(risk))}>
                    {risk}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="jal-card">
                <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-accent" />
                  Location Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Latitude</p>
                    <p className="font-mono font-medium">{sensor.lat.toFixed(4)}°N</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Longitude</p>
                    <p className="font-mono font-medium">{sensor.long.toFixed(4)}°E</p>
                  </div>
                </div>
              </div>

              {/* High-Res Chart */}
              <div className="jal-card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-accent" />
                    24-Hour Depth Reading
                  </h3>
                  <span className="text-xs text-muted-foreground">High resolution</span>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        interval={3}
                      />
                      <YAxis 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                        unit="m"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value}m`, 'Depth']}
                      />
                      <Line
                        type="monotone"
                        dataKey="depth"
                        stroke="hsl(187, 72%, 40%)"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: 'hsl(187, 72%, 40%)' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Metadata */}
              <div className="jal-card">
                <h3 className="font-semibold text-sm text-foreground mb-3">Sensor Metadata</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Device ID</p>
                    <p className="font-mono text-foreground">{sensor.deviceId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Collected Date</p>
                    <p className="text-foreground">{sensor.collectedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Accuracy</p>
                    <p className="text-foreground">±0.05m</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Calibration</p>
                    <p className="text-depth-safe font-medium">Verified</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadHistory}>
                  <Download className="w-4 h-4" />
                  Download CSV
                </Button>
                <Button className="flex-1 bg-accent hover:bg-accent/90">
                  View History
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
