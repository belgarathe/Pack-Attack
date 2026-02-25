'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, FileText, CheckCircle } from 'lucide-react';

type Props = {
  shopId: string;
  initialTaxId: string | null;
};

export function DealerDetailsClient({ shopId, initialTaxId }: Props) {
  const router = useRouter();
  const [taxId, setTaxId] = useState(initialTaxId || '');
  const [savedTaxId, setSavedTaxId] = useState(initialTaxId || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/shop/owner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxId: taxId.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      setSavedTaxId(taxId.trim());
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(`Fehler beim Speichern: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = (taxId.trim() || '') !== (savedTaxId || '');

  return (
    <div className="glass-strong rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-indigo-500/10">
          <FileText className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Angaben für Händler</h2>
          <p className="text-sm text-gray-400">Pflichtangaben für gewerbliche Verkäufer</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Steuer-ID / USt-IdNr.
          </label>
          <input
            type="text"
            value={taxId}
            onChange={e => setTaxId(e.target.value)}
            placeholder="z.B. DE123456789"
            className="w-full max-w-md px-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            Umsatzsteuer-Identifikationsnummer gemäß §27a UStG
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving || !hasChanged}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Speichern...' : 'Speichern'}
          </button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
              <CheckCircle className="w-4 h-4" />
              Gespeichert
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
