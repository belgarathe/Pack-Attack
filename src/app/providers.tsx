'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Reduce frequency of session refetching to minimize CLIENT_FETCH_ERROR
      refetchInterval={5 * 60} // Refetch session every 5 minutes instead of constantly
      refetchOnWindowFocus={false} // Don't refetch when window regains focus
      refetchWhenOffline={false} // Don't refetch when offline
    >
      {children}
    </SessionProvider>
  );
}

