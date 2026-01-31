import { Droplets, Shield, Clock, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-card/50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg gradient-water flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">JalYantra Project</p>
              <p className="text-xs text-muted-foreground">Groundwater Intelligence Platform</p>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-depth-safe" />
              <span>Calibration Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-accent" />
              <span>Updated every 5 minutes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-depth-safe animate-pulse" />
              <span>Live Data Stream</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-4 text-xs">
            <a 
              href="#" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              Documentation
              <ExternalLink className="w-3 h-3" />
            </a>
            <a 
              href="#" 
              className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              API
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-muted-foreground">© 2025 JalYantra</span>
          </div>
        </div>

        {/* Data Source Attribution */}
        <div className="mt-4 pt-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Data Source: <span className="font-medium text-foreground">JalYantra IoT Sensor Network</span> • 
            Powered by <span className="font-medium text-foreground">Firebase Realtime Database</span> • 
            Visualization: <span className="font-medium text-foreground">Leaflet + OpenStreetMap</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
