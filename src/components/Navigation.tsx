'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Package, Swords, Settings, LogIn, User, ShoppingCart, Coins, History } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { subscribeToCoinBalanceUpdates } from '@/lib/coin-events';

export function Navigation() {
  const { data: session, status } = useSession();
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const fetchCoins = useCallback(() => {
    if (!session) {
      setUserCoins(null);
      return;
    }

    fetch('/api/user/coins')
      .then((res) => res.json())
      .then((data) => {
        if (data.coins !== undefined) {
          setUserCoins(data.coins);
        }
      })
      .catch(console.error);
  }, [session]);

  useEffect(() => {
    if (!session) {
      setUserCoins(null);
      setCartCount(0);
      return;
    }

    fetchCoins();

    fetch('/api/cart')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCartCount(data.items?.length || 0);
        }
      })
      .catch(console.error);
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

  return (
    <nav className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white hover:text-primary transition-colors">
            Pack Attack
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              href="/boxes" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Package className="h-4 w-4" />
              <span>Boxes</span>
            </Link>
            <Link 
              href="/battles" 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Swords className="h-4 w-4" />
              <span>Battles</span>
            </Link>
            {session && (
              <>
                <Link 
                  href="/collection" 
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Package className="h-4 w-4" />
                  <span>Collection</span>
                </Link>
                <Link 
                  href="/sales-history" 
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <History className="h-4 w-4" />
                  <span>Sales History</span>
                </Link>
              </>
            )}
            {session?.user?.role === 'ADMIN' && (
              <Link 
                href="/admin" 
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {status === 'loading' ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-700" />
          ) : session ? (
            <>
              <Link href="/purchase-coins">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/50 hover:bg-yellow-500/30 cursor-pointer transition-colors">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-semibold text-yellow-500">
                    {userCoins !== null ? userCoins.toLocaleString() : '...'}
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
              <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                <User className="h-4 w-4" />
                <span>{session.user.name || session.user.email}</span>
              </Link>
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
      </div>
    </nav>
  );
}
