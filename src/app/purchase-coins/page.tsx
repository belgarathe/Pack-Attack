'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { 
  Coins, 
  Euro, 
  Sparkles, 
  Zap, 
  Crown, 
  Star, 
  Gift,
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Flame,
  TrendingUp,
  Package,
  Swords,
} from 'lucide-react';
import Link from 'next/link';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

type CoinPackage = {
  amount: number;
  price: number;
  bonus: number;
  popular?: boolean;
  bestValue?: boolean;
  icon: typeof Coins;
  gradient: string;
  description: string;
};

const coinPackages: CoinPackage[] = [
  { 
    amount: 100, 
    price: 5, 
    bonus: 0, 
    icon: Coins,
    gradient: 'from-slate-500 to-slate-600',
    description: 'Starter pack'
  },
  { 
    amount: 250, 
    price: 10, 
    bonus: 25, 
    icon: Star,
    gradient: 'from-blue-500 to-cyan-500',
    description: 'Great for beginners'
  },
  { 
    amount: 500, 
    price: 20, 
    bonus: 50, 
    popular: true,
    icon: Zap,
    gradient: 'from-purple-500 to-pink-500',
    description: 'Most popular choice'
  },
  { 
    amount: 1000, 
    price: 35, 
    bonus: 150, 
    icon: Flame,
    gradient: 'from-orange-500 to-red-500',
    description: 'Serious collector'
  },
  { 
    amount: 2500, 
    price: 75, 
    bonus: 500, 
    bestValue: true,
    icon: Crown,
    gradient: 'from-amber-500 to-yellow-500',
    description: 'Best value!'
  },
  { 
    amount: 5000, 
    price: 125, 
    bonus: 1250, 
    icon: Gift,
    gradient: 'from-emerald-500 to-teal-500',
    description: 'Ultimate pack'
  },
];

