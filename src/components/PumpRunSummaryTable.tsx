import { PumpRunSegment } from '@/lib/pumpEvents';

interface PumpRunSummaryTableProps {
  segments: PumpRunSegment[];
}

export function PumpRunSummaryTable({ segments }: PumpRunSummaryTableProps) {
  if (!segments.length) {
    return (
      <p className="text-xs text-muted-foreground">No pump runs detected in the selected window.</p>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border bg-card/70 text-[11px]">
      <table className="w-full border-collapse text-left">
        <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Run</th>
            <th className="px-3 py-2">Start</th>
            <th className="px-3 py-2">End</th>
            <th className="px-3 py-2 text-right">Drawdown (m)</th>
            <th className="px-3 py-2 text-right">Duration (min)</th>
            <th className="px-3 py-2 text-right">Rate (m/min)</th>
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => (
            <tr key={`run-${segment.runIndex}`} className="border-t border-border/50">
              <td className="px-3 py-2 font-semibold text-foreground">#{segment.runIndex}</td>
              <td className="px-3 py-2">{segment.startLabel}</td>
              <td className="px-3 py-2">{segment.endLabel}</td>
              <td className="px-3 py-2 text-right text-foreground">
                {Math.max(0, segment.drawdown).toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right text-foreground">
                {segment.durationMin.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right text-foreground">
                {segment.drawdownRatePerMin.toFixed(3)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
