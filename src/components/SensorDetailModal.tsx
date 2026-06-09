import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Activity, Clock, Download, Signal, Thermometer, BarChart3 } from 'lucide-react';
import {
  SensorReading,
  formatLastSyncDate,
  getDepthRiskLevel,
  getRiskColorClass,
  getRiskTextColorClass,
  sensorHistoryPointsToCsvRows,
  sensorsDashboardExportRows,
} from '@/lib/data';
import {
  buildPumpRunSegments,
  getPointsLast24h,
  pumpRunSegmentsToChartRows,
  segmentIntoPumpEvents,
  summarize24h,
} from '@/lib/pumpEvents';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PumpDrawdownChart } from '@/components/PumpDrawdownChart';
import { PumpRunSummaryTable } from '@/components/PumpRunSummaryTable';
import { downloadDataAsCsv } from '@/lib/csv';

interface SensorDetailModalProps {
  sensor: SensorReading | null;
  isOpen: boolean;
  onClose: () => void;
  onViewHistory?: (sensor: SensorReading) => void;
}

export function SensorDetailModal({ sensor, isOpen, onClose, onViewHistory }: SensorDetailModalProps) {
  if (!sensor) return null;

  const risk = getDepthRiskLevel(sensor.depth);
  const points24h = getPointsLast24h(sensor);
  const pumpEvents24h = segmentIntoPumpEvents(points24h);
  const pumpSegments24h = buildPumpRunSegments(pumpEvents24h);
  const chartRows24h = pumpRunSegmentsToChartRows(pumpSegments24h);
  const summary24h = summarize24h(points24h);
  const hasReadingsIn24h = points24h.length > 0;
  const currentLevelDisplay =
    summary24h.currentWaterLevel !== null ? summary24h.currentWaterLevel : sensor.depth;
  const has24hChartData = chartRows24h.some((r) => r.depth !== null);
  const lastSyncLabel = formatLastSyncDate(sensor);
  const validationNotes = sensor.validationFlags ?? [];

  const handleDownloadHistory = () => {
    const rows =
      sensor.history.length > 0
        ? sensorHistoryPointsToCsvRows([...sensor.history].reverse())
        : sensorsDashboardExportRows([sensor]);

    downloadDataAsCsv(`${sensor.deviceId}-history.csv`, rows);
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

          <div className="fixed inset-0 z-50 flex items-center justify-end px-4 py-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-3xl bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[92vh] pointer-events-auto"
            >
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

              <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 120px)' }}>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="jal-card text-center">
                    <Activity
                      className={cn(
                        'w-5 h-5 mx-auto mb-2',
                        sensor.status === 'active' ? 'text-depth-safe' : 'text-muted-foreground'
                      )}
                    />
                    <p className="text-xs text-muted-foreground mb-1">Status</p>
                    <p
                      className={cn(
                        'font-semibold text-sm',
                        sensor.status === 'active' ? 'text-depth-safe' : 'text-muted-foreground'
                      )}
                    >
                      {sensor.status === 'active' ? 'Active' : 'Offline'}
                    </p>
                  </div>

                  <div className="jal-card text-center">
                    <Thermometer className="w-5 h-5 mx-auto mb-2 text-accent" />
                    <p className="text-xs text-muted-foreground mb-1">Current Depth</p>
                    <p className={cn('font-bold text-lg', getRiskTextColorClass(risk))}>
                      {sensor.depth}m
                    </p>
                  </div>

                  <div className="jal-card text-center">
                    <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mb-1">Last sync</p>
                    <p className="font-semibold text-sm text-foreground">{lastSyncLabel}</p>
                  </div>

                  <div className="jal-card text-center">
                    <div
                      className={cn(
                        'w-5 h-5 mx-auto mb-2 rounded-full',
                        getRiskColorClass(risk)
                      )}
                    />
                    <p className="text-xs text-muted-foreground mb-1">Risk Level</p>
                    <p className={cn('font-semibold text-sm capitalize', getRiskTextColorClass(risk))}>
                      {risk}
                    </p>
                  </div>
                </div>

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

                <div className="jal-card">
                  <div className="mb-4 space-y-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-accent" />
                        24-hour pump drawdown
                      </h3>
                      <span className="text-[11px] text-muted-foreground leading-snug max-w-md text-left">
                        Green dots show the reading when the pump starts; red dots show the reading when the pump stops.
                        A connector line links each start and stop pair so one pump run is easy to read.
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current depth</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {currentLevelDisplay}m
                          {!hasReadingsIn24h && (
                            <span className="block text-[10px] font-normal text-muted-foreground normal-case">
                              No samples in 24h
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pump runs</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">{summary24h.pumpRuns}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max drawdown</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {summary24h.pumpRuns ? `${summary24h.maxDrawdown.toFixed(2)}m` : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg drawdown rate</p>
                        <p className="text-sm font-bold text-foreground tabular-nums">
                          {summary24h.runsWithDuration > 0
                            ? `${summary24h.avgDrawdownRate.toFixed(3)} m/min`
                            : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="w-full">
                    {has24hChartData ? (
                      <PumpDrawdownChart rows={chartRows24h} segments={pumpSegments24h} />
                    ) : (
                      <div className="flex h-full min-h-[14rem] items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 px-4 text-center text-sm text-muted-foreground">
                        No depth readings in the last 24 hours. Data appears only while the pump is powered on.
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <PumpRunSummaryTable segments={pumpSegments24h} />
                  </div>
                </div>
                {validationNotes.length > 0 && (
                  <div className="mt-3 rounded-lg border border-lime-500/40 bg-lime-50/80 p-3 text-[11px] text-lime-800">
                    <p className="font-semibold text-xs text-lime-700">Data validation flags</p>
                    <ul className="mt-1 space-y-1">
                      {validationNotes.map((note, index) => (
                        <li key={note + index} className="text-[11px]">
                          • {note}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-1 text-[10px] text-lime-600">
                      These flags trim implausible values and highlight sudden jumps to avoid misleading reporting.
                    </p>
                  </div>
                )}
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

                <div className="flex flex-col md:flex-row gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={handleDownloadHistory}>
                    <Download className="w-4 h-4" />
                    Download CSV
                  </Button>
                  <Button
                    className="flex-1 bg-accent hover:bg-accent/90"
                    onClick={() => onViewHistory?.(sensor)}
                  >
                    View History
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
