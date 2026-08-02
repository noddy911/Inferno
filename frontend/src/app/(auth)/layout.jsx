'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';

/**
 * Auth-facing layout: centered card. Already-authenticated users are
 * bounced to the dashboard once the persisted session is restored.
 */
export default function AuthLayout({ children }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (hydrated && accessToken) router.replace('/dashboard');
  }, [hydrated, accessToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <span className="font-heading text-2xl font-semibold tracking-tight">Interior Quotation</span>
        </div>
        {children}
      </div>
    </div>
  );
}
