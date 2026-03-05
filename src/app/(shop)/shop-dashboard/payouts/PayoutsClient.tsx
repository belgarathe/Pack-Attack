'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet, ArrowRightLeft, Clock, CheckCircle, XCircle,
  Loader2, Banknote, Coins, AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type Payout = {
  id: string;
  status: string;
  coinAmount: number;
  euroAmount: number;
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
};

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
  REQUESTED: { color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', icon: Clock, label: 'Requested' },
  PROCESSING: { color: 'text-blue-400', bgColor: 'bg-blue-400/10', icon: Loader2, label: 'Processing' },
  COMPLETED: { color: 'text-green-400', bgColor: 'bg-green-400/10', icon: CheckCircle, label: 'Completed' },
  REJECTED: { color: 'text-red-400', bgColor: 'bg-red-400/10', icon: XCircle, label: 'Rejected' },
};

export function PayoutsClient({
  initialPayouts,
  coinBalance,
  rate,
  isAdmin = false,
}: {
  initialPayouts: Payout[];
  coinBalance: number;
  rate: number;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [payouts, setPayouts] = useState(initialPayouts);
  const [balance, setBalance] = useState(coinBalance);
  const [requesting, setRequesting] = useState(false);

  const euroValue = balance / rate;
  const hasPending = payouts.some(p => p.status === 'REQUESTED' || p.status === 'PROCESSING');

  const handleRequestPayout = async () => {
    if (balance <= 0 || hasPending) return;
    setRequesting(true);
    try {
      const res = await fetch('/api/shop-dashboard/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to request payout');

      setPayouts([data.payout, ...payouts]);
      addToast({ title: 'Payout Requested', description: `${balance.toFixed(2)} coins (${euroValue.toFixed(2)} EUR) payout requested` });
      router.refresh();
    } catch (err: any) {
      addToast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Wallet Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div className="relative">
            <Coins className="w-8 h-8 text-amber-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{balance.toFixed(2)}</div>
            <div className="text-sm text-gray-400">Coin Balance</div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent" />
          <div className="relative">
            <Banknote className="w-8 h-8 text-green-400 mb-3" />
            <div className="text-3xl font-bold text-white mb-1">{euroValue.toFixed(2)} EUR</div>
            <div className="text-sm text-gray-400">Euro Value ({rate} coins = 1 EUR)</div>
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-6 flex flex-col justify-center">
          {isAdmin ? (
            <div className="text-center">
              <Wallet className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-orange-400 font-medium text-sm">Admin View</p>
              <p className="text-gray-500 text-xs mt-1">Process payouts from the admin panel</p>
            </div>
          ) : hasPending ? (
            <div className="text-center">
              <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-yellow-400 font-medium text-sm">Payout request pending</p>
              <p className="text-gray-500 text-xs mt-1">Wait for admin to process your current request</p>
            </div>
          ) : balance <= 0 ? (
            <div className="text-center">
              <Wallet className="w-8 h-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 font-medium text-sm">No coins to pay out</p>
              <p className="text-gray-600 text-xs mt-1">Complete orders to earn coins</p>
            </div>
          ) : (
            <button
              onClick={handleRequestPayout}
              disabled={requesting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {requesting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRightLeft className="w-5 h-5" />
              )}
              Request Payout
            </button>
          )}
        </div>
      </div>

      {/* Payout History */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Payout History</h2>
        {payouts.length === 0 ? (
          <div className="glass-strong rounded-2xl p-12 text-center">
            <Wallet className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400">No payouts yet</p>
            <p className="text-gray-600 text-sm mt-1">Request a payout when you have coins in your wallet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map((payout) => {
              const config = statusConfig[payout.status] || statusConfig.REQUESTED;
              const StatusIcon = config.icon;
              return (
                <div key={payout.id} className="glass-strong rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${config.bgColor}`}>
                        <StatusIcon className={`w-5 h-5 ${config.color} ${payout.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-amber-400">{payout.coinAmount.toFixed(2)} coins</span>
                          <span className="text-gray-600">→</span>
                          <span className="font-semibold text-green-400">{payout.euroAmount.toFixed(2)} EUR</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Requested {new Date(payout.createdAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {payout.processedAt && ` • Processed ${new Date(payout.processedAt).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' })}`}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-xs font-medium ${config.color} ${config.bgColor}`}>
                      {config.label}
                    </div>
                  </div>
                  {payout.adminNotes && (
                    <div className="mt-3 p-3 rounded-lg bg-gray-800/50 text-sm text-gray-400">
                      <span className="text-gray-500 font-medium">Admin: </span>{payout.adminNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
