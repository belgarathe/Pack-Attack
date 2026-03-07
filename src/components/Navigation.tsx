'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Package, Swords, Settings, LogIn, LogOut, User, ShoppingCart, Coins, History, Trophy, Menu, X, Store, Zap, MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { subscribeToCoinBalanceUpdates } from '@/lib/coin-events';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const { data: session, status } = useSession();
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [levelData, setLevelData] = useState<{ level: number; xpInCurrentLevel: number; xpForNextLevel: number; percent: number; title: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [mobileMenuOpen]);

  // Swipe gesture to close mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX.current;
      const deltaY = Math.abs(touchEndY - touchStartY.current);

      // Swipe right to close (at least 100px horizontal, less than 100px vertical)
      if (deltaX > 100 && deltaY < 100) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mobileMenuOpen]);

  const fetchCoins = useCallback(async () => {
    if (!session) {
      setUserCoins(null);
      return;
    }

    try {
      const response = await fetch('/api/user/coins');
      if (!response.ok) {
        console.error('Failed to fetch coins:', response.status, response.statusText);
        return;
      }
      const data = await response.json();
      if (data.coins !== undefined) {
        setUserCoins(data.coins);
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
    }
  }, [session]);

  const fetchLevel = useCallback(async () => {
    if (!session) {
      setLevelData(null);
      return;
    }
    try {
      const response = await fetch('/api/user/level');
      if (!response.ok) return;
      const data = await response.json();
      setLevelData(data);
    } catch {
      // non-critical, ignore
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setUserCoins(null);
      setCartCount(0);
      return;
    }

    fetchCoins();
    fetchLevel();

    // Fetch pending feedback count for admins
    if (session?.user?.role === 'ADMIN') {
      fetch('/api/feedback/pending-count')
        .then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          if (data.success) setFeedbackCount(data.count);
        })
        .catch(() => {});
    }

    // Fetch cart count
    fetch('/api/cart')
      .then(async (res) => {
        if (!res.ok) {
          console.error('Failed to fetch cart:', res.status, res.statusText);
          return;
        }
        const data = await res.json();
        if (data.success) {
          setCartCount(data.items?.length || 0);
        }
      })
      .catch((error) => {
        console.error('Error fetching cart:', error);
      });
  }, [session, fetchCoins, fetchLevel]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const unsubscribe = subscribeToCoinBalanceUpdates((detail) => {
      if (detail.balance !== undefined) {
        setUserCoins(detail.balance);
        return;
      }

      fetchCoins();
    });

    return unsubscribe;
  }, [session, fetchCoins]);

  useEffect(() => {
    if (!session) {
      return;
    }

    // PERFORMANCE: Reduced polling frequency from 10s to 60s to reduce server load
    const interval = setInterval(fetchCoins, 60000);
    return () => clearInterval(interval);
  }, [session, fetchCoins]);

  const navLinks: Array<{
    href: string;
    icon: React.ElementType;
    label: string;
    requiresAuth: boolean;
    adminOnly?: boolean;
    shopOrAdmin?: boolean;
    hideForAdmin?: boolean;
    badge?: number;
  }> = [
    { href: '/boxes', icon: Package, label: 'Boxes', requiresAuth: false },
    { href: '/battles', icon: Swords, label: 'Battles', requiresAuth: false },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', requiresAuth: false },
    { href: '/collection', icon: Package, label: 'Collection', requiresAuth: true },
    { href: '/sales-history', icon: History, label: 'Sales History', requiresAuth: true },
    { href: '/feedback', icon: MessageSquare, label: 'Feedback', requiresAuth: false, hideForAdmin: true },
    { href: '/shop-dashboard', icon: Store, label: 'Shop Dashboard', requiresAuth: true, shopOrAdmin: true },
    { href: '/admin', icon: Settings, label: 'Admin', requiresAuth: true, adminOnly: true, badge: feedbackCount },
  ];

  // PERFORMANCE: Memoize filtered links
  const filteredLinks = useMemo(() => {
    return navLinks.filter(link => {
      if (link.adminOnly && session?.user?.role !== 'ADMIN') return false;
      if (link.shopOrAdmin && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SHOP_OWNER') return false;
      if (link.hideForAdmin && session?.user?.role === 'ADMIN') return false;
      if (link.requiresAuth && !session) return false;
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, feedbackCount]);

  return (
    <nav ref={navRef} className="relative z-50 border-b border-white/[0.08] bg-gray-950" id="main-navigation">
      <div className="container flex h-16 items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 touch-target group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
            <Package className="h-4 w-4 text-blue-400" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Pack<span className="text-blue-400">Attack</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 flex-1">
          {filteredLinks.map((link) => {
            // Check if a more specific sibling link matches — avoid parent highlighting child routes
            const hasMoreSpecificMatch = filteredLinks.some(
              (other) => other.href !== link.href && other.href.startsWith(link.href + '/') && pathname?.startsWith(other.href)
            );
            const isActive = hasMoreSpecificMatch
              ? false
              : pathname === link.href || pathname?.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 touch-target ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <link.icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : ''}`} />
                <span>{link.label}</span>
                {link.badge && link.badge > 0 ? (
                  <span className="flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white min-w-[18px] h-[18px] px-1">
                    {link.badge > 99 ? '99+' : link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        {/* Desktop Right Side */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {status === 'loading' ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-800" />
          ) : session ? (
            <>
              {/* Coin Balance */}
              <Link href="/purchase-coins">
                <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-yellow-500/10 border border-yellow-500/25 hover:bg-yellow-500/20 cursor-pointer transition-all duration-150">
                  <Coins className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-400 tabular-nums">
                    {userCoins !== null ? userCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                  </span>
                </div>
              </Link>

              {/* Level Badge */}
              {levelData && (
                <Link href="/dashboard" title={`Level ${levelData.level} — ${levelData.title}`}>
                  <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-purple-500/10 border border-purple-500/25 hover:bg-purple-500/20 transition-all duration-150 relative overflow-hidden">
                    {/* XP fill bar */}
                    <div
                      className="absolute inset-0 bg-purple-500/15 origin-left transition-transform duration-500"
                      style={{ transform: `scaleX(${levelData.percent / 100})` }}
                    />
                    <Zap className="h-3.5 w-3.5 text-purple-400 relative z-10 shrink-0" />
                    <span className="text-xs font-bold text-purple-300 relative z-10 tabular-nums">
                      {levelData.level}
                    </span>
                  </div>
                </Link>
              )}

              {/* Cart */}
              <Link href="/cart" className="relative">
                <div className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/[0.06] transition-colors">
                  <ShoppingCart className="h-4 w-4 text-gray-400" />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white min-w-[18px] h-[18px] px-1">
                      {cartCount}
                    </span>
                  )}
                </div>
              </Link>

              {/* User Profile */}
              <Link href="/dashboard" className="hidden lg:flex items-center gap-2 h-9 px-3 rounded-lg hover:bg-white/[0.06] transition-colors">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20">
                  <User className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-sm text-gray-300 max-w-[100px] truncate">{session.user.name || session.user.email}</span>
              </Link>

              {/* Sign Out */}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Right Side */}
        <div className="flex md:hidden items-center gap-1.5 ml-auto">
          {session && (
            <>
              <Link href="/purchase-coins" className="touch-target">
                <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/25">
                  <Coins className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-xs font-semibold text-yellow-400 tabular-nums">
                    {userCoins !== null ? userCoins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '...'}
                  </span>
                </div>
              </Link>
              <Link href="/cart" className="relative flex items-center justify-center h-9 w-9 touch-target">
                <ShoppingCart className="h-5 w-5 text-gray-400" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white min-w-[16px] h-[16px] px-1">
                    {cartCount}
                  </span>
                )}
              </Link>
            </>
          )}
          
          {/* Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center h-9 w-9 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.06] active:bg-white/10 transition-all touch-target"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        id="mobile-menu"
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-gray-950/98 backdrop-blur-xl transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          top: '64px'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
          {/* Navigation Links */}
          <div className="flex-1 px-3 py-4 space-y-0.5">
            {filteredLinks.map((link) => {
              const hasMoreSpecificMatch = filteredLinks.some(
                (other) => other.href !== link.href && other.href.startsWith(link.href + '/') && pathname?.startsWith(other.href)
              );
              const isActive = hasMoreSpecificMatch
                ? false
                : pathname === link.href || pathname?.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium transition-all touch-target min-h-[52px] ${
                    isActive
                      ? 'bg-blue-500/15 text-white'
                      : 'text-gray-300 active:bg-white/[0.06]'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <link.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} />
                  <span>{link.label}</span>
                  {link.badge && link.badge > 0 ? (
                    <span className="ml-auto flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white min-w-[18px] h-[18px] px-1">
                      {link.badge > 99 ? '99+' : link.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>

          {/* User Section */}
          <div className="border-t border-white/[0.06] px-3 py-4 space-y-3 safe-area-padding-bottom">
            {status === 'loading' ? (
              <div className="h-14 animate-pulse rounded-xl bg-gray-800" />
            ) : session ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/[0.04] active:bg-white/[0.08] transition-colors touch-target min-h-[60px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white truncate">
                        {session.user.name || 'User'}
                      </p>
                      {levelData && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-300 shrink-0">
                          <Zap className="h-2.5 w-2.5" />
                          {levelData.level}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {session.user.email}
                    </p>
                    {levelData && (
                      <div className="mt-1.5 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${levelData.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-medium text-red-400 border border-red-500/20 active:bg-red-500/10 transition-colors touch-target min-h-[48px]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Button asChild className="w-full py-3 min-h-[48px] touch-target bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/25">
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full py-3 min-h-[48px] touch-target">
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
          onTouchEnd={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}
