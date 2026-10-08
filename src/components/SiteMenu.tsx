import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Deployments', href: '/deployments' },
  { label: 'Partners', href: '/partners' },
  { label: 'Contact', href: '/#contact' },
  // Points at the dashboard for now — survey markers/popups live there (§3.1 of
  // docs/survey-feature-design.md). Repoint once a dedicated survey report page
  // exists (design doc §3.3 / §8 phase 6).
  { label: 'Survey Reports', href: '/dashboard', variant: 'survey' },
] as const;

type SiteMenuProps = {
  className?: string;
  onNavigate?: () => void;
  vertical?: boolean;
};

export function SiteMenu({ className, onNavigate, vertical = false }: SiteMenuProps) {
  const location = useLocation();

  return (
    <nav
      className={cn(
        vertical
          ? 'flex flex-col gap-1'
          : 'flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {NAV_ITEMS.map((item, index) => {
        const active =
          item.href === location.pathname ||
          (item.href === '/#contact' && location.pathname === '/' && location.hash === '#contact');
        const isSurvey = 'variant' in item && item.variant === 'survey';
        const prevIsSurvey = index > 0 && 'variant' in NAV_ITEMS[index - 1] && NAV_ITEMS[index - 1].variant === 'survey';
        return (
          <span key={item.href + item.label} className={cn(!vertical && 'flex items-center gap-4', vertical && 'contents')}>
            {!vertical && isSurvey && !prevIsSurvey && (
              <span className="h-4 w-px bg-border" aria-hidden="true" />
            )}
            <Link
              to={item.href}
              onClick={onNavigate}
              className={cn(
                vertical
                  ? 'rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-teal-50 hover:text-teal-700'
                  : 'transition-colors hover:text-teal-600',
                active && !isSurvey && (vertical ? 'bg-teal-50 text-teal-700' : 'text-teal-700'),
                !vertical &&
                  item.href === '/dashboard' &&
                  !isSurvey &&
                  'rounded-full bg-teal-600 px-3 py-1 text-white hover:bg-teal-700 hover:text-white',
                !vertical && item.href === '/dashboard' && !isSurvey && active && 'bg-teal-700',
                vertical &&
                  item.href === '/dashboard' &&
                  !isSurvey &&
                  'bg-teal-600 text-white hover:bg-teal-700 hover:text-white',
                isSurvey &&
                  (vertical
                    ? 'border border-amber-500 text-amber-700 hover:bg-amber-50'
                    : 'rounded-full border border-amber-500 px-3 py-1 text-amber-700 hover:bg-amber-50 hover:text-amber-700'),
              )}
            >
              {item.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
