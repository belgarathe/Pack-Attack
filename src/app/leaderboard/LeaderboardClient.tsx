'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Coins, Swords, Clock, Star, Flame, TrendingUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type LeaderboardEntry = {
  rank: number;
  points: number;
  userId: string;
  userName: string;
  userAvatar: string | null;
  battlesWon: number;
  battlesPlayed: number;
  totalCoinsWon: number;
  prize: number;
  title: string | null;
};

type LeaderboardData = {
  leaderboard: LeaderboardEntry[];
  fullLeaderboard: LeaderboardEntry[];
  month: number;
  year: number;
  monthName: string;
  period: string;
  resetIn: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  };
};

export function LeaderboardClient() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'current' | 'previous'>('current');
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    fetchLeaderboard();
  }, [period]);

  useEffect(() => {
    if (!data) return;
    
    setCountdown(data.resetIn);
    
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else if (prev.days > 0) {
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?period=${period}`);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const top3 = data?.leaderboard.slice(0, 3) || [];
  const restOfLeaderboard = data?.fullLeaderboard.slice(3) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">Battle Rankings</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400">
              LEADERBOARD
            </span>
          </h1>

          <p className="text-gray-400 max-w-lg mx-auto mb-6">
            Top 10 players each month win coin prizes. Compete in battles to climb the ranks!
          </p>

          {/* Countdown */}
          {period === 'current' && (
            <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-400">Resets in</span>
              <div className="flex items-center gap-1 font-mono">
                <span className="px-2 py-1 rounded bg-gray-900 text-white font-bold">{String(countdown.days).padStart(2, '0')}</span>
                <span className="text-gray-500">:</span>
                <span className="px-2 py-1 rounded bg-gray-900 text-white font-bold">{String(countdown.hours).padStart(2, '0')}</span>
                <span className="text-gray-500">:</span>
                <span className="px-2 py-1 rounded bg-gray-900 text-white font-bold">{String(countdown.minutes).padStart(2, '0')}</span>
                <span className="text-gray-500">:</span>
                <span className="px-2 py-1 rounded bg-gray-900 text-white font-bold">{String(countdown.seconds).padStart(2, '0')}</span>
              </div>
            </div>
          )}
        </div>

        {/* Period Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-lg bg-gray-800/60 border border-gray-700/50">
            <button
              onClick={() => setPeriod('current')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                period === 'current'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setPeriod('previous')}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${
                period === 'previous'
                  ? 'bg-amber-500 text-gray-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Previous
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex items-center gap-3 text-amber-400">
              <Flame className="w-5 h-5 animate-pulse" />
              <span>Loading rankings...</span>
            </div>
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 flex items-center justify-center">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No Rankings Yet</h2>
            <p className="text-gray-400 mb-6">Be the first to compete this month!</p>
            <Link
              href="/battles"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-gray-900 font-semibold rounded-lg hover:bg-amber-400 transition-colors"
            >
              <Swords className="w-4 h-4" />
              Start Battling
            </Link>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {/* Second Place */}
              <div className="order-2 md:order-1">
                {top3[1] ? (
                  <div className="h-full p-6 rounded-2xl bg-gradient-to-b from-slate-500/10 to-slate-600/5 border border-slate-500/20">
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                          {top3[1].userAvatar ? (
                            <img src={top3[1].userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(top3[1].userName)
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-slate-400 flex items-center justify-center text-sm font-bold text-white shadow-md">
                          2
                        </div>
                      </div>
                      <h3 className="font-bold text-white mb-1 truncate">{top3[1].userName}</h3>
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-3">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">{formatNumber(top3[1].points)}</span>
                        <span className="text-xs">pts</span>
                      </div>
                      <div className="pt-3 border-t border-slate-600/30">
                        <div className="flex items-center justify-center gap-1 text-amber-400">
                          <Coins className="w-4 h-4" />
                          <span className="font-semibold">{top3[1].prize.toLocaleString()}</span>
                        </div>
                        <span className="text-xs text-gray-500">Prize</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full p-6 rounded-2xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-center">
                    <span className="text-gray-600">—</span>
                  </div>
                )}
              </div>

              {/* First Place */}
              <div className="order-1 md:order-2">
                {top3[0] ? (
                  <div className="h-full p-6 rounded-2xl bg-gradient-to-b from-amber-500/15 to-yellow-600/5 border border-amber-500/30 relative">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Crown className="w-8 h-8 text-amber-400" />
                    </div>
                    <div className="text-center pt-4">
                      <div className="relative inline-block mb-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-amber-500/20">
                          {top3[0].userAvatar ? (
                            <img src={top3[0].userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(top3[0].userName)
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                          <Crown className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div className="inline-block px-3 py-1 mb-2 rounded-full bg-amber-500/20 text-xs font-semibold text-amber-400">
                        CHAMPION
                      </div>
                      <h3 className="font-bold text-white text-lg mb-1 truncate">{top3[0].userName}</h3>
                      <div className="flex items-center justify-center gap-1 text-amber-400 mb-3">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xl font-bold">{formatNumber(top3[0].points)}</span>
                        <span className="text-sm">pts</span>
                      </div>
                      <div className="pt-3 border-t border-amber-500/20">
                        <div className="flex items-center justify-center gap-1 text-amber-400">
                          <Coins className="w-5 h-5" />
                          <span className="text-lg font-bold">{top3[0].prize.toLocaleString()}</span>
                        </div>
                        <span className="text-xs text-amber-500/70">Prize</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full p-6 rounded-2xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-center">
                    <span className="text-gray-600">—</span>
                  </div>
                )}
              </div>

              {/* Third Place */}
              <div className="order-3">
                {top3[2] ? (
                  <div className="h-full p-6 rounded-2xl bg-gradient-to-b from-orange-600/10 to-orange-700/5 border border-orange-600/20">
                    <div className="text-center">
                      <div className="relative inline-block mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                          {top3[2].userAvatar ? (
                            <img src={top3[2].userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(top3[2].userName)
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white shadow-md">
                          3
                        </div>
                      </div>
                      <h3 className="font-bold text-white mb-1 truncate">{top3[2].userName}</h3>
                      <div className="flex items-center justify-center gap-1 text-orange-400 mb-3">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">{formatNumber(top3[2].points)}</span>
                        <span className="text-xs">pts</span>
                      </div>
                      <div className="pt-3 border-t border-orange-600/20">
                        <div className="flex items-center justify-center gap-1 text-amber-400">
                          <Coins className="w-4 h-4" />
                          <span className="font-semibold">{top3[2].prize.toLocaleString()}</span>
                        </div>
                        <span className="text-xs text-gray-500">Prize</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full p-6 rounded-2xl bg-gray-800/30 border border-gray-700/30 flex items-center justify-center">
                    <span className="text-gray-600">—</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rankings List */}
            {restOfLeaderboard.length > 0 && (
              <div className="rounded-2xl bg-gray-800/40 border border-gray-700/50 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-700/50 flex items-center gap-2">
                  <Star className="w-4 h-4 text-blue-400" />
                  <h2 className="font-semibold text-white">Full Rankings</h2>
                </div>
                <div className="divide-y divide-gray-700/30">
                  {restOfLeaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className="px-5 py-4 flex items-center gap-4 hover:bg-gray-700/20 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <span className="font-bold text-blue-400">#{entry.rank}</span>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {entry.userAvatar ? (
                          <img src={entry.userAvatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getInitials(entry.userName)
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">{entry.userName}</h3>
                        <div className="text-xs text-gray-500">
                          {entry.battlesWon} wins • {entry.battlesPlayed} battles
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <TrendingUp className="w-3 h-3 text-blue-400" />
                          <span className="font-semibold text-white">{formatNumber(entry.points)}</span>
                          <span className="text-xs text-gray-500">pts</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end text-xs text-gray-500">
                          <Coins className="w-3 h-3" />
                          <span>{entry.prize.toLocaleString()} prize</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="mt-10 text-center">
              <div className="inline-flex flex-col items-center p-8 rounded-2xl bg-gray-800/40 border border-gray-700/50">
                <Swords className="w-10 h-10 text-amber-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Ready to Compete?</h2>
                <p className="text-gray-400 mb-6 max-w-sm">
                  Join battles to earn points and climb the leaderboard!
                </p>
                <Link
                  href="/battles"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400 transition-all"
                >
                  <Swords className="w-5 h-5" />
                  Enter Battle Arena
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
