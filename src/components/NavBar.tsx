import { Droplets, RefreshCw, Download, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface NavBarProps {
  selectedState: string;
  dateRange: string;
  isLive: boolean;
  lastUpdated: Date | null;
  onStateChange: (state: string) => void;
  onDateRangeChange: (range: string) => void;
  onLiveToggle: (live: boolean) => void;
  onRefresh: () => void;
}

export function NavBar({
  selectedState,
  dateRange,
  isLive,
  lastUpdated,
  onStateChange,
  onDateRangeChange,
  onLiveToggle,
  onRefresh,
}: NavBarProps) {
  return (
    <nav className="nav-bar">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand - Squared Professional */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-water flex items-center justify-center" style={{ borderRadius: '0.25rem' }}>
            <Droplets className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-foreground tracking-tight">JALYANTRA</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-0.5">Groundwater Intelligence</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-2">
          {/* State Selector */}
          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-medium">
              <SelectValue placeholder="Select State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Maharashtra">Maharashtra</SelectItem>
              <SelectItem value="Gujarat">Gujarat</SelectItem>
              <SelectItem value="Rajasthan">Rajasthan</SelectItem>
              <SelectItem value="Karnataka">Karnataka</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Range */}
          <Select value={dateRange} onValueChange={onDateRangeChange}>
            <SelectTrigger className="w-[110px] h-8 text-xs font-medium hidden sm:flex">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 bg-border mx-1" />

          {/* Live Toggle */}
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => onLiveToggle(!isLive)}
            className={cn(
              "h-8 gap-2 text-xs font-semibold uppercase tracking-wide",
              isLive && "bg-accent hover:bg-accent/90"
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full bg-accent-foreground opacity-75" style={{ borderRadius: '1px' }} />
              )}
              <span className={cn(
                "relative inline-flex h-1.5 w-1.5",
                isLive ? "bg-accent-foreground" : "bg-muted-foreground"
              )} style={{ borderRadius: '1px' }} />
            </span>
            <span className="hidden sm:inline">Live</span>
          </Button>

          {/* Refresh */}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-semibold uppercase tracking-wide hidden md:flex">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Last Updated Strip */}
      {lastUpdated && (
        <div className="border-t border-border bg-muted/30 px-4 py-1">
          <div className="container mx-auto flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
            <span className="font-medium">
              Last Sync: <span className="font-mono text-foreground">{lastUpdated.toLocaleTimeString()}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Radio className="h-3 w-3 text-accent" />
              {isLive ? 'Auto-refresh enabled' : 'Manual refresh mode'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
