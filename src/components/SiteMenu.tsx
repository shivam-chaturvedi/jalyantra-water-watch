import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Deployments', href: '/deployments' },
  { label: 'Partners', href: '/partners' },
  { label: 'Contact', href: '/#contact' },
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
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === location.pathname ||
          (item.href === '/#contact' && location.pathname === '/' && location.hash === '#contact');
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
            className={cn(
              vertical
                ? 'rounded-xl px-4 py-3 text-base font-medium transition-colors hover:bg-teal-50 hover:text-teal-700'
                : 'transition-colors hover:text-teal-600',
              active && (vertical ? 'bg-teal-50 text-teal-700' : 'text-teal-700'),
              !vertical &&
                item.href === '/dashboard' &&
                'rounded-full bg-teal-600 px-3 py-1 text-white hover:bg-teal-700 hover:text-white',
              !vertical && item.href === '/dashboard' && active && 'bg-teal-700',
              vertical &&
                item.href === '/dashboard' &&
                'bg-teal-600 text-white hover:bg-teal-700 hover:text-white',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
