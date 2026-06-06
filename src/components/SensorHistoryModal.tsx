import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Save } from 'lucide-react';
import { SensorReading, sensorHistoryPointsToCsvRows, sensorsDashboardExportRows } from '@/lib/data';
import {
  buildPumpRunSegments,
  chartPointLabel,
  pumpRunSegmentsToChartRows,
  segmentIntoPumpEvents,
} from '@/lib/pumpEvents';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PumpDrawdownChart } from '@/components/PumpDrawdownChart';
import { downloadDataAsCsv } from '@/lib/csv';

interface SensorHistoryModalProps {
  sensor: SensorReading | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SensorHistoryModal({ sensor, isOpen, onClose }: SensorHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  const tableMeta = useMemo(() => {
    const h = sensor?.history ?? [];
    return {
      showTrigger: h.some((p) => p.triggerSource),
      showUptime: h.some((p) => p.uptimeSeconds != null),
      showOnline: h.some((p) => p.deviceOnlineSince),
    };
  }, [sensor?.history]);

  if (!sensor) return null;

  const sortedHistory = [...sensor.history].sort((a, b) => a.timestamp - b.timestamp);
  const pumpEvents = segmentIntoPumpEvents(sortedHistory);
  const pumpSegments = buildPumpRunSegments(pumpEvents);
  const lastSyncMs = new Date(sensor.lastSync).getTime();
  const chartData =
    pumpSegments.length > 0
      ? pumpRunSegmentsToChartRows(pumpSegments)
      : [
          {
            timeMs: Number.isFinite(lastSyncMs) ? lastSyncMs : Date.now(),
            depth: sensor.depth,
            label: chartPointLabel({
              id: 'current',
              depth: sensor.depth,
              collectedDate: sensor.collectedDate,
              collectedDateTime: sensor.lastCollectedDateTime,
              timestamp: Number.isFinite(lastSyncMs) ? lastSyncMs : Date.now(),
            }),
            runIndex: 1,
            isRunStart: true,
            isRunEnd: true,
          },
        ];

  const handleExportHistory = () => {
    if (!sensor) return;

    const rows =
      sensor.history.length > 0
        ? sensorHistoryPointsToCsvRows(sensor.history.slice().reverse())
        : sensorsDashboardExportRows([sensor]);

    downloadDataAsCsv(`${sensor.deviceId}-full-history.csv`, rows);
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
          {/* Flex wrapper centers modal; avoid Tailwind translate + motion transform fighting layout. */}
          <div className="fixed inset-0 z-[51] pointer-events-none flex items-center justify-center px-3 py-4 sm:px-5 sm:py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className="pointer-events-auto flex max-h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            >
              <div className="gradient-header flex shrink-0 items-center justify-between p-4 text-white sm:p-5">
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

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
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
                <div className="jal-card max-h-[min(42vh,320px)] space-y-2 overflow-y-auto sm:max-h-[45vh]">
                  <p className="px-0.5 text-[11px] leading-snug text-muted-foreground">
                    Green dots = pump start reading. Red dots = pump stop reading.
                  </p>
                  <PumpDrawdownChart rows={chartData} segments={pumpSegments} className="h-48 sm:h-56" />
                </div>
              )}

              {activeTab === 'table' && (
                <div className="jal-card max-h-[min(50vh,360px)] overflow-y-auto sm:max-h-[50vh]">
                  {sensor.history.length > 0 ? (
                    <table className="w-full border-collapse text-left text-[11px] sm:text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="py-2 pr-2 font-medium">When</th>
                          <th className="py-2 pr-2 font-medium tabular-nums">Depth</th>
                          {tableMeta.showTrigger && <th className="py-2 pr-2 font-medium">Trigger</th>}
                          {tableMeta.showUptime && <th className="py-2 pr-2 font-medium tabular-nums">Uptime s</th>}
                          {tableMeta.showOnline && <th className="py-2 font-medium">Online since</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {sensor.history
                          .slice()
                          .reverse()
                          .map((point) => (
                            <tr key={point.id} className="border-b border-border/50">
                              <td className="py-2 pr-2 align-top leading-snug">{chartPointLabel(point)}</td>
                              <td className="py-2 pr-2 tabular-nums align-top">{point.depth}m</td>
                              {tableMeta.showTrigger && (
                                <td className="py-2 pr-2 align-top text-muted-foreground">
                                  {point.triggerSource ?? '—'}
                                </td>
                              )}
                              {tableMeta.showUptime && (
                                <td className="py-2 pr-2 tabular-nums align-top">
                                  {point.uptimeSeconds ?? '—'}
                                </td>
                              )}
                              {tableMeta.showOnline && (
                                <td className="py-2 align-top text-muted-foreground break-all">
                                  {point.deviceOnlineSince ?? '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-muted-foreground">No history yet.</p>
                  )}
                </div>
              )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
