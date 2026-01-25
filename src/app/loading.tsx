import { Package } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <Package className="w-8 h-8 text-blue-400 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/50 animate-ping" />
        </div>
        <p className="text-gray-400 font-medium">Loading...</p>
      </div>
    </div>
  );
}
