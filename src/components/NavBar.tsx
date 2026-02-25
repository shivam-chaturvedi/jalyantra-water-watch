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
  selectedLocation: string;
  locationOptions: string[];
  selectedDate: string;
  dateOptions: string[];
  isLive: boolean;
  lastUpdated: Date | null;
  onLocationChange: (location: string) => void;
  onDateChange: (date: string) => void;
  onLiveToggle: (live: boolean) => void;
  onRefresh: () => void;
  onExport?: () => void;
  activeSensors: number;
  userEmail?: string | null;
  onLogout?: () => void;
  logoutLoading?: boolean;
}

export function NavBar({
  selectedLocation,
  locationOptions,
  selectedDate,
  dateOptions,
  isLive,
  lastUpdated,
  onLocationChange,
  onDateChange,
  onLiveToggle,
  onRefresh,
  onExport,
  activeSensors,
  userEmail,
  onLogout,
  logoutLoading = false,
}: NavBarProps) {
  return (
    <nav className="nav-bar">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand - Squared Professional */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="JalYantra Logo"
            className="w-16 h-16 object-cover"
            style={{ borderRadius: '0.25rem' }}
          />
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">JALYANTRA</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-0.5">
              Groundwater Intelligence
            </p>
          </div>
          <div className="flex flex-col text-right text-xs uppercase tracking-wide text-muted-foreground">
            <span className="text-[9px]">Active sensors</span>
            <p className="text-lg font-semibold text-foreground">{activeSensors}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Location Selector */}
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger className="w-[160px] h-8 text-xs font-medium">
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-locations">All Locations</SelectItem>
              {locationOptions.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Selector */}
          <Select value={selectedDate} onValueChange={onDateChange}>
            <SelectTrigger className="w-[130px] h-8 text-xs font-medium hidden sm:flex">
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-dates">All Dates</SelectItem>
              {dateOptions.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold uppercase tracking-wide hidden md:flex"
            onClick={onExport}
            disabled={!onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <div className="hidden md:flex flex-col items-end text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>Signed in as</span>
              <p className="font-mono text-[12px] text-foreground">{userEmail}</p>
            </div>
          )}
          {onLogout && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={onLogout}
              disabled={logoutLoading}
            >
              {logoutLoading ? 'Signing out…' : 'Logout'}
            </Button>
          )}
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
