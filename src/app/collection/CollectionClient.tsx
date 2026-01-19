'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Coins, ShoppingCart, X, AlertTriangle, Filter, ChevronDown, Package } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

type Pull = {
  id: string;
  card: {
    id: string;
    name: string;
    imageUrlGatherer: string;
    coinValue: number;
    rarity: string;
  } | null;
  box: {
    name: string;
    games: string[];
  };
  cartItem: { id: string } | null;
};

interface CollectionClientProps {
  pulls: Pull[];
  availableGames: string[];
}

const gameDisplayNames: Record<string, string> = {
  'all': 'All Games',
  'pokemon': 'Pokémon',
  'POKEMON': 'Pokémon',
  'magic': 'Magic: The Gathering',
  'MAGIC_THE_GATHERING': 'Magic: The Gathering',
  'magic_the_gathering': 'Magic: The Gathering',
  'yugioh': 'Yu-Gi-Oh!',
  'YUGIOH': 'Yu-Gi-Oh!',
  'onepiece': 'One Piece',
  'ONE_PIECE': 'One Piece',
  'one_piece': 'One Piece',
  'lorcana': 'Disney Lorcana',
  'LORCANA': 'Disney Lorcana',
  'digimon': 'Digimon',
  'DIGIMON': 'Digimon',
  'sports': 'Sports Cards',
  'SPORTS': 'Sports Cards',
  'flesh_and_blood': 'Flesh & Blood',
  'FLESH_AND_BLOOD': 'Flesh & Blood',
  'fleshblood': 'Flesh & Blood',
};

