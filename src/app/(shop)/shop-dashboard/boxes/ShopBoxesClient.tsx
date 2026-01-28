'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Edit, Eye, EyeOff, Trash2, ShoppingCart, Users, Coins, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type Box = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
  createdAt: string;
  createdByShop?: { id: string; name: string } | null;
  cards: { id: string; name: string; coinValue: number }[];
  _count: { pulls: number; shopBoxOrders: number };
};

export function ShopBoxesClient({ boxes: initialBoxes, isAdmin }: { boxes: Box[]; isAdmin: boolean }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [boxes, setBoxes] = useState(initialBoxes);
  const [updatingBox, setUpdatingBox] = useState<string | null>(null);
  const [deletingBox, setDeletingBox] = useState<string | null>(null);

  const toggleBoxStatus = async (boxId: string, currentStatus: boolean) => {
    setUpdatingBox(boxId);
    try {
      const res = await fetch(`/api/shop-dashboard/boxes/${boxId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update box');
      }

      setBoxes(boxes.map(box => 
        box.id === boxId ? { ...box, isActive: !currentStatus } : box
      ));

      addToast({
        title: 'Success',
        description: `Box ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to update box status',
        variant: 'destructive',
      });
    } finally {
      setUpdatingBox(null);
    }
  };

  const deleteBox = async (boxId: string) => {
    if (!confirm('Are you sure you want to delete this box? This action cannot be undone.')) {
      return;
    }

    setDeletingBox(boxId);
    try {
      const res = await fetch(`/api/shop-dashboard/boxes/${boxId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete box');
      }

      setBoxes(boxes.filter(box => box.id !== boxId));

      addToast({
        title: 'Success',
        description: 'Box deleted successfully',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: 'Failed to delete box',
        variant: 'destructive',
      });
    } finally {
      setDeletingBox(null);
    }
  };

  if (boxes.length === 0) {
    return (
      <div className="glass-strong rounded-2xl p-12 text-center">
        <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Boxes Yet</h3>
        <p className="text-gray-400 mb-6 max-w-md mx-auto">
          Create your first card box to start selling to users. Add cards, set prices, and watch the orders come in!
        </p>
        <Link
          href="/shop-dashboard/boxes/create"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-medium transition-all"
        >
          <Package className="w-5 h-5" />
          <span>Create Your First Box</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {boxes.map((box) => (
        <div 
          key={box.id} 
          className={`glass-strong rounded-2xl overflow-hidden transition-all hover:ring-2 ${
            box.isActive ? 'hover:ring-cyan-500/50' : 'hover:ring-gray-500/50 opacity-75'
          }`}
        >
          {/* Box Image */}
          <div className="relative aspect-[4/3] bg-gray-800">
            {box.imageUrl ? (
              <Image
                src={box.imageUrl}
                alt={box.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-700" />
              </div>
            )}
            
            {/* Status Badge */}
            <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium ${
              box.isActive 
                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}>
              {box.isActive ? 'Active' : 'Inactive'}
            </div>

            {/* Shop Badge (Admin view) */}
            {isAdmin && box.createdByShop && (
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {box.createdByShop.name}
              </div>
            )}
          </div>

          {/* Box Info */}
          <div className="p-5">
            <h3 className="text-lg font-bold text-white mb-1 truncate">{box.name}</h3>
            <p className="text-sm text-gray-400 line-clamp-2 mb-4">{box.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-2 rounded-lg bg-gray-800/50">
                <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                  <Coins className="w-3 h-3" />
                  <span className="text-sm font-bold">{box.price}</span>
                </div>
                <span className="text-[10px] text-gray-500">Price</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-800/50">
                <div className="flex items-center justify-center gap-1 text-cyan-400 mb-1">
                  <Users className="w-3 h-3" />
                  <span className="text-sm font-bold">{box._count.pulls}</span>
                </div>
                <span className="text-[10px] text-gray-500">Opens</span>
              </div>
              <div className="text-center p-2 rounded-lg bg-gray-800/50">
                <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                  <ShoppingCart className="w-3 h-3" />
                  <span className="text-sm font-bold">{box._count.shopBoxOrders}</span>
                </div>
                <span className="text-[10px] text-gray-500">Orders</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 mb-4">
              {box.cards.length} cards • {box.cardsPerPack} per pack
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleBoxStatus(box.id, box.isActive)}
                disabled={updatingBox === box.id}
                className={`flex-1 ${
                  box.isActive 
                    ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' 
                    : 'border-green-500/50 text-green-400 hover:bg-green-500/10'
                }`}
              >
                {box.isActive ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Activate
                  </>
                )}
              </Button>
              
              <Link href={`/shop-dashboard/boxes/${box.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </Link>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteBox(box.id)}
                disabled={deletingBox === box.id}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
