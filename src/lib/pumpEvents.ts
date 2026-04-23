import type { RtdbCsvRow, SensorHistoryPoint } from '@/lib/data';

/** No reading for this long ⇒ pump powered off → start a new pumping event. */
export const DEFAULT_PUMP_GAP_MS = 20 * 60 * 1000;

/** Trailing moving-average window (3–5 samples) per pump run for chart noise reduction. */
export const PUMP_CHART_MA_WINDOW = 5;

/** Depth step for plotted points after smoothing (display only; keep 0.02–0.05). */
export const PUMP_CHART_DEPTH_DISPLAY_STEP = 0.04;

const Y_AXIS_PAD_M = 0.25;
const Y_AXIS_MIN_SPAN_M = 0.5;

const TWENTY_FOUR_H_MS = 24 * 60 * 60 * 1000;

export function filterPointsSince(points: SensorHistoryPoint[], sinceMs: number): SensorHistoryPoint[] {
  return points
    .filter((p) => Number.isFinite(p.timestamp) && p.timestamp >= sinceMs)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function samePumpRun(prev: SensorHistoryPoint, cur: SensorHistoryPoint, gapMs: number): boolean {
  if (cur.timestamp - prev.timestamp > gapMs) return false;
  const a = prev.deviceOnlineSince?.trim();
  const b = cur.deviceOnlineSince?.trim();
  if (a && b && a !== b) return false;
  return true;
}

export function segmentIntoPumpEvents(
  sortedPoints: SensorHistoryPoint[],
  gapMs: number = DEFAULT_PUMP_GAP_MS,
): SensorHistoryPoint[][] {
  if (sortedPoints.length === 0) return [];
  const events: SensorHistoryPoint[][] = [];
  let current: SensorHistoryPoint[] = [sortedPoints[0]];
  for (let i = 1; i < sortedPoints.length; i++) {
    const prev = sortedPoints[i - 1];
    const cur = sortedPoints[i];
    if (!samePumpRun(prev, cur, gapMs)) {
      events.push(current);
      current = [cur];
    } else {
      current.push(cur);
    }
  }
  events.push(current);
  return events;
}

export type PumpChartRow = {
  timeMs: number;
  depth?: number | null;
  label: string;
  runIndex: number | null;
  /** Per run: first / last sample markers for UX (only on depth rows). */
  isRunStart?: boolean;
  isRunEnd?: boolean;
  startDepth?: number | null;
  endDepth?: number | null;
};

/** Tooltip / legend text: prefer Firebase `collectedDateTime`, then `collectedDate`, then locale from instant. */
export function chartPointLabel(p: SensorHistoryPoint): string {
  const dt = p.collectedDateTime?.trim();
  if (dt) {
    const ms = Date.parse(dt);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return dt;
  }
  const raw = p.collectedDate?.trim();
  if (raw) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const ms = Date.parse(`${raw}T12:00:00`);
      if (Number.isFinite(ms)) {
        return new Date(ms).toLocaleDateString(undefined, { dateStyle: 'medium' });
      }
      return raw;
    }
    const ms = Date.parse(raw);
    if (Number.isFinite(ms)) {
      return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    }
    return raw;
  }
  return new Date(p.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** X-axis tick: include date when the series spans more than ~36h. */
export function formatChartAxisTime(ms: number, rangeMs: number): string {
  const d = new Date(ms);
  if (!Number.isFinite(d.getTime())) return '';
  if (rangeMs > 36 * 60 * 60 * 1000) {
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function trailingMovingAverage(values: number[], windowSize: number): number[] {
  const w = Math.max(1, Math.floor(windowSize));
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

export function roundDepthForChartDisplay(m: number, step: number = PUMP_CHART_DEPTH_DISPLAY_STEP): number {
  return Math.round(m / step) * step;
}

/**
 * Drop trailing samples that share the same display-rounded smoothed depth as the final reading.
 * Otherwise ~1 min samples after drawdown stabilizes draw a long flat tail to "now" even though the
 * level is unchanged — looks like the line extends past when pumping mattered. Metrics still use full runs.
 */
function trimTerminalDepthPlateauForChart(
  ev: SensorHistoryPoint[],
  smoothed: number[],
): { ev: SensorHistoryPoint[]; smoothed: number[] } {
  const n = ev.length;
  if (n <= 1) return { ev, smoothed };
  const terminal = smoothed[n - 1]!;
  let firstTerminal = n - 1;
  while (firstTerminal > 0 && smoothed[firstTerminal - 1] === terminal) firstTerminal--;
  if (firstTerminal === 0) return { ev, smoothed };
  return {
    ev: ev.slice(0, firstTerminal + 1),
    smoothed: smoothed.slice(0, firstTerminal + 1),
  };
}

interface PumpRunChartOptions {
  windowSize?: number;
  displayStep?: number;
}

export type PumpRunSegment = {
  runIndex: number;
  startPoint: SensorHistoryPoint;
  endPoint: SensorHistoryPoint;
  startLabel: string;
  endLabel: string;
  startDepth: number;
  endDepth: number;
  drawdown: number;
  durationMin: number;
  drawdownRatePerMin: number;
};

function smoothEventForChart(
  ev: SensorHistoryPoint[],
  windowSize: number,
  displayStep: number,
) {
  const depths = ev.map((p) => p.depth);
  const smoothedFull = trailingMovingAverage(depths, windowSize).map((d) =>
    roundDepthForChartDisplay(d, displayStep),
  );
  return trimTerminalDepthPlateauForChart(ev, smoothedFull);
}

export function buildPumpRunSegments(
  events: SensorHistoryPoint[][],
  options?: PumpRunChartOptions,
): PumpRunSegment[] {
  const windowSize = Math.min(5, Math.max(3, options?.windowSize ?? PUMP_CHART_MA_WINDOW));
  const displayStep = options?.displayStep ?? PUMP_CHART_DEPTH_DISPLAY_STEP;
  const segments: PumpRunSegment[] = [];
  events.forEach((ev, idx) => {
    if (!ev.length) return;
    const { ev: evChart, smoothed } = smoothEventForChart(ev, windowSize, displayStep);
    if (!evChart.length) return;
    const startPoint = evChart[0];
    const endPoint = evChart[evChart.length - 1];
    const stats = statsForEvent(ev);
    segments.push({
      runIndex: idx + 1,
      startPoint,
      endPoint,
      startLabel: chartPointLabel(startPoint),
      endLabel: chartPointLabel(endPoint),
      startDepth: smoothed[0] as number,
      endDepth: smoothed[smoothed.length - 1] as number,
      drawdown: stats.drawdown,
      durationMin: stats.durationMin,
      drawdownRatePerMin: stats.drawdownRatePerMin,
    });
  });
  return segments;
}

export function pumpRunSegmentsToChartRows(segments: PumpRunSegment[]): PumpChartRow[] {
  const rows: PumpChartRow[] = [];
  segments.forEach((segment, idx) => {
    const startTime = segment.startPoint.timestamp;
    const endTime = segment.endPoint.timestamp;
    rows.push({
      timeMs: startTime,
      depth: segment.startDepth,
      startDepth: segment.startDepth,
      label: segment.startLabel,
      runIndex: segment.runIndex,
      isRunStart: true,
    });
    rows.push({
      timeMs: endTime,
      depth: segment.endDepth,
      endDepth: segment.endDepth,
      label: segment.endLabel,
      runIndex: segment.runIndex,
      isRunEnd: true,
    });
    if (idx < segments.length - 1) {
      const nextStart = segments[idx + 1].startPoint.timestamp;
      rows.push({
        timeMs: Math.floor((endTime + nextStart) / 2),
        depth: null,
        label: '',
        runIndex: null,
      });
    }
  });
  return rows;
}

/**
 * Pump drawdown chart: per-run trailing moving average + display rounding. Gaps between runs preserved (recovery not shown).
 * Metrics (drawdown, rates) should continue to use raw points via `summarize24h` / `statsForEvent`.
 */
export function buildPumpDrawdownChartRows(
  events: SensorHistoryPoint[][],
  options?: { windowSize?: number; displayStep?: number },
): PumpChartRow[] {
  const segments = buildPumpRunSegments(events, options);
  return pumpRunSegmentsToChartRows(segments);
}

/** Raw depths (no smoothing) — prefer `buildPumpDrawdownChartRows` for UI line charts. */
export function buildDisconnectedChartRows(events: SensorHistoryPoint[][]): PumpChartRow[] {
  const rows: PumpChartRow[] = [];
  events.forEach((ev, idx) => {
    ev.forEach((p) => {
      rows.push({
        timeMs: p.timestamp,
        depth: p.depth,
        label: chartPointLabel(p),
        runIndex: idx + 1,
      });
    });
    if (idx < events.length - 1) {
      const last = ev[ev.length - 1];
      const nextFirst = events[idx + 1][0];
      rows.push({
        timeMs: (last.timestamp + nextFirst.timestamp) / 2,
        depth: null,
        label: '',
        runIndex: null,
      });
    }
  });
  return rows;
}

export function computeDepthYAxisDomain(
  rows: { depth: number | null }[],
  padM: number = Y_AXIS_PAD_M,
  minSpanM: number = Y_AXIS_MIN_SPAN_M,
): [number, number] {
  const depths = rows.filter((r) => r.depth != null).map((r) => r.depth as number);
  if (depths.length === 0) return [0, minSpanM];
  const minD = Math.min(...depths);
  const maxD = Math.max(...depths);
  let low = minD - padM;
  let high = maxD + padM;
  if (high - low < minSpanM) {
    const mid = (minD + maxD) / 2;
    low = mid - minSpanM / 2;
    high = mid + minSpanM / 2;
  }
  return [low, high];
}

function niceDepthTickStep(range: number, targetTickCount: number): number {
  if (range <= 0 || !Number.isFinite(range)) return 0.1;
  const rough = range / Math.max(2, targetTickCount - 1);
  const exp = Math.floor(Math.log10(rough));
  const frac = rough / 10 ** exp;
  let nf: number;
  if (frac <= 1) nf = 1;
  else if (frac <= 2) nf = 2;
  else if (frac <= 5) nf = 5;
  else nf = 10;
  return nf * 10 ** exp;
}

/** Evenly spaced depth ticks (e.g. 3.2, 3.4, 3.6) for readable Y-axis. */
export function buildDepthYTicks(low: number, high: number, step = 0.1): number[] {
  if (!Number.isFinite(low) || !Number.isFinite(high)) return [0, 1];
  if (low >= high) return [low, low + step];
  const normalizedStep = Math.max(0.01, step);
  const start = Math.floor(low / normalizedStep) * normalizedStep;
  const ticks: number[] = [];
  let t = start;
  let guard = 0;
  while (t <= high + normalizedStep * 0.0001 && guard++ < 128) {
    ticks.push(Math.round(t * 100) / 100);
    t += normalizedStep;
  }
  if (ticks.length === 0) return [low, high];
  return ticks;
}

/** Align numeric domain to include all tick marks (avoids Recharts odd tick ordering). */
export function alignDepthDomainToTicks(low: number, high: number, ticks: number[]): [number, number] {
  if (!ticks.length) return [low, high];
  return [Math.min(low, ticks[0]!), Math.max(high, ticks[ticks.length - 1]!)];
}

/** X extent from real samples only — line does not imply data beyond last timestamp. */
export function chartTimeExtentMs(rows: { timeMs: number; depth: number | null }[]): [number, number] | null {
  const withDepth = rows.filter((r) => r.depth != null && Number.isFinite(r.depth as number));
  if (!withDepth.length) return null;
  const times = withDepth.map((r) => r.timeMs);
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  if (tMin === tMax) {
    const pad = 60_000;
    return [tMin - pad, tMax + pad];
  }
  const span = tMax - tMin;
  const leftPad = Math.min(120_000, Math.max(30_000, span * 0.02));
  const rightPad = Math.min(45_000, Math.max(5_000, span * 0.012));
  return [tMin - leftPad, tMax + rightPad];
}

export type PumpEventStats = {
  drawdown: number;
  durationMin: number;
  drawdownRatePerMin: number;
};

export function statsForEvent(ev: SensorHistoryPoint[]): PumpEventStats {
  if (ev.length === 0) {
    return { drawdown: 0, durationMin: 0, drawdownRatePerMin: 0 };
  }
  const initial = ev[0].depth;
  const finalD = ev[ev.length - 1].depth;
  const drawdown = finalD - initial;
  let durationMs = Math.max(0, ev[ev.length - 1].timestamp - ev[0].timestamp);
  let durationMin = durationMs / (60 * 1000);
  if (durationMin <= 0) {
    const firstU = ev[0].uptimeSeconds;
    const lastU = ev[ev.length - 1].uptimeSeconds;
    if (typeof firstU === 'number' && typeof lastU === 'number' && lastU >= firstU) {
      durationMin = (lastU - firstU) / 60;
    } else if (typeof lastU === 'number' && lastU > 0) {
      durationMin = lastU / 60;
    }
  }
  const drawdownRatePerMin = durationMin > 0 ? drawdown / durationMin : 0;
  return { drawdown, durationMin, drawdownRatePerMin };
}

export type Summary24h = {
  currentWaterLevel: number | null;
  pumpRuns: number;
  maxDrawdown: number;
  avgDrawdownRate: number;
  /** Runs with at least two samples (rate is defined). */
  runsWithDuration: number;
};

export function summarize24h(points: SensorHistoryPoint[]): Summary24h {
  if (points.length === 0) {
    return { currentWaterLevel: null, pumpRuns: 0, maxDrawdown: 0, avgDrawdownRate: 0, runsWithDuration: 0 };
  }
  const events = segmentIntoPumpEvents(points);
  const stats = events.map(statsForEvent);
  const drawdowns = stats.map((s) => Math.max(0, s.drawdown));
  const maxDrawdown = drawdowns.length ? Math.max(...drawdowns) : 0;
  const withDuration = stats.filter((s) => s.durationMin > 0);
  const avgDrawdownRate = withDuration.length
    ? withDuration.reduce((a, s) => a + s.drawdownRatePerMin, 0) / withDuration.length
    : 0;
  const last = points[points.length - 1];
  return {
    currentWaterLevel: last.depth,
    pumpRuns: events.length,
    maxDrawdown,
    avgDrawdownRate,
    runsWithDuration: withDuration.length,
  };
}

/** History points in the last 24h, or a single synthetic point from the latest sync when in range. */
export function getPointsLast24h(sensor: {
  history: SensorHistoryPoint[];
  depth: number;
  collectedDate: string;
  lastSync: string;
  lastCollectedDateTime?: string;
  latestRtdbExport?: RtdbCsvRow;
}): SensorHistoryPoint[] {
  const since = Date.now() - TWENTY_FOUR_H_MS;
  const fromHistory = filterPointsSince(sensor.history, since);
  if (fromHistory.length > 0) return fromHistory;

  const lastMs = new Date(sensor.lastSync).getTime();
  if (Number.isFinite(lastMs) && lastMs >= since) {
    return [
      {
        id: `${sensor.lastSync}-current`,
        depth: sensor.depth,
        collectedDate: sensor.collectedDate,
        ...(sensor.lastCollectedDateTime?.trim()
          ? { collectedDateTime: sensor.lastCollectedDateTime.trim() }
          : {}),
        timestamp: lastMs,
        ...(sensor.latestRtdbExport ? { rtdbExport: { ...sensor.latestRtdbExport } } : {}),
      },
    ];
  }
  return [];
}

export function formatClockLabel(ms: number): string {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function chartTimeRangeMs(rows: { timeMs: number; depth: number | null }[]): number {
  const withDepth = rows.filter((r) => r.depth != null).map((r) => r.timeMs);
  if (withDepth.length < 2) return 0;
  return Math.max(...withDepth) - Math.min(...withDepth);
}