export default function PurchaseCoinsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage>(coinPackages[2]); // Default to popular
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetch('/api/user/coins')
      .then((res) => res.json())
      .then((data) => {
        if (data.coins !== undefined) {
          setUserCoins(data.coins);
        }
      })
      .catch(console.error);
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/purchase-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedPackage.price }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to purchase coins',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success! 🎉',
        description: `You received ${selectedPackage.amount + selectedPackage.bonus} coins!`,
      });

      setUserCoins(data.newBalance);
      emitCoinBalanceUpdate({ balance: data.newBalance });
    } catch (error) {
      console.error('Error purchasing coins:', error);
      addToast({
        title: 'Error',
        description: 'Failed to purchase coins',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalCoins = selectedPackage.amount + selectedPackage.bonus;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Decorative orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-amber-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative container py-12 md:py-16">
        {/* Header */}
        <div 
          className="text-center mb-12"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease, transform 0.5s ease'
          }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full glass border border-amber-500/30 text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-medium">Power Up Your Collection</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-white">Get </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400">Coins</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Unlock packs, join battles, and build your ultimate card collection
          </p>
        </div>

        {/* Current Balance */}
        {userCoins !== null && (
          <div 
            className="max-w-md mx-auto mb-10"
            style={{ 
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.5s ease 100ms, transform 0.5s ease 100ms'
            }}
          >
            <div className="glass-strong rounded-2xl p-5 flex items-center justify-between border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/20">
                  <Coins className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Current Balance</p>
                  <p className="text-2xl font-bold text-white">{userCoins.toLocaleString()}</p>
                </div>
              </div>
              <Link 
                href="/dashboard" 
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
              >
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Packages Grid */}
        <div 
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto mb-10"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 200ms, transform 0.5s ease 200ms'
          }}
        >
          {coinPackages.map((pkg, index) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage.amount === pkg.amount;
            
            return (
              <button
                key={pkg.amount}
                onClick={() => setSelectedPackage(pkg)}
                className={`group relative p-6 rounded-2xl text-left transition-all duration-300 ${
                  isSelected 
                    ? 'scale-[1.02] -translate-y-1' 
                    : 'hover:scale-[1.01] hover:-translate-y-0.5'
                }`}
                style={{ 
                  animationDelay: `${index * 50}ms`,
                }}
              >
                {/* Background */}
                <div className={`absolute inset-0 rounded-2xl transition-opacity ${
                  isSelected 
                    ? `bg-gradient-to-br ${pkg.gradient} opacity-20` 
                    : 'bg-white/[0.02] opacity-100'
                }`} />
                
                {/* Border */}
                <div className={`absolute inset-0 rounded-2xl border-2 transition-colors ${
                  isSelected 
                    ? `border-transparent bg-gradient-to-br ${pkg.gradient} opacity-50` 
                    : 'border-white/[0.08] group-hover:border-white/[0.15]'
                }`} style={{ 
                  WebkitMask: isSelected ? 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)' : undefined,
                  WebkitMaskComposite: isSelected ? 'xor' : undefined,
                  maskComposite: isSelected ? 'exclude' : undefined,
                }} />
                
                {/* Glass overlay */}
                <div className="absolute inset-[2px] rounded-[14px] bg-gray-900/80 backdrop-blur-xl" />

                {/* Badges */}
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-lg">
                    MOST POPULAR
                  </div>
                )}
                {pkg.bestValue && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-xs font-bold shadow-lg">
                    BEST VALUE
                  </div>
                )}

                {/* Content */}
                <div className="relative">
                  {/* Icon & Amount */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${pkg.gradient} shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {pkg.bonus > 0 && (
                      <div className="px-2.5 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                        <span className="text-green-400 text-xs font-bold">+{pkg.bonus} BONUS</span>
                      </div>
                    )}
                  </div>

                  {/* Coins */}
                  <div className="mb-2">
                    <span className="text-3xl font-bold text-white">{pkg.amount.toLocaleString()}</span>
                    {pkg.bonus > 0 && (
                      <span className="text-green-400 text-lg font-bold ml-1">+{pkg.bonus}</span>
                    )}
                    <span className="text-gray-400 ml-2">coins</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-500 mb-4">{pkg.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <Euro className="w-5 h-5 text-white" />
                    <span className="text-2xl font-bold text-white">{pkg.price}</span>
                    {pkg.bonus > 0 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({((pkg.price / (pkg.amount + pkg.bonus)) * 100).toFixed(1)}¢/coin)
                      </span>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute -right-1 -bottom-1">
                      <div className={`p-1.5 rounded-full bg-gradient-to-br ${pkg.gradient}`}>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Checkout Card */}
        <div 
          className="max-w-xl mx-auto"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 300ms, transform 0.5s ease 300ms'
          }}
        >
          <div className="relative overflow-hidden rounded-3xl">
            {/* Background gradient */}
            <div className={`absolute inset-0 bg-gradient-to-br ${selectedPackage.gradient} opacity-10`} />
            
            <div className="relative glass-strong p-8 border border-white/10">
              {/* Summary Header */}
              <div className="text-center mb-6">
                <p className="text-gray-400 text-sm mb-2">Your Purchase</p>
                <div className="flex items-center justify-center gap-3">
                  <Coins className="w-8 h-8 text-amber-400" />
                  <span className="text-4xl font-bold text-white">{totalCoins.toLocaleString()}</span>
                  <span className="text-gray-400 text-xl">coins</span>
                </div>
                {selectedPackage.bonus > 0 && (
                  <p className="text-green-400 text-sm mt-2 flex items-center justify-center gap-1">
                    <Gift className="w-4 h-4" />
                    Includes {selectedPackage.bonus} bonus coins!
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

              {/* Price breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">{selectedPackage.amount} coins</span>
                  <span className="text-white font-medium">€{selectedPackage.price}</span>
                </div>
                {selectedPackage.bonus > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">Bonus coins</span>
                    <span className="text-green-400 font-medium">+{selectedPackage.bonus} FREE</span>
                  </div>
                )}
                <div className="h-px bg-white/10" />
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">Total</span>
                  <div className="flex items-center gap-1">
                    <Euro className="w-5 h-5 text-white" />
                    <span className="text-2xl font-bold text-white">{selectedPackage.price}</span>
                  </div>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                onClick={handlePurchase}
                disabled={loading}
                className={`group relative w-full py-4 px-8 rounded-2xl font-bold text-lg transition-all duration-300 ${
                  loading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:scale-[1.02] hover:shadow-xl'
                } bg-gradient-to-r ${selectedPackage.gradient} text-white shadow-lg`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Purchase for €{selectedPackage.price}
                    </>
                  )}
                </span>
              </button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>Instant delivery</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What you can do with coins */}
        <div 
          className="max-w-4xl mx-auto mt-16"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.5s ease 400ms, transform 0.5s ease 400ms'
          }}
        >
          <h2 className="text-2xl font-bold text-center text-white mb-8">
            What can you do with coins?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { 
                icon: Package, 
                title: 'Open Packs', 
                description: 'Pull cards from various TCG sets',
                gradient: 'from-blue-500 to-cyan-500'
              },
              { 
                icon: Swords, 
                title: 'Join Battles', 
                description: 'Compete against other players',
                gradient: 'from-purple-500 to-pink-500'
              },
              { 
                icon: TrendingUp, 
                title: 'Win Real Cards', 
                description: 'Checkout and receive physical cards',
                gradient: 'from-emerald-500 to-teal-500'
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.title}
                  className="glass rounded-2xl p-6 text-center"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} mb-4 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-gray-600 mt-12">
          Note: In production, this integrates with Stripe for secure payment processing.
        </p>
      </div>
    </div>
  );
}
