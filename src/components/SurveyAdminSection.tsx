import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudDownload, CloudUpload, Eraser, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  clearFirebaseSurvey,
  fetchFirebaseSurveyMeta,
  fetchSurveys,
  FIREBASE_SURVEY_PATH,
  FirebaseSurveyMeta,
  PortableSyncResult,
  pushSurveyToFirebase,
  setSurveyStatus,
  SurveySummary,
  syncPortableReadings,
} from '@/lib/surveySync';

type WellOption = { wellId: string; wellName: string; village: string };

const STATUS_STYLES: Record<string, string> = {
  Planned: 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-amber-100 text-amber-800',
  Completed: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-rose-100 text-rose-700',
};

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

function NewSurveyForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [surveyor, setSurveyor] = useState('');
  const [wells, setWells] = useState<WellOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from('well_master')
      .select('well_id, well_name, location_master ( village_city )')
      .eq('status', 'Active')
      .order('well_id')
      .then(({ data }) =>
        setWells(
          (data || []).map((w: any) => ({
            wellId: w.well_id,
            wellName: w.well_name ?? w.well_id,
            village: w.location_master?.village_city ?? '—',
          })),
        ),
      );
  }, []);

  const visibleWells = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return wells;
    return wells.filter((w) => `${w.wellId} ${w.wellName} ${w.village}`.toLowerCase().includes(q));
  }, [wells, filter]);

  const toggle = (wellId: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(wellId)) next.delete(wellId);
      else next.add(wellId);
      return next;
    });

  const create = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('survey_master')
        .insert({
          survey_name: name.trim(),
          survey_type: 'seasonal',
          survey_year: new Date().getFullYear(),
          organization_name: organization.trim(),
          surveyor_name: surveyor.trim() || null,
          status: 'Planned',
        })
        .select('survey_id')
        .single();
      if (error) throw error;

      const { error: wellError } = await supabase
        .from('survey_well')
        .insert(Array.from(selected).map((wellId) => ({ survey_id: data.survey_id, well_id: wellId })));
      if (wellError) throw wellError;

      toast({ title: 'Survey created', description: `${name} with ${selected.size} well(s).` });
      onCreated();
    } catch (err) {
      toast({ title: 'Could not create survey', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-3 border-teal-200">
      <h4 className="font-semibold text-sm">New survey</h4>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Survey name (e.g. Post-Monsoon 2026)" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
        <Input placeholder="Organization (e.g. Krushivikas)" value={organization} onChange={(e) => setOrganization(e.target.value)} disabled={busy} />
        <Input placeholder="Surveyor (optional)" value={surveyor} onChange={(e) => setSurveyor(e.target.value)} disabled={busy} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Wells in this survey — {selected.size} selected</p>
          <Input className="h-8 max-w-[220px] text-xs" placeholder="Filter wells / villages" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        <div className="max-h-56 overflow-y-auto rounded border border-border divide-y divide-border">
          {visibleWells.map((w) => (
            <label key={w.wellId} className="flex items-center gap-3 px-3 py-1.5 text-xs cursor-pointer hover:bg-muted/50">
              <input type="checkbox" checked={selected.has(w.wellId)} onChange={() => toggle(w.wellId)} disabled={busy} />
              <span className="font-medium text-foreground">{w.wellName}</span>
              <span className="font-mono text-muted-foreground">{w.wellId}</span>
              <span className="ml-auto text-muted-foreground">{w.village}</span>
            </label>
          ))}
          {visibleWells.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">No wells match.</p>}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button
          onClick={create}
          disabled={busy || !name.trim() || !organization.trim() || selected.size === 0}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          Create survey
        </Button>
      </div>
    </Card>
  );
}

/**
 * Admin → Surveys. Supabase is the source of truth for surveys; these controls move data to and
 * from Firebase (see src/lib/surveySync.ts):
 *  - Push to device: Supabase survey wells -> RTDB latestSurvey/ (feeds the portable form dropdowns)
 *  - Clear device list: empties RTDB latestSurvey/
 *  - Sync portable readings: RTDB readings/Porta-* -> survey_reading
 *  - Mark completed: moves the dashboard's "Latest Survey Snapshot" to this survey
 */
export function SurveyAdminSection() {
  const [surveys, setSurveys] = useState<SurveySummary[]>([]);
  const [firebaseMeta, setFirebaseMeta] = useState<FirebaseSurveyMeta | null>(null);
  const [lastSync, setLastSync] = useState<PortableSyncResult | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showNewSurvey, setShowNewSurvey] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, meta] = await Promise.all([fetchSurveys(), fetchFirebaseSurveyMeta().catch(() => null)]);
      setSurveys(list);
      setFirebaseMeta(meta);
    } catch (err) {
      toast({ title: 'Could not load surveys', description: errorMessage(err), variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await action();
      await load();
    } catch (err) {
      toast({ title: 'Action failed', description: errorMessage(err), variant: 'destructive' });
    } finally {
      setBusyAction(null);
    }
  };

  const busy = busyAction !== null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <Button
          className="gap-2 bg-teal-700 hover:bg-teal-800"
          disabled={busy}
          onClick={() =>
            run('sync', async () => {
              const result = await syncPortableReadings();
              setLastSync(result);
              toast({
                title: 'Portable readings synced',
                description: `${result.saved} saved, ${result.unchanged} already up to date, ${result.unmatched.length} unmatched${
                  result.completedSurveyIds.length ? ` · completed: ${result.completedSurveyIds.join(', ')}` : ''
                }.`,
              });
            })
          }
        >
          <CloudDownload className="h-4 w-4" />
          Sync portable readings (Firebase → Supabase)
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          disabled={busy || !firebaseMeta}
          onClick={() => {
            if (!window.confirm(`Remove the survey well list from Firebase (${FIREBASE_SURVEY_PATH}/)? Devices will have no wells to pick until a survey is pushed again.`)) return;
            run('clear', async () => {
              await clearFirebaseSurvey();
              toast({ title: 'Firebase survey list cleared' });
            });
          }}
        >
          <Eraser className="h-4 w-4" />
          Clear device list in Firebase
        </Button>
        <Button variant="outline" className="gap-2" disabled={busy} onClick={() => setShowNewSurvey((v) => !v)}>
          <Plus className="h-4 w-4" />
          New survey
        </Button>
        <Button variant="ghost" className="gap-2" disabled={busy} onClick={() => run('reload', async () => {})}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {showNewSurvey && (
        <NewSurveyForm
          onCancel={() => setShowNewSurvey(false)}
          onCreated={() => {
            setShowNewSurvey(false);
            load();
          }}
        />
      )}

      <Card className="p-4 space-y-1 bg-muted/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          On the portable devices now (Firebase {FIREBASE_SURVEY_PATH}/)
        </p>
        {firebaseMeta ? (
          <p className="text-sm">
            <span className="font-semibold">{firebaseMeta.surveyName}</span>{' '}
            <span className="font-mono text-xs text-muted-foreground">{firebaseMeta.surveyId}</span> —{' '}
            {firebaseMeta.wellCount} wells in {firebaseMeta.villageCount} villages · pushed{' '}
            {new Date(firebaseMeta.pushedAt).toLocaleString()}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Empty — no survey has been pushed.</p>
        )}
      </Card>

      {lastSync && lastSync.unmatched.length > 0 && (
        <Card className="p-4 space-y-2 border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">
            {lastSync.unmatched.length} portable well(s) not saved — the well is not in the pushed survey or any In Progress survey
          </p>
          <ul className="text-xs text-amber-900 space-y-0.5">
            {lastSync.unmatched.map((u) => (
              <li key={`${u.deviceId}_${u.wellId}`}>
                <span className="font-mono">{u.wellId}</span> at “{u.siteName || '—'}” from {u.deviceId}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Survey</th>
              <th className="py-2 pr-3 font-medium">Organization</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 pr-3 font-medium">Wells surveyed</th>
              <th className="py-2 pr-3 font-medium">Dates</th>
              <th className="py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {surveys.map((s) => {
              const onDevice = firebaseMeta?.surveyId === s.surveyId;
              return (
                <tr key={s.surveyId} className="border-b border-border/60 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-foreground">{s.surveyName}</p>
                    <p className="font-mono text-muted-foreground">{s.surveyId}</p>
                  </td>
                  <td className="py-2 pr-3">{s.organizationName}</td>
                  <td className="py-2 pr-3">
                    <Badge className={STATUS_STYLES[s.status] ?? ''} variant="secondary">{s.status}</Badge>
                    {onDevice && <Badge variant="outline" className="ml-1">On device</Badge>}
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{s.surveyedCount} / {s.wellCount}</td>
                  <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                    {s.actualStartDate ?? '—'} → {s.actualEndDate ?? '—'}
                  </td>
                  <td className="py-2 text-right whitespace-nowrap space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      disabled={busy || s.status === 'Cancelled' || s.wellCount === 0}
                      onClick={() =>
                        run(`push-${s.surveyId}`, async () => {
                          const meta = await pushSurveyToFirebase(s.surveyId);
                          toast({
                            title: 'Pushed to Firebase',
                            description: `${meta.wellCount} wells in ${meta.villageCount} villages are now on the device form.`,
                          });
                        })
                      }
                    >
                      <CloudUpload className="h-3.5 w-3.5" />
                      Push to device
                    </Button>
                    {s.status !== 'Completed' && s.status !== 'Cancelled' && (
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={busy}
                        onClick={() =>
                          run(`complete-${s.surveyId}`, async () => {
                            await setSurveyStatus(s.surveyId, 'Completed');
                            toast({ title: 'Survey completed', description: 'The dashboard snapshot now shows this survey.' });
                          })
                        }
                      >
                        Mark completed
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
            {surveys.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-muted-foreground">No surveys yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
