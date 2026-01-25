'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-white">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full text-center border border-gray-800">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              A critical error occurred. Please try refreshing the page.
            </p>
            
            <button
              onClick={() => reset()}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
