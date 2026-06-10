import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', href: '/' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Deployments', href: '/deployments' },
  { label: 'Partners', href: '/partners' },
  { label: 'Contact', href: '/#contact' },
] as const;

export function SiteMenu({ className }: { className?: string }) {
  const location = useLocation();

  return (
    <nav className={cn('flex flex-wrap items-center gap-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground', className)}>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === location.pathname ||
          (item.href === '/#contact' && location.pathname === '/' && location.hash === '#contact');
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              'transition-colors hover:text-teal-600',
              active && 'text-teal-700',
              item.href === '/dashboard' && 'rounded-full bg-teal-600 px-3 py-1 text-white hover:bg-teal-700 hover:text-white',
              item.href === '/dashboard' && active && 'bg-teal-700',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
