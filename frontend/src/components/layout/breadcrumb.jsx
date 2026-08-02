'use client';

import { Fragment } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

/**
 * Simple breadcrumb for the current route. Phase 1 only has /dashboard,
 * so it renders a static "Dashboard" crumb; Phase 2 will map real segments.
 */
export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      <span className="font-medium text-foreground">Dashboard</span>
      {segments.slice(1).map((segment) => (
        <Fragment key={segment}>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <span className="capitalize text-muted-foreground">{segment.replace(/-/g, ' ')}</span>
        </Fragment>
      ))}
    </nav>
  );
}
