import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Save } from 'lucide-react';
import { fetchSurveyReadingsForWell, SurveyReadingRow, SurveyWellPoint } from '@/lib/surveyData';
import { downloadDataAsCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';

interface SurveyHistoryModalProps {
  well: SurveyWellPoint | null;
  isOpen: boolean;
  onClose: () => void;
}

export function SurveyHistoryModal({ well, isOpen, onClose }: SurveyHistoryModalProps) {
  const [readings, setReadings] = useState<SurveyReadingRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !well) return;
    let cancelled = false;
    setIsLoading(true);
    fetchSurveyReadingsForWell(well.wellId).then((rows) => {
      if (!cancelled) {
        setReadings(rows);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, well?.wellId]);

  if (!well) return null;

  const handleExport = () => {
    downloadDataAsCsv(
      `${well.wellId}-survey-history.csv`,
      readings.map((r) => ({
        survey: r.surveyName,
        reading_sequence: r.readingSequence,
        depth_meters: r.depthMeters,
        reading_timestamp: r.readingTimestamp,
        latitude: r.latitude,
        longitude: r.longitude,
        surveyor_notes: r.surveyorNotes,
      })),
    );
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
          <div className="fixed inset-0 z-[51] pointer-events-none flex items-center justify-center px-3 py-4 sm:px-5 sm:py-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: 'spring', damping: 24, stiffness: 320 }}
              className="pointer-events-auto flex max-h-[min(92dvh,calc(100dvh-2rem))] w-full max-w-2xl min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:rounded-2xl"
            >
              <div className="gradient-header flex shrink-0 items-center justify-between p-4 text-white sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{well.wellName}</h2>
                    <p className="text-xs text-white/80 uppercase tracking-wider">Survey reading history</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:space-y-4 sm:p-4">
                <div className="flex items-center justify-end border-b border-border/50 pb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs uppercase tracking-wide"
                    onClick={handleExport}
                    disabled={!readings.length}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Export History
                  </Button>
                </div>

                <div className="jal-card max-h-[min(55vh,420px)] space-y-3 overflow-y-auto sm:max-h-[55vh]">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : readings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No survey readings recorded for this well yet.</p>
                  ) : (
                    <table className="w-full border-collapse text-left text-[11px] sm:text-xs">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="py-2 pr-2 font-medium">Survey</th>
                          <th className="py-2 pr-2 font-medium">When</th>
                          <th className="py-2 pr-2 font-medium tabular-nums">#</th>
                          <th className="py-2 pr-2 font-medium tabular-nums">Depth</th>
                          <th className="py-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {readings.map((r) => (
                          <tr key={r.id} className="border-b border-border/50">
                            <td className="py-2 pr-2 align-top">{r.surveyName}</td>
                            <td className="py-2 pr-2 align-top leading-snug">
                              {new Date(r.readingTimestamp).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="py-2 pr-2 tabular-nums align-top">{r.readingSequence ?? '—'}</td>
                            <td className="py-2 pr-2 tabular-nums align-top">{r.depthMeters}m</td>
                            <td className="py-2 align-top text-muted-foreground">{r.surveyorNotes ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
