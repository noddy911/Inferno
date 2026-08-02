'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';

/**
 * Landing redirect: send authenticated users to the dashboard,
 * everyone else to the sign-in page. Runs client-side because the
 * session lives in localStorage and is not readable on the server.
 */
export default function HomePage() {
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(accessToken ? '/dashboard' : '/login');
  }, [hydrated, accessToken, router]);

  return null;
}
