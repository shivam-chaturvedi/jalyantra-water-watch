import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, TrendingDown, TrendingUp, Activity, Droplets, BarChart3 } from 'lucide-react';
import { District, getRiskColorClass, getRiskTextColorClass } from '@/lib/data';
import { downloadDataAsCsv } from '@/lib/csv';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DistrictPanelProps {
  district: District | null;
  isOpen: boolean;
  onClose: () => void;
  onViewAllSensors?: () => void;
}

export function DistrictPanel({ district, isOpen, onClose, onViewAllSensors }: DistrictPanelProps) {
  const trendData = district?.history ?? [];
  const fallbackDate =
    district?.history.at(-1)?.date ?? district?.history[0]?.date ?? '';
  const fallbackRecord = {
    avgDepth: district?.avgDepth ?? 0,
    date: fallbackDate || '',
  };
  const highestRecord = trendData.length
    ? trendData.reduce((best, point) => (point.avgDepth > best.avgDepth ? point : best), trendData[0])
    : fallbackRecord;
  const lowestRecord = trendData.length
    ? trendData.reduce((best, point) => (point.avgDepth < best.avgDepth ? point : best), trendData[0])
    : fallbackRecord;

  const handleDownloadReport = () => {
    if (!district) return;

    const rows =
      district.history.length > 0
        ? district.history
        : [
            {
              date: new Date().toISOString().split('T')[0],
              avgDepth: district.avgDepth,
              sensors: district.sensorCount,
            },
          ];

    downloadDataAsCsv(
      `${district.name}-trend-report.csv`,
      rows.map((point) => ({
        Date: point.date,
        'Average Depth (m)': point.avgDepth,
        'Sensors Counted': point.sensors,
      }))
    );
  };

  return (
    <AnimatePresence>
      {isOpen && district && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    getRiskColorClass(district.riskLevel)
                  )}>
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{district.name}</h2>
                    <p className="text-sm text-muted-foreground">District Analytics</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="jal-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Avg Depth</span>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    getRiskTextColorClass(district.riskLevel)
                  )}>
                    {district.avgDepth}m
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {district.riskLevel} Zone
                  </p>
                </div>

                <div className="jal-card">
                  <div className="flex items-center gap-2 mb-2">
                    {district.change30Days < 0 ? (
                      <TrendingDown className="w-4 h-4 text-depth-critical" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-depth-safe" />
                    )}
                    <span className="text-xs text-muted-foreground">30-Day Change</span>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    district.change30Days < 0 ? "text-depth-critical" : "text-depth-safe"
                  )}>
                    {district.change30Days > 0 ? '+' : ''}{district.change30Days}m
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {district.change30Days < 0 ? 'Declining' : 'Improving'}
                  </p>
                </div>

                <div className="jal-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-accent" />
                    <span className="text-xs text-muted-foreground">Active Sensors</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {district.sensorCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Reporting data</p>
                </div>

                <div className="jal-card">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-depth-warning" />
                    <span className="text-xs text-muted-foreground">Critical %</span>
                  </div>
                  <p className={cn(
                    "text-2xl font-bold",
                    district.criticalPercentage > 30 ? "text-depth-critical" : "text-foreground"
                  )}>
                    {district.criticalPercentage}%
                  </p>
                  <p className="text-xs text-muted-foreground">Sensors &gt;20m</p>
                </div>
              </div>

              {/* Depth Trend Chart */}
              <div className="jal-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">Depth Trend</h3>
                    <p className="text-xs text-muted-foreground">Aggregated from sensor history</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {trendData.length} data points
                  </span>
                </div>
                <div className="h-48 w-full overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(187, 72%, 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(187, 72%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        minTickGap={40}
                        tickFormatter={(val: string) => {
                          if (!val) return '';
                          const d = new Date(val);
                          if (isNaN(d.getTime())) return val.slice(0, 5);
                          return `${d.getMonth() + 1}/${d.getDate()}`;
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                        unit="m"
                        width={36}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value}m`, 'Avg Depth']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="avgDepth"
                        stroke="hsl(187, 72%, 40%)"
                        strokeWidth={2}
                        fill="url(#depthGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Historical Stats */}
              <div className="jal-card">
                <h3 className="font-semibold text-sm text-foreground mb-3">Historical Records</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">All-Time Highest</p>
                    <p className="text-lg font-bold text-depth-critical">
                      {highestRecord.avgDepth}m
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {highestRecord.date || 'Latest'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">All-Time Lowest</p>
                    <p className="text-lg font-bold text-depth-safe">
                      {lowestRecord.avgDepth}m
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lowestRecord.date || 'Latest'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleDownloadReport}>
                  Download Report
                </Button>
                <Button
                  className="flex-1 bg-accent hover:bg-accent/90"
                  onClick={() => {
                    onViewAllSensors?.();
                    onClose();
                  }}
                >
                  View All Sensors
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
