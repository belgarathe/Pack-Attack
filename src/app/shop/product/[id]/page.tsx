'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { 
  Store, 
  ShoppingCart, 
  ArrowLeft, 
  Package, 
  Star,
  Minus,
  Plus,
  ChevronLeft,
  ChevronRight,
  Tag,
  Shield
} from 'lucide-react';

type Product = {
  id: string;
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
    description: string | null;
  };
};

const categoryDisplayNames: Record<string, string> = {
  SINGLE_CARD: 'Single Card',
  BOOSTER_BOX: 'Booster Box',
  BOOSTER_PACK: 'Booster Pack',
  STARTER_DECK: 'Starter Deck',
  STRUCTURE_DECK: 'Structure Deck',
  ACCESSORIES: 'Accessories',
  SLEEVES: 'Sleeves',
  PLAYMAT: 'Playmat',
  BINDER: 'Binder',
  DECK_BOX: 'Deck Box',
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

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/shop/products/${params.id}`);
        const data = await res.json();
        
        if (data.success && data.product) {
          setProduct(data.product);
        } else {
          addToast({
            title: 'Error',
            description: 'Product not found',
            variant: 'destructive',
          });
          router.push('/shop');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [params.id, router, addToast]);

  const handleAddToCart = async () => {
    if (!product) return;
    
    setAddingToCart(true);
    try {
      const res = await fetch('/api/shop/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, quantity }),
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
        description: `${quantity}x ${product.name} added to your cart`,
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to add to cart',
        variant: 'destructive',
      });
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
        <div className="text-white flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading product...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
          <Link href="/shop" className="text-emerald-400 hover:underline">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.comparePrice 
    ? Math.round((1 - product.price / product.comparePrice) * 100)
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Breadcrumb */}
        <Link href="/shop" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden glass-strong">
              {product.images[currentImageIndex] ? (
                <Image
                  src={product.images[currentImageIndex]}
                  alt={product.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-24 h-24 text-gray-600" />
                </div>
              )}

              {/* Image Navigation */}
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {product.featured && (
                  <span className="px-3 py-1 rounded-lg bg-amber-500 text-gray-900 text-sm font-bold flex items-center gap-1">
                    <Star className="w-4 h-4" /> Featured
                  </span>
                )}
                {discount && discount > 0 && (
                  <span className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm font-bold">
                    -{discount}% OFF
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      currentImageIndex === index ? 'border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Shop Info */}
            <Link 
              href={`/shop?shopId=${product.shop.id}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/5 transition-colors"
            >
              <Store className="w-4 h-4 text-emerald-400" />
              <span className="text-gray-300">{product.shop.name}</span>
            </Link>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-white">{product.name}</h1>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-lg bg-gray-700/50 text-gray-300 text-sm flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {categoryDisplayNames[product.category] || product.category}
              </span>
              {product.game && (
                <span className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
                  {gameDisplayNames[product.game] || product.game}
                </span>
              )}
              <span className="px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {conditionDisplayNames[product.condition] || product.condition}
              </span>
            </div>

            {/* Price */}
            <div className="glass-strong rounded-xl p-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-emerald-400">€{product.price.toFixed(2)}</span>
                {product.comparePrice && (
                  <span className="text-xl text-gray-500 line-through">€{product.comparePrice.toFixed(2)}</span>
                )}
              </div>
              {discount && discount > 0 && (
                <p className="text-emerald-400 text-sm">You save €{(product.comparePrice! - product.price).toFixed(2)} ({discount}%)</p>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              {product.stock > 0 ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-400">In Stock</span>
                  {product.stock <= 5 && (
                    <span className="text-orange-400 text-sm">- Only {product.stock} left!</span>
                  )}
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-400">Out of Stock</span>
                </>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {product.stock > 0 && (
              <div className="space-y-4">
                {/* Quantity Selector */}
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">Quantity:</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                    >
                      <Minus className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-12 text-center text-white font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                      className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addingToCart ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding to Cart...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5" />
                      Add to Cart - €{(product.price * quantity).toFixed(2)}
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="glass-strong rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Description</h2>
                <p className="text-gray-400 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
