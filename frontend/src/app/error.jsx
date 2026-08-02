'use client';

import { Button } from '@/components/ui/button';

/** Global error boundary shown on client errors (e.g. failed route render). */
export default function GlobalError({ error, reset }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {error?.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
