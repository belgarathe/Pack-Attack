'use client';

import { useState, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { 
  Store, 
  Search, 
  Filter, 
  ChevronDown, 
  ShoppingCart, 
  Star,
  Package,
  Tag,
  Sparkles
} from 'lucide-react';

type Product = {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  images: string[];
  category: string;
  game: string | null;
  condition: string;
  stock: number;
  featured: boolean;
  shop: {
    id: string;
    name: string;
    logo: string | null;
  };
};

type CategoryCount = {
  category: string;
  _count: number;
};

type GameCount = {
  game: string | null;
  _count: number;
};

interface ShopClientProps {
  initialProducts: Product[];
  categories: CategoryCount[];
  games: GameCount[];
}

const categoryDisplayNames: Record<string, string> = {
  SINGLE_CARD: 'Single Cards',
  BOOSTER_BOX: 'Booster Boxes',
  BOOSTER_PACK: 'Booster Packs',
  STARTER_DECK: 'Starter Decks',
  STRUCTURE_DECK: 'Structure Decks',
  ACCESSORIES: 'Accessories',
  SLEEVES: 'Sleeves',
  PLAYMAT: 'Playmats',
  BINDER: 'Binders',
  DECK_BOX: 'Deck Boxes',
  OTHER: 'Other',
};

const gameDisplayNames: Record<string, string> = {
  MAGIC_THE_GATHERING: 'Magic: The Gathering',
  ONE_PIECE: 'One Piece',
  POKEMON: 'Pokémon',
  LORCANA: 'Lorcana',
  YUGIOH: 'Yu-Gi-Oh!',
  FLESH_AND_BLOOD: 'Flesh and Blood',
};

const conditionDisplayNames: Record<string, string> = {
  MINT: 'Mint',
  NEAR_MINT: 'Near Mint',
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  LIGHT_PLAYED: 'Light Played',
  PLAYED: 'Played',
  POOR: 'Poor',
};

export function ShopClient({ initialProducts, categories, games }: ShopClientProps) {
  const { addToast } = useToast();
  const [products] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGame, setSelectedGame] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description?.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesGame = selectedGame === 'all' || product.game === selectedGame;

      return matchesSearch && matchesCategory && matchesGame;
    });
  }, [products, searchQuery, selectedCategory, selectedGame]);

  const featuredProducts = useMemo(() => {
    return filteredProducts.filter(p => p.featured);
  }, [filteredProducts]);

  const regularProducts = useMemo(() => {
    return filteredProducts.filter(p => !p.featured);
  }, [filteredProducts]);

  const handleAddToCart = async (productId: string) => {
    setAddingToCart(productId);
    try {
      const res = await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
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
        title: 'Added to Cart',
        description: 'Item has been added to your cart',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      <div className="fixed top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl hidden lg:block" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl hidden lg:block" />

      <div className="relative container py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-4 rounded-full glass text-sm">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="text-gray-300">TCG Marketplace</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Shop <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Cards & Products</span>
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Browse products from verified sellers. Find singles, sealed products, and accessories.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-xl glass-strong text-white placeholder-gray-500 border border-gray-700 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 rounded-xl glass-strong text-white border border-gray-700 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer min-w-[180px]"
              >
                <option value="all" className="bg-gray-900">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.category} value={cat.category} className="bg-gray-900">
                    {categoryDisplayNames[cat.category] || cat.category} ({cat._count})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Game Filter */}
            <div className="relative">
              <select
                value={selectedGame}
                onChange={(e) => setSelectedGame(e.target.value)}
                className="appearance-none pl-4 pr-10 py-3 rounded-xl glass-strong text-white border border-gray-700 focus:border-emerald-500 focus:outline-none transition-colors cursor-pointer min-w-[180px]"
              >
                <option value="all" className="bg-gray-900">All Games</option>
                {games.filter(g => g.game).map((g) => (
                  <option key={g.game} value={g.game!} className="bg-gray-900">
                    {gameDisplayNames[g.game!] || g.game} ({g._count})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>

            {/* Cart Link */}
            <Link
              href="/shop/cart"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold hover:from-emerald-500 hover:to-cyan-500 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>Cart</span>
            </Link>
          </div>

          {/* Active Filters */}
          {(selectedCategory !== 'all' || selectedGame !== 'all' || searchQuery) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
                  Search: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="ml-1 hover:text-white">×</button>
                </span>
              )}
              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm">
                  {categoryDisplayNames[selectedCategory] || selectedCategory}
                  <button onClick={() => setSelectedCategory('all')} className="ml-1 hover:text-white">×</button>
                </span>
              )}
              {selectedGame !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm">
                  {gameDisplayNames[selectedGame] || selectedGame}
                  <button onClick={() => setSelectedGame('all')} className="ml-1 hover:text-white">×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedGame('all');
                }}
                className="px-3 py-1 rounded-full bg-gray-700/50 text-gray-400 text-sm hover:bg-gray-600/50 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Featured Products */}
        {featuredProducts.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
              Featured Products
            </h2>
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {featuredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={handleAddToCart}
                  isAdding={addingToCart === product.id}
                  featured
                />
              ))}
            </div>
          </div>
        )}

        {/* All Products */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Package className="w-6 h-6 text-emerald-400" />
              {selectedCategory !== 'all' || selectedGame !== 'all' ? 'Filtered Results' : 'All Products'}
            </h2>
            <span className="text-gray-400">
              {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </span>
          </div>

          {regularProducts.length === 0 && featuredProducts.length === 0 ? (
            <div className="glass-strong rounded-2xl p-12 text-center">
              <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Products Found</h3>
              <p className="text-gray-400">
                {searchQuery || selectedCategory !== 'all' || selectedGame !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'No products are available at the moment. Check back later!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {regularProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddToCart={handleAddToCart}
                  isAdding={addingToCart === product.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// PERFORMANCE: Memoized ProductCard to prevent unnecessary re-renders
const ProductCard = memo(function ProductCard({ 
  product, 
  onAddToCart, 
  isAdding,
  featured = false 
}: { 
  product: Product; 
  onAddToCart: (id: string) => void;
  isAdding: boolean;
  featured?: boolean;
}) {
  const discount = product.comparePrice 
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null;

  return (
    <div className={`group glass-strong rounded-2xl overflow-hidden transition-all hover:scale-[1.02] ${featured ? 'ring-2 ring-amber-500/50' : ''}`}>
      {/* Image */}
      <Link href={`/shop/product/${product.id}`}>
        <div className="relative aspect-square bg-gray-800">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-16 h-16 text-gray-600" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {featured && (
              <span className="px-2 py-1 rounded-lg bg-amber-500 text-gray-900 text-xs font-bold flex items-center gap-1">
                <Star className="w-3 h-3" /> Featured
              </span>
            )}
            {discount && discount > 0 && (
              <span className="px-2 py-1 rounded-lg bg-red-500 text-white text-xs font-bold">
                -{discount}%
              </span>
            )}
          </div>

          {/* Game Badge */}
          {product.game && (
            <div className="absolute top-3 right-3">
              <span className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs">
                {gameDisplayNames[product.game] || product.game}
              </span>
            </div>
          )}

          {/* Stock Badge */}
          {product.stock <= 3 && product.stock > 0 && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 rounded-lg bg-orange-500/90 text-white text-xs font-bold">
                Only {product.stock} left!
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Shop Name */}
        <div className="flex items-center gap-2 mb-2">
          <Store className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500">{product.shop.name}</span>
        </div>

        {/* Product Name */}
        <Link href={`/shop/product/${product.id}`}>
          <h3 className="font-semibold text-white mb-1 line-clamp-2 hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Category & Condition */}
        <div className="flex flex-wrap gap-1 mb-3">
          <span className="px-2 py-0.5 rounded bg-gray-700/50 text-gray-400 text-xs">
            {categoryDisplayNames[product.category] || product.category}
          </span>
          <span className="px-2 py-0.5 rounded bg-gray-700/50 text-gray-400 text-xs">
            {conditionDisplayNames[product.condition] || product.condition}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl font-bold text-emerald-400">€{product.price.toFixed(2)}</span>
          {product.comparePrice && (
            <span className="text-sm text-gray-500 line-through">€{product.comparePrice.toFixed(2)}</span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={() => onAddToCart(product.id)}
          disabled={isAdding}
          className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isAdding ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
});

// Display name for React DevTools
ProductCard.displayName = 'ProductCard';
