'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Coins, Trash2, CreditCard, Truck, ShoppingBag, Plus, Minus, Check, Euro } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';

type CartItem = {
  id: string;
  pull: {
    id: string;
    card: {
      id: string;
      name: string;
      imageUrlGatherer: string;
      coinValue: number;
    } | null;
  };
};

type UpsellItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  price: number;
  coinPrice: number;
  externalUrl: string | null;
};

type UpsellCartItem = {
  id: string;
  quantity: number;
  payWithCoins: boolean;
  upsellItem: {
    id: string;
    name: string;
    imageUrl: string;
    price: number;
    coinPrice: number;
  };
};

type Props = {
  items: CartItem[];
  total: number;
  upsellCartItems: UpsellCartItem[];
};

export function CartClient({ items, total, upsellCartItems }: Props) {
  const { addToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [upsellItems, setUpsellItems] = useState<UpsellItem[]>([]);
  const [addingUpsell, setAddingUpsell] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/upsell-items')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUpsellItems(data.items);
      })
      .catch(() => {});
  }, []);

  const handleRemove = async (pullId: string) => {
    setLoading(pullId);
    try {
      const res = await fetch('/api/cart/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pullId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({ title: 'Error', description: data.error || 'Failed to remove item', variant: 'destructive' });
        return;
      }

      addToast({ title: 'Success', description: 'Item removed from cart' });
      router.refresh();
    } catch {
      addToast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleUpsellAction = async (upsellItemId: string, action: 'add' | 'remove' | 'increment' | 'decrement') => {
    setAddingUpsell(upsellItemId);
    try {
      const res = await fetch('/api/cart/upsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsellItemId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        addToast({ title: 'Error', description: data.error || 'Failed to update cart', variant: 'destructive' });
        return;
      }

      if (action === 'add') {
        addToast({ title: 'Added to Cart', description: 'Item added to your order' });
      }

      router.refresh();
    } catch {
      addToast({ title: 'Error', description: 'Failed to update cart', variant: 'destructive' });
    } finally {
      setAddingUpsell(null);
    }
  };

  const handleTogglePayment = async (upsellItemId: string, payWithCoins: boolean) => {
    setAddingUpsell(upsellItemId);
    try {
      await fetch('/api/cart/upsell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upsellItemId, action: 'togglePayment', payWithCoins }),
      });
      router.refresh();
    } catch {
      addToast({ title: 'Error', description: 'Failed to update payment method', variant: 'destructive' });
    } finally {
      setAddingUpsell(null);
    }
  };

  const upsellEurTotal = upsellCartItems.filter(ui => !ui.payWithCoins).reduce((sum, ui) => sum + ui.upsellItem.price * ui.quantity, 0);
  const upsellCoinTotal = upsellCartItems.filter(ui => ui.payWithCoins).reduce((sum, ui) => sum + ui.upsellItem.coinPrice * ui.quantity, 0);
  const inCartUpsellIds = new Set(upsellCartItems.map(ui => ui.upsellItem.id));

  const isEmpty = items.length === 0 && upsellCartItems.length === 0;

  return (
    <div className="space-y-10">
      {isEmpty ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
            <ShoppingBag className="w-10 h-10 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Cart Empty</h2>
          <p className="text-gray-400 mb-6">Add cards from your collection to checkout, or browse add-on items below!</p>
        </div>
      ) : (
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Card items */}
          {items.map((item) => {
            if (!item.pull.card) return null;
            return (
              <div key={item.id} className="glass rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-36 rounded-xl overflow-hidden flex-shrink-0">
                    <Image src={item.pull.card.imageUrlGatherer} alt={item.pull.card.name} fill className="object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">{item.pull.card.name}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="h-4 w-4 text-amber-400" />
                      <span className="font-semibold text-amber-400">{item.pull.card.coinValue} coins</span>
                    </div>
                    <button
                      onClick={() => handleRemove(item.pull.id)}
                      disabled={loading === item.pull.id}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Upsell cart items */}
          {upsellCartItems.map((ui) => (
            <div key={ui.id} className="glass rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-800">
                  <Image src={ui.upsellItem.imageUrl} alt={ui.upsellItem.name} fill className="object-contain p-2" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">Add-on</span>
                  </div>
                  <h3 className="font-semibold text-white mb-2">{ui.upsellItem.name}</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Payment method toggle */}
                    {ui.upsellItem.coinPrice > 0 && (
                      <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
                        <button
                          onClick={() => handleTogglePayment(ui.upsellItem.id, false)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${!ui.payWithCoins ? 'bg-green-500/20 text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <Euro className="h-3 w-3" /> EUR
                        </button>
                        <button
                          onClick={() => handleTogglePayment(ui.upsellItem.id, true)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${ui.payWithCoins ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                          <Coins className="h-3 w-3" /> Coins
                        </button>
                      </div>
                    )}
                    <span className="font-bold text-amber-400">
                      {ui.payWithCoins ? `${ui.upsellItem.coinPrice.toFixed(2)} coins` : `${ui.upsellItem.price.toFixed(2)} €`}
                    </span>
                    <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-1">
                      <button
                        onClick={() => handleUpsellAction(ui.upsellItem.id, 'decrement')}
                        disabled={addingUpsell === ui.upsellItem.id}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-white font-semibold text-sm w-6 text-center">{ui.quantity}</span>
                      <button
                        onClick={() => handleUpsellAction(ui.upsellItem.id, 'increment')}
                        disabled={addingUpsell === ui.upsellItem.id}
                        className="p-1.5 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-gray-400 text-sm">
                      = {ui.payWithCoins
                        ? `${(ui.upsellItem.coinPrice * ui.quantity).toFixed(2)} coins`
                        : `${(ui.upsellItem.price * ui.quantity).toFixed(2)} €`}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUpsellAction(ui.upsellItem.id, 'remove')}
                  disabled={addingUpsell === ui.upsellItem.id}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-strong rounded-2xl p-6 sticky top-4">
            <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
            
            <div className="space-y-3 mb-6">
              {items.length > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Cards ({items.length})</span>
                  <span className="text-white">{total} coins</span>
                </div>
              )}
              {upsellCartItems.length > 0 && (
                <>
                  {upsellCartItems.map(ui => (
                    <div key={ui.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">{ui.upsellItem.name} x{ui.quantity}</span>
                      <span className={ui.payWithCoins ? 'text-yellow-400' : 'text-amber-400'}>
                        {ui.payWithCoins
                          ? `${(ui.upsellItem.coinPrice * ui.quantity).toFixed(2)} coins`
                          : `${(ui.upsellItem.price * ui.quantity).toFixed(2)} €`}
                      </span>
                    </div>
                  ))}
                  {upsellEurTotal > 0 && (
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-gray-300">Add-ons (EUR)</span>
                      <span className="text-amber-400">{upsellEurTotal.toFixed(2)} €</span>
                    </div>
                  )}
                  {upsellCoinTotal > 0 && (
                    <div className="flex items-center justify-between text-sm font-medium">
                      <span className="text-gray-300">Add-ons (Coins)</span>
                      <span className="text-yellow-400">{upsellCoinTotal.toFixed(2)} coins</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Shipping</span>
                <span className="text-white">5,00 €</span>
              </div>
              <div className="h-px bg-gray-700" />
              {items.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Cards Value</span>
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-400" />
                    <span className="text-2xl font-bold text-white">{total}</span>
                  </div>
                </div>
              )}
              {upsellCoinTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Add-ons Coins</span>
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-400" />
                    <span className="text-lg font-bold text-yellow-400">{upsellCoinTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
              {upsellEurTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total EUR</span>
                  <span className="text-xl font-bold text-amber-400">{(upsellEurTotal + 5).toFixed(2)} €</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => router.push('/checkout')}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <CreditCard className="h-5 w-5" />
                Proceed to Checkout
              </button>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Truck className="h-4 w-4" />
                <span>Real cards shipped to you</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Upsell Recommendations */}
      {upsellItems.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold text-white">Ordered with the most</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {upsellItems.map(item => {
              const isInCart = inCartUpsellIds.has(item.id);
              return (
                <div key={item.id} className={`glass-strong rounded-2xl overflow-hidden group transition-all ${isInCart ? 'ring-2 ring-green-500/40' : 'hover:ring-2 hover:ring-amber-500/30'}`}>
                  <div className="relative h-52 bg-gradient-to-b from-gray-800/50 to-gray-900/50">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
                    />
                    {isInCart && (
                      <div className="absolute top-3 right-3 bg-green-500 rounded-full p-1.5">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-white text-lg mb-1">{item.name}</h3>
                    {item.description && (
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <div>
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                          {item.price.toFixed(2)} €
                        </span>
                        {item.coinPrice > 0 && (
                          <span className="block text-sm font-medium text-yellow-400 mt-0.5">
                            or {item.coinPrice.toFixed(2)} coins
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUpsellAction(item.id, 'add')}
                        disabled={addingUpsell === item.id}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 font-semibold rounded-xl transition-all hover:scale-105 text-sm disabled:opacity-50 ${
                          isInCart
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
                        }`}
                      >
                        {addingUpsell === item.id ? (
                          <span>Adding...</span>
                        ) : isInCart ? (
                          <>
                            <Plus className="h-4 w-4" />
                            Add More
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="h-4 w-4" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
