'use client';

import { useState, useEffect } from 'react';
import { Trophy, Crown, Medal, Coins, Swords, Clock, ChevronRight } from 'lucide-react';
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

  // Reorder for podium: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          {/* Trophy Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30">
            <Trophy className="w-10 h-10 text-white" />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tight">
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              LEADERBOARD
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            Top 10 warriors earn monthly coin prizes
          </p>

          {/* Period Toggle */}
          <div className="inline-flex items-center gap-1 p-1.5 mb-8 rounded-full bg-gray-900/80 border border-gray-800">
            <button
              onClick={() => setPeriod('current')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                period === 'current'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              This Month
            </button>
            <button
              onClick={() => setPeriod('previous')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
                period === 'previous'
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-black shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Last Month
            </button>
          </div>

          {/* Countdown Timer */}
          {period === 'current' && (
            <div className="flex items-center justify-center gap-3">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-gray-400 text-sm">Season ends in</span>
              <div className="flex items-center gap-2 font-mono">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{String(countdown.days).padStart(2, '0')}</span>
                  <span className="text-[10px] text-gray-500 uppercase">Days</span>
                </div>
                <span className="text-amber-400 text-xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{String(countdown.hours).padStart(2, '0')}</span>
                  <span className="text-[10px] text-gray-500 uppercase">Hrs</span>
                </div>
                <span className="text-amber-400 text-xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{String(countdown.minutes).padStart(2, '0')}</span>
                  <span className="text-[10px] text-gray-500 uppercase">Min</span>
                </div>
                <span className="text-amber-400 text-xl font-bold">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-black text-white">{String(countdown.seconds).padStart(2, '0')}</span>
                  <span className="text-[10px] text-gray-500 uppercase">Sec</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-4" />
            <span className="text-gray-400">Loading rankings...</span>
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-gray-800/50 border-2 border-dashed border-gray-700">
              <Trophy className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">No Rankings Yet</h2>
            <p className="text-gray-500 mb-8">Be the first champion of this season!</p>
            <Link
              href="/battles"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold rounded-full hover:shadow-lg hover:shadow-amber-500/30 transition-all"
            >
              <Swords className="w-5 h-5" />
              Enter Battle Arena
            </Link>
          </div>
        ) : (
          <>
            {/* Podium Section - 3 Column Layout */}
            <div className="flex flex-col md:flex-row items-end justify-center gap-4 mb-16 px-4">
              {/* 2nd Place */}
              <div className="w-full md:w-72 order-2 md:order-1">
                {top3[1] ? (
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-slate-400/10 blur-xl rounded-3xl" />
                    <div className="relative bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur rounded-3xl border border-slate-500/30 p-8">
                      {/* Rank Badge */}
                      <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center shadow-lg">
                          <span className="text-xl font-black text-white">2</span>
                        </div>
                      </div>
                      
                      {/* Avatar */}
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 p-1">
                          <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                            {top3[1].userAvatar ? (
                              <img src={top3[1].userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl font-bold text-slate-400">{getInitials(top3[1].userName)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="text-center text-lg font-bold text-white mb-2 truncate px-2">
                        {top3[1].userName}
                      </h3>

                      {/* Stats */}
                      <div className="text-center mb-4">
                        <span className="text-3xl font-black text-slate-300">{formatNumber(top3[1].points)}</span>
                        <span className="text-sm text-slate-500 ml-1">PTS</span>
                      </div>

                      {/* Battles */}
                      <div className="text-center text-sm text-gray-500 mb-4">
                        {top3[1].battlesWon} wins / {top3[1].battlesPlayed} battles
                      </div>

                      {/* Prize */}
                      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-500/10 rounded-xl">
                        <Coins className="w-5 h-5 text-amber-400" />
                        <span className="text-lg font-bold text-amber-400">{top3[1].prize.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/50 rounded-3xl border border-gray-800 p-8 min-h-[300px] flex items-center justify-center">
                    <span className="text-gray-700 text-4xl font-bold">—</span>
                  </div>
                )}
              </div>

              {/* 1st Place - Larger */}
              <div className="w-full md:w-80 order-1 md:order-2">
                {top3[0] ? (
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-3xl" />
                    <div className="relative bg-gradient-to-b from-amber-900/40 to-gray-900/90 backdrop-blur rounded-3xl border-2 border-amber-500/50 p-8">
                      {/* Crown */}
                      <div className="flex justify-center mb-4">
                        <div className="relative">
                          <Crown className="w-16 h-16 text-amber-400 drop-shadow-lg" />
                          <div className="absolute inset-0 animate-pulse">
                            <Crown className="w-16 h-16 text-amber-300 blur-sm" />
                          </div>
                        </div>
                      </div>

                      {/* Champion Badge */}
                      <div className="flex justify-center mb-4">
                        <span className="px-4 py-1.5 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black rounded-full uppercase tracking-wider">
                          Champion
                        </span>
                      </div>
                      
                      {/* Avatar */}
                      <div className="flex justify-center mb-4">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-xl shadow-amber-500/30">
                          <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                            {top3[0].userAvatar ? (
                              <img src={top3[0].userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-3xl font-bold text-amber-400">{getInitials(top3[0].userName)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="text-center text-xl font-bold text-white mb-2 truncate px-2">
                        {top3[0].userName}
                      </h3>

                      {/* Stats */}
                      <div className="text-center mb-4">
                        <span className="text-4xl font-black bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
                          {formatNumber(top3[0].points)}
                        </span>
                        <span className="text-sm text-amber-500/70 ml-2">PTS</span>
                      </div>

                      {/* Battles */}
                      <div className="text-center text-sm text-gray-400 mb-4">
                        {top3[0].battlesWon} wins / {top3[0].battlesPlayed} battles
                      </div>

                      {/* Prize */}
                      <div className="flex items-center justify-center gap-2 py-4 px-6 bg-amber-500/10 rounded-xl border border-amber-500/20">
                        <Coins className="w-6 h-6 text-amber-400" />
                        <span className="text-2xl font-black text-amber-400">{top3[0].prize.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/50 rounded-3xl border border-gray-800 p-8 min-h-[350px] flex items-center justify-center">
                    <span className="text-gray-700 text-4xl font-bold">—</span>
                  </div>
                )}
              </div>

              {/* 3rd Place */}
              <div className="w-full md:w-72 order-3">
                {top3[2] ? (
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-orange-600/10 blur-xl rounded-3xl" />
                    <div className="relative bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur rounded-3xl border border-orange-700/30 p-8">
                      {/* Rank Badge */}
                      <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
                          <span className="text-xl font-black text-white">3</span>
                        </div>
                      </div>
                      
                      {/* Avatar */}
                      <div className="flex justify-center mb-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-orange-700 p-1">
                          <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                            {top3[2].userAvatar ? (
                              <img src={top3[2].userAvatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-2xl font-bold text-orange-400">{getInitials(top3[2].userName)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Name */}
                      <h3 className="text-center text-lg font-bold text-white mb-2 truncate px-2">
                        {top3[2].userName}
                      </h3>

                      {/* Stats */}
                      <div className="text-center mb-4">
                        <span className="text-3xl font-black text-orange-300">{formatNumber(top3[2].points)}</span>
                        <span className="text-sm text-orange-500/70 ml-1">PTS</span>
                      </div>

                      {/* Battles */}
                      <div className="text-center text-sm text-gray-500 mb-4">
                        {top3[2].battlesWon} wins / {top3[2].battlesPlayed} battles
                      </div>

                      {/* Prize */}
                      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-orange-600/10 rounded-xl">
                        <Coins className="w-5 h-5 text-amber-400" />
                        <span className="text-lg font-bold text-amber-400">{top3[2].prize.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-900/50 rounded-3xl border border-gray-800 p-8 min-h-[300px] flex items-center justify-center">
                    <span className="text-gray-700 text-4xl font-bold">—</span>
                  </div>
                )}
              </div>
            </div>

            {/* Rest of Rankings */}
            {restOfLeaderboard.length > 0 && (
              <div className="mb-16">
                <h2 className="text-center text-xl font-bold text-white mb-6">
                  Full Rankings
                </h2>
                <div className="space-y-3">
                  {restOfLeaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className="flex items-center gap-4 p-4 bg-gray-900/50 backdrop-blur rounded-2xl border border-gray-800 hover:border-gray-700 transition-colors"
                    >
                      {/* Rank */}
                      <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-black text-gray-400">#{entry.rank}</span>
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-0.5 flex-shrink-0">
                        <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                          {entry.userAvatar ? (
                            <img src={entry.userAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-blue-400">{getInitials(entry.userName)}</span>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 text-center md:text-left">
                        <h3 className="font-bold text-white truncate">{entry.userName}</h3>
                        <p className="text-xs text-gray-500">
                          {entry.battlesWon} wins • {entry.battlesPlayed} battles
                        </p>
                      </div>

                      {/* Points */}
                      <div className="text-center flex-shrink-0">
                        <span className="text-xl font-black text-white">{formatNumber(entry.points)}</span>
                        <span className="text-xs text-gray-500 ml-1">PTS</span>
                      </div>

                      {/* Prize */}
                      <div className="flex items-center gap-1.5 px-4 py-2 bg-amber-500/10 rounded-xl flex-shrink-0">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-amber-400">{entry.prize.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="text-center">
              <div className="inline-block p-8 bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur rounded-3xl border border-gray-800">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Swords className="w-8 h-8 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Ready to Compete?</h2>
                <p className="text-gray-400 mb-6 max-w-sm mx-auto">
                  Join battles to earn points and climb the leaderboard!
                </p>
                <Link
                  href="/battles"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-bold rounded-full hover:shadow-xl hover:shadow-amber-500/30 transition-all"
                >
                  <Swords className="w-5 h-5" />
                  Enter Battle Arena
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
