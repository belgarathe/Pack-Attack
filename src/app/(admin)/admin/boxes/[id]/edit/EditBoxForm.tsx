'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, Save, Upload, X } from 'lucide-react';
import Image from 'next/image';

type Box = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  cardBackUrl?: string | null;
  price: number;
  cardsPerPack: number;
  isActive: boolean;
};

const TARGET_RATIO = 63 / 88;
const RATIO_TOLERANCE = 0.025;
const MIN_W = 400;
const MIN_H = 559;
const MAX_W = 630;
const MAX_H = 880;

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load image'));
    };
    img.src = url;
  });
}

export function EditBoxForm({ box, onSave }: { box: Box; onSave?: () => void }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: box.name,
    description: box.description,
    imageUrl: box.imageUrl,
    cardBackUrl: box.cardBackUrl ?? '',
    price: box.price.toString(),
    cardsPerPack: box.cardsPerPack.toString(),
    isActive: box.isActive,
  });

  // Card back image management
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/admin/card-backs')
      .then(r => r.json())
      .then(data => {
        if (data.files) setAvailableImages(data.files);
      })
      .catch(() => {/* silently ignore */});
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Client-side type check
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setUploadError('Only PNG and JPG files are allowed.');
      return;
    }

    // Client-side dimension check
    let dims: { width: number; height: number };
    try {
      dims = await getImageDimensions(file);
    } catch {
      setUploadError('Could not read image dimensions.');
      return;
    }

    const { width, height } = dims;

    if (width < MIN_W || height < MIN_H) {
      setUploadError(`Image too small: ${width}×${height}px. Minimum is ${MIN_W}×${MIN_H}px.`);
      return;
    }
    if (width > MAX_W || height > MAX_H) {
      setUploadError(`Image too large: ${width}×${height}px. Maximum is ${MAX_W}×${MAX_H}px.`);
      return;
    }

    const ratio = width / height;
    if (Math.abs(ratio - TARGET_RATIO) > RATIO_TOLERANCE) {
      setUploadError(`Wrong aspect ratio (${width}×${height}). Expected 63:88. Got ${ratio.toFixed(3)}, need ~${TARGET_RATIO.toFixed(3)}.`);
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/card-backs', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Refresh image list and auto-select uploaded file
      const listRes = await fetch('/api/admin/card-backs');
      const listData = await listRes.json();
      if (listData.files) setAvailableImages(listData.files);

      setFormData(prev => ({ ...prev, cardBackUrl: data.filename }));
      addToast({ title: 'Uploaded', description: `${data.filename} uploaded successfully.` });
    } catch (error) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/boxes/${box.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          imageUrl: formData.imageUrl,
          cardBackUrl: formData.cardBackUrl || null,
          price: parseFloat(formData.price),
          cardsPerPack: parseInt(formData.cardsPerPack),
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update box');
      }

      addToast({
        title: 'Success',
        description: 'Box updated successfully!',
      });

      if (onSave) {
        onSave();
      } else {
        router.refresh();
      }
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this box? This action cannot be undone and will delete all associated cards and pulls.')) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/boxes/${box.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete box');
      }

      addToast({
        title: 'Success',
        description: 'Box deleted successfully!',
      });

      router.push('/admin/boxes');
    } catch (error) {
      addToast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const selectedPreviewSrc = formData.cardBackUrl
    ? `/assets/card-backs/${formData.cardBackUrl}`
    : '/assets/card-backs/pa_card_back.png';

  return (
    <Card className="border-gray-800 bg-gray-900/50">
      <CardHeader>
        <CardTitle className="text-white">Edit Box Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-white">Box Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
              rows={3}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-white">Image URL</label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
              required
            />
          </div>

          {/* Card Back Image */}
          <div>
            <label className="block text-sm font-medium mb-2 text-white">
              Card Back Image
              <span className="ml-2 text-xs text-gray-400 font-normal">
                PNG/JPG · 63:88 ratio · 400×559 – 630×880 px
              </span>
            </label>

            <div className="flex gap-3 items-start">
              {/* Preview thumbnail */}
              <div className="relative w-14 h-20 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0 bg-gray-800">
                <Image
                  src={selectedPreviewSrc}
                  alt="Card back preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>

              <div className="flex-1 space-y-2">
                {/* Dropdown */}
                <select
                  value={formData.cardBackUrl}
                  onChange={(e) => setFormData({ ...formData, cardBackUrl: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                >
                  <option value="">Default (pa_card_back.png)</option>
                  {availableImages.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>

                {/* Upload button */}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:text-white"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {uploading ? 'Uploading...' : 'Upload new'}
                  </Button>
                  <span className="text-xs text-gray-500">PNG/JPG, 63:88, 400×559 – 630×880 px</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleUpload}
                />

                {uploadError && (
                  <div className="flex items-start gap-1.5 text-xs text-red-400">
                    <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-white">Price (coins)</label>
              <input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                min="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-white">Cards per Pack</label>
              <input
                type="number"
                value={formData.cardsPerPack}
                onChange={(e) => setFormData({ ...formData, cardsPerPack: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-primary focus:outline-none"
                min="1"
                required
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-primary focus:ring-primary"
              />
              <span className="text-white">Active (visible in marketplace)</span>
            </label>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete Box'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
