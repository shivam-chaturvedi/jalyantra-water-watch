import { motion } from 'framer-motion';
import { Activity, Waves, AlertTriangle, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIStats } from '@/lib/data';

interface KPICardsProps {
  stats: KPIStats | null;
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'warning' | 'critical' | 'accent';
  delay?: number;
}

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendValue,
  variant = 'default',
  delay = 0 
}: KPICardProps) {
  const variantStyles = {
    default: 'border-border',
    warning: 'border-l-4 border-l-depth-warning border-t-border border-r-border border-b-border bg-depth-warning/5',
    critical: 'border-l-4 border-l-depth-critical border-t-border border-r-border border-b-border bg-depth-critical/5',
    accent: 'border-l-4 border-l-accent border-t-border border-r-border border-b-border bg-accent/5',
  };

  const iconStyles = {
    default: 'bg-secondary text-foreground',
    warning: 'bg-depth-warning/15 text-depth-warning',
    critical: 'bg-depth-critical/15 text-depth-critical',
    accent: 'bg-accent/15 text-accent',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className={cn("kpi-card", variantStyles[variant])}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn("w-9 h-9 flex items-center justify-center", iconStyles[variant])} style={{ borderRadius: '0.25rem' }}>
          <Icon className="w-4 h-4" />
        </div>
        {trend && trendValue && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 uppercase tracking-wide",
            trend === 'down' ? 'bg-depth-critical/10 text-depth-critical' : 
            trend === 'up' ? 'bg-depth-safe/10 text-depth-safe' : 
            'bg-muted text-muted-foreground'
          )} style={{ borderRadius: '0.25rem' }}>
            <TrendingDown className={cn("w-3 h-3", trend === 'up' && "rotate-180")} />
            {trendValue}
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight font-mono">{value}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </motion.div>
  );
}

export function KPICards({ stats, isLoading }: KPICardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="kpi-card animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-muted mb-3" />
            <div className="space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-8 w-16 bg-muted rounded" />
              <div className="h-3 w-32 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KPICard
        title="Active Sensors"
        value={stats.activeSensors}
        subtitle="Connected and reporting"
        icon={Activity}
        variant="accent"
        delay={0}
      />
      <KPICard
        title="Average Depth"
        value={`${stats.avgDepth}m`}
        subtitle="State-wide average"
        icon={Waves}
        trend={stats.avgDepth > 15 ? 'down' : 'neutral'}
        trendValue={stats.avgDepth > 15 ? 'High' : 'Normal'}
        variant={stats.avgDepth > 15 ? 'warning' : 'default'}
        delay={0.1}
      />
      <KPICard
        title="Critical Districts"
        value={`${stats.criticalPercentage}%`}
        subtitle="Above 20m depth threshold"
        icon={AlertTriangle}
        variant={stats.criticalPercentage > 20 ? 'critical' : 'default'}
        delay={0.2}
      />
      <KPICard
        title="Fastest Decline"
        value={stats.fastestDecliningDistrict}
        subtitle={`-${stats.fastestDeclineRate}m in 30 days`}
        icon={TrendingDown}
        trend="down"
        trendValue={`-${stats.fastestDeclineRate}m`}
        variant="critical"
        delay={0.3}
      />
    </div>
  );
}
