'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Box {
  id: string;
  name: string;
  description: string;
  price: number;
  cardsPerPack: number;
  _count: {
    cards: number;
    battles: number;
  };
}

export default function AdminBoxesPage() {
  const router = useRouter();
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBoxes();
  }, []);

  const loadBoxes = async () => {
    try {
      const res = await fetch('/api/admin/boxes');
      if (res.ok) {
        const data = await res.json();
        setBoxes(data.boxes || []);
      }
    } catch (error) {
      console.error('Failed to load boxes:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteBox = async (boxId: string) => {
    if (!confirm('Are you sure you want to delete this box?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/boxes/${boxId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBoxes(boxes.filter(b => b.id !== boxId));
      } else {
        alert('Failed to delete box');
      }
    } catch (error) {
      alert('Failed to delete box');
    }
  };

  const handleEdit = (boxId: string) => {
    router.push(`/admin/boxes/${boxId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Box Management</h1>
          <Link 
            href="/admin/boxes/create"
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 inline-block"
          >
            + Create New Box
          </Link>
        </div>

        <div className="space-y-4">
          {boxes.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <p className="text-gray-400">No boxes created yet.</p>
              <Link 
                href="/admin/boxes/create"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Create Your First Box
              </Link>
            </div>
          ) : (
            boxes.map(box => (
              <div key={box.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-2">{box.name}</h2>
                    <p className="text-gray-400 mb-4">{box.description}</p>
                    
                    <div className="flex gap-6 text-sm text-gray-400">
                      <span>Price: {box.price} coins</span>
                      <span>Cards: {box._count.cards}</span>
                      <span>Battles: {box._count.battles}</span>
                      <span>Cards per pack: {box.cardsPerPack}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(box.id)}
                      className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteBox(box.id)}
                      className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}