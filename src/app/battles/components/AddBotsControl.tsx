'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface AddBotsControlProps {
  battleId: string;
  maxAddable: number;
}

export function AddBotsControl({ battleId, maxAddable }: AddBotsControlProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [count, setCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleCountChange = (value: number) => {
    if (!Number.isFinite(value)) return;
    const clamped = Math.min(Math.max(value, 1), maxAddable);
    setCount(clamped);
  };

  const handleAddBots = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/battles/${battleId}/bots`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ count }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add bots');
      }

      addToast({
        title: 'Bots added',
        description: `${count} bot${count > 1 ? 's' : ''} joined the battle.`,
      });

      router.refresh();
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add bots',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/30 to-amber-800/10 p-5 shadow-lg shadow-amber-500/10">
      <div className="mb-2 text-base font-bold text-amber-300 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-xs uppercase tracking-wider">Admin Only</span>
        Testing Tool
      </div>
      <p className="mb-4 text-sm text-gray-300">
        Instantly fill open slots with testing bots to simulate a full lobby.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          Bots to add:
          <input
            type="number"
            min={1}
            max={maxAddable}
            value={count}
            onChange={(event) => handleCountChange(parseInt(event.target.value, 10))}
            className="w-20 rounded-lg border-2 border-gray-600 bg-gray-900 px-3 py-2 text-center text-white font-bold focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
          />
        </label>
        <Button
          type="button"
          onClick={handleAddBots}
          disabled={submitting}
          className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-amber-500/30 border border-amber-400/30"
        >
          {submitting ? 'Adding Bots...' : `Add ${count} Bot${count > 1 ? 's' : ''}`}
        </Button>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-gray-400">Open slots available: <span className="text-amber-400 font-bold">{maxAddable}</span></span>
        <span className="text-green-400">✓ 8 bots ready</span>
      </div>
    </div>
  );
}



