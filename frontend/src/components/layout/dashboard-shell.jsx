'use client';

import { useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Header } from './header';
import { Sidebar, SidebarNav } from './sidebar';

/**
 * App shell: fixed sidebar on desktop, slide-over sheet on mobile,
 * sticky header with breadcrumbs / theme toggle / user menu.
 */
export function DashboardShell({ children }) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {isDesktop ? (
        <Sidebar />
      ) : (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex h-14 items-center border-b px-4 font-heading text-lg font-semibold tracking-tight">
              Interior Quotation
            </div>
            <SidebarNav />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
