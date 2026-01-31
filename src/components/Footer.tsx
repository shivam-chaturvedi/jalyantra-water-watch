import { Droplets, Shield, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-card/80">
      <div className="container mx-auto px-4 py-5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-water flex items-center justify-center" style={{ borderRadius: '0.25rem' }}>
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground uppercase tracking-wider">JalYantra Project</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Groundwater Intelligence</p>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground uppercase tracking-wide">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-depth-safe" />
              <span>Calibration Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-accent" />
              <span>5min Intervals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-depth-safe" style={{ borderRadius: '1px' }} />
              <span>Live Stream</span>
            </div>
          </div>

          {/* Links */}
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            © 2026 JalYantra • All rights reserved
          </div>
        </div>

        {/* Data Source Attribution */}
        <div className="mt-4 pt-4 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Source: <span className="font-semibold text-foreground">JalYantra IoT Network</span> • 
            Backend: <span className="font-semibold text-foreground">Firebase RTDB</span> • 
            Maps: <span className="font-semibold text-foreground">Leaflet + CARTO</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
