'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';
import { DashboardShell } from '@/components/layout/dashboard-shell';

/**
 * Protected area. Waits for the persisted session to hydrate, then bounces
 * unauthenticated visitors to /login. The redirect runs client-side because
 * the session lives in localStorage and is invisible to the server.
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (hydrated && !accessToken) router.replace('/login');
  }, [hydrated, accessToken, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accessToken) return null; // redirect in flight

  return <DashboardShell>{children}</DashboardShell>;
}
