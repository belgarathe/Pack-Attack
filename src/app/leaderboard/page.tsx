import { Suspense } from 'react';
import { LeaderboardClient } from './LeaderboardClient';

// PERFORMANCE: Use ISR instead of force-dynamic
export const revalidate = 120; // Revalidate every 2 minutes

export default function LeaderboardPage() {
  return (
    <Suspense fallback={<LeaderboardSkeleton />}>
      <LeaderboardClient />
    </Suspense>
  );
}

function LeaderboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="relative container py-12">
        <div className="animate-pulse space-y-8">
          <div className="h-12 w-64 bg-gray-800 rounded-lg" />
          <div className="h-64 bg-gray-800 rounded-2xl" />
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
