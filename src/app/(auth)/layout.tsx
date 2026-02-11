import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050810] font-display p-4 relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-grid opacity-[0.03]" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-600/[0.06] rounded-full blur-[120px]" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[300px] bg-purple-600/[0.04] rounded-full blur-[100px]" />

      {/* Logo */}
      <div className="relative text-center mb-8">
        <Link href="/" className="inline-block group">
          <h1 className="text-2xl font-black tracking-tight">
            <span className="text-white">PACK</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">ATTACK</span>
          </h1>
        </Link>
      </div>

      {/* Content */}
      <div className="relative w-full max-w-[420px]">
        {children}
      </div>

      {/* Back to home */}
      <div className="relative mt-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-gray-600 hover:text-gray-400 transition-colors font-medium">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
