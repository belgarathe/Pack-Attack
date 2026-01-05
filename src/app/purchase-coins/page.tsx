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
  Shield,
  Clock,
  CheckCircle2,
  ArrowRight,
  Flame,
  TrendingUp,
  Package,
  Swords,
  Rocket,
} from 'lucide-react';
import Link from 'next/link';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

type CoinPackage = {
  amount: number;
  price: number;
  popular?: boolean;
  bestValue?: boolean;
  icon: typeof Coins;
  gradient: string;
  shadowColor: string;
  label: string;
};

const coinPackages: CoinPackage[] = [
  { 
    amount: 500, 
    price: 5, 
    icon: Coins,
    gradient: 'from-slate-500 to-slate-600',
    shadowColor: 'shadow-slate-500/20',
    label: 'Starter',
  },
  { 
    amount: 1000, 
    price: 10, 
    icon: Star,
    gradient: 'from-blue-500 to-blue-600',
    shadowColor: 'shadow-blue-500/20',
    label: 'Basic',
  },
  { 
    amount: 2500, 
    price: 25, 
    popular: true,
    icon: Zap,
    gradient: 'from-purple-500 to-pink-500',
    shadowColor: 'shadow-purple-500/30',
    label: 'Popular',
  },
  { 
    amount: 5000, 
    price: 50, 
    icon: Flame,
    gradient: 'from-orange-500 to-red-500',
    shadowColor: 'shadow-orange-500/20',
    label: 'Pro',
  },
  { 
    amount: 10000, 
    price: 100, 
    bestValue: true,
    icon: Crown,
    gradient: 'from-amber-400 to-yellow-500',
    shadowColor: 'shadow-amber-500/30',
    label: 'Premium',
  },
  { 
    amount: 25000, 
    price: 250, 
    icon: Rocket,
    gradient: 'from-emerald-500 to-teal-500',
    shadowColor: 'shadow-emerald-500/20',
    label: 'Ultimate',
  },
];

