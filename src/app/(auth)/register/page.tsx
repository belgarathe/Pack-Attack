'use client';

import { useState, useMemo } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Mail, Lock, User, Eye, EyeOff, ChevronRight, AlertCircle, CheckCircle2, Coins, Sparkles } from 'lucide-react';

function TwitchIcon({ className }: { className?: string }) {
  return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
      </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
  );
}

function PasswordCheck({ met, label }: { met: boolean; label: string }) {
  return (
      <div className={`flex items-center gap-1.5 text-[11px] transition-colors ${met ? 'text-emerald-400' : 'text-gray-600'}`}>
        <CheckCircle2 className={`w-3 h-3 ${met ? 'text-emerald-400' : 'text-gray-700'}`} />
        {label}
      </div>
  );
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [twitchLoading, setTwitchLoading] = useState(false);
  const [discordLoading, setDiscordLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  const passwordChecks = useMemo(() => {
    const p = formData.password;
    return {
      length: p.length >= 8,
      upper: /[A-Z]/.test(p),
      lower: /[a-z]/.test(p),
      number: /[0-9]/.test(p),
    };
  }, [formData.password]);

  const passwordStrong = passwordChecks.length && passwordChecks.upper && passwordChecks.lower && passwordChecks.number;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordStrong) {
      setError('Password does not meet the requirements.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setRegisteredEmail(formData.email);
      setSuccess(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwitchSignup = () => {
    setTwitchLoading(true);
    signIn('twitch', { callbackUrl: '/dashboard' });
  };

  const handleDiscordSignup = () => {
    setDiscordLoading(true);
    signIn('discord', { callbackUrl: '/dashboard' });
  };

  // Success state
  if (success) {
    return (
        <div className="rounded-2xl border border-white/6 bg-white/2 p-6 sm:p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-sm text-gray-500 mb-4">We sent a verification link to:</p>
          <p className="text-sm font-semibold text-white bg-white/4 border border-white/6 rounded-lg py-2 px-4 inline-block mb-4">
            {registeredEmail}
          </p>
          <p className="text-xs text-gray-600 mb-6">
            Click the link in the email to verify your account and receive your{' '}
            <span className="text-amber-400 font-semibold">1,000 bonus coins</span>.
          </p>
          <Link
              href="/login"
              className="block w-full h-11 bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20 items-center justify-center"
          >
            Go to Login
          </Link>
          <p className="mt-4 text-[11px] text-gray-600">
            Didn&apos;t receive it? Check your spam folder.
          </p>
        </div>
    );
  }

  return (
      <>
        {/* Welcome Bonus */}
        <div className="flex items-center gap-3 p-3.5 mb-5 rounded-xl border border-amber-500/15 bg-amber-500/4">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10 shrink-0">
            <Coins className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">1,000 free coins</p>
            <p className="text-[11px] text-gray-500">Sign up and start opening packs immediately</p>
          </div>
          <Sparkles className="w-4 h-4 text-amber-400/40 ml-auto shrink-0" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/6 bg-white/2 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-7">
            <h2 className="text-xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-sm text-gray-500">Join the ultimate TCG experience</p>
          </div>

          {/* Twitch Signup */}
          <button
              onClick={handleTwitchSignup}
              disabled={twitchLoading}
              className="w-full flex items-center justify-center gap-2.5 h-11 rounded-xl bg-[#9146FF] hover:bg-[#7C3AED] text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-60"
          >
            {twitchLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                  <TwitchIcon className="w-4.5 h-4.5" />
                  Sign up with Twitch
                </>
            )}
          </button>

          {/* Discord Signup */}
          <button
              onClick={handleDiscordSignup}
              disabled={discordLoading}
              className="w-full mt-3 flex items-center justify-center gap-2.5 h-11 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/20 disabled:opacity-60"
          >
            {discordLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <>
                  <DiscordIcon className="w-4.5 h-4.5" />
                  Sign up with Discord
                </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-[11px] text-gray-600 font-medium uppercase tracking-wider">or with email</span>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          {/* Error */}
          {error && (
              <div className="flex items-center gap-2.5 mb-5 p-3 rounded-xl bg-red-500/[0.07] border border-red-500/15 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/4 border border-white/8 text-sm text-white placeholder-gray-600 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 focus:bg-white/6 outline-none transition-all"
                    placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/4 border border-white/8 text-sm text-white placeholder-gray-600 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 focus:bg-white/6 outline-none transition-all"
                    placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-11 pl-10 pr-11 rounded-xl bg-white/4 border border-white/8 text-sm text-white placeholder-gray-600 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 focus:bg-white/6 outline-none transition-all"
                    placeholder="Create a password"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password strength */}
              {formData.password.length > 0 && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2.5 ml-1">
                    <PasswordCheck met={passwordChecks.length} label="8+ characters" />
                    <PasswordCheck met={passwordChecks.upper} label="Uppercase letter" />
                    <PasswordCheck met={passwordChecks.lower} label="Lowercase letter" />
                    <PasswordCheck met={passwordChecks.number} label="Number" />
                  </div>
              )}
            </div>

            <button
                type="submit"
                disabled={loading || !passwordStrong}
                className="w-full h-11 mt-1 bg-linear-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-40 disabled:hover:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                  <>
                    Create Account
                    <ChevronRight className="w-4 h-4" />
                  </>
              )}
            </button>
          </form>

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </>
  );
}