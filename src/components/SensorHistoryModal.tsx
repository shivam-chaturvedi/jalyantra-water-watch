import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Save } from 'lucide-react';
import { SensorReading } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { downloadDataAsCsv } from '@/lib/csv';

interface SensorHistoryModalProps {
  sensor: SensorReading | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SensorHistoryModal({ sensor, isOpen, onClose }: SensorHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  if (!sensor) return null;

  const chartData = sensor.history.length
    ? sensor.history.map((point) => ({
        time: point.collectedDate,
        depth: point.depth,
      }))
    : [{ time: sensor.collectedDate, depth: sensor.depth }];

  const handleExportHistory = () => {
    if (!sensor) return;

    const historyRows =
      sensor.history.length > 0
        ? sensor.history.slice().reverse().map((point) => ({
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

    downloadDataAsCsv(`${sensor.deviceId}-full-history.csv`, historyRows);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed inset-0 m-auto h-full max-h-[80vh] max-w-3xl bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden"
          >
            <div className="gradient-header p-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">{sensor.deviceId}</h2>
                  <p className="text-xs text-white/80 uppercase tracking-wider">{sensor.district}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="p-5 space-y-5 h-full overflow-hidden">
              <div className="flex items-center gap-3 border-b border-border/50 pb-3">
                {['chart', 'table'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab as 'chart' | 'table')}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide transition',
                      activeTab === tab
                        ? 'bg-accent text-white shadow-sm'
                        : 'bg-muted/30 text-muted-foreground'
                    )}
                  >
                    {tab === 'chart' ? 'Graph' : 'Table'}
                  </button>
                ))}
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs uppercase tracking-wide"
                    onClick={handleExportHistory}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Export History
                  </Button>
                </div>
              </div>

              {activeTab === 'chart' && (
                <div className="jal-card max-h-[45vh] overflow-y-auto">
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={false}
                          unit="m"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px',
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
              )}

              {activeTab === 'table' && (
                <div className="jal-card max-h-[50vh] overflow-y-auto">
                  <div className="space-y-2 text-xs font-mono">
                    {sensor.history.slice().reverse().map((point) => (
                      <div
                        key={point.id}
                        className="flex items-center justify-between border-b border-border/50 pb-2"
                      >
                        <span>{point.collectedDate}</span>
                        <span>{point.depth}m</span>
                      </div>
                    ))}
                    {!sensor.history.length && (
                      <p className="text-muted-foreground">No history yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
