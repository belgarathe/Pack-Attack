'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, ArrowLeft, Plus, Trash2, Save, Edit2, X, Eye, EyeOff, Tag, ExternalLink,
} from 'lucide-react';

type UpsellItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  price: number;
  coinPrice: number;
  externalUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type FormData = {
  name: string;
  description: string;
  imageUrl: string;
  price: string;
  coinPrice: string;
  externalUrl: string;
  isActive: boolean;
  sortOrder: string;
};

const emptyForm: FormData = {
  name: '',
  description: '',
  imageUrl: '',
  price: '',
  coinPrice: '',
  externalUrl: '',
  isActive: true,
  sortOrder: '0',
};

export function UpsaleItemsClient({ initialItems }: { initialItems: UpsellItem[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [items, setItems] = useState<UpsellItem[]>(initialItems);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item: UpsellItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      imageUrl: item.imageUrl,
      price: item.price.toString(),
      coinPrice: item.coinPrice.toString(),
      externalUrl: item.externalUrl || '',
      isActive: item.isActive,
      sortOrder: item.sortOrder.toString(),
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.imageUrl || !formData.price) {
      addToast({ title: 'Validation Error', description: 'Name, Image URL, and Price are required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        imageUrl: formData.imageUrl,
        price: parseFloat(formData.price),
        coinPrice: parseFloat(formData.coinPrice) || 0,
        externalUrl: formData.externalUrl || undefined,
        isActive: formData.isActive,
        sortOrder: parseInt(formData.sortOrder) || 0,
      };

      const url = editingId ? `/api/admin/upsell-items/${editingId}` : '/api/admin/upsell-items';
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      addToast({ title: 'Success', description: editingId ? 'Item updated' : 'Item created' });
      closeForm();
      router.refresh();

      if (editingId) {
        setItems(prev => prev.map(i => i.id === editingId ? data.item : i));
      } else {
        setItems(prev => [...prev, data.item]);
      }
    } catch (error) {
      addToast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this upsell item?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/upsell-items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setItems(prev => prev.filter(i => i.id !== id));
      addToast({ title: 'Deleted', description: 'Item removed' });
    } catch (error) {
      addToast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const toggleActive = async (item: UpsellItem) => {
    try {
      const res = await fetch(`/api/admin/upsell-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i));
    } catch (error) {
      addToast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-slate-900 to-gray-950 font-display">
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />

      <div className="relative container py-12">
        <div className="mb-8">
          <Link href="/admin" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Admin</span>
          </Link>
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-sm">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-gray-300">Admin Panel</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                <span className="text-white">Upsale </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Items</span>
              </h1>
              <p className="text-gray-400">Manage add-on products shown in the cart checkout area.</p>
            </div>
            <Button onClick={openCreate} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="glass-strong rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Item' : 'New Upsale Item'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Acrylic Display Case"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Short description..."
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Image URL *</label>
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price (EUR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: e.target.value })}
                      placeholder="24.99"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Price (Coins)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.coinPrice}
                      onChange={e => setFormData({ ...formData, coinPrice: e.target.value })}
                      placeholder="50"
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Sort Order</label>
                    <input
                      type="number"
                      value={formData.sortOrder}
                      onChange={e => setFormData({ ...formData, sortOrder: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">External Link (optional)</label>
                  <input
                    type="text"
                    value={formData.externalUrl}
                    onChange={e => setFormData({ ...formData, externalUrl: e.target.value })}
                    placeholder="https://shop.example.com/product"
                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-gray-300">Active (visible in cart)</span>
                </label>
              </div>
              <div className="flex flex-col items-center justify-center">
                {formData.imageUrl ? (
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border-2 border-gray-700 bg-gray-800">
                    <Image src={formData.imageUrl} alt="Preview" fill className="object-contain" />
                  </div>
                ) : (
                  <div className="w-48 h-48 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center">
                    <span className="text-gray-500 text-sm">Image Preview</span>
                  </div>
                )}
                <p className="text-gray-500 text-xs mt-2">Image preview</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
              <Button variant="outline" onClick={closeForm} className="border-gray-700">Cancel</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : editingId ? 'Update Item' : 'Create Item'}
              </Button>
            </div>
          </div>
        )}

        {/* Items List */}
        {items.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Tag className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No Upsale Items</h2>
            <p className="text-gray-400 mb-6">Add products that will be shown as recommendations in the cart.</p>
            <Button onClick={openCreate} className="bg-gradient-to-r from-amber-500 to-orange-500">
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <div key={item.id} className={`glass-strong rounded-2xl overflow-hidden transition-all ${!item.isActive ? 'opacity-50' : ''}`}>
                <div className="relative h-48 bg-gray-800">
                  <Image src={item.imageUrl} alt={item.name} fill className="object-contain p-4" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button
                      onClick={() => toggleActive(item)}
                      className={`p-2 rounded-lg ${item.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-400'} hover:scale-110 transition-all`}
                      title={item.isActive ? 'Active - click to deactivate' : 'Inactive - click to activate'}
                    >
                      {item.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="absolute top-3 left-3 flex flex-col gap-1">
                    <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold">
                      {item.price.toFixed(2)} €
                    </span>
                    {item.coinPrice > 0 && (
                      <span className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm font-bold">
                        {item.coinPrice.toFixed(2)} Coins
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-white mb-1 truncate">{item.name}</h3>
                  {item.description && <p className="text-gray-400 text-sm mb-3 line-clamp-2">{item.description}</p>}
                  {item.externalUrl && (
                    <a href={item.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-3">
                      <ExternalLink className="w-3 h-3" />
                      External Link
                    </a>
                  )}
                  <div className="flex gap-2 pt-3 border-t border-gray-800">
                    <Button size="sm" variant="outline" onClick={() => openEdit(item)} className="flex-1 border-gray-700">
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="flex-1"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {deletingId === item.id ? '...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
