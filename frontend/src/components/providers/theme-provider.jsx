'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

/** next-themes wrapper for light/dark/system switching. */
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
