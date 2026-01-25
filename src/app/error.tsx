'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center p-4 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      <div className="relative glass-strong rounded-2xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-red-500/20">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-gray-400 mb-6">
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>
        
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-left">
            <p className="text-sm text-red-400 font-mono break-all">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white gradient-border bg-gray-900/50 hover:bg-gray-800/50 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
