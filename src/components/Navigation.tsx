'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Package, Swords, Settings, LogIn, LogOut, User, ShoppingCart, Coins, History, Trophy, Menu, X, Store } from 'lucide-react';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { subscribeToCoinBalanceUpdates } from '@/lib/coin-events';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const { data: session, status } = useSession();
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!session) {
      setUserCoins(null);
      setCartCount(0);
      return;
    }

    fetchCoins();

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
  }, [session, fetchCoins]);

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
  }> = [
    { href: '/boxes', icon: Package, label: 'Boxes', requiresAuth: false },
    { href: '/battles', icon: Swords, label: 'Battles', requiresAuth: false },
    { href: '/leaderboard', icon: Trophy, label: 'Leaderboard', requiresAuth: false },
    { href: '/collection', icon: Package, label: 'Collection', requiresAuth: true },
    { href: '/sales-history', icon: History, label: 'Sales History', requiresAuth: true },
    { href: '/shop-dashboard', icon: Store, label: 'Shop Dashboard', requiresAuth: true, shopOrAdmin: true },
    { href: '/admin', icon: Settings, label: 'Admin', requiresAuth: true, adminOnly: true },
  ];

  // PERFORMANCE: Memoize filtered links
  const filteredLinks = useMemo(() => {
    return navLinks.filter(link => {
      if (link.adminOnly && session?.user?.role !== 'ADMIN') return false;
      if (link.shopOrAdmin && session?.user?.role !== 'ADMIN' && session?.user?.role !== 'SHOP_OWNER') return false;
      if (link.requiresAuth && !session) return false;
      return true;
    });
  }, [session]);

  return (
    <nav ref={navRef} className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50" id="main-navigation">
      <div className="container flex items-center justify-between py-3 md:py-4">
        {/* Logo */}
        <Link href="/" className="text-lg md:text-xl font-bold text-white hover:text-primary transition-colors shrink-0 touch-target">
          Pack Attack
        </Link>

        {/* Desktop Navigation - hidden on mobile/tablet (<1024px), visible on large screens (≥1024px) */}
        <div className="hidden lg:flex items-center gap-6">
          {filteredLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 text-sm transition-colors touch-target ${
                pathname === link.href ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <link.icon className="h-4 w-4" />
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Desktop Right Side - hidden on mobile (<768px), visible on tablet+ (≥768px) */}
        <div className="hidden md:flex items-center gap-3">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700" />
          ) : session ? (
            <>
              <Link href="/purchase-coins">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 cursor-pointer transition-colors">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-500">
                    {userCoins !== null ? userCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                  </span>
                </div>
              </Link>
              <Link href="/cart" className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </Link>
              <Link href="/dashboard" className="hidden lg:flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{session.user.name || session.user.email}</span>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-gray-400 hover:text-white hover:bg-red-500/20"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Right Side - visible on mobile (<768px), hidden on tablet+ (≥768px) */}
        <div className="flex md:hidden items-center gap-2">
          {session && (
            <>
              <Link href="/purchase-coins" className="touch-target">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/50 min-h-[44px]">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-semibold text-yellow-500">
                    {userCoins !== null ? userCoins.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '...'}
                  </span>
                </div>
              </Link>
              <Link href="/cart" className="relative p-2 touch-target min-h-[44px] min-w-[44px] flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-gray-400" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </>
          )}
          
          {/* Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white active:text-white transition-colors touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu - visible on mobile (<768px), hidden on tablet+ (≥768px) */}
      <div
        id="mobile-menu"
        className={`md:hidden fixed inset-x-0 bottom-0 z-40 bg-gray-900/98 backdrop-blur-lg transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          top: navRef.current ? `${navRef.current.offsetHeight}px` : '57px'
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain">
          {/* Navigation Links */}
          <div className="flex-1 px-4 py-6 space-y-1">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-4 rounded-xl text-base font-medium transition-colors touch-target min-h-[56px] ${
                  pathname === link.href
                    ? 'bg-primary/20 text-white'
                    : 'text-gray-300 active:bg-gray-800 active:text-white'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          {/* User Section */}
          <div className="border-t border-gray-800 px-4 py-6 space-y-4 safe-area-padding-bottom">
            {status === 'loading' ? (
              <div className="h-14 animate-pulse rounded-xl bg-gray-800" />
            ) : session ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-4 py-4 rounded-xl bg-gray-800/50 active:bg-gray-800 transition-colors touch-target min-h-[64px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {session.user.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </Link>
                <Button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ callbackUrl: '/' });
                  }}
                  variant="outline"
                  className="w-full py-4 min-h-[52px] text-red-400 border-red-400/30 active:bg-red-500/10 active:text-red-300 touch-target"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <Button asChild className="w-full py-4 min-h-[52px] touch-target">
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full py-4 min-h-[52px] touch-target">
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

      {/* Backdrop - only visible on mobile when menu is open */}
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
