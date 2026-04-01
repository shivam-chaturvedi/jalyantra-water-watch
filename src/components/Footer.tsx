import { Shield, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer
      className="mt-8 border-t"
      style={{ borderColor: '#e2e8f0', background: '#ffffff' }}
    >
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0ea5a4, #0f766e)' }}
            >
              <img
                src="/logo.jpeg"
                alt="JalYantra Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'Poppins, Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                JalYantra Project
              </p>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '10px',
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Groundwater Intelligence
              </p>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="flex flex-wrap items-center justify-center gap-5">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <Shield className="w-3 h-3" style={{ color: '#22c55e' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                Calibration Verified
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(14,165,164,0.12)' }}
              >
                <Clock className="w-3 h-3" style={{ color: '#0ea5a4' }} />
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                5min Intervals
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)' }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: '#22c55e', display: 'block' }}
                />
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                Live Stream
              </span>
            </div>
          </div>

          {/* Copyright */}
          <div
            style={{
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              color: '#94a3b8',
              letterSpacing: '0.04em',
            }}
          >
            © 2026 JalYantra • All rights reserved
          </div>
        </div>

        {/* Attribution */}
        <div
          className="mt-5 pt-4 border-t text-center"
          style={{ borderColor: '#f1f5f9' }}
        >
          <p style={{ fontSize: '11px', fontFamily: 'Inter, sans-serif', color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Source:{' '}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>JalYantra IoT Network</span>
            {' '}•{' '}
            Backend:{' '}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Firebase RTDB</span>
            {' '}•{' '}
            Maps:{' '}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Leaflet + CARTO</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
