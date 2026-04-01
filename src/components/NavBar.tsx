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
      <div className="container mx-auto px-6 h-[68px] flex items-center justify-between gap-4">

        {/* Logo & Brand */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/logo.jpeg"
            alt="JalYantra Logo"
            className="w-20 h-20 object-cover rounded-2xl ring-2 ring-blue-200 shadow-md"
          />
          <div>
            <h1
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: 'Poppins, Inter, sans-serif', color: '#1e40af', fontSize: '20px', letterSpacing: '-0.01em', lineHeight: 1 }}
            >
              JALYANTRA
            </h1>
            <p
              className="text-sm uppercase tracking-widest mt-0.5 font-medium"
              style={{ color: '#64748b' }}
            >
              Groundwater Intelligence
            </p>
          </div>
          {/* Active sensors pill */}
          <div
            className="hidden sm:flex flex-col items-center justify-center px-3 py-1 rounded-full text-white text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg, #0ea5a4, #0f766e)', fontSize: '11px' }}
          >
            <span style={{ fontSize: '9px', opacity: 0.85, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Active</span>
            <span style={{ fontSize: '15px', fontWeight: 700, lineHeight: 1 }}>{activeSensors}</span>
          </div>
        </Link>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">

          {/* Location Selector */}
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger
              className="h-9 text-xs font-medium border-[#e2e8f0] bg-white rounded-xl"
              style={{ width: '160px', fontFamily: 'Inter, sans-serif' }}
            >
              <SelectValue placeholder="Select Location" />
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

          {/* Date Selector */}
          <Select value={selectedDate} onValueChange={onDateChange}>
            <SelectTrigger
              className="h-9 text-xs font-medium border-[#e2e8f0] bg-white rounded-xl hidden sm:flex"
              style={{ width: '130px', fontFamily: 'Inter, sans-serif' }}
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

          <div className="hidden sm:block w-px h-6 bg-[#e2e8f0] mx-1" />

          {/* Live Toggle */}
          <Button
            variant={isLive ? 'default' : 'outline'}
            size="sm"
            onClick={() => onLiveToggle(!isLive)}
            className={cn(
              'h-9 gap-2 text-xs font-semibold rounded-xl px-4',
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
            <span className="hidden sm:inline">Live</span>
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-[#e2e8f0] text-[#64748b] hover:border-[#0ea5a4] hover:text-[#0ea5a4]"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>

          {/* Export */}
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold rounded-xl px-4 border-[#e2e8f0] text-[#64748b] hover:border-[#0ea5a4] hover:text-[#0ea5a4] hidden md:flex"
            onClick={onExport}
            disabled={!onExport}
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>

          <div className="hidden md:flex">
            <GoogleTranslateDropdown className="max-w-[220px]" />
          </div>
        </div>
      </div>

      {/* Last Updated Strip */}
      {lastUpdated && (
        <div
          className="border-t px-6 py-1.5"
          style={{ borderColor: '#e2e8f0', background: 'rgba(14,165,164,0.04)' }}
        >
          <div className="container mx-auto flex items-center justify-between" style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <span style={{ fontWeight: 500 }}>
              Last Sync:{' '}
              <span style={{ fontFamily: 'ui-monospace, monospace', color: '#0f172a', fontWeight: 600 }}>
                {lastUpdated.toLocaleTimeString()}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <Radio className="h-3 w-3" style={{ color: '#0ea5a4' }} />
              {isLive ? 'Auto-refresh enabled' : 'Manual refresh mode'}
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}
