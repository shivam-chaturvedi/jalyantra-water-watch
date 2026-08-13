import { describe, expect, it } from 'vitest';
import {
  buildPumpRunSegments,
  segmentIntoPumpEvents,
  summarize24h,
  type PumpRunSegment,
} from '@/lib/pumpEvents';
import type { SensorHistoryPoint } from '@/lib/data';

function point(id: string, minute: number, depth: number, online = 'session-a'): SensorHistoryPoint {
  return {
    id,
    depth,
    collectedDate: '2026-07-18',
    timestamp: Date.UTC(2026, 6, 18, 10, minute),
    deviceOnlineSince: online,
  };
}

function runs(points: SensorHistoryPoint[]): PumpRunSegment[] {
  return buildPumpRunSegments(segmentIntoPumpEvents(points));
}

describe('pump run detection', () => {
  it('counts only sessions with verified drawdown', () => {
    const segments = runs([
      point('drawdown-1', 0, 7.4),
      point('drawdown-2', 8, 7.46),
      point('recovery-1', 40, 7.55, 'session-b'),
      point('recovery-2', 50, 7.42, 'session-b'),
      point('flat-1', 80, 7.5, 'session-c'),
      point('flat-2', 90, 7.51, 'session-c'),
    ]);

    expect(segments).toHaveLength(1);
    expect(segments[0].drawdown).toBeCloseTo(0.06);
  });

  it('summarizes pump runs from the same validated segments', () => {
    const summary = summarize24h([
      point('drawdown-1', 0, 7.4),
      point('drawdown-2', 8, 7.46),
      point('recovery-1', 40, 7.55, 'session-b'),
      point('recovery-2', 50, 7.42, 'session-b'),
    ]);

    expect(summary.pumpRuns).toBe(1);
    expect(summary.maxDrawdown).toBeCloseTo(0.06);
  });
});
