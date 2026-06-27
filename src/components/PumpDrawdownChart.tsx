import {
  CartesianGrid,
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
  /** When set, X-axis is clamped to this exact window (e.g. rolling 24h). */
  xDomainMs?: [number, number];
}

const startColor = '#22c55e';
const endColor = '#ef4444';

function PumpRunDot({
  cx,
  cy,
  payload,
}: {
  cx?: number;
  cy?: number;
  payload?: {
    isRunStart?: boolean;
    isRunEnd?: boolean;
  };
}) {
  if (cx == null || cy == null || Number.isNaN(cx) || Number.isNaN(cy)) return null;
  const isStart = Boolean(payload?.isRunStart);
  const isEnd = Boolean(payload?.isRunEnd);
  const fill = isStart ? startColor : isEnd ? endColor : '#64748b';
  return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="#fff" strokeWidth={1.5} />;
}

export function PumpDrawdownChart({
  rows,
  segments,
  className = 'h-56 sm:h-64',
  xDomainMs,
}: PumpDrawdownChartProps) {
  const rangeMs = xDomainMs ? xDomainMs[1] - xDomainMs[0] : chartTimeRangeMs(rows);
  const extent = xDomainMs ?? chartTimeExtentMs(rows);
  const extentStartMs = extent?.[0];
  const baseDomain = computeDepthYAxisDomain(rows);
  const yTicks = buildDepthYTicks(baseDomain[0], baseDomain[1], 0.1);
  const yDomain = alignDepthDomainToTicks(baseDomain[0], baseDomain[1], yTicks);
  const invertedYDomain: [number, number] = [yDomain[1], yDomain[0]];

  const xDomain: [number, number] | ['dataMin', 'dataMax'] =
    extent != null ? [extent[0], extent[1]] : ['dataMin', 'dataMax'];

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, left: 18, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            dataKey="timeMs"
            domain={xDomain}
            padding={{ left: 0, right: 0 }}
            tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(ms: number) => formatChartAxisTime(ms, rangeMs, extentStartMs)}
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
            dataKey="depth"
            stroke="rgba(15, 23, 42, 0.32)"
            strokeWidth={2.5}
            dot={<PumpRunDot />}
            connectNulls={false}
            isAnimationActive={false}
            activeDot={<PumpRunDot />}
            name="Pump run"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: startColor }} aria-hidden />
          Green · Pump start reading
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: endColor }} aria-hidden />
          Red · Pump stop reading
        </span>
      </p>
    </div>
  );
}
