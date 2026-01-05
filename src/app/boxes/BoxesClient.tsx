'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Coins, Package, ChevronRight, ChevronDown, Filter, Sparkles } from 'lucide-react';

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
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 px-4 py-3 glass-strong rounded-xl text-white font-medium hover:bg-white/10 transition-all min-w-[220px]"
          >
            <Filter className="w-4 h-4 text-blue-400" />
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
              <div className="absolute top-full left-0 mt-2 w-full min-w-[260px] glass-strong rounded-xl overflow-hidden z-50 border border-white/10 shadow-2xl">
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {/* All Games option */}
                  <button
                    onClick={() => {
                      setSelectedGame('all');
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                      selectedGame === 'all' 
                        ? 'bg-blue-500/20 text-blue-400' 
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    <Package className="w-4 h-4" />
                    <span className="font-medium">All Games</span>
                    <span className="ml-auto text-xs text-gray-500">{boxes.length} boxes</span>
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-white/10" />

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
                        className={`w-full px-4 py-3 text-left flex items-center gap-3 transition-colors ${
                          selectedGame === game 
                            ? 'bg-blue-500/20 text-blue-400' 
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${getGameBadgeColor(game)}`} />
                        <span className="font-medium">{getGameDisplayName(game)}</span>
                        <span className="ml-auto text-xs text-gray-500">{gameBoxCount} boxes</span>
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm">
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
        <span className="text-gray-400 text-sm ml-auto">
          Showing {filteredBoxes.length} of {boxes.length} boxes
        </span>
      </div>

      {/* Boxes Grid */}
      {filteredBoxes.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
            <Package className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">No Boxes Found</h2>
          <p className="text-gray-400 mb-6">No boxes available for {getGameDisplayName(selectedGame)}</p>
          <button 
            onClick={() => setSelectedGame('all')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white font-semibold rounded-xl transition-all hover:scale-105"
          >
            <Sparkles className="w-5 h-5" />
            Show All Boxes
          </button>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredBoxes.map((box) => (
            <Link 
              key={box.id} 
              href={`/open/${box.id}`}
              className="group glass rounded-xl overflow-hidden card-lift"
            >
              {/* Card Preview Section - Fanned Cards */}
              <div className="relative h-48 bg-gradient-to-b from-gray-800/50 to-gray-900/80 flex items-end justify-center pb-2 overflow-hidden">
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
                          className="absolute transition-transform duration-300 group-hover:scale-105"
                          style={{
                            transform: `rotate(${rotations[index]}deg) translateX(${translations[index]}px)`,
                            zIndex: zIndexes[index],
                          }}
                        >
                          <div className="relative w-20 h-[110px] rounded-md overflow-hidden border-2 border-gray-600 shadow-lg group-hover:border-amber-400/50 transition-colors bg-gray-800">
                            {card.imageUrlGatherer ? (
                              <Image
                                src={card.imageUrlGatherer}
                                alt={card.name}
                                fill
                                className="object-cover"
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
                                <span className="text-[8px] font-bold text-amber-400">{card.coinValue}</span>
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
                {box.games && box.games[0] && (
                  <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold badge-${box.games[0].toLowerCase()} z-10`}>
                    {box.games[0]}
                  </div>
                )}
              </div>

              {/* Box Info */}
              <div className="p-4 border-t border-gray-800">
                <h3 className="text-sm font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
                  {box.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-amber-400">{box.price.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">coins</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-blue-400 text-xs font-medium group-hover:translate-x-0.5 transition-transform">
                    Open <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-800/50 flex items-center justify-between text-[11px] text-gray-500">
                  <span>{box.cardsPerPack} cards/pack</span>
                  <span>{box._count.cards} total</span>
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

