'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Award, Coins, Swords, Clock, Star, Flame, TrendingUp, ChevronRight, Sparkles } from 'lucide-react';
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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <Award className="w-5 h-5 text-blue-400" />;
    }
  };

  const getRankGradient = (rank: number) => {
    switch (rank) {
      case 1: return 'from-yellow-500/30 via-amber-500/20 to-yellow-600/30';
      case 2: return 'from-gray-400/20 via-slate-400/15 to-gray-500/20';
      case 3: return 'from-amber-700/20 via-orange-600/15 to-amber-800/20';
      default: return 'from-gray-800/50 to-gray-900/50';
    }
  };

  const getRankBorder = (rank: number) => {
    switch (rank) {
      case 1: return 'border-yellow-500/50 shadow-yellow-500/20';
      case 2: return 'border-gray-400/50 shadow-gray-400/10';
      case 3: return 'border-amber-600/50 shadow-amber-600/10';
      default: return 'border-gray-700/50';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const top3 = data?.leaderboard.slice(0, 3) || [];
  const restOfTop10 = data?.fullLeaderboard.slice(3, 10) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Animated background orbs */}
      <div className="fixed top-20 left-10 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl animate-float hidden lg:block" />
      <div className="fixed bottom-20 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-float hidden lg:block" style={{ animationDelay: '2s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-yellow-500/3 to-transparent rounded-full" />

      <div className="relative container py-12">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass border border-yellow-500/30">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-400">Battle Champions</span>
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 animate-gradient">
              LEADERBOARD
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Compete in battles, climb the ranks, and win monthly prizes. Top 10 players earn coins and glory!
          </p>

          {/* Countdown Timer */}
          {period === 'current' && (
            <div className="inline-flex items-center gap-4 px-6 py-3 glass-strong rounded-2xl border border-yellow-500/20">
              <Clock className="w-5 h-5 text-yellow-400" />
              <span className="text-gray-400">Resets in:</span>
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-2xl font-bold text-white font-mono">{String(countdown.days).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 block">days</span>
                </div>
                <span className="text-yellow-400 text-xl">:</span>
                <div className="text-center">
                  <span className="text-2xl font-bold text-white font-mono">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 block">hrs</span>
                </div>
                <span className="text-yellow-400 text-xl">:</span>
                <div className="text-center">
                  <span className="text-2xl font-bold text-white font-mono">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 block">min</span>
                </div>
                <span className="text-yellow-400 text-xl">:</span>
                <div className="text-center">
                  <span className="text-2xl font-bold text-white font-mono">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="text-xs text-gray-500 block">sec</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Period Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 glass-strong rounded-xl">
            <button
              onClick={() => setPeriod('current')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                period === 'current'
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {data ? `${data.monthName} ${data.year}` : 'Current Month'}
            </button>
            <button
              onClick={() => setPeriod('previous')}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                period === 'previous'
                  ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Previous Month
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex items-center gap-3 text-yellow-400">
              <Flame className="w-6 h-6 animate-pulse" />
              <span className="text-lg">Loading rankings...</span>
            </div>
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="glass-strong rounded-2xl p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-yellow-500/20">
              <Trophy className="w-10 h-10 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Rankings Yet</h2>
            <p className="text-gray-400 mb-8">
              Be the first to compete in battles this month and claim the top spot!
            </p>
            <Link
              href="/battles"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-600 to-amber-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
            >
              <Swords className="w-5 h-5" />
              Start Battling
            </Link>
          </div>
        ) : (
          <>
            {/* Top 3 Podium */}
            <div className="mb-12">
              <div className="flex flex-col md:flex-row items-end justify-center gap-4 md:gap-6 max-w-4xl mx-auto">
                {/* 2nd Place */}
                {top3[1] && (
                  <div className="order-2 md:order-1 w-full md:w-1/3">
                    <div className={`glass rounded-2xl p-6 border-2 ${getRankBorder(2)} bg-gradient-to-br ${getRankGradient(2)} transform hover:scale-105 transition-all duration-300`}>
                      <div className="text-center">
                        <div className="relative inline-block mb-4">
                          {top3[1].userAvatar ? (
                            <img 
                              src={top3[1].userAvatar} 
                              alt={top3[1].userName}
                              className="w-20 h-20 rounded-full object-cover border-4 border-gray-400/50"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-400 to-slate-500 flex items-center justify-center text-2xl font-bold text-white border-4 border-gray-400/50">
                              {getInitials(top3[1].userName)}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-lg">
                            <span className="text-gray-900 font-bold text-lg">2</span>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{top3[1].userName}</h3>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <TrendingUp className="w-4 h-4 text-gray-400" />
                          <span className="text-xl font-bold text-gray-300">{formatNumber(top3[1].points)}</span>
                          <span className="text-sm text-gray-500">pts</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-600/30">
                          <div className="flex items-center justify-center gap-1 text-gray-400">
                            <Coins className="w-4 h-4" />
                            <span className="font-semibold text-gray-300">{top3[1].prize.toLocaleString()}</span>
                            <span className="text-sm">coins</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 1st Place */}
                {top3[0] && (
                  <div className="order-1 md:order-2 w-full md:w-1/3 md:-mt-8">
                    <div className={`glass rounded-2xl p-8 border-2 ${getRankBorder(1)} bg-gradient-to-br ${getRankGradient(1)} transform hover:scale-105 transition-all duration-300 relative overflow-hidden`}>
                      {/* Crown decoration */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <Crown className="w-12 h-12 text-yellow-400" />
                      </div>
                      
                      <div className="text-center pt-4">
                        <div className="relative inline-block mb-4">
                          {top3[0].userAvatar ? (
                            <img 
                              src={top3[0].userAvatar} 
                              alt={top3[0].userName}
                              className="w-24 h-24 rounded-full object-cover border-4 border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-3xl font-bold text-white border-4 border-yellow-500/50 shadow-lg shadow-yellow-500/20">
                              {getInitials(top3[0].userName)}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                            <Crown className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="inline-flex items-center gap-1 px-3 py-1 mb-2 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                          <Sparkles className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs font-semibold text-yellow-400">CHAMPION</span>
                        </div>
                        <h3 className="text-xl font-bold text-white truncate">{top3[0].userName}</h3>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <TrendingUp className="w-5 h-5 text-yellow-400" />
                          <span className="text-2xl font-bold text-yellow-400">{formatNumber(top3[0].points)}</span>
                          <span className="text-sm text-yellow-500">pts</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-yellow-600/30">
                          <div className="flex items-center justify-center gap-1 text-yellow-400">
                            <Coins className="w-5 h-5" />
                            <span className="font-bold text-xl">{top3[0].prize.toLocaleString()}</span>
                            <span className="text-sm">coins</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {top3[2] && (
                  <div className="order-3 w-full md:w-1/3">
                    <div className={`glass rounded-2xl p-6 border-2 ${getRankBorder(3)} bg-gradient-to-br ${getRankGradient(3)} transform hover:scale-105 transition-all duration-300`}>
                      <div className="text-center">
                        <div className="relative inline-block mb-4">
                          {top3[2].userAvatar ? (
                            <img 
                              src={top3[2].userAvatar} 
                              alt={top3[2].userName}
                              className="w-20 h-20 rounded-full object-cover border-4 border-amber-700/50"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center text-2xl font-bold text-white border-4 border-amber-700/50">
                              {getInitials(top3[2].userName)}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-lg">3</span>
                          </div>
                        </div>
                        <h3 className="text-lg font-bold text-white truncate">{top3[2].userName}</h3>
                        <div className="flex items-center justify-center gap-1 mt-2">
                          <TrendingUp className="w-4 h-4 text-amber-500" />
                          <span className="text-xl font-bold text-amber-500">{formatNumber(top3[2].points)}</span>
                          <span className="text-sm text-amber-600">pts</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-amber-700/30">
                          <div className="flex items-center justify-center gap-1 text-amber-500">
                            <Coins className="w-4 h-4" />
                            <span className="font-semibold">{top3[2].prize.toLocaleString()}</span>
                            <span className="text-sm">coins</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rest of Top 10 */}
            {restOfTop10.length > 0 && (
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <Star className="w-5 h-5 text-blue-400" />
                  <h2 className="text-xl font-bold text-white">Full Rankings</h2>
                </div>
                <div className="space-y-3">
                  {restOfTop10.map((entry) => (
                    <div
                      key={entry.userId}
                      className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group"
                    >
                      {/* Rank */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-400">#{entry.rank}</span>
                      </div>

                      {/* Avatar & Name */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {entry.userAvatar ? (
                          <img 
                            src={entry.userAvatar} 
                            alt={entry.userName}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white">
                            {getInitials(entry.userName)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-semibold text-white truncate">{entry.userName}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{entry.battlesWon} wins</span>
                            <span>•</span>
                            <span>{entry.battlesPlayed} battles</span>
                          </div>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-blue-400" />
                          <span className="font-bold text-white">{formatNumber(entry.points)}</span>
                          <span className="text-xs text-gray-500">pts</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Coins className="w-3 h-3" />
                          <span>{entry.prize.toLocaleString()} prize</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Section */}
            <div className="mt-16 text-center">
              <div className="glass-strong rounded-2xl p-10 max-w-2xl mx-auto">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-amber-500/20">
                  <Swords className="w-8 h-8 text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Ready to Compete?</h2>
                <p className="text-gray-400 mb-8">
                  Join battles, win matches, and climb the leaderboard to earn monthly prizes!
                </p>
                <Link
                  href="/battles"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white font-semibold rounded-xl transition-all hover:scale-105 shimmer"
                >
                  <Swords className="w-5 h-5" />
                  Enter Battle Arena
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
