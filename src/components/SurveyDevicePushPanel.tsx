import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, CloudUpload, Database, Eraser, Flame, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  buildSurveyDevicePayload,
  FIREBASE_SURVEY_PATH,
  FirebaseSurveyNode,
  SurveyDevicePayload,
  SurveySummary,
} from '@/lib/surveySync';

const WELL_STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  Surveyed: 'bg-emerald-100 text-emerald-800',
  Skipped: 'bg-rose-100 text-rose-700',
};

type VillageGroup = { village: string; district: string; wells: { wellId: string; wellName: string; status?: string; excluded?: boolean }[] };

/** Village -> wells list, for both the Supabase preview and the Firebase view. */
function VillageTree({ groups, emptyText }: { groups: VillageGroup[]; emptyText: string }) {
  if (!groups.length) return <p className="px-3 py-4 text-xs text-muted-foreground">{emptyText}</p>;
  return (
    <div className="max-h-64 overflow-y-auto divide-y divide-border">
      {groups.map((g) => (
        <div key={`${g.village}_${g.district}`} className="px-3 py-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {g.village}
            <span className="font-normal text-muted-foreground">· {g.district}</span>
          </p>
          <ul className="mt-1 space-y-0.5 pl-4">
            {g.wells.map((w) => (
              <li key={w.wellId} className={cn('flex items-center gap-2 text-xs', w.excluded && 'opacity-40 line-through')}>
                <span className="text-foreground">{w.wellName}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{w.wellId}</span>
                {w.status && (
                  <Badge variant="secondary" className={cn('ml-auto h-5 px-1.5 text-[10px]', WELL_STATUS_STYLES[w.status])}>
                    {w.status}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function groupFirebaseNode(node: FirebaseSurveyNode | null): VillageGroup[] {
  if (!node?.villages) return [];
  return Object.values(node.villages)
    .map((v) => ({
      village: v.village,
      district: v.district,
      wells: Object.values(v.wells || {}).sort((a, b) => a.wellId.localeCompare(b.wellId)),
    }))
    .sort((a, b) => a.village.localeCompare(b.village));
}

function groupPayload(payload: SurveyDevicePayload | null, onlyPending: boolean): VillageGroup[] {
  if (!payload) return [];
  const groups = new Map<string, VillageGroup>();
  for (const w of payload.wells) {
    const key = `${w.village}_${w.district}`;
    const group = groups.get(key) ?? { village: w.village, district: w.district, wells: [] };
    group.wells.push({ wellId: w.wellId, wellName: w.wellName, status: w.wellStatus, excluded: onlyPending && w.wellStatus !== 'Pending' });
    groups.set(key, group);
  }
  return Array.from(groups.values()).sort((a, b) => a.village.localeCompare(b.village));
}

type Comparison =
  | { kind: 'empty' }
  | { kind: 'other-survey'; surveyName: string }
  | { kind: 'in-sync' }
  | { kind: 'out-of-date'; added: string[]; removed: string[] };

function compare(payload: SurveyDevicePayload, firebase: FirebaseSurveyNode | null): Comparison {
  if (!firebase?.meta) return { kind: 'empty' };
  if (firebase.meta.surveyId !== payload.survey.surveyId) return { kind: 'other-survey', surveyName: firebase.meta.surveyName };
  const onDevice = new Set(Object.keys(firebase.wells || {}));
  const toSend = new Set(Object.keys(payload.node.wells));
  const added = [...toSend].filter((id) => !onDevice.has(id));
  const removed = [...onDevice].filter((id) => !toSend.has(id));
  return added.length || removed.length ? { kind: 'out-of-date', added, removed } : { kind: 'in-sync' };
}

interface SurveyDevicePushPanelProps {
  surveys: SurveySummary[];
  selectedSurveyId: string | null;
  onSelectSurvey: (surveyId: string) => void;
  /** Live RTDB `latestSurvey/` (null when empty). */
  firebaseNode: FirebaseSurveyNode | null;
  busy: boolean;
  onPush: (surveyId: string, onlyPending: boolean) => void;
  onClear: () => void;
}

/**
 * Supabase -> Firebase: pick a survey, preview exactly what the portable devices will receive,
 * compare it with what RTDB `latestSurvey/` holds right now, then push or clear.
 */
export function SurveyDevicePushPanel({
  surveys,
  selectedSurveyId,
  onSelectSurvey,
  firebaseNode,
  busy,
  onPush,
  onClear,
}: SurveyDevicePushPanelProps) {
  const [onlyPending, setOnlyPending] = useState(false);
  const [payload, setPayload] = useState<SurveyDevicePayload | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const pushable = useMemo(() => surveys.filter((s) => s.status !== 'Cancelled'), [surveys]);

  // `surveys` changes after every action, so the preview reloads with fresh well statuses too.
  useEffect(() => {
    if (!selectedSurveyId) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    setPreviewError(null);
    buildSurveyDevicePayload(selectedSurveyId, { onlyPending })
      .then((p) => !cancelled && setPayload(p))
      .catch((err) => !cancelled && setPreviewError(err instanceof Error ? err.message : String(err)))
      .finally(() => !cancelled && setLoadingPreview(false));
    return () => {
      cancelled = true;
    };
  }, [selectedSurveyId, onlyPending, surveys]);

  const comparison = payload ? compare(payload, firebaseNode) : null;
  const pendingCount = payload?.wells.filter((w) => w.wellStatus === 'Pending').length ?? 0;
  const sendCount = payload?.node.meta.wellCount ?? 0;

  const handlePush = () => {
    if (!payload) return;
    const warnings: string[] = [];
    if (comparison?.kind === 'other-survey') {
      warnings.push(`This replaces "${comparison.surveyName}" on the devices.`);
    }
    if (payload.survey.status === 'Completed') {
      warnings.push(
        'This survey is already Completed. Readings synced while it is on the device will overwrite its stored readings for the same wells.',
      );
    }
    if (warnings.length && !window.confirm(`${warnings.join('\n\n')}\n\nPush anyway?`)) return;
    onPush(payload.survey.surveyId, onlyPending);
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Send survey to portable devices</h4>
          <p className="text-xs text-muted-foreground">
            Supabase survey wells → Firebase <span className="font-mono">{FIREBASE_SURVEY_PATH}/</span> (the device form reads its
            village and well dropdowns from here)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={busy || !firebaseNode}
          onClick={() => {
            if (!window.confirm(`Remove the survey well list from Firebase (${FIREBASE_SURVEY_PATH}/)? Devices will have no wells to pick until a survey is pushed again.`)) return;
            onClear();
          }}
        >
          <Eraser className="h-4 w-4" />
          Clear device list
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedSurveyId ?? undefined} onValueChange={onSelectSurvey} disabled={busy}>
          <SelectTrigger className="h-9 w-[320px] max-w-full text-sm">
            <SelectValue placeholder="Choose a survey to send" />
          </SelectTrigger>
          <SelectContent>
            {pushable.map((s) => (
              <SelectItem key={s.surveyId} value={s.surveyId}>
                {s.surveyName} · {s.status} · {s.surveyedCount}/{s.wellCount}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} disabled={busy} />
          Only wells not surveyed yet {payload && `(${pendingCount} of ${payload.wells.length})`}
        </label>
      </div>

      {previewError && <p className="text-xs text-rose-700">Could not load the survey: {previewError}</p>}

      <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] items-stretch">
        <div className="rounded border border-border">
          <p className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Database className="h-3.5 w-3.5" />
            Will be sent (Supabase)
            {payload && (
              <span className="ml-auto font-normal">
                {sendCount} wells · {payload.node.meta.villageCount} villages
              </span>
            )}
          </p>
          {loadingPreview ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">Loading…</p>
          ) : (
            <VillageTree
              groups={groupPayload(payload, onlyPending)}
              emptyText={selectedSurveyId ? 'This survey has no wells assigned.' : 'Choose a survey to preview its wells.'}
            />
          )}
        </div>

        <div className="hidden lg:flex items-center text-muted-foreground">
          <ArrowRight className="h-5 w-5" />
        </div>

        <div className="rounded border border-border">
          <p className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
            <Flame className="h-3.5 w-3.5" />
            On the devices now (Firebase, live)
            {firebaseNode?.meta && (
              <span className="ml-auto font-normal">
                {firebaseNode.meta.wellCount} wells · {firebaseNode.meta.villageCount} villages
              </span>
            )}
          </p>
          {firebaseNode?.meta && (
            <p className="border-b border-border px-3 py-1.5 text-xs">
              <span className="font-medium text-foreground">{firebaseNode.meta.surveyName}</span>{' '}
              <span className="font-mono text-muted-foreground">{firebaseNode.meta.surveyId}</span>
              <span className="text-muted-foreground"> · pushed {new Date(firebaseNode.meta.pushedAt).toLocaleString()}</span>
            </p>
          )}
          <VillageTree groups={groupFirebaseNode(firebaseNode)} emptyText="Empty — no survey has been pushed." />
        </div>
      </div>

      {payload && comparison && (
        <div
          className={cn(
            'flex items-start gap-2 rounded px-3 py-2 text-xs',
            comparison.kind === 'in-sync' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900',
          )}
        >
          {comparison.kind === 'in-sync' ? (
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {comparison.kind === 'empty' && 'Nothing is on the devices. Push to start this survey.'}
            {comparison.kind === 'other-survey' && `The devices hold a different survey (“${comparison.surveyName}”). Pushing replaces it.`}
            {comparison.kind === 'in-sync' && 'The devices already have exactly this well list.'}
            {comparison.kind === 'out-of-date' &&
              `The devices have an older list of this survey${comparison.added.length ? ` — ${comparison.added.length} well(s) missing on device` : ''}${
                comparison.removed.length ? ` — ${comparison.removed.length} well(s) on device no longer in this list` : ''
              }. Push again to update.`}
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          className="gap-2 bg-teal-600 hover:bg-teal-700 text-white"
          disabled={busy || loadingPreview || !payload || sendCount === 0 || payload.survey.status === 'Cancelled'}
          onClick={handlePush}
        >
          <CloudUpload className="h-4 w-4" />
          {comparison?.kind === 'in-sync' ? 'Push again' : 'Push to devices'}
          {sendCount > 0 && ` (${sendCount} wells)`}
        </Button>
      </div>
    </Card>
  );
}
