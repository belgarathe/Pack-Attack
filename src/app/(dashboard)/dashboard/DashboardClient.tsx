'use client';

import {useState, useEffect, useCallback, useMemo, memo} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useToast} from '@/components/ui/use-toast';
import {emitCoinBalanceUpdate} from '@/lib/coin-events';
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
    Flame,
    Crown,
    Gem,
    Gift,
    ArrowUpRight,
    TrendingDown,
    Activity,
    Lock,
    Shield,
    Medal,
    Diamond,
    Layers,
    Library,
    BadgeDollarSign,
    Wallet,
    Banknote,
    Heart,
    Clover,
    Moon,
    Sunrise,
    CircleDollarSign,
    Rocket,
    Users,
    type LucideIcon,
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

type Achievement = {
    id: string;
    code: string;
    name: string;
    description: string;
    category: 'PULLS' | 'BATTLES' | 'COLLECTION' | 'ECONOMY' | 'SOCIAL' | 'SPECIAL';
    icon: string;
    rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
    requirement: number;
    coinReward: number;
    isSecret: boolean;
    progress: number;
    isUnlocked: boolean;
    unlockedAt: string | null;
    rewardClaimed: boolean;
};

type AchievementSummary = {
    total: number;
    unlocked: number;
    progress: number;
    unclaimedRewards: number;
};

type AchievementsData = {
    achievements: Achievement[];
    byCategory: Record<string, Achievement[]>;
    summary: AchievementSummary;
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
    {id: 'overview', label: 'Overview', icon: LayoutDashboard, gradient: 'from-blue-500 to-cyan-500'},
    {id: 'achievements', label: 'Achievements', icon: Award, gradient: 'from-amber-500 to-yellow-500'},
    {id: 'collection', label: 'Collection', icon: Package, gradient: 'from-purple-500 to-pink-500'},
    {id: 'orders', label: 'Orders', icon: ShoppingBag, gradient: 'from-emerald-500 to-teal-500'},
    {id: 'statistics', label: 'Statistics', icon: BarChart3, gradient: 'from-orange-500 to-red-500'},
    {id: 'connections', label: 'Connections', icon: Zap, gradient: 'from-orange-500 to-red-500'},
    {id: 'settings', label: 'Settings', icon: Settings, gradient: 'from-slate-500 to-zinc-500'},
];

