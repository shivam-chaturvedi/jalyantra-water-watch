import { RefreshCw, Download, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import GoogleTranslateDropdown from '@/components/GoogleTranslate';

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
}: NavBarProps) {
  return (
    <nav className="nav-bar">
      {/* ── Row 1: Logo + right controls ── */}
      <div className="container mx-auto px-4 flex items-center justify-between gap-3 py-2 flex-wrap">

        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img
            src="/logo.jpeg"
            alt="JalYantra Logo"
            className="w-10 h-10 sm:w-14 sm:h-14 object-cover rounded-xl ring-2 ring-teal-200 shadow-md"
          />
          <div>
            <h1
              className="font-bold tracking-tight leading-none"
              style={{ fontFamily: 'Poppins, Inter, sans-serif', color: '#0f766e', fontSize: '16px' }}
            >
              JALYANTRA
            </h1>
            <p
              className="text-[10px] uppercase tracking-widest font-medium hidden sm:block"
              style={{ color: '#64748b' }}
            >
              Groundwater Intelligence
            </p>
          </div>
          {/* Active sensors pill */}
          <div
            className="hidden sm:flex flex-col items-center justify-center px-2 py-1 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg, #0ea5a4, #0f766e)', fontSize: '11px' }}
          >
            <span style={{ fontSize: '9px', opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active</span>
            <span style={{ fontSize: '14px', fontWeight: 700, lineHeight: 1 }}>{activeSensors}</span>
          </div>
        </Link>

        {/* Right side controls — wrap on mobile */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Location Selector */}
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger
              className="h-8 text-xs font-medium border-[#e2e8f0] bg-white rounded-xl"
              style={{ width: '130px', fontFamily: 'Inter, sans-serif' }}
            >
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all-locations">All Locations</SelectItem>
              {locationOptions.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Selector — hidden on xs, visible sm+ */}
          <Select value={selectedDate} onValueChange={onDateChange}>
            <SelectTrigger
              className="h-8 text-xs font-medium border-[#e2e8f0] bg-white rounded-xl hidden sm:flex"
              style={{ width: '120px', fontFamily: 'Inter, sans-serif' }}
            >
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all-dates">All Dates</SelectItem>
              {dateOptions.map((date) => (
                <SelectItem key={date} value={date}>
                  {date}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Live Toggle */}
          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLiveToggle(!isLive)}
            className={cn(
              'h-8 gap-1.5 text-xs font-semibold rounded-xl px-3',
              isLive
                ? 'text-white border-transparent'
                : 'border-[#e2e8f0] text-[#64748b] hover:border-[#0ea5a4] hover:text-[#0ea5a4]'
            )}
            style={isLive ? { background: 'linear-gradient(135deg, #0ea5a4, #0f766e)' } : {}}
          >
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-70" />
              )}
              <span className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                isLive ? 'bg-white' : 'bg-[#94a3b8]'
              )} />
            </span>
            Live
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-xl border-[#e2e8f0] text-[#64748b]"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Export — hidden on mobile */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs font-semibold rounded-xl px-3 border-[#e2e8f0] text-[#64748b] hidden md:flex"
            onClick={onExport}
            disabled={!onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>

          {/* Translate — visible on all screens, compact on mobile */}
          <GoogleTranslateDropdown className="max-w-[100px] sm:max-w-[180px]" />
        </div>
      </div>

      {/* Last Updated Strip */}
      {lastUpdated && (
        <div
          className="border-t px-4 py-1"
          style={{ borderColor: '#e2e8f0', background: 'rgba(14,165,164,0.04)' }}
        >
          <div
            className="container mx-auto flex items-center justify-between flex-wrap gap-1"
            style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            <span style={{ fontWeight: 500 }}>
              Last Sync:{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a', fontWeight: 600 }}>
                {lastUpdated.toLocaleTimeString()}
              </span>
            </span>
            <span className="flex items-center gap-1">
              <Radio className="h-3 w-3" style={{ color: '#0ea5a4' }} />
              {isLive ? 'Auto-refresh on' : 'Manual mode'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
