'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  BarChart3,
  Settings,
  Coins,
  Trophy,
  Swords,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ShoppingCart,
  Filter,
  Search,
  User,
  Mail,
  MapPin,
  Phone,
  Save,
  Calendar,
  Star,
  Zap,
  Target,
  Award,
  X,
} from 'lucide-react';

type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
  avatar: string | null;
  coins: number;
  emailVerified: boolean;
  shippingName: string | null;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingZip: string | null;
  shippingCountry: string | null;
  shippingPhone: string | null;
  createdAt: string;
};

type Pull = {
  id: string;
  timestamp: string;
  card: {
    id: string;
    name: string;
    rarity: string;
    coinValue: number;
    imageUrlGatherer: string;
    sourceGame: string;
  } | null;
  box: { name: string };
  cartItem: { id: string } | null;
};

type Order = {
  id: string;
  status: string;
  totalCoins: number;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
  createdAt: string;
  items: Array<{
    id: string;
    cardName: string;
    cardImage: string | null;
    coinValue: number;
  }>;
};

type Stats = {
  totalPulls: number;
  totalBattles: number;
  battlesWon: number;
  winRate: number;
  totalOrders: number;
  pendingOrders: number;
  totalSales: number;
  totalCoinsEarned: number;
  collectionValue: number;
  currentCoins: number;
};

