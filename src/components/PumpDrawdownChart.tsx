import {
  CartesianGrid,
  Customized,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PumpChartRow, PumpRunSegment } from '@/lib/pumpEvents';
import {
  alignDepthDomainToTicks,
  buildDepthYTicks,
  chartTimeExtentMs,
  chartTimeRangeMs,
  computeDepthYAxisDomain,
  formatChartAxisTime,
} from '@/lib/pumpEvents';

interface PumpDrawdownChartProps {
  rows: PumpChartRow[];
  segments?: PumpRunSegment[];
  className?: string;
}

const startColor = '#ef4444';
const endColor = '#1d4ed8';

function PumpConnector({ segments }: { segments?: PumpRunSegment[] }) {
  if (!segments || !segments.length) return null;
  return (
    <Customized
      component={(props) => {
        const xAxis = props.xAxisMap?.[0];
        const yAxis = props.yAxisMap?.[0];
        if (!xAxis || !yAxis) return null;
        const connectors = segments.map((segment) => {
          const x1 = xAxis.scale(segment.startPoint.timestamp);
          const y1 = yAxis.scale(segment.startDepth);
          const x2 = xAxis.scale(segment.endPoint.timestamp);
          const y2 = yAxis.scale(segment.endDepth);
          if ([x1, y1, x2, y2].some((value) => value == null || Number.isNaN(value))) return null;
          return (
            <line
              key={`connector-${segment.runIndex}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(210, 12%, 70%)"
              strokeWidth={1.5}
              strokeDasharray="4 2"
            />
          );
        });
        return <>{connectors}</>;
      }}
    />
  );
}

export function PumpDrawdownChart({
  rows,
  segments,
  className = 'h-56 sm:h-64',
}: PumpDrawdownChartProps) {
  const rangeMs = chartTimeRangeMs(rows);
  const extent = chartTimeExtentMs(rows);
  const baseDomain = computeDepthYAxisDomain(rows);
  const yTicks = buildDepthYTicks(baseDomain[0], baseDomain[1], 0.1);
  const yDomain = alignDepthDomainToTicks(baseDomain[0], baseDomain[1], yTicks);
  const invertedYDomain: [number, number] = [yDomain[1], yDomain[0]];

  const xDomain: [number, number] | ['dataMin', 'dataMax'] =
    extent != null ? [extent[0], extent[1]] : ['dataMin', 'dataMax'];

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 2, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="timeMs"
            domain={xDomain}
            padding={{ left: 0, right: 0 }}
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(ms: number) => formatChartAxisTime(ms, rangeMs)}
          />
          <YAxis
            domain={invertedYDomain}
            ticks={yTicks}
            allowDecimals
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            width={58}
            tickFormatter={(v: number) =>
              typeof v === 'number' && Number.isFinite(v) ? `${v.toFixed(2)}m` : ''
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { label?: string } | undefined;
              return row?.label ?? '';
            }}
            formatter={(value: number | undefined, name: string, item) => {
              if (value === undefined || value === null) return null;
              const run = (item?.payload as { runIndex?: number | null })?.runIndex;
              const suffix = run != null ? ` · run ${run}` : '';
              const label = name ?? '';
              return [`${value.toFixed(2)} m (${label})${suffix}`, 'Depth'];
            }}
          />
          <Line
            type="linear"
            dataKey="startDepth"
            stroke={startColor}
            strokeWidth={2}
            dot={{ r: 4.5, stroke: '#fff', strokeWidth: 1.5, fill: startColor }}
            connectNulls
            isAnimationActive={false}
            activeDot={{ r: 5, fill: startColor }}
            name="Pump start reading"
          />
          <Line
            type="linear"
            dataKey="endDepth"
            stroke={endColor}
            strokeWidth={2}
            dot={{ r: 3.5, stroke: '#fff', strokeWidth: 1.5, fill: endColor }}
            connectNulls
            isAnimationActive={false}
            activeDot={{ r: 5, fill: endColor }}
            name="Pump stop reading"
          />
          <PumpConnector segments={segments} />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: endColor }} aria-hidden />
          Blue · Pump stop reading
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: startColor }} aria-hidden />
          Red · Pump start reading
        </span>
      </p>
    </div>
  );
}