// PERFORMANCE: Wrap component in memo to prevent unnecessary re-renders
export const DashboardClient = memo(function DashboardClient({
                                                                 initialUser,
                                                                 initialPulls,
                                                                 initialStats
                                                             }: DashboardProps) {
    const {addToast} = useToast();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState('overview');
    const [user, setUser] = useState(initialUser);
    const [pulls, setPulls] = useState(initialPulls);
    const [orders, setOrders] = useState<Order[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [achievements, setAchievements] = useState<AchievementsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [achievementCategoryFilter, setAchievementCategoryFilter] = useState<string>('ALL');
    const [claimingReward, setClaimingReward] = useState<string | null>(null);

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

    // Animation mount
    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Fetch achievements when achievements tab is opened
    useEffect(() => {
        if (activeTab === 'achievements' && !achievements) {
            fetchAchievements();
        }
    }, [activeTab, achievements]);

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

    const fetchAchievements = async () => {
        setLoading(true);
        try {
            // PERFORMANCE: Fast load without progress recompute
            const res = await fetch('/api/user/achievements?update=false');
            const data = await res.json();
            if (res.ok) {
                setAchievements(data);
            }

            // Update progress in background, then refresh data
            void fetch('/api/user/achievements/check', {method: 'POST'})
                .then(async (checkRes) => {
                    if (!checkRes.ok) return;
                    const refreshed = await fetch('/api/user/achievements?update=false');
                    if (!refreshed.ok) return;
                    const refreshedData = await refreshed.json();
                    setAchievements(refreshedData);
                })
                .catch(() => {
                });
        } catch (error) {
            console.error('Failed to fetch achievements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimReward = async (achievementId: string) => {
        setClaimingReward(achievementId);
        try {
            const res = await fetch('/api/user/achievements/claim', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({achievementId}),
            });

            const data = await res.json();

            if (!res.ok) {
                addToast({
                    title: 'Error',
                    description: data.error || 'Failed to claim reward',
                    variant: 'destructive',
                });
                return;
            }

            addToast({
                title: 'Reward Claimed!',
                description: `You received ${data.coinsAwarded} coins for "${data.achievementName}"!`,
            });

            // Update user coins
            if (data.newBalance !== undefined) {
                emitCoinBalanceUpdate({balance: data.newBalance});
                setUser(prev => ({...prev, coins: data.newBalance}));
            }

            // Refresh achievements
            fetchAchievements();
        } catch (error) {
            addToast({
                title: 'Error',
                description: 'Failed to claim reward',
                variant: 'destructive',
            });
        } finally {
            setClaimingReward(null);
        }
    };

    const handleClaimAllRewards = async () => {
        setClaimingReward('all');
        try {
            const res = await fetch('/api/user/achievements/claim', {
                method: 'PUT',
            });

            const data = await res.json();

            if (!res.ok) {
                addToast({
                    title: 'Error',
                    description: data.error || 'Failed to claim rewards',
                    variant: 'destructive',
                });
                return;
            }

            if (data.coinsAwarded > 0) {
                addToast({
                    title: 'All Rewards Claimed!',
                    description: `You received ${data.coinsAwarded} coins from ${data.achievementsClaimed} achievements!`,
                });

                // Update user coins
                if (data.newBalance !== undefined) {
                    emitCoinBalanceUpdate({balance: data.newBalance});
                    setUser(prev => ({...prev, coins: data.newBalance}));
                }

                // Refresh achievements
                fetchAchievements();
            } else {
                addToast({
                    title: 'No Rewards',
                    description: 'No unclaimed rewards available',
                });
            }
        } catch (error) {
            addToast({
                title: 'Error',
                description: 'Failed to claim rewards',
                variant: 'destructive',
            });
        } finally {
            setClaimingReward(null);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
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

    // PERFORMANCE: Memoize handlers to prevent child re-renders
    const handleSellCard = useCallback(async (pullId: string, coinValue: number) => {
        setLoading(true);
        try {
            const res = await fetch('/api/cards/sell', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({pullId}),
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
                emitCoinBalanceUpdate({balance: data.newBalance});
                setUser(prev => ({...prev, coins: data.newBalance}));
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
    }, [addToast]);

    const handleAddToCart = useCallback(async (pullId: string) => {
        setLoading(true);
        try {
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({pullId}),
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
                p.id === pullId ? {...p, cartItem: {id: 'temp'}} : p
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
    }, [addToast]);

    const getRarityConfig = (rarity: string) => {
        switch (rarity?.toLowerCase()) {
            case 'mythic':
                return {
                    color: 'text-orange-400',
                    bg: 'bg-gradient-to-r from-orange-500/20 to-red-500/20',
                    border: 'border-orange-500/40',
                    glow: 'shadow-orange-500/20',
                    icon: Crown
                };
            case 'legendary':
                return {
                    color: 'text-amber-400',
                    bg: 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20',
                    border: 'border-amber-500/40',
                    glow: 'shadow-amber-500/20',
                    icon: Gem
                };
            case 'rare':
                return {
                    color: 'text-purple-400',
                    bg: 'bg-gradient-to-r from-purple-500/20 to-pink-500/20',
                    border: 'border-purple-500/40',
                    glow: 'shadow-purple-500/20',
                    icon: Star
                };
            case 'uncommon':
                return {
                    color: 'text-blue-400',
                    bg: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20',
                    border: 'border-blue-500/40',
                    glow: 'shadow-blue-500/20',
                    icon: Sparkles
                };
            default:
                return {
                    color: 'text-gray-400',
                    bg: 'bg-gray-500/20',
                    border: 'border-gray-500/40',
                    glow: '',
                    icon: Package
                };
        }
    };

    const getOrderStatusConfig = (status: string) => {
        switch (status) {
            case 'PENDING':
                return {
                    icon: Clock,
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/30',
                    label: 'Pending'
                };
            case 'PROCESSING':
                return {
                    icon: Activity,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/30',
                    label: 'Processing'
                };
            case 'SHIPPED':
                return {
                    icon: Truck,
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/30',
                    label: 'Shipped'
                };
            case 'DELIVERED':
                return {
                    icon: CheckCircle2,
                    color: 'text-green-400',
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/30',
                    label: 'Delivered'
                };
            case 'CANCELLED':
                return {
                    icon: XCircle,
                    color: 'text-red-400',
                    bg: 'bg-red-500/10',
                    border: 'border-red-500/30',
                    label: 'Cancelled'
                };
            default:
                return {
                    icon: Clock,
                    color: 'text-gray-400',
                    bg: 'bg-gray-500/10',
                    border: 'border-gray-500/30',
                    label: status
                };
        }
    };

    const getGameConfig = (game: string) => {
        switch (game) {
            case 'MAGIC_THE_GATHERING':
                return {label: 'MTG', bg: 'bg-gradient-to-r from-red-600 to-red-700', text: 'text-white'};
            case 'POKEMON':
                return {label: 'Pokemon', bg: 'bg-gradient-to-r from-yellow-500 to-amber-500', text: 'text-black'};
            case 'ONE_PIECE':
                return {label: 'One Piece', bg: 'bg-gradient-to-r from-red-500 to-rose-600', text: 'text-white'};
            case 'LORCANA':
                return {label: 'Lorcana', bg: 'bg-gradient-to-r from-violet-600 to-purple-700', text: 'text-white'};
            case 'YUGIOH':
                return {label: 'Yu-Gi-Oh', bg: 'bg-gradient-to-r from-indigo-600 to-blue-700', text: 'text-white'};
            default:
                return {label: game, bg: 'bg-gray-600', text: 'text-white'};
        }
    };

    // PERFORMANCE: Memoize filtered pulls to prevent recalculation on every render
    const filteredPulls = useMemo(() => {
        return pulls.filter(pull => {
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
    }, [pulls, searchQuery, rarityFilter, gameFilter]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Icon mapping for achievements
    const getAchievementIcon = (iconName: string): LucideIcon => {
        const iconMap: Record<string, LucideIcon> = {
            Sparkles, Package, Flame, Zap, Crown, Star, Swords, Trophy, Shield, Medal, Award,
            Gem, Diamond, Layers, Library, Coins, TrendingUp, BadgeDollarSign, Wallet, Banknote,
            ShoppingBag, Heart, Clover, Moon, Sunrise, CircleDollarSign, Rocket, Lock, Users,
        };
        return iconMap[iconName] || Sparkles;
    };

    // Rarity configuration
    const getRarityStyles = (rarity: string) => {
        switch (rarity) {
            case 'COMMON':
                return {
                    color: 'text-gray-400',
                    bg: 'bg-gray-500/10',
                    border: 'border-gray-500/30',
                    gradient: 'from-gray-500 to-slate-500'
                };
            case 'UNCOMMON':
                return {
                    color: 'text-green-400',
                    bg: 'bg-green-500/10',
                    border: 'border-green-500/30',
                    gradient: 'from-green-500 to-emerald-500'
                };
            case 'RARE':
                return {
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/30',
                    gradient: 'from-blue-500 to-cyan-500'
                };
            case 'EPIC':
                return {
                    color: 'text-purple-400',
                    bg: 'bg-purple-500/10',
                    border: 'border-purple-500/30',
                    gradient: 'from-purple-500 to-pink-500'
                };
            case 'LEGENDARY':
                return {
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10',
                    border: 'border-amber-500/30',
                    gradient: 'from-amber-500 to-orange-500'
                };
            default:
                return {
                    color: 'text-gray-400',
                    bg: 'bg-gray-500/10',
                    border: 'border-gray-500/30',
                    gradient: 'from-gray-500 to-slate-500'
                };
        }
    };

    // Category configuration
    const getCategoryConfig = (category: string) => {
        switch (category) {
            case 'PULLS':
                return {label: 'Pack Opening', icon: Package, color: 'text-blue-400', bg: 'bg-blue-500/10'};
            case 'BATTLES':
                return {label: 'Battles', icon: Swords, color: 'text-purple-400', bg: 'bg-purple-500/10'};
            case 'COLLECTION':
                return {label: 'Collection', icon: Gem, color: 'text-pink-400', bg: 'bg-pink-500/10'};
            case 'ECONOMY':
                return {label: 'Economy', icon: Coins, color: 'text-amber-400', bg: 'bg-amber-500/10'};
            case 'SOCIAL':
                return {label: 'Community', icon: Users, color: 'text-green-400', bg: 'bg-green-500/10'};
            case 'SPECIAL':
                return {label: 'Special', icon: Sparkles, color: 'text-orange-400', bg: 'bg-orange-500/10'};
            default:
                return {label: category, icon: Star, color: 'text-gray-400', bg: 'bg-gray-500/10'};
        }
    };

    // PERFORMANCE: Memoize filtered achievements
    const filteredAchievements = useMemo(() => {
        return achievements?.achievements.filter(a =>
            achievementCategoryFilter === 'ALL' || a.category === achievementCategoryFilter
        ) || [];
    }, [achievements, achievementCategoryFilter]);

    const currentTabConfig = tabs.find(t => t.id === activeTab);

    const handleConnectDiscord = () => {
        console.log("Connecting Discord")
    }

    const handleDisconnectDiscord = () => {
        console.log("Disconnecting Discord")
    }

    const handleConnectTwitch = () => {
        console.log("Connecting Twitch")
    }

    const handleDisconnectTwitch = () => {
        console.log("Disconnecting Twitch")
    }

    return (
        <>
            {/* Premium Tab Navigation */}
            <div className="relative mb-10">
                <div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"/>
                <div className="relative glass-strong rounded-2xl p-2 overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {tabs.map((tab, index) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`group relative flex items-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 ${
                                        isActive
                                            ? `bg-gradient-to-r ${tab.gradient} text-white shadow-lg`
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                                    style={{
                                        animationDelay: `${index * 50}ms`,
                                        opacity: mounted ? 1 : 0,
                                        transform: mounted ? 'translateY(0)' : 'translateY(10px)',
                                        transition: `opacity 0.3s ease ${index * 50}ms, transform 0.3s ease ${index * 50}ms`
                                    }}
                                >
                                    {isActive && (
                                        <div
                                            className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-xl"/>
                                    )}
                                    <Icon
                                        className={`w-5 h-5 relative z-10 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`}/>
                                    <span className="hidden sm:inline relative z-10">{tab.label}</span>
                                    {isActive && (
                                        <div
                                            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white"/>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-8">
                    {/* Hero Balance Card */}
                    <div
                        className="relative overflow-hidden rounded-3xl"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.5s ease, transform 0.5s ease'
                        }}
                    >
                        <div
                            className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-orange-500/20 to-red-500/30"/>
                        <div className="absolute inset-0 bg-grid opacity-30"/>
                        <div className="relative glass-strong p-8 md:p-10">
                            <div
                                className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                <div>
                                    <div
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium mb-4">
                                        <Coins className="w-4 h-4"/>
                                        Your Balance
                                    </div>
                                    <div className="flex items-baseline gap-4">
                    <span className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                      {user.coins.toLocaleString()}
                    </span>
                                        <span className="text-2xl text-amber-400/80 font-medium">coins</span>
                                    </div>
                                    <p className="text-gray-400 mt-3">Open packs, join battles, and win real cards!</p>
                                </div>
                                <div className="flex gap-3">
                                    <Link
                                        href="/purchase-coins"
                                        className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25"
                                    >
                                        <div
                                            className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"/>
                                        <Gift className="w-5 h-5 relative z-10"/>
                                        <span className="relative z-10">Buy Coins</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                label: 'Total Pulls',
                                value: initialStats.pulls,
                                icon: Package,
                                gradient: 'from-blue-500 to-cyan-500',
                                delay: 100
                            },
                            {
                                label: 'Battles',
                                value: initialStats.battles,
                                icon: Swords,
                                gradient: 'from-purple-500 to-pink-500',
                                delay: 150
                            },
                            {
                                label: 'Victories',
                                value: initialStats.wins,
                                icon: Trophy,
                                gradient: 'from-green-500 to-emerald-500',
                                delay: 200
                            },
                            {
                                label: 'Win Rate',
                                value: `${initialStats.battles > 0 ? Math.round((initialStats.wins / initialStats.battles) * 100) : 0}%`,
                                icon: Target,
                                gradient: 'from-orange-500 to-red-500',
                                delay: 250
                            },
                        ].map((stat, index) => {
                            const Icon = stat.icon;
                            return (
                                <div
                                    key={stat.label}
                                    className="group relative overflow-hidden rounded-2xl transition-all hover:scale-[1.02] hover:-translate-y-1"
                                    style={{
                                        opacity: mounted ? 1 : 0,
                                        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                        transition: `opacity 0.4s ease ${stat.delay}ms, transform 0.4s ease ${stat.delay}ms`
                                    }}
                                >
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}/>
                                    <div className="relative glass-strong p-6">
                                        <div
                                            className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} mb-4 shadow-lg`}>
                                            <Icon className="w-6 h-6 text-white"/>
                                        </div>
                                        <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                                        <p className="text-sm text-gray-400">{stat.label}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Actions & Recent Pulls */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Quick Actions */}
                        <div
                            className="glass-strong rounded-2xl p-6 overflow-hidden relative"
                            style={{
                                opacity: mounted ? 1 : 0,
                                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                transition: 'opacity 0.5s ease 300ms, transform 0.5s ease 300ms'
                            }}
                        >
                            <div
                                className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full"/>
                            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                                    <Zap className="w-5 h-5 text-white"/>
                                </div>
                                Quick Actions
                            </h2>
                            <div className="space-y-3">
                                {[
                                    {
                                        href: '/battles',
                                        icon: Swords,
                                        label: 'Join Battles',
                                        desc: 'Compete and win',
                                        gradient: 'from-purple-500 to-pink-500'
                                    },
                                    {
                                        href: '/boxes',
                                        icon: Package,
                                        label: 'Open Packs',
                                        desc: 'Pull rare cards',
                                        gradient: 'from-blue-500 to-cyan-500'
                                    },
                                    {
                                        href: '/cart',
                                        icon: ShoppingCart,
                                        label: 'View Cart',
                                        desc: 'Checkout cards',
                                        gradient: 'from-emerald-500 to-teal-500'
                                    },
                                ].map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <Link
                                            key={action.href}
                                            href={action.href}
                                            className="group flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/[0.1] transition-all"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                                                    <Icon className="w-5 h-5 text-white"/>
                                                </div>
                                                <div>
                                                    <span
                                                        className="font-semibold text-white block">{action.label}</span>
                                                    <span className="text-sm text-gray-500">{action.desc}</span>
                                                </div>
                                            </div>
                                            <ChevronRight
                                                className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all"/>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Pulls */}
                        <div
                            className="glass-strong rounded-2xl p-6 overflow-hidden relative"
                            style={{
                                opacity: mounted ? 1 : 0,
                                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                transition: 'opacity 0.5s ease 350ms, transform 0.5s ease 350ms'
                            }}
                        >
                            <div
                                className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full"/>
                            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                                    <Sparkles className="w-5 h-5 text-white"/>
                                </div>
                                Recent Pulls
                            </h2>
                            {pulls.slice(0, 4).length > 0 ? (
                                <>
                                    <div className="grid grid-cols-4 gap-3">
                                        {pulls.slice(0, 4).map((pull, index) => {
                                            if (!pull.card) return null;
                                            const rarityConfig = getRarityConfig(pull.card.rarity);
                                            return (
                                                <div
                                                    key={pull.id}
                                                    className={`group relative aspect-[63/88] rounded-xl overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-2 ${rarityConfig.border.replace('border-', 'hover:ring-')} transition-all hover:scale-105`}
                                                    onClick={() => setZoomedCard(pull)}
                                                    style={{animationDelay: `${index * 50}ms`}}
                                                >
                                                    <Image
                                                        src={pull.card.imageUrlGatherer}
                                                        alt={pull.card.name}
                                                        fill
                                                        className="object-cover"
                                                        sizes="(max-width: 1024px) 22vw, 96px"
                                                        unoptimized
                                                    />
                                                    <div
                                                        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}/>
                                                    <div
                                                        className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-xs text-white font-medium truncate">{pull.card.name}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {pulls.length > 4 && (
                                        <button
                                            onClick={() => setActiveTab('collection')}
                                            className="w-full mt-4 py-3 text-sm text-gray-400 hover:text-white bg-white/[0.02] hover:bg-white/[0.05] rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            View all {pulls.length} cards
                                            <ArrowUpRight className="w-4 h-4"/>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <div
                                        className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-800/50 mb-4">
                                        <Package className="w-8 h-8 text-gray-600"/>
                                    </div>
                                    <p className="text-gray-400 mb-2">No cards yet</p>
                                    <Link href="/boxes"
                                          className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm">
                                        Open some packs! <ArrowUpRight className="w-3 h-3"/>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Achievements Tab */}
            {activeTab === 'achievements' && (
                <div className="space-y-8">
                    {loading ? (
                        <div className="glass-strong rounded-2xl p-16 text-center">
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"/>
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin"/>
                            </div>
                            <p className="text-gray-400">Loading your achievements...</p>
                        </div>
                    ) : achievements ? (
                        <>
                            {/* Achievement Summary Hero */}
                            <div
                                className="relative overflow-hidden rounded-3xl"
                                style={{
                                    opacity: mounted ? 1 : 0,
                                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                    transition: 'opacity 0.5s ease, transform 0.5s ease'
                                }}
                            >
                                <div
                                    className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-yellow-500/10 to-orange-500/20"/>
                                <div className="absolute inset-0 bg-grid opacity-30"/>
                                <div className="relative glass-strong p-8 md:p-10">
                                    <div
                                        className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                        <div>
                                            <div
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-medium mb-4">
                                                <Trophy className="w-4 h-4"/>
                                                Achievement Progress
                                            </div>
                                            <div className="flex items-baseline gap-4">
                        <span className="text-5xl md:text-7xl font-bold text-white tracking-tight">
                          {achievements.summary.unlocked}
                        </span>
                                                <span
                                                    className="text-2xl text-gray-400 font-medium">/ {achievements.summary.total}</span>
                                            </div>
                                            <div className="mt-4 w-full max-w-md">
                                                <div className="flex justify-between text-sm mb-2">
                                                    <span className="text-gray-400">Overall Progress</span>
                                                    <span
                                                        className="text-amber-400 font-semibold">{achievements.summary.progress}%</span>
                                                </div>
                                                <div className="h-3 rounded-full bg-gray-800 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 transition-all duration-1000"
                                                        style={{width: `${achievements.summary.progress}%`}}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {achievements.summary.unclaimedRewards > 0 && (
                                            <button
                                                onClick={handleClaimAllRewards}
                                                disabled={claimingReward === 'all'}
                                                className="group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-2xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-amber-500/25 disabled:opacity-50 disabled:hover:scale-100"
                                            >
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"/>
                                                {claimingReward === 'all' ? (
                                                    <>
                                                        <div
                                                            className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"/>
                                                        <span className="relative z-10">Claiming...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Gift className="w-5 h-5 relative z-10"/>
                                                        <span
                                                            className="relative z-10">Claim All ({achievements.summary.unclaimedRewards} coins)</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Rarity Stats */}
                            <div
                                className="grid gap-4 grid-cols-2 md:grid-cols-5"
                                style={{
                                    opacity: mounted ? 1 : 0,
                                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                    transition: 'opacity 0.4s ease 100ms, transform 0.4s ease 100ms'
                                }}
                            >
                                {['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'].map((rarity, index) => {
                                    const rarityStyle = getRarityStyles(rarity);
                                    const count = achievements.achievements.filter(a => a.rarity === rarity && a.isUnlocked).length;
                                    const total = achievements.achievements.filter(a => a.rarity === rarity).length;
                                    return (
                                        <div
                                            key={rarity}
                                            className={`relative overflow-hidden rounded-xl transition-all hover:scale-[1.02]`}
                                            style={{animationDelay: `${index * 50}ms`}}
                                        >
                                            <div
                                                className={`absolute inset-0 bg-gradient-to-br ${rarityStyle.gradient} opacity-10`}/>
                                            <div className="relative glass-strong p-4 text-center">
                                                <div
                                                    className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${rarityStyle.gradient} mb-2`}>
                                                    <Star className="w-5 h-5 text-white"/>
                                                </div>
                                                <p className={`text-xl font-bold ${rarityStyle.color}`}>{count}/{total}</p>
                                                <p className="text-xs text-gray-500 capitalize">{rarity.toLowerCase()}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Category Filter Pills */}
                            <div
                                className="flex flex-wrap gap-2"
                                style={{
                                    opacity: mounted ? 1 : 0,
                                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                    transition: 'opacity 0.4s ease 150ms, transform 0.4s ease 150ms'
                                }}
                            >
                                <button
                                    onClick={() => setAchievementCategoryFilter('ALL')}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        achievementCategoryFilter === 'ALL'
                                            ? 'bg-white/10 text-white border border-white/20'
                                            : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
                                    }`}
                                >
                                    <Star className="w-4 h-4"/>
                                    All
                                </button>
                                {['PULLS', 'BATTLES', 'COLLECTION', 'ECONOMY', 'SOCIAL', 'SPECIAL'].map((category) => {
                                    const config = getCategoryConfig(category);
                                    const Icon = config.icon;
                                    const isActive = achievementCategoryFilter === category;
                                    return (
                                        <button
                                            key={category}
                                            onClick={() => setAchievementCategoryFilter(category)}
                                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                                isActive
                                                    ? `${config.bg} ${config.color} border border-current/30`
                                                    : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4"/>
                                            {config.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Achievement Grid */}
                            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                {filteredAchievements.map((achievement, index) => {
                                    const rarityStyle = getRarityStyles(achievement.rarity);
                                    const categoryConfig = getCategoryConfig(achievement.category);
                                    const Icon = getAchievementIcon(achievement.icon);
                                    const progress = Math.min((achievement.progress / achievement.requirement) * 100, 100);
                                    const canClaim = achievement.isUnlocked && !achievement.rewardClaimed;

                                    return (
                                        <div
                                            key={achievement.id}
                                            className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
                                                achievement.isUnlocked ? '' : 'opacity-70'
                                            }`}
                                            style={{
                                                opacity: mounted ? 1 : 0,
                                                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                                transition: `opacity 0.3s ease ${Math.min(index * 50, 500)}ms, transform 0.3s ease ${Math.min(index * 50, 500)}ms`
                                            }}
                                        >
                                            {/* Glow effect for unlocked */}
                                            {achievement.isUnlocked && (
                                                <div
                                                    className={`absolute inset-0 bg-gradient-to-br ${rarityStyle.gradient} opacity-10 group-hover:opacity-20 transition-opacity`}/>
                                            )}

                                            <div
                                                className={`relative glass-strong p-5 border ${achievement.isUnlocked ? rarityStyle.border : 'border-gray-700/50'}`}>
                                                {/* Header with icon and rarity */}
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className={`relative p-3 rounded-xl ${
                                                        achievement.isUnlocked
                                                            ? `bg-gradient-to-br ${rarityStyle.gradient} shadow-lg`
                                                            : 'bg-gray-800'
                                                    }`}>
                                                        <Icon
                                                            className={`w-6 h-6 ${achievement.isUnlocked ? 'text-white' : 'text-gray-500'}`}/>
                                                        {achievement.isUnlocked && (
                                                            <div
                                                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                                                <CheckCircle2 className="w-3 h-3 text-white"/>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                            <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${rarityStyle.bg} ${rarityStyle.color} border ${rarityStyle.border}`}>
                              {achievement.rarity}
                            </span>
                                                        {achievement.coinReward > 0 && (
                                                            <div
                                                                className="flex items-center gap-1 text-amber-400 text-sm">
                                                                <Coins className="w-3.5 h-3.5"/>
                                                                <span
                                                                    className="font-semibold">{achievement.coinReward}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Title and description */}
                                                <h3 className={`font-bold text-lg mb-1 ${achievement.isUnlocked ? 'text-white' : 'text-gray-400'}`}>
                                                    {achievement.name}
                                                </h3>
                                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                                                    {achievement.description}
                                                </p>

                                                {/* Progress bar */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs mb-1.5">
                                                        <span className="text-gray-500">Progress</span>
                                                        <span
                                                            className={achievement.isUnlocked ? rarityStyle.color : 'text-gray-400'}>
                              {achievement.progress}/{achievement.requirement}
                            </span>
                                                    </div>
                                                    <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                achievement.isUnlocked
                                                                    ? `bg-gradient-to-r ${rarityStyle.gradient}`
                                                                    : 'bg-gray-600'
                                                            }`}
                                                            style={{width: `${progress}%`}}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Category badge and claim button */}
                                                <div className="flex items-center justify-between">
                          <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${categoryConfig.bg} ${categoryConfig.color}`}>
                            <categoryConfig.icon className="w-3 h-3"/>
                              {categoryConfig.label}
                          </span>

                                                    {canClaim ? (
                                                        <button
                                                            onClick={() => handleClaimReward(achievement.id)}
                                                            disabled={claimingReward === achievement.id}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-sm font-bold rounded-lg transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                                                        >
                                                            {claimingReward === achievement.id ? (
                                                                <>
                                                                    <div
                                                                        className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                                                    Claiming...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Gift className="w-3.5 h-3.5"/>
                                                                    Claim
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : achievement.rewardClaimed ? (
                                                        <span
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                              <CheckCircle2 className="w-3 h-3"/>
                              Claimed
                            </span>
                                                    ) : achievement.isUnlocked ? null : (
                                                        <span className="text-xs text-gray-500">
                              {achievement.unlockedAt ? formatDate(achievement.unlockedAt) : 'Locked'}
                            </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Empty state */}
                            {filteredAchievements.length === 0 && (
                                <div className="glass-strong rounded-2xl p-16 text-center">
                                    <div
                                        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 mb-6">
                                        <Trophy className="w-10 h-10 text-amber-400"/>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">No achievements found</h3>
                                    <p className="text-gray-400 mb-6">
                                        Try selecting a different category
                                    </p>
                                    <button
                                        onClick={() => setAchievementCategoryFilter('ALL')}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all"
                                    >
                                        <Star className="w-5 h-5"/>
                                        Show All Achievements
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="glass-strong rounded-2xl p-16 text-center">
                            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                            <p className="text-gray-400">Unable to load achievements</p>
                            <button
                                onClick={fetchAchievements}
                                className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-medium rounded-xl transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Collection Tab */}
            {activeTab === 'collection' && (
                <div className="space-y-6">
                    {/* Search & Filters */}
                    <div
                        className="glass-strong rounded-2xl p-5"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease, transform 0.4s ease'
                        }}
                    >
                        <div className="flex flex-wrap gap-4">
                            <div className="flex-1 min-w-[250px]">
                                <div className="relative group">
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-purple-400 transition-colors"/>
                                    <input
                                        type="text"
                                        placeholder="Search your collection..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                                    />
                                </div>
                            </div>
                            <select
                                value={rarityFilter}
                                onChange={(e) => setRarityFilter(e.target.value)}
                                className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-purple-500/50 min-w-[140px]"
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
                                className="px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:border-purple-500/50 min-w-[180px]"
                            >
                                <option value="">All Games</option>
                                <option value="MAGIC_THE_GATHERING">Magic: The Gathering</option>
                                <option value="POKEMON">Pokemon</option>
                                <option value="ONE_PIECE">One Piece</option>
                                <option value="LORCANA">Lorcana</option>
                                <option value="YUGIOH">Yu-Gi-Oh</option>
                            </select>
                        </div>
                    </div>

                    {/* Collection Stats Bar */}
                    <div
                        className="grid grid-cols-2 md:grid-cols-4 gap-4"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease 100ms, transform 0.4s ease 100ms'
                        }}
                    >
                        {[
                            {label: 'Cards Shown', value: filteredPulls.length, color: 'text-white'},
                            {
                                label: 'Total Value',
                                value: filteredPulls.reduce((sum, p) => sum + (p.card?.coinValue || 0), 0).toLocaleString(),
                                color: 'text-amber-400',
                                icon: Coins
                            },
                            {
                                label: 'Rare+',
                                value: filteredPulls.filter(p => ['rare', 'mythic', 'legendary'].includes(p.card?.rarity.toLowerCase() || '')).length,
                                color: 'text-purple-400',
                                icon: Gem
                            },
                            {
                                label: 'In Cart',
                                value: filteredPulls.filter(p => p.cartItem).length,
                                color: 'text-emerald-400',
                                icon: ShoppingCart
                            },
                        ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="glass rounded-xl p-4 text-center">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        {Icon && <Icon className={`w-4 h-4 ${stat.color}`}/>}
                                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                    </div>
                                    <p className="text-sm text-gray-500">{stat.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Card Grid */}
                    {filteredPulls.length > 0 ? (
                        <div
                            className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                            {filteredPulls.map((pull, index) => {
                                if (!pull.card) return null;
                                const rarityConfig = getRarityConfig(pull.card.rarity);
                                const gameConfig = getGameConfig(pull.card.sourceGame);
                                const RarityIcon = rarityConfig.icon;

                                return (
                                    <div
                                        key={pull.id}
                                        className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1`}
                                        onClick={() => setZoomedCard(pull)}
                                        style={{
                                            opacity: mounted ? 1 : 0,
                                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                            transition: `opacity 0.3s ease ${Math.min(index * 30, 300)}ms, transform 0.3s ease ${Math.min(index * 30, 300)}ms`
                                        }}
                                    >
                                        <div
                                            className={`absolute inset-0 ${rarityConfig.bg} opacity-0 group-hover:opacity-100 transition-opacity`}/>
                                        <div
                                            className={`relative glass border ${rarityConfig.border} rounded-2xl overflow-hidden`}>
                                            <div className="relative aspect-[63/88] w-full">
                                                <Image
                                                    src={pull.card.imageUrlGatherer}
                                                    alt={pull.card.name}
                                                    fill
                                                    className="object-cover transition-transform group-hover:scale-110"
                                                    sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, (max-width: 1280px) 16vw, 12vw"
                                                    unoptimized
                                                />
                                                {/* Overlays */}
                                                <div
                                                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"/>

                                                {/* Badges */}
                                                {pull.cartItem && (
                                                    <div
                                                        className="absolute top-2 right-2 rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-bold text-white shadow-lg">
                                                        In Cart
                                                    </div>
                                                )}
                                                <div
                                                    className={`absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${rarityConfig.bg} ${rarityConfig.color} border ${rarityConfig.border}`}>
                                                    <RarityIcon className="w-3 h-3"/>
                                                    {pull.card.rarity}
                                                </div>
                                                <div
                                                    className={`absolute bottom-12 left-2 rounded-full px-2 py-0.5 text-xs font-bold ${gameConfig.bg} ${gameConfig.text}`}>
                                                    {gameConfig.label}
                                                </div>

                                                {/* Card Info */}
                                                <div className="absolute bottom-0 left-0 right-0 p-3">
                                                    <h3 className="font-bold text-white text-sm truncate mb-0.5">{pull.card.name}</h3>
                                                    <div className="flex items-center gap-1">
                                                        <Coins className="h-3.5 w-3.5 text-amber-400"/>
                                                        <span
                                                            className="text-sm font-bold text-amber-400">{pull.card.coinValue}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            className="glass-strong rounded-2xl p-16 text-center"
                            style={{
                                opacity: mounted ? 1 : 0,
                                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                transition: 'opacity 0.4s ease 200ms, transform 0.4s ease 200ms'
                            }}
                        >
                            <div
                                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-6">
                                <Package className="w-10 h-10 text-purple-400"/>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">No cards found</h3>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                {searchQuery || rarityFilter || gameFilter
                                    ? "Try adjusting your filters to see more cards"
                                    : "Start opening packs to build your collection!"}
                            </p>
                            <Link
                                href="/boxes"
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-purple-500/25"
                            >
                                <Package className="w-5 h-5"/>
                                Browse Boxes
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
                <div className="space-y-6">
                    {/* Status Filter Pills */}
                    <div
                        className="flex flex-wrap gap-2"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease, transform 0.4s ease'
                        }}
                    >
                        {['', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status, index) => {
                            const config = status ? getOrderStatusConfig(status) : null;
                            const Icon = config?.icon;
                            const isActive = orderStatusFilter === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => {
                                        setOrderStatusFilter(status);
                                        setOrders([]);
                                    }}
                                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                        isActive
                                            ? config
                                                ? `${config.bg} ${config.color} border ${config.border}`
                                                : 'bg-white/10 text-white border border-white/20'
                                            : 'bg-white/[0.03] text-gray-400 border border-white/[0.05] hover:bg-white/[0.06] hover:text-white'
                                    }`}
                                    style={{animationDelay: `${index * 50}ms`}}
                                >
                                    {Icon && <Icon className="w-4 h-4"/>}
                                    {status || 'All Orders'}
                                </button>
                            );
                        })}
                    </div>

                    {/* Orders List */}
                    {loading ? (
                        <div className="glass-strong rounded-2xl p-16 text-center">
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"/>
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"/>
                            </div>
                            <p className="text-gray-400">Loading your orders...</p>
                        </div>
                    ) : orders.length > 0 ? (
                        <div className="space-y-4">
                            {orders.map((order, index) => {
                                const statusConfig = getOrderStatusConfig(order.status);
                                const StatusIcon = statusConfig.icon;
                                return (
                                    <div
                                        key={order.id}
                                        className="glass-strong rounded-2xl overflow-hidden"
                                        style={{
                                            opacity: mounted ? 1 : 0,
                                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                            transition: `opacity 0.4s ease ${index * 100}ms, transform 0.4s ease ${index * 100}ms`
                                        }}
                                    >
                                        {/* Order Header */}
                                        <div className="p-5 md:p-6 border-b border-white/[0.05]">
                                            <div className="flex flex-wrap items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl ${statusConfig.bg} border ${statusConfig.border}`}>
                                                        <StatusIcon className={`w-4 h-4 ${statusConfig.color}`}/>
                                                        <span
                                                            className={`font-semibold text-sm ${statusConfig.color}`}>{statusConfig.label}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold">Order
                                                            #{order.id.slice(-8).toUpperCase()}</p>
                                                        <p className="text-gray-500 text-sm">{formatDate(order.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <div
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                                    <Coins className="w-5 h-5 text-amber-400"/>
                                                    <span
                                                        className="font-bold text-lg text-amber-400">{order.totalCoins.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Order Items */}
                                        <div className="p-5 md:p-6">
                                            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                                {order.items.map((item) => (
                                                    <div key={item.id} className="flex-shrink-0 w-24">
                                                        <div
                                                            className="relative aspect-[63/88] rounded-xl overflow-hidden bg-gray-800 ring-1 ring-white/10">
                                                            {item.cardImage ? (
                                                                <Image
                                                                    src={item.cardImage}
                                                                    alt={item.cardName}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="96px"
                                                                />
                                                            ) : (
                                                                <div
                                                                    className="absolute inset-0 flex items-center justify-center">
                                                                    <Package className="w-8 h-8 text-gray-600"/>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-2 truncate text-center">{item.cardName}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Shipping Info */}
                                            <div className="mt-5 pt-5 border-t border-white/[0.05]">
                                                <div className="flex items-start gap-3 text-sm">
                                                    <div className="p-2 rounded-lg bg-emerald-500/10">
                                                        <MapPin className="w-4 h-4 text-emerald-400"/>
                                                    </div>
                                                    <div className="text-gray-400">
                                                        <p className="text-white font-medium">{order.shippingName}</p>
                                                        <p>{order.shippingAddress}</p>
                                                        <p>{order.shippingCity}, {order.shippingZip}</p>
                                                        <p>{order.shippingCountry}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div
                            className="glass-strong rounded-2xl p-16 text-center"
                            style={{
                                opacity: mounted ? 1 : 0,
                                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                transition: 'opacity 0.4s ease 100ms, transform 0.4s ease 100ms'
                            }}
                        >
                            <div
                                className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 mb-6">
                                <ShoppingBag className="w-10 h-10 text-emerald-400"/>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">No orders yet</h3>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                When you checkout cards from your collection, they'll appear here for tracking.
                            </p>
                            <button
                                onClick={() => setActiveTab('collection')}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all hover:scale-105 shadow-lg shadow-emerald-500/25"
                            >
                                <Package className="w-5 h-5"/>
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
                        <div className="glass-strong rounded-2xl p-16 text-center">
                            <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-full border-4 border-orange-500/20"/>
                                <div
                                    className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"/>
                            </div>
                            <p className="text-gray-400">Crunching your numbers...</p>
                        </div>
                    ) : stats ? (
                        <>
                            {/* Main Stats Grid */}
                            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                                {[
                                    {
                                        label: 'Total Pulls',
                                        value: stats.totalPulls,
                                        icon: Package,
                                        gradient: 'from-blue-500 to-cyan-500',
                                        delay: 0
                                    },
                                    {
                                        label: 'Battles Joined',
                                        value: stats.totalBattles,
                                        icon: Swords,
                                        gradient: 'from-purple-500 to-pink-500',
                                        delay: 50
                                    },
                                    {
                                        label: 'Victories',
                                        value: stats.battlesWon,
                                        icon: Trophy,
                                        gradient: 'from-green-500 to-emerald-500',
                                        delay: 100
                                    },
                                    {
                                        label: 'Win Rate',
                                        value: `${stats.winRate}%`,
                                        icon: Target,
                                        gradient: 'from-orange-500 to-red-500',
                                        delay: 150
                                    },
                                ].map((stat) => {
                                    const Icon = stat.icon;
                                    return (
                                        <div
                                            key={stat.label}
                                            className="relative overflow-hidden rounded-2xl"
                                            style={{
                                                opacity: mounted ? 1 : 0,
                                                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                                transition: `opacity 0.4s ease ${stat.delay}ms, transform 0.4s ease ${stat.delay}ms`
                                            }}
                                        >
                                            <div
                                                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10`}/>
                                            <div className="relative glass-strong p-6 text-center">
                                                <div
                                                    className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${stat.gradient} mb-4 shadow-lg`}>
                                                    <Icon className="w-7 h-7 text-white"/>
                                                </div>
                                                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                                                <p className="text-sm text-gray-400">{stat.label}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Economy & Orders */}
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div
                                    className="glass-strong rounded-2xl p-6 relative overflow-hidden"
                                    style={{
                                        opacity: mounted ? 1 : 0,
                                        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                        transition: 'opacity 0.4s ease 200ms, transform 0.4s ease 200ms'
                                    }}
                                >
                                    <div
                                        className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full"/>
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500">
                                            <Coins className="w-5 h-5 text-white"/>
                                        </div>
                                        Coin Economy
                                    </h3>
                                    <div className="space-y-3">
                                        {[
                                            {
                                                label: 'Current Balance',
                                                value: stats.currentCoins.toLocaleString(),
                                                color: 'text-amber-400',
                                                icon: Coins
                                            },
                                            {
                                                label: 'From Sales',
                                                value: `+${stats.totalCoinsEarned.toLocaleString()}`,
                                                color: 'text-green-400',
                                                icon: TrendingUp
                                            },
                                            {
                                                label: 'Collection Value',
                                                value: stats.collectionValue.toLocaleString(),
                                                color: 'text-purple-400',
                                                icon: Gem
                                            },
                                            {
                                                label: 'Cards Sold',
                                                value: stats.totalSales.toString(),
                                                color: 'text-white',
                                                icon: Package
                                            },
                                        ].map((item) => {
                                            const Icon = item.icon;
                                            return (
                                                <div key={item.label}
                                                     className="flex justify-between items-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                          <span className="text-gray-400 flex items-center gap-2">
                            <Icon className="w-4 h-4"/>
                              {item.label}
                          </span>
                                                    <span
                                                        className={`font-bold text-lg ${item.color}`}>{item.value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div
                                    className="glass-strong rounded-2xl p-6 relative overflow-hidden"
                                    style={{
                                        opacity: mounted ? 1 : 0,
                                        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                        transition: 'opacity 0.4s ease 250ms, transform 0.4s ease 250ms'
                                    }}
                                >
                                    <div
                                        className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full"/>
                                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                                            <ShoppingBag className="w-5 h-5 text-white"/>
                                        </div>
                                        Orders Overview
                                    </h3>
                                    <div className="space-y-3">
                                        <div
                                            className="flex justify-between items-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                                            <span className="text-gray-400">Total Orders</span>
                                            <span className="font-bold text-2xl text-white">{stats.totalOrders}</span>
                                        </div>
                                        <div
                                            className="flex justify-between items-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                      <span className="text-gray-400 flex items-center gap-2">
                        <Clock className="w-4 h-4"/>
                        Pending/Processing
                      </span>
                                            <span
                                                className="font-bold text-lg text-amber-400">{stats.pendingOrders}</span>
                                        </div>
                                        <div
                                            className="flex justify-between items-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                      <span className="text-gray-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4"/>
                        Completed
                      </span>
                                            <span
                                                className="font-bold text-lg text-green-400">{stats.totalOrders - stats.pendingOrders}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Milestones */}
                            <div
                                className="glass-strong rounded-2xl p-6 relative overflow-hidden"
                                style={{
                                    opacity: mounted ? 1 : 0,
                                    transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                                    transition: 'opacity 0.4s ease 300ms, transform 0.4s ease 300ms'
                                }}
                            >
                                <div
                                    className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-bl-full"/>
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-500">
                                        <Award className="w-5 h-5 text-white"/>
                                    </div>
                                    Milestones & Achievements
                                </h3>
                                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                                    {[
                                        {
                                            label: '100 Pulls',
                                            current: stats.totalPulls,
                                            target: 100,
                                            icon: Package,
                                            gradient: 'from-blue-500 to-cyan-500'
                                        },
                                        {
                                            label: '10 Victories',
                                            current: stats.battlesWon,
                                            target: 10,
                                            icon: Trophy,
                                            gradient: 'from-green-500 to-emerald-500'
                                        },
                                        {
                                            label: '50 Sales',
                                            current: stats.totalSales,
                                            target: 50,
                                            icon: Coins,
                                            gradient: 'from-purple-500 to-pink-500'
                                        },
                                        {
                                            label: '5 Orders',
                                            current: stats.totalOrders,
                                            target: 5,
                                            icon: ShoppingBag,
                                            gradient: 'from-orange-500 to-red-500'
                                        },
                                    ].map((milestone) => {
                                        const Icon = milestone.icon;
                                        const isComplete = milestone.current >= milestone.target;
                                        const progress = Math.min((milestone.current / milestone.target) * 100, 100);
                                        return (
                                            <div
                                                key={milestone.label}
                                                className={`relative p-5 rounded-2xl border transition-all ${
                                                    isComplete
                                                        ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-amber-500/30'
                                                        : 'bg-white/[0.02] border-white/[0.05]'
                                                }`}
                                            >
                                                {isComplete && (
                                                    <div className="absolute top-3 right-3">
                                                        <CheckCircle2 className="w-5 h-5 text-amber-400"/>
                                                    </div>
                                                )}
                                                <div
                                                    className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${isComplete ? `bg-gradient-to-br ${milestone.gradient}` : 'bg-gray-800'} mb-4`}>
                                                    <Icon
                                                        className={`w-6 h-6 ${isComplete ? 'text-white' : 'text-gray-500'}`}/>
                                                </div>
                                                <p className={`font-bold mb-1 ${isComplete ? 'text-white' : 'text-gray-400'}`}>{milestone.label}</p>
                                                <p className="text-sm text-gray-500 mb-3">{milestone.current}/{milestone.target}</p>
                                                {/* Progress bar */}
                                                <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full bg-gradient-to-r ${milestone.gradient} transition-all duration-500`}
                                                        style={{width: `${progress}%`}}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-strong rounded-2xl p-16 text-center">
                            <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4"/>
                            <p className="text-gray-400">Unable to load statistics</p>
                        </div>
                    )}
                </div>
            )}

            {/* Connections Tab - Modern Redesign with Bold Aesthetics */}
            {activeTab === 'connections' && (
                <div className="max-w-6xl mx-auto space-y-8 pb-8">
                    {/* Hero Header with Gradient Text */}
                    <div
                        className="relative"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                            transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div className="relative">
                            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-4">
                    <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                        Connect Your World
                    </span>
                            </h2>
                            <p className="text-xl text-gray-400 max-w-2xl">
                                Unite your gaming profiles and unlock exclusive perks across platforms
                            </p>
                        </div>
                    </div>

                    {/* Connection Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Discord Card - Not Connected */}
                        <div
                            className="group relative"
                            style={{
                                opacity: mounted ? 1 : 0,
                                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.1s'
                            }}
                        >
                            <div className="relative h-full glass-strong rounded-3xl p-8 border border-white/[0.05] overflow-hidden transition-all duration-500 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10">
                                {/* Animated Background Gradient */}
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5"/>
                                </div>

                                {/* Content */}
                                <div className="relative z-10 h-full flex flex-col">
                                    {/* Header with Icon */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 transition-transform duration-300 group-hover:scale-110">
                                                    <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
                                                    </svg>
                                                </div>
                                                {/* Pulse Ring */}
                                                <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 animate-ping opacity-0 group-hover:opacity-75"/>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-1">Discord</h3>
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/20">
                                                    <div className="w-2 h-2 rounded-full bg-gray-500"/>
                                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Not Connected</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-400 text-base leading-relaxed mb-6">
                                        Join our thriving community server and unlock special roles that give you access to exclusive channels, events, and insider updates.
                                    </p>

                                    {/* Benefits Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-8">
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                            <Star className="w-4 h-4 text-indigo-400 flex-shrink-0"/>
                                            <span className="text-sm text-indigo-300 font-medium">Exclusive Roles</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                            <Gift className="w-4 h-4 text-indigo-400 flex-shrink-0"/>
                                            <span className="text-sm text-indigo-300 font-medium">Early Access</span>
                                        </div>
                                    </div>

                                    {/* CTA */}
                                    <div className="mt-auto">
                                        <button
                                            className="relative w-full group/btn overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 p-[2px] transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02]"
                                        >
                                            <div className="relative bg-gradient-to-r from-indigo-500 to-blue-600 rounded-[10px] px-6 py-4 flex items-center justify-center gap-3">
                                                <Zap className="w-5 h-5 text-white"/>
                                                <span className="text-white font-bold text-lg">Connect Discord</span>
                                            </div>
                                        </button>
                                        <p className="text-center text-xs text-gray-500 mt-3">
                                            Instant setup • Less than 30 seconds
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Twitch Card - Connected */}
                        <div
                            className="group relative"
                            style={{
                                opacity: mounted ? 1 : 0,
                                transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.2s'
                            }}
                        >
                            <div className="relative h-full glass-strong rounded-3xl p-8 border border-green-500/20 overflow-hidden transition-all duration-500 hover:border-green-500/40 hover:shadow-2xl hover:shadow-green-500/10">
                                {/* Animated Background Gradient */}
                                <div className="absolute inset-0 opacity-100 transition-opacity duration-500">
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5"/>
                                </div>

                                {/* Success Glow */}
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-500/10 to-transparent rounded-bl-full"/>

                                {/* Content */}
                                <div className="relative z-10 h-full flex flex-col">
                                    {/* Header with Icon */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-xl shadow-purple-500/30 transition-transform duration-300 group-hover:scale-110">
                                                    <svg className="w-9 h-9 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
                                                    </svg>
                                                </div>
                                                {/* Connected Badge */}
                                                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-gray-900 flex items-center justify-center shadow-lg">
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                                    </svg>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-2xl font-bold text-white mb-1">Twitch</h3>
                                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                                                    <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">Connected</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-400 text-base leading-relaxed mb-6">
                                        Earn exclusive rewards while streaming your favorite games or watching other creators. Your activity unlocks special benefits.
                                    </p>

                                    {/* Benefits Grid */}
                                    <div className="grid grid-cols-2 gap-3 mb-6">
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                            <Trophy className="w-4 h-4 text-purple-400 flex-shrink-0"/>
                                            <span className="text-sm text-purple-300 font-medium">Stream Rewards</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/10">
                                            <Coins className="w-4 h-4 text-purple-400 flex-shrink-0"/>
                                            <span className="text-sm text-purple-300 font-medium">Watch & Earn</span>
                                        </div>
                                    </div>

                                    {/* Connection Info */}
                                    <div className="px-4 py-3 rounded-xl bg-green-500/5 border border-green-500/10 mb-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Connected Since</p>
                                                <p className="text-sm font-bold text-white">December 28, 2025</p>
                                            </div>
                                            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Disconnect Button */}
                                    <div className="mt-auto">
                                        <button
                                            className="w-full group/btn flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 font-semibold transition-all duration-300"
                                        >
                                            <X className="w-4 h-4 transition-transform duration-300 group-hover/btn:rotate-90"/>
                                            <span>Disconnect Account</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Privacy Notice - Redesigned */}
                    <div
                        className="relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 p-6"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(30px)',
                            transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s, transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.3s'
                        }}
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-bl-full"/>
                        <div className="relative flex items-start gap-4">
                            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-blue-400"/>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-white mb-2">Your Privacy is Protected</h4>
                                <p className="text-gray-400 leading-relaxed">
                                    We only use your connected accounts to verify your identity and provide platform-specific features. All data is encrypted and you maintain full control—disconnect anytime with a single click.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-6">
                    {/* Profile Section */}
                    <div
                        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease, transform 0.4s ease'
                        }}
                    >
                        <div
                            className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full"/>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                                <User className="w-5 h-5 text-white"/>
                            </div>
                            Profile Information
                        </h3>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={profileForm.name}
                                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    placeholder="Your name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                                <div
                                    className="flex items-center gap-3 px-4 py-3 bg-black/20 border border-white/[0.05] rounded-xl">
                                    <Mail className="w-5 h-5 text-gray-500"/>
                                    <span className="text-gray-400 flex-1">{user.email}</span>
                                    {user.emailVerified && (
                                        <div
                                            className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/30">
                                            <CheckCircle2 className="w-3 h-3 text-green-400"/>
                                            <span className="text-xs text-green-400 font-medium">Verified</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Bio</label>
                                <textarea
                                    value={profileForm.bio}
                                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                                    placeholder="Tell us about yourself..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address Section */}
                    <div
                        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease 100ms, transform 0.4s ease 100ms'
                        }}
                    >
                        <div
                            className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full"/>
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500">
                                <MapPin className="w-5 h-5 text-white"/>
                            </div>
                            Default Shipping Address
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">This address will be pre-filled when you checkout
                            cards.</p>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={profileForm.shippingName}
                                    onChange={(e) => setProfileForm({...profileForm, shippingName: e.target.value})}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"/>
                                    <input
                                        type="tel"
                                        value={profileForm.shippingPhone}
                                        onChange={(e) => setProfileForm({
                                            ...profileForm,
                                            shippingPhone: e.target.value
                                        })}
                                        className="w-full pl-12 pr-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                        placeholder="+1 234 567 8900"
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Street Address</label>
                                <input
                                    type="text"
                                    value={profileForm.shippingAddress}
                                    onChange={(e) => setProfileForm({...profileForm, shippingAddress: e.target.value})}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    placeholder="123 Main Street, Apt 4"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                                <input
                                    type="text"
                                    value={profileForm.shippingCity}
                                    onChange={(e) => setProfileForm({...profileForm, shippingCity: e.target.value})}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    placeholder="New York"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">ZIP / Postal
                                    Code</label>
                                <input
                                    type="text"
                                    value={profileForm.shippingZip}
                                    onChange={(e) => setProfileForm({...profileForm, shippingZip: e.target.value})}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    placeholder="10001"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Country</label>
                                <input
                                    type="text"
                                    value={profileForm.shippingCountry}
                                    onChange={(e) => setProfileForm({...profileForm, shippingCountry: e.target.value})}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                    placeholder="United States"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Account Info */}
                    <div
                        className="glass-strong rounded-2xl p-6 relative overflow-hidden"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease 200ms, transform 0.4s ease 200ms'
                        }}
                    >
                        <div
                            className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full"/>
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                                <Calendar className="w-5 h-5 text-white"/>
                            </div>
                            Account Information
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                                <p className="text-sm text-gray-500 mb-1">Member Since</p>
                                <p className="text-white font-semibold">{formatDate(user.createdAt)}</p>
                            </div>
                            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
                                <p className="text-sm text-gray-500 mb-1">Account Status</p>
                                <div className="flex items-center gap-2">
                                    {user.emailVerified ? (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>
                                            <span className="text-green-400 font-semibold">Verified & Active</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-amber-500"/>
                                            <span className="text-amber-400 font-semibold">Pending Verification</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div
                        className="flex justify-end"
                        style={{
                            opacity: mounted ? 1 : 0,
                            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                            transition: 'opacity 0.4s ease 300ms, transform 0.4s ease 300ms'
                        }}
                    >
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="group relative inline-flex items-center gap-3 px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all hover:scale-105 hover:shadow-xl hover:shadow-purple-500/25 disabled:opacity-50 disabled:hover:scale-100"
                        >
                            <div
                                className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"/>
                            {saving ? (
                                <>
                                    <div
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10"/>
                                    <span className="relative z-10">Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 relative z-10"/>
                                    <span className="relative z-10">Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Card Zoom Modal */}
            {zoomedCard && zoomedCard.card && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setZoomedCard(null);
                    }}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-xl"/>

                    {/* Content */}
                    <div
                        className="relative max-w-lg w-full flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setZoomedCard(null)}
                            className="absolute -top-14 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-110"
                            aria-label="Close"
                        >
                            <X className="h-6 w-6"/>
                        </button>

                        {/* Card Image */}
                        <div
                            className="relative w-full max-w-xs aspect-[63/88] mb-6 rounded-2xl overflow-hidden shadow-2xl shadow-black/50">
                            <Image
                                src={zoomedCard.card.imageUrlGatherer}
                                alt={zoomedCard.card.name}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 90vw, 420px"
                                unoptimized
                            />
                        </div>

                        {/* Card Details */}
                        <div className="glass-strong rounded-2xl p-6 w-full text-center border border-white/10">
                            {/* Rarity Badge */}
                            {(() => {
                                const config = getRarityConfig(zoomedCard.card.rarity);
                                const Icon = config.icon;
                                return (
                                    <div
                                        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold mb-4 ${config.bg} ${config.color} border ${config.border}`}>
                                        <Icon className="w-4 h-4"/>
                                        {zoomedCard.card.rarity}
                                    </div>
                                );
                            })()}

                            <h2 className="text-2xl font-bold text-white mb-2">{zoomedCard.card.name}</h2>
                            <p className="text-gray-400 mb-6">{zoomedCard.box.name}</p>

                            <div
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
                                <Coins className="h-5 w-5 text-amber-400"/>
                                <span className="text-xl font-bold text-amber-400">{zoomedCard.card.coinValue}</span>
                                <span className="text-amber-400/70">coins</span>
                            </div>

                            {zoomedCard.cartItem ? (
                                <div
                                    className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-500/10 text-emerald-400 rounded-xl font-bold border border-emerald-500/30">
                                    <ShoppingCart className="h-5 w-5"/>
                                    Already in Cart
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleAddToCart(zoomedCard.id)}
                                        disabled={loading}
                                        className="flex-1 px-6 py-4 rounded-xl font-bold text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ShoppingCart className="h-5 w-5"/>
                                        Add to Cart
                                    </button>
                                    <button
                                        onClick={() => handleSellCard(zoomedCard.id, zoomedCard.card!.coinValue)}
                                        disabled={loading}
                                        className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25"
                                    >
                                        <Coins className="h-5 w-5"/>
                                        Sell Card
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
});
