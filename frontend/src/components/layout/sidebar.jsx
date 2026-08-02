'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from './nav-items';

/** The nav list, shared by the desktop sidebar and the mobile sheet. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-4" aria-label="Main navigation">
      {navItems.map((item) => {
        if (item.soon) {
          return (
            <div
              key={item.href}
              title="Coming in Phase 2"
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                Soon
              </span>
            </div>
          );
        }

        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'flex items-center gap-3 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground'
                : 'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Fixed desktop sidebar (lg+ breakpoint). */
export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="font-heading text-lg font-semibold tracking-tight">
          Interior Quotation
        </Link>
      </div>
      <SidebarNav />
      <div className="mt-auto p-4 text-xs text-muted-foreground">v1.0.0 · Phase 1</div>
    </aside>
  );
}