function getGameDisplayName(game: string) {
  return gameDisplayNames[game] || game.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function getGameBadgeColor(game: string): string {
  const normalized = game.toLowerCase().replace(/-/g, '_');
  const colors: Record<string, string> = {
    pokemon: 'bg-yellow-400',
    magic: 'bg-purple-500',
    magic_the_gathering: 'bg-purple-500',
    yugioh: 'bg-orange-500',
    onepiece: 'bg-red-500',
    one_piece: 'bg-red-500',
    lorcana: 'bg-blue-500',
    digimon: 'bg-cyan-400',
    sports: 'bg-green-500',
    flesh_and_blood: 'bg-rose-500',
    fleshblood: 'bg-rose-500',
  };
  return colors[normalized] || 'bg-gray-400';
}

export function CollectionClient({ pulls, availableGames }: CollectionClientProps) {
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [zoomedCard, setZoomedCard] = useState<Pull | null>(null);
  const [showSellAllModal, setShowSellAllModal] = useState(false);
  const [sellAllLoading, setSellAllLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Filter pulls based on selected game
  const filteredPulls = useMemo(() => {
    if (selectedGame === 'all') return pulls;
    return pulls.filter(pull => pull.box.games?.includes(selectedGame));
  }, [pulls, selectedGame]);

  // Calculate totals for sell all (only for filtered cards)
  const sellableCards = filteredPulls.filter(p => p.card && !p.cartItem);
  const totalValue = sellableCards.reduce((sum, p) => sum + (p.card?.coinValue || 0), 0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomedCard && (e.target as HTMLElement).classList.contains('zoom-overlay')) {
        setZoomedCard(null);
      }
    };

    if (zoomedCard) {
      document.addEventListener('click', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [zoomedCard]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && zoomedCard) {
        setZoomedCard(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [zoomedCard]);

  const handleSell = async (pullId: string, coinValue: number) => {
    setLoading(pullId);
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
      } else {
        emitCoinBalanceUpdate();
      }
      router.refresh();
    } catch (error) {
      console.error('Error selling card:', error);
      addToast({
        title: 'Error',
        description: 'Failed to sell card',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleAddToCart = async (pullId: string) => {
    setLoading(pullId);
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

      router.refresh();
    } catch (error) {
      console.error('Error adding to cart:', error);
      addToast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleSellAll = async () => {
    setSellAllLoading(true);
    try {
      const res = await fetch('/api/cards/sell-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to sell cards',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'All Cards Sold!',
        description: `Sold ${data.cardsSold} cards for ${data.coinsReceived.toLocaleString()} coins!`,
      });

      if (data.newBalance !== undefined) {
        emitCoinBalanceUpdate({ balance: data.newBalance });
      } else {
        emitCoinBalanceUpdate();
      }
      
      setShowSellAllModal(false);
      router.refresh();
    } catch (error) {
      console.error('Error selling all cards:', error);
      addToast({
        title: 'Error',
        description: 'Failed to sell cards',
        variant: 'destructive',
      });
    } finally {
      setSellAllLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'mythic':
      case 'legendary':
        return 'text-amber-400 bg-amber-500/20';
      case 'rare':
        return 'text-purple-400 bg-purple-500/20';
      case 'uncommon':
        return 'text-blue-400 bg-blue-500/20';
      default:
        return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-4 py-3 glass-strong rounded-xl text-white font-medium hover:bg-white/10 transition-all min-w-[220px]"
          >
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="flex-1 text-left">
              {selectedGame === 'all' ? 'All Games' : getGameDisplayName(selectedGame)}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsDropdownOpen(false)} 
              />
              
              {/* Dropdown */}
              <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] rounded-xl overflow-hidden z-50 border border-gray-700 shadow-2xl bg-gray-900">
                <div className="max-h-[400px] overflow-y-auto py-2 bg-gray-900">
                  {/* All Games option */}
                  <button
                    onClick={() => {
                      setSelectedGame('all');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                      selectedGame === 'all' 
                        ? 'bg-emerald-600/30 text-emerald-400' 
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="font-medium">All Games</span>
                    <span className="ml-auto text-xs text-gray-500">{pulls.length} cards</span>
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-gray-700" />

                  {/* Game options */}
                  {availableGames.map(game => {
                    const gameCardCount = pulls.filter(p => p.box.games?.includes(game)).length;
                    return (
                      <button
                        key={game}
                        onClick={() => {
                          setSelectedGame(game);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                          selectedGame === game 
                            ? 'bg-emerald-600/30 text-emerald-400' 
                            : 'text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${getGameBadgeColor(game)}`} />
                        <span className="font-medium">{getGameDisplayName(game)}</span>
                        <span className="ml-auto text-xs text-gray-500">{gameCardCount} cards</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Active filter pill */}
        {selectedGame !== 'all' && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
            <span>{getGameDisplayName(selectedGame)}</span>
            <button 
              onClick={() => setSelectedGame('all')}
              className="ml-1 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Results count */}
        <span className="text-gray-400 text-sm">
          Showing {filteredPulls.length} of {pulls.length} cards
        </span>

        {/* Sell All Button - moved to the right */}
        {sellableCards.length > 0 && (
          <button
            onClick={() => setShowSellAllModal(true)}
            className="ml-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg hover:shadow-amber-500/25 flex items-center gap-2"
          >
            <Coins className="h-5 w-5" />
            Sell All ({sellableCards.length})
          </button>
        )}
      </div>

      {filteredPulls.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20">
            <Package className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Cards Found</h2>
          <p className="text-gray-400 mb-6">No cards in your collection for {getGameDisplayName(selectedGame)}</p>
          <button 
            onClick={() => setSelectedGame('all')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl transition-all hover:scale-105"
          >
            Show All Cards
          </button>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filteredPulls.map((pull) => {
            if (!pull.card) return null;

            return (
              <div
                key={pull.id}
                className="group glass rounded-xl overflow-hidden hover:ring-2 hover:ring-emerald-500/50 transition-all cursor-pointer"
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
      )}

      {/* Zoom Modal */}
      {zoomedCard && zoomedCard.card && (
        <div
          className="zoom-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setZoomedCard(null);
          }}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button
              onClick={() => setZoomedCard(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close zoom"
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
              <div className={`inline-block rounded-full px-3 py-1 text-sm font-semibold mb-3 ${getRarityColor(zoomedCard.card.rarity)}`}>
                {zoomedCard.card.rarity}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{zoomedCard.card.name}</h2>
              <p className="text-gray-400 mb-4">{zoomedCard.box.name}</p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <Coins className="h-5 w-5 text-amber-400" />
                <span className="text-xl font-semibold text-white">{zoomedCard.card.coinValue} coins</span>
              </div>

              {zoomedCard.cartItem ? (
                <div className="px-6 py-3 bg-emerald-500/20 text-emerald-400 rounded-xl font-semibold">
                  <ShoppingCart className="h-4 w-4 inline mr-2" />
                  In Cart
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleAddToCart(zoomedCard.id);
                      setZoomedCard(null);
                    }}
                    disabled={loading === zoomedCard.id}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-white gradient-border bg-gray-900/50 hover:bg-gray-800/50 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Checkout
                  </button>
                  <button
                    onClick={() => {
                      handleSell(zoomedCard.id, zoomedCard.card!.coinValue);
                      setZoomedCard(null);
                    }}
                    disabled={loading === zoomedCard.id}
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

      {/* Sell All Confirmation Modal */}
      {showSellAllModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSellAllModal(false);
          }}
        >
          <div className="glass-strong rounded-2xl p-8 max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-2xl bg-amber-500/20">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-3">Sell All Cards?</h2>
            <p className="text-gray-400 mb-6">
              You are about to sell <span className="text-white font-semibold">{sellableCards.length} cards</span> for a total of{' '}
              <span className="text-amber-400 font-semibold">{totalValue.toLocaleString()} coins</span>.
            </p>
            <p className="text-red-400 text-sm mb-6">
              This action cannot be undone!
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSellAllModal(false)}
                disabled={sellAllLoading}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gray-700 hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSellAll}
                disabled={sellAllLoading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl transition-all hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {sellAllLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Selling...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4" />
                    Sell All
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
