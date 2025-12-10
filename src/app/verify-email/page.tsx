'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, XCircle, Loader2, Mail, Sparkles } from 'lucide-react';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired' | 'already-verified';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token provided');
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          if (data.message === 'Email already verified') {
            setStatus('already-verified');
            setMessage('Your email is already verified');
          } else {
            setStatus('success');
            setMessage('Your email has been verified successfully!');
          }
        } else {
          if (data.error?.includes('expired')) {
            setStatus('expired');
            setMessage('Your verification link has expired');
          } else {
            setStatus('error');
            setMessage(data.error || 'Failed to verify email');
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your email');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="glass-strong rounded-2xl p-8 text-center">
      {status === 'loading' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifying Email</h2>
          <p className="text-gray-400">Please wait while we verify your email address...</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Email Verified!</h2>
          <p className="text-gray-400 mb-6">{message}</p>
          <div className="space-y-3">
            <Link
              href="/login"
              className="block w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
            >
              Sign In to Your Account
            </Link>
            <Link
              href="/boxes"
              className="block w-full py-4 text-gray-400 hover:text-white transition-colors"
            >
              Browse Boxes
            </Link>
          </div>
        </>
      )}

      {status === 'already-verified' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <CheckCircle2 className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Already Verified</h2>
          <p className="text-gray-400 mb-6">{message}</p>
          <Link
            href="/login"
            className="block w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
          >
            Sign In to Your Account
          </Link>
        </>
      )}

      {status === 'expired' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
            <Mail className="w-10 h-10 text-amber-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Link Expired</h2>
          <p className="text-gray-400 mb-6">{message}</p>
          <p className="text-sm text-gray-500 mb-4">
            Please request a new verification email from the login page.
          </p>
          <Link
            href="/login"
            className="block w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
          >
            Go to Login
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Failed</h2>
          <p className="text-gray-400 mb-6">{message}</p>
          <Link
            href="/login"
            className="block w-full py-4 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02]"
          >
            Back to Login
          </Link>
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="glass-strong rounded-2xl p-8 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
        <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Loading</h2>
      <p className="text-gray-400">Please wait...</p>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display p-4">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-30" />
      <div className="absolute inset-0 radial-gradient" />
      
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold">
              <span className="text-white">PACK </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">ATTACK</span>
            </h1>
          </Link>
        </div>

        {/* Card wrapped in Suspense */}
        <Suspense fallback={<LoadingState />}>
          <VerifyEmailContent />
        </Suspense>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm">
            <Sparkles className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
