'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Package, Swords, Settings, LogIn, LogOut, User, ShoppingCart, Coins, History, Menu, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { subscribeToCoinBalanceUpdates } from '@/lib/coin-events';
import { usePathname } from 'next/navigation';

export function Navigation() {
  const { data: session, status } = useSession();
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
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

    const interval = setInterval(fetchCoins, 10000);
    return () => clearInterval(interval);
  }, [session, fetchCoins]);

  const NavLink = ({ href, icon: Icon, children, onClick }: { href: string; icon: React.ElementType; children: React.ReactNode; onClick?: () => void }) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        className={`flex items-center gap-2 transition-colors touch-target ${
          isActive 
            ? 'text-white font-medium' 
            : 'text-gray-400 hover:text-white'
        }`}
        onClick={onClick}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{children}</span>
      </Link>
    );
  };

  const MobileNavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link 
        href={href} 
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-target ${
          isActive 
            ? 'bg-primary/20 text-white font-medium' 
            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white active:bg-gray-800'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className="text-base">{children}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50 safe-area-padding" role="navigation" aria-label="Main navigation">
        <div className="container flex items-center justify-between py-3 md:py-4">
          {/* Logo */}
          <div className="flex items-center gap-4 md:gap-8">
            <Link 
              href="/" 
              className="text-lg md:text-xl font-bold text-white hover:text-primary transition-colors focus-ring"
              aria-label="Pack Attack - Home"
            >
              Pack Attack
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <NavLink href="/boxes" icon={Package}>Boxes</NavLink>
              <NavLink href="/battles" icon={Swords}>Battles</NavLink>
              {session && (
                <>
                  <NavLink href="/collection" icon={Package}>Collection</NavLink>
                  <NavLink href="/sales-history" icon={History}>Sales History</NavLink>
                </>
              )}
              {session?.user?.role === 'ADMIN' && (
                <NavLink href="/admin" icon={Settings}>Admin</NavLink>
              )}
            </div>
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center gap-4">
            {status === 'loading' ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700" aria-hidden="true" />
            ) : session ? (
              <>
                <Link href="/purchase-coins" className="focus-ring rounded-lg">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 cursor-pointer transition-colors">
                    <Coins className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                    <span className="text-sm font-semibold text-yellow-500" aria-label={`${userCoins !== null ? userCoins.toLocaleString() : 'Loading'} coins`}>
                      {userCoins !== null ? userCoins.toLocaleString() : '...'}
                    </span>
                  </div>
                </Link>
                <Link href="/cart" className="relative focus-ring rounded-lg">
                  <Button variant="ghost" size="sm" className="relative touch-target" aria-label={`Shopping cart with ${cartCount} items`}>
                    <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                    {cartCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white" aria-hidden="true">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white focus-ring rounded-lg px-2 py-1">
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="truncate-text max-w-[120px]">{session.user.name || session.user.email}</span>
                </Link>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-gray-400 hover:text-red-400 touch-target"
                  aria-label="Sign out"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" size="sm" className="touch-target">
                  <Link href="/login">
                    <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                    Sign In
                  </Link>
                </Button>
                <Button asChild size="sm" className="touch-target">
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Right Side - Coins, Cart, and Menu */}
          <div className="flex md:hidden items-center gap-2">
            {session && (
              <>
                <Link href="/purchase-coins" className="focus-ring rounded-lg">
                  <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/50">
                    <Coins className="h-4 w-4 text-yellow-500" aria-hidden="true" />
                    <span className="text-xs font-semibold text-yellow-500">
                      {userCoins !== null ? userCoins.toLocaleString() : '...'}
                    </span>
                  </div>
                </Link>
                <Link href="/cart" className="relative focus-ring rounded-lg p-2">
                  <ShoppingCart className="h-5 w-5 text-gray-400" aria-label={`Shopping cart with ${cartCount} items`} />
                  {cartCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            
            {/* Hamburger Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 text-gray-400 hover:text-white transition-colors focus-ring rounded-lg touch-target ${mobileMenuOpen ? 'hamburger-active' : ''}`}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        id="mobile-menu"
        className={`mobile-menu md:hidden ${mobileMenuOpen ? 'open' : ''}`}
        aria-hidden={!mobileMenuOpen}
      >
        <div className="container py-6 space-y-2">
          {/* Navigation Links */}
          <div className="space-y-1">
            <MobileNavLink href="/boxes" icon={Package}>Boxes</MobileNavLink>
            <MobileNavLink href="/battles" icon={Swords}>Battles</MobileNavLink>
            {session && (
              <>
                <MobileNavLink href="/collection" icon={Package}>My Collection</MobileNavLink>
                <MobileNavLink href="/sales-history" icon={History}>Sales History</MobileNavLink>
              </>
            )}
            {session?.user?.role === 'ADMIN' && (
              <MobileNavLink href="/admin" icon={Settings}>Admin Panel</MobileNavLink>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 my-4" />

          {/* User Section */}
          {status === 'loading' ? (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-700" />
              <div className="h-4 w-24 animate-pulse rounded bg-gray-700" />
            </div>
          ) : session ? (
            <div className="space-y-2">
              <Link 
                href="/dashboard" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800/50 touch-target"
                onClick={() => setMobileMenuOpen(false)}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-5 w-5 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{session.user.name || 'User'}</p>
                  <p className="text-sm text-gray-400 truncate">{session.user.email}</p>
                </div>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut({ callbackUrl: '/login' });
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors touch-target"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="text-base">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2 px-4">
              <Button asChild variant="outline" className="w-full touch-target justify-center">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign In
                </Link>
              </Button>
              <Button asChild className="w-full touch-target justify-center">
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  Get Started
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop for mobile menu */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
