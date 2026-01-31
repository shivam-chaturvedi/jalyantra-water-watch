import { Droplets, RefreshCw, Download, ChevronDown, Radio } from 'lucide-react';
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
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-water flex items-center justify-center">
            <Droplets className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-foreground">JalYantra</h1>
            <p className="text-xs text-muted-foreground -mt-0.5">Groundwater Intelligence</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* State Selector */}
          <Select value={selectedState} onValueChange={onStateChange}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
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
            <SelectTrigger className="w-[130px] h-9 text-sm hidden sm:flex">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last7">Last 7 Days</SelectItem>
              <SelectItem value="last30">Last 30 Days</SelectItem>
              <SelectItem value="seasonal">Seasonal</SelectItem>
              <SelectItem value="yearly">This Year</SelectItem>
            </SelectContent>
          </Select>

          {/* Live Toggle */}
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => onLiveToggle(!isLive)}
            className={cn(
              "h-9 gap-2 text-sm font-medium",
              isLive && "bg-accent hover:bg-accent/90"
            )}
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-foreground opacity-75" />
              )}
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                isLive ? "bg-accent-foreground" : "bg-muted-foreground"
              )} />
            </span>
            <span className="hidden sm:inline">Live</span>
          </Button>

          {/* Refresh */}
          <Button variant="outline" size="icon" className="h-9 w-9" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Export */}
          <Button variant="outline" size="sm" className="h-9 gap-2 hidden md:flex">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Last Updated Strip */}
      {lastUpdated && (
        <div className="border-t border-border bg-muted/50 px-4 py-1.5">
          <div className="container mx-auto flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Last updated: {lastUpdated.toLocaleTimeString()}
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
