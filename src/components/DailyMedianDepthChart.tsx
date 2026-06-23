import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { MedianChartRow } from '@/lib/pumpEvents';
import {
  alignDepthDomainToTicks,
  buildDepthYTicks,
  chartTimeExtentMs,
  chartTimeRangeMs,
  computeDepthYAxisDomain,
  formatChartAxisTime,
} from '@/lib/pumpEvents';

interface DailyMedianDepthChartProps {
  rows: MedianChartRow[];
  className?: string;
}

export function DailyMedianDepthChart({ rows, className = 'h-56 sm:h-64' }: DailyMedianDepthChartProps) {
  const chartRows = rows.map((r) => ({ ...r, depth: r.depth as number | null }));
  const rangeMs = chartTimeRangeMs(chartRows);
  const extent = chartTimeExtentMs(chartRows);
  const extentStartMs = extent?.[0];
  const baseDomain = computeDepthYAxisDomain(chartRows);
  const yTicks = buildDepthYTicks(baseDomain[0], baseDomain[1], 0.1);
  const yDomain = alignDepthDomainToTicks(baseDomain[0], baseDomain[1], yTicks);
  const invertedYDomain: [number, number] = [yDomain[1], yDomain[0]];

  const xDomain: [number, number] | ['dataMin', 'dataMax'] =
    extent != null ? [extent[0], extent[1]] : ['dataMin', 'dataMax'];

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartRows} margin={{ top: 8, right: 12, left: 18, bottom: 4 }}>
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
            formatter={(value: number | undefined, _name, item) => {
              if (value === undefined || value === null) return null;
              const count = (item?.payload as { sampleCount?: number })?.sampleCount;
              const suffix = count != null ? ` · ${count} sample${count === 1 ? '' : 's'}` : '';
              return [`${value.toFixed(2)} m (daily median)${suffix}`, 'Depth'];
            }}
          />
          <Line
            type="monotone"
            dataKey="depth"
            stroke="#0d9488"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#0d9488', stroke: '#fff', strokeWidth: 1.5 }}
            connectNulls
            isAnimationActive={false}
            activeDot={{ r: 5, fill: '#0d9488', stroke: '#fff', strokeWidth: 1.5 }}
            name="Daily median"
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Smooth line shows the daily median groundwater depth (non-pump installation).
      </p>
    </div>
  );
}
