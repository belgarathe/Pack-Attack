'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Coins, 
  Layers, 
  Package,
  Download,
  Calendar
} from 'lucide-react';

type CardConfig = {
  scryfallId: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  rarity: string;
  imageUrl: string;
  pullRate: number;
  coinValue: number;
  sourceGame: string;
};

type PresetPreviewModalProps = {
  preset: {
    id: string;
    name: string;
    description: string | null;
    boxName: string;
    boxDescription: string;
    price: number;
    cardsPerPack: number;
    games: string[];
    cardsConfig: CardConfig[];
    thumbnailUrl: string | null;
    cardCount: number;
    totalPullRate: number;
    createdAt: string;
  };
  onClose: () => void;
  onLoad: () => void;
};

const gameLabels: Record<string, string> = {
  MAGIC_THE_GATHERING: 'Magic: The Gathering',
  ONE_PIECE: 'One Piece',
  POKEMON: 'Pokémon',
  LORCANA: 'Lorcana',
  YUGIOH: 'Yu-Gi-Oh!',
  FLESH_AND_BLOOD: 'Flesh and Blood',
};

const rarityColors: Record<string, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  mythic: 'text-orange-400',
  'mythic rare': 'text-orange-400',
  legendary: 'text-yellow-400',
  special: 'text-purple-400',
  'super rare': 'text-purple-400',
  'ultra rare': 'text-yellow-400',
  'secret rare': 'text-pink-400',
};

export function PresetPreviewModal({ preset, onClose, onLoad }: PresetPreviewModalProps) {
  const cards = preset.cardsConfig as CardConfig[];
  const sortedCards = [...cards].sort((a, b) => b.coinValue - a.coinValue);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{preset.name}</h2>
              {preset.description && (
                <p className="text-gray-400">{preset.description}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Box Info Summary */}
          <div className="p-6 bg-gray-800/50 border-b border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">Box Name</span>
                </div>
                <p className="font-semibold text-white truncate">{preset.boxName}</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Price</span>
                </div>
                <p className="font-semibold text-white">{Number(preset.price).toLocaleString()} coins</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Layers className="h-4 w-4" />
                  <span className="text-sm">Cards</span>
                </div>
                <p className="font-semibold text-white">{preset.cardCount} cards • {preset.cardsPerPack}/pack</p>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Created</span>
                </div>
                <p className="font-semibold text-white">
                  {new Date(preset.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            {/* Games */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-400">Games:</span>
              {preset.games.map((game) => (
                <span
                  key={game}
                  className="px-3 py-1 rounded-full bg-gray-700 text-sm text-white"
                >
                  {gameLabels[game] || game}
                </span>
              ))}
            </div>

            {/* Box Description */}
            {preset.boxDescription && (
              <div className="mt-4">
                <span className="text-sm text-gray-400">Description:</span>
                <p className="text-white mt-1">{preset.boxDescription}</p>
              </div>
            )}
          </div>

          {/* Cards Preview */}
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Cards in this Preset ({cards.length})
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {sortedCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  {/* Card Image */}
                  <div className="relative aspect-[63/88]">
                    {card.imageUrl ? (
                      <Image
                        src={card.imageUrl}
                        alt={card.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                        <Package className="h-8 w-8 text-gray-500" />
                      </div>
                    )}
                  </div>
                  
                  {/* Card Info */}
                  <div className="p-3">
                    <p className="font-medium text-white text-sm truncate" title={card.name}>
                      {card.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {card.setName}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs capitalize ${rarityColors[card.rarity.toLowerCase()] || 'text-gray-400'}`}>
                        {card.rarity}
                      </span>
                      <span className="text-xs text-amber-400 flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        {card.coinValue}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Pull Rate: {card.pullRate.toFixed(3)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Loading this preset will populate the box creation form with all settings and cards.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onLoad} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Download className="h-4 w-4 mr-2" />
                Load Preset
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
