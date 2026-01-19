'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { 
  ShoppingCart, 
  ArrowLeft, 
  Package, 
  Trash2,
  Minus,
  Plus,
  Store,
  CreditCard
} from 'lucide-react';

type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
    shop: {
      id: string;
      name: string;
    };
  };
};

type Cart = {
  id: string;
  items: CartItem[];
  total: number;
  itemCount: number;
};

export default function ShopCartPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchCart = async () => {
    try {
      const res = await fetch('/api/shop/cart');
      const data = await res.json();
      
      if (data.success) {
        setCart(data.cart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdating(itemId);
    try {
      const res = await fetch(`/api/shop/cart/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to update quantity',
          variant: 'destructive',
        });
        return;
      }

      // Update local state
      setCart((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((item) => 
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        );
        const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return { ...prev, items, total, itemCount };
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update quantity',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const res = await fetch(`/api/shop/cart/${itemId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to remove item',
          variant: 'destructive',
        });
        return;
      }

      // Update local state
      setCart((prev) => {
        if (!prev) return prev;
        const items = prev.items.filter((item) => item.id !== itemId);
        const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
        return { ...prev, items, total, itemCount };
      });

      addToast({
        title: 'Removed',
        description: 'Item removed from cart',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to remove item',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const clearCart = async () => {
    try {
      const res = await fetch('/api/shop/cart', {
        method: 'DELETE',
      });

      if (res.ok) {
        setCart({ id: cart?.id || '', items: [], total: 0, itemCount: 0 });
        addToast({
          title: 'Cart Cleared',
          description: 'All items have been removed',
        });
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to clear cart',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 flex items-center justify-center font-display">
        <div className="text-white flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading cart...
        </div>
      </div>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        {/* Breadcrumb */}
        <Link href="/shop" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Continue Shopping
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="w-8 h-8 text-emerald-400" />
          <h1 className="text-3xl font-bold text-white">Shopping Cart</h1>
          {cart && cart.itemCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">
              {cart.itemCount} item{cart.itemCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {isEmpty ? (
          <div className="glass-strong rounded-2xl p-12 text-center max-w-md mx-auto">
            <ShoppingCart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Your Cart is Empty</h2>
            <p className="text-gray-400 mb-6">Browse our shop and add some products!</p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all"
            >
              <Package className="w-5 h-5" />
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Group by Shop */}
              {Array.from(new Set(cart.items.map(item => item.product.shop.id))).map(shopId => {
                const shopItems = cart.items.filter(item => item.product.shop.id === shopId);
                const shopName = shopItems[0]?.product.shop.name;
                
                return (
                  <div key={shopId} className="glass-strong rounded-2xl overflow-hidden">
                    {/* Shop Header */}
                    <div className="px-6 py-4 border-b border-gray-700/50 flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-400" />
                      <span className="font-semibold text-white">{shopName}</span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-gray-700/50">
                      {shopItems.map((item) => (
                        <div key={item.id} className="p-6 flex gap-4">
                          {/* Image */}
                          <Link href={`/shop/product/${item.product.id}`} className="flex-shrink-0">
                            <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-800">
                              {item.product.images[0] ? (
                                <Image
                                  src={item.product.images[0]}
                                  alt={item.product.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package className="w-8 h-8 text-gray-600" />
                                </div>
                              )}
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <Link href={`/shop/product/${item.product.id}`}>
                              <h3 className="font-semibold text-white hover:text-emerald-400 transition-colors truncate">
                                {item.product.name}
                              </h3>
                            </Link>
                            <p className="text-emerald-400 font-semibold mt-1">
                              €{item.product.price.toFixed(2)}
                            </p>

                            {/* Quantity Controls */}
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  disabled={updating === item.id || item.quantity <= 1}
                                  className="p-1.5 rounded-lg glass hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                  <Minus className="w-4 h-4 text-white" />
                                </button>
                                <span className="w-8 text-center text-white font-semibold">
                                  {updating === item.id ? '...' : item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  disabled={updating === item.id || item.quantity >= item.product.stock}
                                  className="p-1.5 rounded-lg glass hover:bg-white/10 transition-colors disabled:opacity-50"
                                >
                                  <Plus className="w-4 h-4 text-white" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.id)}
                                disabled={updating === item.id}
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Subtotal */}
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              €{(item.product.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Clear Cart */}
              <button
                onClick={clearCart}
                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear Cart
              </button>
            </div>

            {/* Order Summary */}
            <div>
              <div className="glass-strong rounded-2xl p-6 sticky top-24">
                <h2 className="text-xl font-bold text-white mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-400">
                    <span>Subtotal ({cart.itemCount} items)</span>
                    <span className="text-white">€{cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Shipping</span>
                    <span className="text-white">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-white">Total</span>
                    <span className="text-2xl font-bold text-emerald-400">€{cart.total.toFixed(2)}</span>
                  </div>
                </div>

                <Link
                  href="/shop/checkout"
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  Proceed to Checkout
                </Link>

                <Link
                  href="/shop"
                  className="w-full mt-3 py-3 glass text-gray-300 font-medium rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