export default function PurchaseCoinsPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage>(coinPackages[2]);
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
        description: `You received ${selectedPackage.amount.toLocaleString()} coins!`,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="fixed inset-0 radial-gradient pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Header */}
        <div 
          className="text-center mb-16"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease'
          }}
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 mb-8 rounded-full glass border border-amber-500/20">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-semibold">Power Up Your Collection</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            <span className="text-white">Get </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400">Coins</span>
          </h1>
          <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
            Unlock packs, join epic battles, and build your ultimate trading card collection
          </p>
        </div>

        {/* Current Balance Card */}
        {userCoins !== null && (
          <div 
            className="max-w-lg mx-auto mb-16"
            style={{ 
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'opacity 0.6s ease 150ms, transform 0.6s ease 150ms'
            }}
          >
            <div className="glass-strong rounded-3xl p-6 flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/20">
                  <Coins className="w-7 h-7 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Current Balance</p>
                  <p className="text-3xl font-bold text-white">{userCoins.toLocaleString()}</p>
                </div>
              </div>
              <Link 
                href="/dashboard" 
                className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-sm font-medium"
              >
                Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Section Title */}
        <h2 className="text-center text-gray-400 text-sm font-semibold uppercase tracking-wider mb-8">
          Choose Your Package
        </h2>

        {/* Packages Grid */}
        <div 
          className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 300ms, transform 0.6s ease 300ms'
          }}
        >
          {coinPackages.map((pkg, index) => {
            const Icon = pkg.icon;
            const isSelected = selectedPackage.amount === pkg.amount;
            
            return (
              <button
                key={pkg.amount}
                onClick={() => setSelectedPackage(pkg)}
                className={`group relative text-left transition-all duration-300 ${
                  isSelected 
                    ? 'scale-[1.02]' 
                    : 'hover:scale-[1.01]'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${
                  isSelected 
                    ? `ring-2 ring-offset-2 ring-offset-gray-950 ${pkg.gradient.includes('amber') ? 'ring-amber-500' : pkg.gradient.includes('purple') ? 'ring-purple-500' : pkg.gradient.includes('blue') ? 'ring-blue-500' : pkg.gradient.includes('orange') ? 'ring-orange-500' : pkg.gradient.includes('emerald') ? 'ring-emerald-500' : 'ring-slate-500'}` 
                    : ''
                }`}>
                  
                  {/* Badges */}
                  {pkg.popular && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold shadow-lg">
                      POPULAR
                    </div>
                  )}
                  {pkg.bestValue && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-xs font-bold shadow-lg">
                      BEST VALUE
                    </div>
                  )}

                  {/* Card Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${pkg.gradient} opacity-[0.08] group-hover:opacity-[0.12] transition-opacity`} />
                  <div className="absolute inset-0 bg-gray-900/90" />

                  {/* Card Content */}
                  <div className="relative p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2.5 rounded-xl bg-gradient-to-br ${pkg.gradient} shadow-lg ${pkg.shadowColor}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{pkg.label}</p>
                        <p className="text-gray-500 text-xs">Package</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-white">{pkg.amount.toLocaleString()}</span>
                        <span className="text-gray-500 text-sm">coins</span>
                      </div>
                    </div>

                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-0.5">
                        <Euro className="w-4 h-4 text-white" />
                        <span className="text-xl font-bold text-white">{pkg.price}</span>
                      </div>
                      
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? `bg-gradient-to-br ${pkg.gradient} border-transparent` 
                          : 'border-gray-600 group-hover:border-gray-500'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clear separator */}
        <div className="w-full" style={{ clear: 'both', display: 'block', height: '80px' }} />

        {/* Divider */}
        <div className="max-w-xl mx-auto" style={{ display: 'block', marginBottom: '64px' }}>
          <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>

        {/* Purchase Summary */}
        <div 
          className="max-w-md mx-auto"
          style={{ display: 'block', marginBottom: '96px' }}
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 450ms, transform 0.6s ease 450ms'
          }}
        >
          <div className={`relative rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-8 shadow-2xl`}>
            {/* Glow Effect */}
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${selectedPackage.gradient} rounded-3xl blur opacity-20 -z-10`} />
            
            <div className="text-center mb-6">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mb-3">Your Purchase</p>
              <div className="flex items-center justify-center gap-3">
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${selectedPackage.gradient}`}>
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <span className="text-3xl font-bold text-white">{selectedPackage.amount.toLocaleString()}</span>
                  <p className="text-gray-400 text-sm">coins</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

            <div className="flex items-center justify-between mb-6">
              <span className="text-gray-400">Total</span>
              <div className="flex items-baseline gap-0.5">
                <Euro className="w-5 h-5 text-white" />
                <span className="text-2xl font-bold text-white">{selectedPackage.price}</span>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={loading}
              className={`group relative w-full py-4 px-6 rounded-xl font-bold transition-all duration-300 ${
                loading 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:scale-[1.02] hover:shadow-2xl'
              } bg-gradient-to-r ${selectedPackage.gradient} text-white shadow-xl`}
            >
              <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Purchase Now
                  </>
                )}
              </span>
            </button>

            <div className="flex items-center justify-center gap-6 mt-6 text-gray-500 text-xs">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Instant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div 
          className="max-w-4xl mx-auto"
          style={{ 
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease 600ms, transform 0.6s ease 600ms'
          }}
        >
          <h2 className="text-center text-2xl md:text-3xl font-bold text-white mb-4">
            What can you do with coins?
          </h2>
          <p className="text-center text-gray-500 mb-10 max-w-xl mx-auto">
            Use your coins to unlock amazing features and build your collection
          </p>
          
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { 
                icon: Package, 
                title: 'Open Packs', 
                description: 'Pull cards from various TCG sets including Magic, Pokemon, and more',
                gradient: 'from-blue-500 to-cyan-500'
              },
              { 
                icon: Swords, 
                title: 'Join Battles', 
                description: 'Compete against other players in exciting pack battles',
                gradient: 'from-purple-500 to-pink-500'
              },
              { 
                icon: TrendingUp, 
                title: 'Win Real Cards', 
                description: 'Checkout your winnings and receive physical cards delivered to you',
                gradient: 'from-emerald-500 to-teal-500'
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div 
                  key={item.title}
                  className="glass rounded-2xl p-6 text-center hover:bg-white/[0.03] transition-colors"
                >
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${item.gradient} mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Note */}
        <p className="text-center text-xs text-gray-600 mt-16">
          Secure payments processed via Stripe
        </p>
      </div>
    </div>
  );
}
