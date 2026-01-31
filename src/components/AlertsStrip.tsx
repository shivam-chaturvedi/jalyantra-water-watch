import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Wifi, CloudRain, X } from 'lucide-react';
import { Alert } from '@/lib/data';
import { cn } from '@/lib/utils';

interface AlertsStripProps {
  alerts: Alert[];
  onAlertClick?: (alert: Alert) => void;
  onDismiss?: (alertId: string) => void;
}

const alertIcons = {
  rapid_decline: TrendingDown,
  offline_sensor: Wifi,
  poor_recharge: CloudRain,
  critical_threshold: AlertTriangle,
};

const severityStyles = {
  critical: {
    bg: 'bg-depth-critical/10 border-depth-critical/30',
    icon: 'text-depth-critical',
    badge: 'bg-depth-critical',
  },
  warning: {
    bg: 'bg-depth-warning/10 border-depth-warning/30',
    icon: 'text-depth-warning',
    badge: 'bg-depth-warning',
  },
  info: {
    bg: 'bg-accent/10 border-accent/30',
    icon: 'text-accent',
    badge: 'bg-accent',
  },
};

export function AlertsStrip({ alerts, onAlertClick, onDismiss }: AlertsStripProps) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="jal-card p-4"
    >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-depth-warning" />
          <h3 className="font-semibold text-sm text-foreground">Active Alerts</h3>
          <span className="px-2 py-0.5 bg-depth-critical text-white text-xs font-medium rounded-full">
            {alerts.length}
          </span>
        </div>

      <div className="flex flex-wrap gap-2">
        {alerts.map((alert, index) => {
          const Icon = alertIcons[alert.type];
          const styles = severityStyles[alert.severity];

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onAlertClick?.(alert)}
              className={cn(
                "alert-strip border cursor-pointer transition-all hover:shadow-md group",
                styles.bg
              )}
            >
              <Icon className={cn("w-4 h-4 flex-shrink-0", styles.icon)} />
              <span className="font-semibold text-foreground">{alert.district}:</span>
              <span className="text-muted-foreground">{alert.message}</span>
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(alert.id);
                  }}
                  className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
