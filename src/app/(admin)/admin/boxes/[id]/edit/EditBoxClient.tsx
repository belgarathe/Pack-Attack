'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Coins, Package, ArrowLeft, Edit, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { EditBoxForm } from './EditBoxForm';
import { CardManager } from './CardManager';

type BoxCard = {
  id: string;
  name: string;
  imageUrlGatherer: string;
  coinValue: number;
  pullRate: number;
  rarity: string;
};

type Box = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
  cards: BoxCard[];
};

export function EditBoxClient({ box: initialBox }: { box: Box }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [box, setBox] = useState(initialBox);

  // Refresh box data
  const refreshBox = async () => {
    try {
      const res = await fetch(`/api/admin/boxes/${box.id}`);
      const data = await res.json();
      if (data.success && data.box) {
        setBox(data.box);
      }
    } catch (error) {
      console.error('Error refreshing box:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="mb-6">
          <Button variant="outline" asChild className="mb-4">
            <Link href="/admin/boxes">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Boxes
            </Link>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-white">{box.name}</h1>
              <p className="text-gray-400">Box Overview & Management</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={isEditing ? "outline" : "default"}
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {isEditing ? 'Cancel Edit' : 'Edit Box'}
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/boxes/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Box
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-6">
            <div className="max-w-2xl mx-auto">
              <EditBoxForm box={box} onSave={() => { setIsEditing(false); refreshBox(); router.refresh(); }} />
            </div>
            <div>
              <CardManager boxId={box.id} existingCards={box.cards} onCardsChange={refreshBox} />
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
          {/* Box Info */}
          <div className="lg:col-span-1">
            <Card className="border-gray-800 bg-gray-900/50 mb-6">
              <CardHeader>
                <CardTitle className="text-white">Box Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="relative aspect-[63/88] w-full rounded-lg overflow-hidden">
                    <Image
                      src={box.imageUrl}
                      alt={box.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">Description</p>
                    <p className="text-white">{box.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Price</p>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        <span className="text-white font-semibold">{box.price} coins</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Cards/Pack</p>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-gray-400" />
                        <span className="text-white">{box.cardsPerPack}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Status</p>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      box.isActive 
                        ? 'bg-green-500/20 text-green-500' 
                        : 'bg-red-500/20 text-red-500'
                    }`}>
                      {box.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Cards</p>
                    <span className="text-white font-semibold">{box.cards.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cards List */}
          <div className="lg:col-span-2">
            <Card className="border-gray-800 bg-gray-900/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">What's in the box?</CardTitle>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/boxes/create`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Box
                    </Link>
                  </Button>
                </div>
                {box.cards.length > 0 && (
                  <p className="text-sm text-gray-400 mt-2">
                    {box.cards.length} card{box.cards.length !== 1 ? 's' : ''} • Total Pull Rate: {box.cards.reduce((sum, card) => sum + card.pullRate, 0).toFixed(3)}%
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {box.cards.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 mb-4">No cards in this box yet.</p>
                    <p className="text-sm text-gray-500">Cards need to be added during box creation.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {box.cards.map((card) => (
                      <div key={card.id} className="relative group">
                        <div className="relative aspect-[63/88] rounded-lg overflow-hidden border-2 border-gray-700 hover:border-gray-600 transition-all">
                          {card.imageUrlGatherer ? (
                            <Image
                              src={card.imageUrlGatherer}
                              alt={card.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <span className="text-gray-600 text-xs">No Image</span>
                            </div>
                          )}
                          {/* Coin value overlay */}
                          <div className="absolute top-2 left-2 bg-black/80 rounded px-2 py-1 flex items-center gap-1">
                            <Coins className="h-3 w-3 text-yellow-500" />
                            <span className="text-xs font-bold text-yellow-500">
                              {card.coinValue.toLocaleString()}
                            </span>
                          </div>
                          {/* Pull rate overlay */}
                          <div className="absolute top-2 right-2 bg-black/80 rounded px-2 py-1">
                            <span className="text-xs font-bold text-white">
                              {card.pullRate.toFixed(3)}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-2 text-center">
                          <p className="text-sm font-semibold text-white truncate" title={card.name}>
                            {card.name}
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-1">
                            <div className="flex items-center gap-1">
                              <Coins className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-yellow-500 font-semibold">
                                {card.coinValue.toLocaleString()}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400 font-medium">
                              {card.pullRate.toFixed(3)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

