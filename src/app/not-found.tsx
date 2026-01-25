import Link from 'next/link';
import { Search, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center p-4 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      <div className="relative glass-strong rounded-2xl p-8 max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-blue-500/20">
          <Search className="w-10 h-10 text-blue-400" />
        </div>
        
        <h1 className="text-6xl font-bold text-white mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-300 mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/boxes"
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white gradient-border bg-gray-900/50 hover:bg-gray-800/50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Boxes
          </Link>
        </div>
      </div>
    </div>
  );
}
