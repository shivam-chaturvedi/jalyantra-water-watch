import { SensorReading } from '@/lib/data';
import {
  buildPumpRunSegments,
  filterPointsSince,
  pumpRunSegmentsToChartRows,
  segmentIntoPumpEvents,
} from '@/lib/pumpEvents';
import { PumpDrawdownChart } from '@/components/PumpDrawdownChart';
import { PumpRunSummaryTable } from '@/components/PumpRunSummaryTable';

const FOCUS_WINDOW_MS = 24 * 60 * 60 * 1000;

interface FocusedDevicePanelProps {
  sensor: SensorReading | null;
}

export function FocusedDevicePanel({ sensor }: FocusedDevicePanelProps) {
  if (!sensor) return null;

  const since = Date.now() - FOCUS_WINDOW_MS;
  const points24h = filterPointsSince(sensor.history, since);
  const events = segmentIntoPumpEvents(points24h);
  const segments = buildPumpRunSegments(events);
  const chartRows = pumpRunSegmentsToChartRows(segments);

  const drawdowns = segments.map((segment) => Math.max(0, segment.drawdown));
  const maxDrawdown = drawdowns.length ? Math.max(...drawdowns) : 0;
  const validRates = segments.map((segment) => segment.drawdownRatePerMin);
  const avgRate = validRates.length
    ? validRates.reduce((sum, rate) => sum + rate, 0) / validRates.length
    : 0;

  return (
    <div className="jal-card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Device 05 Focus · Nagpur 05
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Dedicated 24-hour pump drawdown overview for the most reliable device.
          </p>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-semibold text-accent border border-accent/30 rounded-full">
          Filtered view
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current depth</p>
          <p className="text-sm font-bold text-foreground">{sensor.depth}m</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pump runs</p>
          <p className="text-sm font-bold text-foreground tabular-nums">{segments.length}</p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Max drawdown</p>
          <p className="text-sm font-bold text-foreground">
            {segments.length ? `${maxDrawdown.toFixed(2)}m` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg rate</p>
          <p className="text-sm font-bold text-foreground">
            {segments.length ? `${avgRate.toFixed(3)} m/min` : '—'}
          </p>
        </div>
      </div>

      {segments.length ? (
        <PumpDrawdownChart rows={chartRows} segments={segments} className="h-52 sm:h-64" />
      ) : (
        <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-border bg-muted/10 text-sm text-muted-foreground">
          No pump runs recorded in the last 24 hours for this device.
        </div>
      )}

      <PumpRunSummaryTable segments={segments} />

      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Alerts / Notifications</p>
        <p className="text-[11px]">No alerts at this time. Alerts will appear here when water levels exceed thresholds or pump anomalies are detected.</p>
      </div>
    </div>
  );
}
