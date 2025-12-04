'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Coins, Euro } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { emitCoinBalanceUpdate } from '@/lib/coin-events';

export default function PurchaseCoinsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [selectedAmount, setSelectedAmount] = useState(10);

  useEffect(() => {
    fetch('/api/user/coins')
      .then((res) => res.json())
      .then((data) => {
        if (data.coins !== undefined) {
          setUserCoins(data.coins);
        }
      })
      .catch(console.error);
  }, []);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/purchase-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: selectedAmount }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to purchase coins',
          variant: 'destructive',
        });
        return;
      }

      addToast({
        title: 'Success',
        description: `Purchased ${data.coinsAdded} coins!`,
      });

      setUserCoins(data.newBalance);
      emitCoinBalanceUpdate({ balance: data.newBalance });
    } catch (error) {
      console.error('Error purchasing coins:', error);
      addToast({
        title: 'Error',
        description: 'Failed to purchase coins',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const amounts = [10, 25, 50, 100, 250, 500, 1000];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <div className="container py-12">
        <div className="max-w-2xl mx-auto">
          <Card className="border-gray-800 bg-gray-900/50">
            <CardHeader>
              <CardTitle className="text-white">Purchase Coins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {userCoins !== null && (
                  <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Current Balance:</span>
                      <div className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-yellow-500" />
                        <span className="text-xl font-bold text-white">{userCoins.toLocaleString()} coins</span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-4 text-white">Select Amount</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {amounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setSelectedAmount(amount)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedAmount === amount
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <div className="text-2xl font-bold">{amount}</div>
                        <div className="text-sm flex items-center justify-center gap-1 mt-1">
                          <Euro className="h-3 w-3" />
                          <span>{amount}</span>
                        </div>
                        <div className="text-xs mt-1 text-gray-500">{amount} coins</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-primary/10 border border-primary/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">You will receive:</span>
                    <div className="flex items-center gap-2">
                      <Coins className="h-5 w-5 text-yellow-500" />
                      <span className="text-2xl font-bold text-white">{selectedAmount} coins</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Cost:</span>
                    <div className="flex items-center gap-1">
                      <Euro className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-white">{selectedAmount}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Rate: 1 coin = 1 EUR
                  </div>
                </div>

                <Button
                  onClick={handlePurchase}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? 'Processing...' : `Purchase ${selectedAmount} Coins for €${selectedAmount}`}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  Note: In production, this would integrate with Stripe for secure payment processing.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