type DashboardProps = {
  initialUser: UserProfile;
  initialPulls: Pull[];
  initialStats: {
    pulls: number;
    battles: number;
    wins: number;
  };
};

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'collection', label: 'Collection', icon: Package },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function DashboardClient({ initialUser, initialPulls, initialStats }: DashboardProps) {
  const { addToast } = useToast();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [user, setUser] = useState(initialUser);
  const [pulls, setPulls] = useState(initialPulls);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [rarityFilter, setRarityFilter] = useState('');
  const [gameFilter, setGameFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  
  // Card zoom
  const [zoomedCard, setZoomedCard] = useState<Pull | null>(null);
  
  // Profile form
  const [profileForm, setProfileForm] = useState({
    name: user.name || '',
    bio: user.bio || '',
    shippingName: user.shippingName || '',
    shippingAddress: user.shippingAddress || '',
    shippingCity: user.shippingCity || '',
    shippingZip: user.shippingZip || '',
    shippingCountry: user.shippingCountry || '',
    shippingPhone: user.shippingPhone || '',
  });

  // Fetch detailed stats when statistics tab is opened
  useEffect(() => {
    if (activeTab === 'statistics' && !stats) {
      fetchStats();
    }
  }, [activeTab, stats]);

  // Fetch orders when orders tab is opened
  useEffect(() => {
    if (activeTab === 'orders' && orders.length === 0) {
      fetchOrders();
    }
  }, [activeTab, orders.length]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/stats');
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (orderStatusFilter) params.set('status', orderStatusFilter);
      
      const res = await fetch(`/api/user/orders?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to save profile',
          variant: 'destructive',
        });
        return;
      }
      
      setUser(data.user);
      addToast({
        title: 'Success',
        description: 'Profile saved successfully!',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSellCard = async (pullId: string, coinValue: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/cards/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to sell card',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: `Card sold for ${coinValue} coins!`,
      });

      if (data.newBalance !== undefined) {
        emitCoinBalanceUpdate({ balance: data.newBalance });
        setUser(prev => ({ ...prev, coins: data.newBalance }));
      }
      
      setPulls(prev => prev.filter(p => p.id !== pullId));
      setZoomedCard(null);
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to sell card',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (pullId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to add to cart',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: 'Card added to cart!',
      });

      setPulls(prev => prev.map(p => 
        p.id === pullId ? { ...p, cartItem: { id: 'temp' } } : p
      ));
      setZoomedCard(null);
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'mythic':
      case 'legendary':
        return 'text-amber-400 bg-amber-500/20 border-amber-500/30';
      case 'rare':
        return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'uncommon':
        return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default:
        return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getOrderStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'PROCESSING':
        return <Package className="w-4 h-4 text-blue-400" />;
      case 'SHIPPED':
        return <Truck className="w-4 h-4 text-purple-400" />;
      case 'DELIVERED':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'PROCESSING':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'SHIPPED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'DELIVERED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getGameBadge = (game: string) => {
    switch (game) {
      case 'MAGIC_THE_GATHERING':
        return { label: 'MTG', class: 'badge-mtg' };
      case 'POKEMON':
        return { label: 'Pokemon', class: 'badge-pokemon' };
      case 'ONE_PIECE':
        return { label: 'One Piece', class: 'badge-onepiece' };
      case 'LORCANA':
        return { label: 'Lorcana', class: 'badge-lorcana' };
      default:
        return { label: game, class: 'bg-gray-600' };
    }
  };

  // Filter pulls
  const filteredPulls = pulls.filter(pull => {
    if (!pull.card) return false;
    
    const matchesSearch = searchQuery === '' || 
      pull.card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pull.box.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRarity = rarityFilter === '' || 
      pull.card.rarity.toLowerCase() === rarityFilter.toLowerCase();
    
    const matchesGame = gameFilter === '' || 
      pull.card.sourceGame === gameFilter;
    
    return matchesSearch && matchesRarity && matchesGame;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      {/* Tab Navigation */}
      <div className="glass-strong rounded-2xl p-2 mb-8 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Balance Card */}
          <div className="glass-strong rounded-2xl p-6 md:p-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-2">Your Balance</p>
                <div className="flex items-center gap-3">
                  <Coins className="w-10 h-10 text-amber-400" />
                  <span className="text-4xl md:text-5xl font-bold text-white">{user.coins.toLocaleString()}</span>
                  <span className="text-gray-400 text-xl">coins</span>
                </div>
              </div>
              <Link 
                href="/purchase-coins"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold rounded-xl transition-all hover:scale-105"
              >
                Buy Coins
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Package className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Pulls</p>
                  <p className="text-2xl font-bold text-white">{initialStats.pulls}</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Swords className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Battles</p>
                  <p className="text-2xl font-bold text-white">{initialStats.battles}</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Wins</p>
                  <p className="text-2xl font-bold text-white">{initialStats.wins}</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Win Rate</p>
                  <p className="text-2xl font-bold text-white">
                    {initialStats.battles > 0 
                      ? Math.round((initialStats.wins / initialStats.battles) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link 
                  href="/battles"
                  className="group flex items-center justify-between p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Swords className="w-5 h-5 text-purple-400" />
                    <span className="font-semibold text-white">Join Battles</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/boxes"
                  className="group flex items-center justify-between p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-blue-400" />
                    <span className="font-semibold text-white">Open Packs</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/cart"
                  className="group flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="w-5 h-5 text-emerald-400" />
                    <span className="font-semibold text-white">View Cart</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Recent Cards */}
            <div className="glass-strong rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Recent Pulls
              </h2>
              {pulls.slice(0, 4).length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {pulls.slice(0, 4).map((pull) => (
                    pull.card && (
                      <div
                        key={pull.id}
                        className="relative aspect-[63/88] rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all"
                        onClick={() => setZoomedCard(pull)}
                      >
                        <Image
                          src={pull.card.imageUrlGatherer}
                          alt={pull.card.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">No cards yet</p>
                  <Link href="/boxes" className="text-blue-400 hover:text-blue-300 text-sm">
                    Open some packs!
                  </Link>
                </div>
              )}
              {pulls.length > 4 && (
                <button
                  onClick={() => setActiveTab('collection')}
                  className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  View all {pulls.length} cards →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Collection Tab */}
      {activeTab === 'collection' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="glass-strong rounded-2xl p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search cards..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={rarityFilter}
                onChange={(e) => setRarityFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-blue-500"
              >
                <option value="">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="mythic">Mythic</option>
              </select>
              <select
                value={gameFilter}
                onChange={(e) => setGameFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-900/50 border border-gray-700 rounded-xl text-white focus:border-blue-500"
              >
                <option value="">All Games</option>
                <option value="MAGIC_THE_GATHERING">Magic: The Gathering</option>
                <option value="POKEMON">Pokemon</option>
                <option value="ONE_PIECE">One Piece</option>
                <option value="LORCANA">Lorcana</option>
              </select>
            </div>
          </div>

          {/* Collection Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{filteredPulls.length}</p>
              <p className="text-sm text-gray-400">Cards Shown</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-400">
                {filteredPulls.reduce((sum, p) => sum + (p.card?.coinValue || 0), 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400">Total Value</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">
                {filteredPulls.filter(p => p.card?.rarity.toLowerCase() === 'rare' || p.card?.rarity.toLowerCase() === 'mythic').length}
              </p>
              <p className="text-sm text-gray-400">Rare+</p>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {filteredPulls.filter(p => p.cartItem).length}
              </p>
              <p className="text-sm text-gray-400">In Cart</p>
            </div>
          </div>

          {/* Card Grid */}
          {filteredPulls.length > 0 ? (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {filteredPulls.map((pull) => {
                if (!pull.card) return null;
                const gameBadge = getGameBadge(pull.card.sourceGame);

                return (
                  <div
                    key={pull.id}
                    className="group glass rounded-xl overflow-hidden hover:ring-2 hover:ring-blue-500/50 transition-all cursor-pointer"
                    onClick={() => setZoomedCard(pull)}
                  >
                    <div className="relative aspect-[63/88] w-full">
                      <Image
                        src={pull.card.imageUrlGatherer}
                        alt={pull.card.name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                        unoptimized
                      />
                      {pull.cartItem && (
                        <div className="absolute top-2 right-2 rounded-full bg-emerald-500 px-2 py-1 text-xs font-bold text-white">
                          In Cart
                        </div>
                      )}
                      <div className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold ${getRarityColor(pull.card.rarity)}`}>
                        {pull.card.rarity}
                      </div>
                      <div className={`absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-xs font-semibold ${gameBadge.class} text-white`}>
                        {gameBadge.label}
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-white text-sm truncate mb-1">{pull.card.name}</h3>
                      <p className="text-xs text-gray-500 truncate mb-2">{pull.box.name}</p>
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-400">{pull.card.coinValue}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No cards found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || rarityFilter || gameFilter
                  ? "Try adjusting your filters"
                  : "Start opening packs to build your collection!"}
              </p>
              <Link
                href="/boxes"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all"
              >
                <Package className="w-5 h-5" />
                Browse Boxes
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Filters */}
          <div className="glass-strong rounded-2xl p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-gray-400 flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filter by status:
              </span>
              <div className="flex flex-wrap gap-2">
                {['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setOrderStatusFilter(status);
                      setOrders([]);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      orderStatusFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {status || 'All'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading orders...</p>
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="glass-strong rounded-2xl overflow-hidden">
                  {/* Order Header */}
                  <div className="p-4 md:p-6 border-b border-gray-800">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusIcon(order.status)}
                          <span className="font-medium text-sm">{order.status}</span>
                        </div>
                        <div>
                          <p className="text-white font-semibold">Order #{order.id.slice(-8).toUpperCase()}</p>
                          <p className="text-gray-400 text-sm">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-400">
                        <Coins className="w-5 h-5" />
                        <span className="font-bold text-lg">{order.totalCoins.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="p-4 md:p-6">
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex-shrink-0 w-20">
                          <div className="relative aspect-[63/88] rounded-lg overflow-hidden bg-gray-800">
                            {item.cardImage ? (
                              <Image
                                src={item.cardImage}
                                alt={item.cardName}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-600" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 truncate">{item.cardName}</p>
                        </div>
                      ))}
                    </div>

                    {/* Shipping Info */}
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="flex items-start gap-2 text-gray-400 text-sm">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-white">{order.shippingName}</p>
                          <p>{order.shippingAddress}</p>
                          <p>{order.shippingCity}, {order.shippingZip}</p>
                          <p>{order.shippingCountry}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <ShoppingBag className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No orders yet</h3>
              <p className="text-gray-400 mb-6">
                When you checkout cards from your collection, they'll appear here.
              </p>
              <button
                onClick={() => setActiveTab('collection')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl"
              >
                <Package className="w-5 h-5" />
                View Collection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {loading ? (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading statistics...</p>
            </div>
          ) : stats ? (
            <>
              {/* Main Stats */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="glass-strong rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-7 h-7 text-blue-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalPulls}</p>
                  <p className="text-gray-400">Total Pulls</p>
                </div>
                <div className="glass-strong rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <Swords className="w-7 h-7 text-purple-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.totalBattles}</p>
                  <p className="text-gray-400">Battles Joined</p>
                </div>
                <div className="glass-strong rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-7 h-7 text-green-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.battlesWon}</p>
                  <p className="text-gray-400">Battles Won</p>
                </div>
                <div className="glass-strong rounded-2xl p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-7 h-7 text-pink-400" />
                  </div>
                  <p className="text-3xl font-bold text-white">{stats.winRate}%</p>
                  <p className="text-gray-400">Win Rate</p>
                </div>
              </div>

              {/* Financial Stats */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="glass-strong rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    Coin Economy
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Current Balance</span>
                      <span className="text-amber-400 font-bold text-xl">{stats.currentCoins.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Coins from Sales</span>
                      <span className="text-green-400 font-bold">+{stats.totalCoinsEarned.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Collection Value</span>
                      <span className="text-purple-400 font-bold">{stats.collectionValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Cards Sold</span>
                      <span className="text-white font-bold">{stats.totalSales}</span>
                    </div>
                  </div>
                </div>

                <div className="glass-strong rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    Orders Overview
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Total Orders</span>
                      <span className="text-white font-bold text-xl">{stats.totalOrders}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Pending/Processing</span>
                      <span className="text-amber-400 font-bold">{stats.pendingOrders}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl">
                      <span className="text-gray-400">Completed</span>
                      <span className="text-green-400 font-bold">{stats.totalOrders - stats.pendingOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Achievement-like Stats */}
              <div className="glass-strong rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Milestones
                </h3>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  <div className={`p-4 rounded-xl border ${stats.totalPulls >= 100 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                    <Star className={`w-8 h-8 mb-2 ${stats.totalPulls >= 100 ? 'text-amber-400' : 'text-gray-600'}`} />
                    <p className={`font-bold ${stats.totalPulls >= 100 ? 'text-white' : 'text-gray-500'}`}>100 Pulls</p>
                    <p className="text-sm text-gray-400">{stats.totalPulls}/100</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${stats.battlesWon >= 10 ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                    <Trophy className={`w-8 h-8 mb-2 ${stats.battlesWon >= 10 ? 'text-green-400' : 'text-gray-600'}`} />
                    <p className={`font-bold ${stats.battlesWon >= 10 ? 'text-white' : 'text-gray-500'}`}>10 Wins</p>
                    <p className="text-sm text-gray-400">{stats.battlesWon}/10</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${stats.totalSales >= 50 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                    <Coins className={`w-8 h-8 mb-2 ${stats.totalSales >= 50 ? 'text-purple-400' : 'text-gray-600'}`} />
                    <p className={`font-bold ${stats.totalSales >= 50 ? 'text-white' : 'text-gray-500'}`}>50 Sales</p>
                    <p className="text-sm text-gray-400">{stats.totalSales}/50</p>
                  </div>
                  <div className={`p-4 rounded-xl border ${stats.totalOrders >= 5 ? 'bg-blue-500/10 border-blue-500/30' : 'bg-gray-800/50 border-gray-700'}`}>
                    <ShoppingBag className={`w-8 h-8 mb-2 ${stats.totalOrders >= 5 ? 'text-blue-400' : 'text-gray-600'}`} />
                    <p className={`font-bold ${stats.totalOrders >= 5 ? 'text-white' : 'text-gray-500'}`}>5 Orders</p>
                    <p className="text-sm text-gray-400">{stats.totalOrders}/5</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Unable to load statistics</p>
            </div>
          )}
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Profile Section */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-400" />
              Profile Information
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl">
                  <Mail className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-400">{user.email}</span>
                  {user.emailVerified && (
                    <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                <textarea
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>
          </div>

          {/* Shipping Address Section */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              Default Shipping Address
            </h3>
            <p className="text-gray-400 text-sm mb-6">
              This address will be pre-filled when you checkout cards.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                <input
                  type="text"
                  value={profileForm.shippingName}
                  onChange={(e) => setProfileForm({ ...profileForm, shippingName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="tel"
                    value={profileForm.shippingPhone}
                    onChange={(e) => setProfileForm({ ...profileForm, shippingPhone: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                <input
                  type="text"
                  value={profileForm.shippingAddress}
                  onChange={(e) => setProfileForm({ ...profileForm, shippingAddress: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500"
                  placeholder="123 Main Street, Apt 4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                <input
                  type="text"
                  value={profileForm.shippingCity}
                  onChange={(e) => setProfileForm({ ...profileForm, shippingCity: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">ZIP / Postal Code</label>
                <input
                  type="text"
                  value={profileForm.shippingZip}
                  onChange={(e) => setProfileForm({ ...profileForm, shippingZip: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500"
                  placeholder="10001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                <input
                  type="text"
                  value={profileForm.shippingCountry}
                  onChange={(e) => setProfileForm({ ...profileForm, shippingCountry: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-blue-500"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="glass-strong rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              Account Information
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Member Since</p>
                <p className="text-white font-medium">{formatDate(user.createdAt)}</p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-xl">
                <p className="text-sm text-gray-400 mb-1">Account Status</p>
                <div className="flex items-center gap-2">
                  {user.emailVerified ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 font-medium">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400 font-medium">Unverified</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Card Zoom Modal */}
      {zoomedCard && zoomedCard.card && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomedCard(null);
          }}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              onClick={() => setZoomedCard(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-8 w-8" />
            </button>

            <div className="relative w-full max-w-md aspect-[63/88] mb-4">
              <Image
                src={zoomedCard.card.imageUrlGatherer}
                alt={zoomedCard.card.name}
                fill
                className="object-contain rounded-xl"
                unoptimized
              />
            </div>

            <div className="glass-strong rounded-2xl p-6 w-full max-w-md text-center">
              <div className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mb-3 border ${getRarityColor(zoomedCard.card.rarity)}`}>
                {zoomedCard.card.rarity}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{zoomedCard.card.name}</h2>
              <p className="text-gray-400 mb-4">{zoomedCard.box.name}</p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <Coins className="h-5 w-5 text-amber-400" />
                <span className="text-xl font-semibold text-white">{zoomedCard.card.coinValue} coins</span>
              </div>

              {zoomedCard.cartItem ? (
                <div className="px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-semibold border border-emerald-500/30">
                  <ShoppingCart className="h-4 w-4 inline mr-2" />
                  In Cart
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAddToCart(zoomedCard.id)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Checkout
                  </button>
                  <button
                    onClick={() => handleSellCard(zoomedCard.id, zoomedCard.card!.coinValue)}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Coins className="h-4 w-4" />
                    Sell
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

