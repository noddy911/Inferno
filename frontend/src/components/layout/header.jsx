'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from './breadcrumb';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

/** Top app bar: mobile menu trigger, breadcrumbs, theme toggle, user menu. */
export function Header({ onOpenMenu }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Breadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
