import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, TrendingDown, TrendingUp, Activity, Calendar, Droplets, BarChart3 } from 'lucide-react';
import { District, getRiskColorClass, getRiskTextColorClass } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DistrictPanelProps {
  district: District | null;
  isOpen: boolean;
  onClose: () => void;
}

// Mock trend data for the district
function generateTrendData(district: District) {
  const data = [];
  const baseDepth = district.avgDepth;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 3;
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      depth: Math.round((baseDepth + variation + (i * 0.05)) * 10) / 10,
      rainfall: i > 20 ? 0 : Math.random() * 50,
    });
  }
  
  return data;
}

export function DistrictPanel({ district, isOpen, onClose }: DistrictPanelProps) {
  const trendData = district ? generateTrendData(district) : [];

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
                  <h3 className="font-semibold text-sm text-foreground">Depth Trend (30 Days)</h3>
                  <div className="flex gap-1">
                    <Button variant="secondary" size="sm" className="h-7 text-xs">30D</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">90D</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">1Y</Button>
                  </div>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="depthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(187, 72%, 40%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(187, 72%, 40%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
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
                      />
                      <Area
                        type="monotone"
                        dataKey="depth"
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
                      {Math.round((district.avgDepth + 8) * 10) / 10}m
                    </p>
                    <p className="text-xs text-muted-foreground">May 2024</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">All-Time Lowest</p>
                    <p className="text-lg font-bold text-depth-safe">
                      {Math.round((district.avgDepth - 6) * 10) / 10}m
                    </p>
                    <p className="text-xs text-muted-foreground">Sep 2023</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Download Report
                </Button>
                <Button className="flex-1 bg-accent hover:bg-accent/90">
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
