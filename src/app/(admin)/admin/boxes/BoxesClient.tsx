'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Trash2, Edit } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type Box = {
  id: string;
  name: string;
  description: string;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
};

export function BoxesClient({ boxes: initialBoxes }: { boxes: Box[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [boxes, setBoxes] = useState(initialBoxes);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (boxId: string, boxName: string) => {
    if (!confirm(`Are you sure you want to delete "${boxName}"? This action cannot be undone and will delete all associated cards and pulls.`)) {
      return;
    }

    setDeletingId(boxId);

    try {
      const res = await fetch(`/api/admin/boxes/${boxId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete box');
      }

      // Remove box from local state
      setBoxes((prevBoxes) => prevBoxes.filter((box) => box.id !== boxId));

      addToast({
        title: 'Success',
        description: 'Box deleted successfully!',
      });

      router.refresh();
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (boxes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No boxes created yet.</p>
        <Button asChild>
          <Link href="/admin/boxes/create">Create Your First Box</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {boxes.map((box) => (
        <Card key={box.id} className="border-gray-800 bg-gray-900/50">
          <CardHeader>
            <div className="flex items-start justify-between">
              <CardTitle className="text-white">{box.name}</CardTitle>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                box.isActive 
                  ? 'bg-green-500/20 text-green-500' 
                  : 'bg-red-500/20 text-red-500'
              }`}>
                {box.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-400">{box.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Price: {box.price} coins</span>
                <span className="text-sm text-gray-400">{box.cardsPerPack} cards/pack</span>
              </div>
              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/admin/boxes/${box.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(box.id, box.name)}
                  disabled={deletingId === box.id}
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deletingId === box.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

