'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Coins, Package, ChevronRight, ChevronDown, Filter, Sparkles, Layers } from 'lucide-react';

interface Card {
  id: string;
  name: string;
  imageUrlGatherer: string | null;
  coinValue: number;
}

interface Box {
  id: string;
  name: string;
  price: number;
  cardsPerPack: number;
  featured: boolean;
  games: string[];
  cards: Card[];
  _count: {
    cards: number;
  };
  createdByShop?: {
    id: string;
    name: string;
  } | null;
}

interface BoxesClientProps {
  boxes: Box[];
  availableGames: string[];
}

export default function BoxesClient({ boxes, availableGames }: BoxesClientProps) {
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const filteredBoxes = useMemo(() => {
    if (selectedGame === 'all') return boxes;
    return boxes.filter(box => box.games.includes(selectedGame));
  }, [boxes, selectedGame]);

  const gameDisplayNames: Record<string, string> = {
    'all': 'All Games',
    'pokemon': 'Pokémon',
    'magic': 'Magic: The Gathering',
    'magic_the_gathering': 'Magic: The Gathering',
    'yugioh': 'Yu-Gi-Oh!',
    'onepiece': 'One Piece',
    'one_piece': 'One Piece',
    'lorcana': 'Disney Lorcana',
    'digimon': 'Digimon',
    'sports': 'Sports Cards',
    'flesh_and_blood': 'Flesh & Blood',
    'fleshblood': 'Flesh & Blood',
  };

  const getGameDisplayName = (game: string) => {
    const normalized = game.toLowerCase().replace(/-/g, '_');
    return gameDisplayNames[normalized] || game.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <>
      {/* Filter Bar */}
      <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl text-white font-semibold transition-all w-full sm:min-w-[240px] border border-gray-700/50 active:border-blue-500/50 touch-target min-h-[52px]"
            style={{
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            }}
            aria-label="Filter by game"
            aria-expanded={isDropdownOpen}
            aria-controls="game-filter-dropdown"
          >
            <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" />
            <span className="flex-1 text-left text-sm sm:text-base">
              {selectedGame === 'all' ? 'All Games' : getGameDisplayName(selectedGame)}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-black/40" 
                onClick={() => setIsDropdownOpen(false)} 
                onTouchEnd={() => setIsDropdownOpen(false)}
              />
              
              {/* Dropdown with premium styling */}
              <div 
                id="game-filter-dropdown"
                className="absolute top-full left-0 mt-3 w-full min-w-[280px] rounded-2xl overflow-hidden z-50 border-2 border-gray-700/80 shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
                  backdropFilter: 'blur(16px)',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255, 255, 255, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                }}
                role="listbox"
                aria-label="Game filter options"
              >
                <div className="max-h-[420px] overflow-y-auto py-2 overscroll-contain"
                     style={{
                       scrollbarWidth: 'thin',
                       scrollbarColor: 'rgba(59, 130, 246, 0.3) rgba(0, 0, 0, 0.2)',
                       WebkitOverflowScrolling: 'touch',
                     }}
                >
                  {/* All Games option */}
                  <button
                    onClick={() => {
                      setSelectedGame('all');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-4 text-left flex items-center gap-3 transition-all duration-200 border-l-4 touch-target min-h-[56px] ${
                      selectedGame === 'all' 
                        ? 'bg-blue-600/20 text-blue-400 border-blue-500' 
                        : 'text-gray-300 active:bg-gray-800/50 border-transparent active:border-blue-500/30'
                    }`}
                    role="option"
                    aria-selected={selectedGame === 'all'}
                  >
                    <Package className="w-4 h-4 shrink-0" />
                    <span className="font-semibold">All Games</span>
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-medium shrink-0">{boxes.length}</span>
                  </button>

                  {/* Divider */}
                  <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />

                  {/* Game options */}
                  {availableGames.map(game => {
                    const gameBoxCount = boxes.filter(b => b.games.includes(game)).length;
                    return (
                      <button
                        key={game}
                        onClick={() => {
                          setSelectedGame(game);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-4 py-4 text-left flex items-center gap-3 transition-all duration-200 border-l-4 touch-target min-h-[56px] ${
                          selectedGame === game 
                            ? 'bg-blue-600/20 text-blue-400 border-blue-500' 
                            : 'text-gray-300 active:bg-gray-800/50 border-transparent active:border-blue-500/30'
                        }`}
                        role="option"
                        aria-selected={selectedGame === game}
                      >
                        <span 
                          className={`w-2.5 h-2.5 rounded-full ${getGameBadgeColor(game)} shrink-0`} 
                          style={{ boxShadow: `0 0 8px currentColor` }}
                        />
                        <span className="font-semibold">{getGameDisplayName(game)}</span>
                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-medium shrink-0">{gameBoxCount}</span>
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-blue-500/20 text-blue-400 text-sm min-h-[40px] w-full sm:w-auto">
            <span className="flex-1 sm:flex-initial">{getGameDisplayName(selectedGame)}</span>
            <button 
              onClick={() => setSelectedGame('all')}
              className="ml-1 active:text-white transition-colors p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label="Clear filter"
            >
              ✕
            </button>
          </div>
        )}

        {/* Results count */}
        <span className="text-gray-400 text-sm sm:ml-auto order-first sm:order-none w-full sm:w-auto text-center sm:text-left py-2 sm:py-0">
          Showing {filteredBoxes.length} of {boxes.length} boxes
        </span>
      </div>

      {/* Boxes Grid */}
      {filteredBoxes.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 sm:p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 mb-4 sm:mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-3">No Boxes Found</h2>
          <p className="text-gray-400 mb-6 text-sm sm:text-base">No boxes available for {getGameDisplayName(selectedGame)}</p>
          <button 
            onClick={() => setSelectedGame('all')}
            className="inline-flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl transition-all active:scale-95 touch-target min-h-[52px]"
          >
            <Sparkles className="w-5 h-5" />
            Show All Boxes
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredBoxes.map((box) => (
            <Link 
              key={box.id} 
              href={`/open/${box.id}`}
              className="group relative rounded-2xl overflow-hidden mobile-card-interaction transition-all duration-300 active:scale-[0.97] sm:hover:scale-[1.02]"
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              }}
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                   style={{
                     background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.15), transparent 70%)',
                   }} />
              
              {/* Card Preview Section - Fanned Cards */}
              <div className="relative h-48 bg-gradient-to-b from-gray-800/40 to-gray-900/60 flex items-end justify-center pb-2 overflow-hidden">
                {/* Background glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 via-transparent to-transparent" />
                
                {/* Fanned Cards Display */}
                {box.cards && box.cards.length > 0 ? (
                  <div className="relative h-40 w-full flex items-center justify-center">
                    {box.cards.slice(0, 3).map((card, index) => {
                      const rotations = [-15, 0, 15];
                      const translations = [-20, 0, 20];
                      const zIndexes = [1, 3, 2];
                      return (
                        <div
                          key={card.id}
                          className="absolute transition-all duration-500 group-hover:scale-110"
                          style={{
                            transform: `rotate(${rotations[index]}deg) translateX(${translations[index]}px)`,
                            zIndex: zIndexes[index],
                          }}
                        >
                          <div 
                            className="relative w-20 h-[110px] rounded-lg overflow-hidden border-2 border-gray-700/80 shadow-2xl group-hover:border-blue-400/80 transition-all duration-300 bg-gray-800"
                            style={{
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                            }}
                          >
                            {card.imageUrlGatherer ? (
                              <Image
                                src={card.imageUrlGatherer}
                                alt={card.name}
                                fill
                                className="object-cover"
                                sizes="80px"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                                <span className="text-[8px] text-gray-500">?</span>
                              </div>
                            )}
                            {/* Value badge on top card */}
                            {index === 1 && (
                              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 flex items-center gap-0.5">
                                <Coins className="w-2 h-2 text-amber-400" />
                                <span className="text-[8px] font-bold text-amber-400">{card.coinValue.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="w-12 h-12 text-gray-600" />
                  </div>
                )}

                {/* Badges */}
                {box.featured && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-[10px] font-bold text-white z-10">
                    ⭐ Featured
                  </div>
                )}
                {box.createdByShop && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-[10px] font-bold text-white z-10" title={`By ${box.createdByShop.name}`}>
                    🏪 Partner Shop
                  </div>
                )}
                {box.games && box.games[0] && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-${box.games[0].toLowerCase()} z-10`}>
                    {box.games[0]}
                  </div>
                )}
              </div>

              {/* Box Info - Modern Premium Design */}
              <div className="relative p-5 bg-gradient-to-b from-gray-900/60 to-gray-950/80">
                {/* Top accent line */}
                <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                
                <h3 className="text-base font-bold text-white mb-3 group-hover:text-blue-400 transition-colors line-clamp-1 tracking-wide">
                  {box.name}
                </h3>
                
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
                    <Coins className="w-4 h-4 text-amber-400" style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))' }} />
                    <span className="text-sm font-bold text-amber-400">{box.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400 text-xs font-semibold group-hover:gap-2 transition-all duration-300">
                    Open <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-800/50">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3" />
                    {box.cardsPerPack} cards/pack
                  </span>
                  <span className="font-medium">{box._count.cards} total</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
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

