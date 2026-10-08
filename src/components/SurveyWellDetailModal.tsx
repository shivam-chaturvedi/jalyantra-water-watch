import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Droplets, CalendarClock, History, FileBarChart } from 'lucide-react';
import { SurveyWellPoint } from '@/lib/surveyData';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SurveyWellDetailModalProps {
  well: SurveyWellPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onViewHistory?: (well: SurveyWellPoint) => void;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function SurveyWellDetailModal({ well, isOpen, onClose, onViewHistory }: SurveyWellDetailModalProps) {
  if (!well) return null;

  const changeLabel =
    well.changeSincePrevious == null
      ? 'No previous survey to compare'
      : `${well.changeSincePrevious > 0 ? '+' : ''}${well.changeSincePrevious.toFixed(2)}m since previous survey`;

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

          <div className="fixed inset-0 z-50 flex items-center justify-end px-4 py-6 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[92vh] pointer-events-auto"
            >
              <div className="gradient-header p-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{well.wellName}</h2>
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <MapPin className="w-3 h-3" />
                        <span>{well.village}, {well.district}</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 120px)' }}>
                <div className="jal-card">
                  <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-accent" />
                    Well Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Well name</p>
                      <p className="font-medium text-foreground">{well.wellName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Village</p>
                      <p className="font-medium text-foreground">{well.village}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">District</p>
                      <p className="font-medium text-foreground">{well.district}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pump connected</p>
                      <p className="font-medium text-foreground">
                        {well.pumpAttached == null ? '—' : well.pumpAttached ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {well.pumpAttached && (
                      <div>
                        <p className="text-xs text-muted-foreground">Pump type</p>
                        <p className="font-medium text-foreground">{well.pumpType ?? '—'}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Well depth</p>
                      <p className="font-medium text-foreground">
                        {well.wellDepthMeters != null ? `${well.wellDepthMeters}m` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Well diameter</p>
                      <p className="font-medium text-foreground">
                        {well.wellDiameterMeters != null ? `${well.wellDiameterMeters}m` : '—'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">GPS coordinates</p>
                      <p className="font-mono text-xs text-foreground">
                        {well.lat.toFixed(5)}, {well.long.toFixed(5)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="jal-card">
                  <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-accent" />
                    Latest Survey Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Last surveyed on</p>
                      <p className="font-medium text-foreground">{formatDate(well.lastSurveyedOn)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Last known depth</p>
                      <p className="font-bold text-lg text-foreground">
                        {well.lastDepthMeters != null ? `${well.lastDepthMeters.toFixed(2)}m` : '—'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Change since previous survey</p>
                      <p
                        className={cn(
                          'font-medium',
                          well.changeSincePrevious == null
                            ? 'text-muted-foreground'
                            : well.changeSincePrevious > 0
                              ? 'text-depth-warning'
                              : 'text-depth-safe',
                        )}
                      >
                        {changeLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Survey name</p>
                      <p className="font-medium text-foreground">{well.lastSurveyName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Surveyor name</p>
                      <p className="font-medium text-foreground">{well.surveyorName ?? '—'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => onViewHistory?.(well)}>
                    <History className="w-4 h-4" />
                    View History
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled
                    title="Survey report page is not built yet"
                  >
                    <FileBarChart className="w-4 h-4" />
                    View Full Survey Report
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
