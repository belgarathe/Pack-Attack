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
    <div className="rounded-lg border border-amber-600/40 bg-amber-500/5 p-4">
      <div className="mb-2 text-sm font-semibold text-amber-300">Admin Testing Tool</div>
      <p className="mb-4 text-sm text-gray-300">
        Instantly fill open slots with testing bots to simulate a full lobby.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          Bots to add:
          <input
            type="number"
            min={1}
            max={maxAddable}
            value={count}
            onChange={(event) => handleCountChange(parseInt(event.target.value, 10))}
            className="w-20 rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-center text-white"
          />
        </label>
        <Button
          type="button"
          onClick={handleAddBots}
          disabled={submitting}
          className="flex-1"
        >
          {submitting ? 'Adding...' : 'Add Bots'}
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-400">Open slots available: {maxAddable}</p>
    </div>
  );
}



