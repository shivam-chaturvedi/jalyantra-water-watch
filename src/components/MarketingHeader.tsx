import { MouseEvent, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import GoogleTranslateDropdown from '@/components/GoogleTranslate';

type MarketingHeaderProps = {
  centerLinks?: Array<{ label: string; href: string }>;
  showDashboardButton?: boolean;
};

export function MarketingHeader({ centerLinks, showDashboardButton = true }: MarketingHeaderProps) {
  const navigateToDashboard = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign('/dashboard');
  }, []);

  const navigateToHome = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign('/');
  }, []);

  return (
    <header className="border-b border-border bg-card/90 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center gap-3 px-4 py-2">
        <a href="/" onClick={navigateToHome} className="flex items-center gap-2 flex-shrink-0">
          <img
            src="/logo.jpeg"
            alt="JalYantra logo"
            className="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-16 rounded-xl object-cover ring-2 ring-teal-200 shadow-md"
          />
          <div>
            <p
              className="text-base sm:text-lg font-bold uppercase tracking-wide"
              style={{ color: '#0f766e', fontFamily: 'Poppins, Inter, sans-serif' }}
            >
              JalYantra
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest font-medium hidden sm:block">
              Groundwater Intelligence
            </p>
          </div>
        </a>

        {centerLinks?.length ? (
          <nav className="hidden md:flex flex-1 justify-center gap-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {centerLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-teal-600 transition-colors">
                {link.label}
              </a>
            ))}
          </nav>
        ) : (
          <div className="hidden md:block flex-1" />
        )}

        <div className="ml-auto flex items-center gap-2">
          <GoogleTranslateDropdown className="max-w-[120px] sm:max-w-[180px]" />
          {showDashboardButton ? (
            <Button
              asChild
              size="sm"
              className="rounded-full px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold bg-teal-600 text-white hover:bg-teal-700 hover:text-white shadow-md whitespace-nowrap"
            >
              <a href="/dashboard" onClick={navigateToDashboard} className="text-white hover:text-white">
                <p className="text-white"> Dashboard</p>
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}

