'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Coins, Swords, Clock } from 'lucide-react';
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
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Amber accent for leaderboard */}
      <div className="fixed top-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl hidden lg:block" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full glass text-sm border border-amber-500/20">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300">Battle Rankings</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="text-white">Battle </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Leaderboard</span>
          </h1>
          <p className="text-gray-400 text-lg mb-6">
            Top 10 players each month win coin prizes!
          </p>

          {/* Period Toggle */}
          <div className="inline-flex items-center gap-1 p-1 mb-6 rounded-xl glass border border-gray-700">
            <button
              onClick={() => setPeriod('current')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === 'current'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('previous')}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                period === 'previous'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Last Month
            </button>
          </div>

          {/* Countdown Timer */}
          {period === 'current' && (
            <div className="flex items-center justify-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-gray-400">Resets in:</span>
              <span className="font-mono font-bold text-white">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m {countdown.seconds}s
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <span className="text-gray-400">Loading rankings...</span>
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Trophy className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Rankings Yet</h2>
            <p className="text-gray-400 mb-6">Be the first champion of this season!</p>
            <Link
              href="/battles"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Swords className="w-5 h-5" />
              Start Battling
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* 2nd Place */}
              <div className="order-2 md:order-1 md:mt-8">
                {top3[1] ? (
                  <div className="glass-strong rounded-2xl p-6 text-center border border-slate-500/30">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center">
                      <span className="text-2xl font-black text-white">2</span>
                    </div>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 p-1">
                      <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                        {top3[1].userAvatar ? (
                          <img src={top3[1].userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-slate-400">{getInitials(top3[1].userName)}</span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-white mb-2 truncate">{top3[1].userName}</h3>
                    <div className="text-2xl font-black text-slate-300 mb-1">{formatNumber(top3[1].points)} <span className="text-sm text-slate-500">PTS</span></div>
                    <div className="text-xs text-gray-500 mb-4">{top3[1].battlesWon} wins / {top3[1].battlesPlayed} battles</div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-400">{top3[1].prize.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-6 text-center border border-gray-700 min-h-[280px] flex items-center justify-center">
                    <span className="text-gray-600 text-2xl">—</span>
                  </div>
                )}
              </div>

              {/* 1st Place */}
              <div className="order-1 md:order-2">
                {top3[0] ? (
                  <div className="glass-strong rounded-2xl p-6 text-center border-2 border-amber-500/50 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent" />
                    <div className="relative">
                      <Crown className="w-12 h-12 mx-auto mb-2 text-amber-400" />
                      <span className="inline-block px-3 py-1 mb-4 text-xs font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-black rounded-full">
                        CHAMPION
                      </span>
                      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1 shadow-lg shadow-amber-500/30">
                        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                          {top3[0].userAvatar ? (
                            <img src={top3[0].userAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl font-bold text-amber-400">{getInitials(top3[0].userName)}</span>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-white mb-2 truncate">{top3[0].userName}</h3>
                      <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 mb-1">
                        {formatNumber(top3[0].points)} <span className="text-sm text-amber-500/70">PTS</span>
                      </div>
                      <div className="text-xs text-gray-400 mb-4">{top3[0].battlesWon} wins / {top3[0].battlesPlayed} battles</div>
                      <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500/20 rounded-xl border border-amber-500/30">
                        <Coins className="w-5 h-5 text-amber-400" />
                        <span className="text-xl font-black text-amber-400">{top3[0].prize.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-6 text-center border border-gray-700 min-h-[320px] flex items-center justify-center">
                    <span className="text-gray-600 text-2xl">—</span>
                  </div>
                )}
              </div>

              {/* 3rd Place */}
              <div className="order-3 md:mt-8">
                {top3[2] ? (
                  <div className="glass-strong rounded-2xl p-6 text-center border border-orange-600/30">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                      <span className="text-2xl font-black text-white">3</span>
                    </div>
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 p-1">
                      <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                        {top3[2].userAvatar ? (
                          <img src={top3[2].userAvatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-bold text-orange-400">{getInitials(top3[2].userName)}</span>
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-white mb-2 truncate">{top3[2].userName}</h3>
                    <div className="text-2xl font-black text-orange-300 mb-1">{formatNumber(top3[2].points)} <span className="text-sm text-orange-500/70">PTS</span></div>
                    <div className="text-xs text-gray-500 mb-4">{top3[2].battlesWon} wins / {top3[2].battlesPlayed} battles</div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-xl">
                      <Coins className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-400">{top3[2].prize.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-2xl p-6 text-center border border-gray-700 min-h-[280px] flex items-center justify-center">
                    <span className="text-gray-600 text-2xl">—</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rest of Rankings */}
            {restOfLeaderboard.length > 0 && (
              <div className="glass-strong rounded-2xl overflow-hidden mb-10">
                <div className="px-6 py-4 border-b border-gray-700">
                  <h2 className="font-semibold text-white text-center">Full Rankings</h2>
                </div>
                <div className="divide-y divide-gray-700/50">
                  {restOfLeaderboard.map((entry) => (
                    <div key={entry.userId} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-gray-400">#{entry.rank}</span>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                          {entry.userAvatar ? (
                            <img src={entry.userAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-blue-400">{getInitials(entry.userName)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-center">
                        <h3 className="font-semibold text-white truncate">{entry.userName}</h3>
                        <p className="text-xs text-gray-500">{entry.battlesWon} wins • {entry.battlesPlayed} battles</p>
                      </div>
                      <div className="text-center flex-shrink-0">
                        <span className="font-bold text-white">{formatNumber(entry.points)}</span>
                        <span className="text-xs text-gray-500 ml-1">PTS</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-lg flex-shrink-0">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-amber-400">{entry.prize.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="glass-strong rounded-2xl p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                <Swords className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Ready to Compete?</h2>
              <p className="text-gray-400 mb-6">Join battles to earn points and climb the leaderboard!</p>
              <Link
                href="/battles"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all hover:scale-105 shimmer"
              >
                <Swords className="w-5 h-5" />
                Enter Battle Arena
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
