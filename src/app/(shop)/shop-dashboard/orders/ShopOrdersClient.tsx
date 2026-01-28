'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Package, Truck, CheckCircle, Clock, XCircle, 
  ChevronDown, ChevronUp, MapPin, Mail, User, 
  Coins, Euro, ExternalLink, MessageSquare, Send,
  AlertCircle, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  cardName: string;
  cardImage: string | null;
  cardValue: number;
  cardRarity: string | null;
  shippingName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
  shippingPhone: string | null;
  shippingMethod: 'COINS' | 'EUROS';
  shippingCost: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  notes: string | null;
  shopNotes: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
  box: { id: string; name: string; imageUrl: string };
  shop: { id: string; name: string };
};

const statusConfig: Record<string, { color: string; bgColor: string; icon: React.ElementType; label: string }> = {
  PENDING: { color: 'text-yellow-400', bgColor: 'bg-yellow-400/10', icon: Clock, label: 'Pending' },
  CONFIRMED: { color: 'text-blue-400', bgColor: 'bg-blue-400/10', icon: Check, label: 'Confirmed' },
  PROCESSING: { color: 'text-purple-400', bgColor: 'bg-purple-400/10', icon: Package, label: 'Processing' },
  SHIPPED: { color: 'text-indigo-400', bgColor: 'bg-indigo-400/10', icon: Truck, label: 'Shipped' },
  DELIVERED: { color: 'text-green-400', bgColor: 'bg-green-400/10', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: 'text-red-400', bgColor: 'bg-red-400/10', icon: XCircle, label: 'Cancelled' },
};

export function ShopOrdersClient({ orders: initialOrders, isAdmin }: { orders: Order[]; isAdmin: boolean }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState({ number: '', url: '' });
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [shopNotes, setShopNotes] = useState('');

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/shop-dashboard/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update order');
      }

      setOrders(orders.map(o => o.id === orderId ? data.order : o));
      addToast({
        title: 'Success',
        description: `Order status updated to ${newStatus}`,
      });
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleTrackingUpdate = async (orderId: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/shop-dashboard/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackingNumber: trackingData.number,
          trackingUrl: trackingData.url,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update tracking');
      }

      setOrders(orders.map(o => o.id === orderId ? data.order : o));
      setEditingTracking(null);
      setTrackingData({ number: '', url: '' });
      addToast({
        title: 'Success',
        description: 'Tracking information updated',
      });
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to update tracking',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleNotesUpdate = async (orderId: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/shop-dashboard/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopNotes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update notes');
      }

      setOrders(orders.map(o => o.id === orderId ? data.order : o));
      setEditingNotes(null);
      setShopNotes('');
      addToast({
        title: 'Success',
        description: 'Notes updated',
      });
    } catch (error: any) {
      addToast({
        title: 'Error',
        description: error.message || 'Failed to update notes',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const filteredOrders = filterStatus === 'ALL' 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  if (orders.length === 0) {
    return (
      <div className="glass-strong rounded-2xl p-12 text-center">
        <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">No Orders Yet</h3>
        <p className="text-gray-400 max-w-md mx-auto">
          When users open your boxes and order cards, the orders will appear here for you to process and ship.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filterStatus === status
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg'
                : 'glass text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            {status === 'ALL' ? 'All Orders' : statusConfig[status]?.label || status}
            {status !== 'ALL' && (
              <span className="ml-2 text-xs opacity-70">
                ({orders.filter(o => o.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="glass-strong rounded-2xl p-8 text-center">
          <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No orders with this status</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div key={order.id} className="glass-strong rounded-2xl overflow-hidden">
                {/* Order Header */}
                <div
                  className="p-5 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Card Image */}
                      <div className="relative w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-gray-700 bg-gray-800">
                        {order.cardImage ? (
                          <Image
                            src={order.cardImage}
                            alt={order.cardName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-500 font-mono">#{order.orderNumber.slice(-8).toUpperCase()}</span>
                          {isAdmin && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                              {order.shop.name}
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-white truncate max-w-[200px]">{order.cardName}</p>
                        <p className="text-sm text-gray-400 truncate">
                          {order.user.name || order.user.email} • {order.box.name}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-medium text-amber-400">{order.cardValue.toFixed(2)} coins</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      
                      <div className={`px-3 py-1.5 rounded-xl text-sm font-medium flex items-center gap-2 ${status.color} ${status.bgColor}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">{status.label}</span>
                      </div>
                      
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-800 p-5 space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Customer Info */}
                      <div className="glass rounded-xl p-4">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-400" />
                          Customer
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300">{order.user.name || 'No name'}</p>
                          <p className="text-gray-400 flex items-center gap-2">
                            <Mail className="w-3 h-3" />
                            {order.user.email}
                          </p>
                        </div>
                      </div>

                      {/* Shipping Info */}
                      <div className="glass rounded-xl p-4">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          Shipping Address
                        </h4>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p className="text-gray-300">{order.shippingName}</p>
                          <p>{order.shippingAddress}</p>
                          <p>{order.shippingZip} {order.shippingCity}</p>
                          <p>{order.shippingCountry}</p>
                          {order.shippingPhone && (
                            <p className="mt-2">📞 {order.shippingPhone}</p>
                          )}
                          <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-gray-700 ${
                            order.shippingMethod === 'COINS' ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {order.shippingMethod === 'COINS' ? (
                              <>
                                <Coins className="w-4 h-4" />
                                <span className="font-medium">Shipping: {order.shippingCost.toFixed(2)} coins</span>
                              </>
                            ) : (
                              <>
                                <Euro className="w-4 h-4" />
                                <span className="font-medium">Shipping: €{order.shippingCost.toFixed(2)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div className="glass rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-400" />
                        Order Item
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-28 rounded-lg overflow-hidden ring-1 ring-gray-700 flex-shrink-0">
                          {order.cardImage ? (
                            <Image
                              src={order.cardImage}
                              alt={order.cardName}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{order.cardName}</p>
                          {order.cardRarity && (
                            <p className="text-sm text-gray-400">Rarity: {order.cardRarity}</p>
                          )}
                          <p className="text-sm text-amber-400 mt-1">{order.cardValue.toFixed(2)} coins</p>
                          <p className="text-xs text-gray-500 mt-1">From: {order.box.name}</p>
                        </div>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    {order.notes && (
                      <div className="glass rounded-xl p-4">
                        <h4 className="font-semibold text-white mb-2">Customer Notes</h4>
                        <p className="text-sm text-gray-400">{order.notes}</p>
                      </div>
                    )}

                    {/* Tracking Info */}
                    <div className="glass rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-emerald-400" />
                        Tracking Information
                      </h4>
                      
                      {editingTracking === order.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Tracking Number"
                            value={trackingData.number}
                            onChange={(e) => setTrackingData({ ...trackingData, number: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Tracking URL (optional)"
                            value={trackingData.url}
                            onChange={(e) => setTrackingData({ ...trackingData, url: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-emerald-500 focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleTrackingUpdate(order.id)}
                              disabled={updatingOrder === order.id}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTracking(null);
                                setTrackingData({ number: '', url: '' });
                              }}
                              className="border-gray-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : order.trackingNumber ? (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-mono">{order.trackingNumber}</p>
                            {order.trackingUrl && (
                              <a
                                href={order.trackingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mt-1"
                              >
                                Track Package <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTracking(order.id);
                              setTrackingData({
                                number: order.trackingNumber || '',
                                url: order.trackingUrl || '',
                              });
                            }}
                            className="border-gray-700 text-gray-400"
                          >
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingTracking(order.id)}
                          className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Add Tracking
                        </Button>
                      )}
                    </div>

                    {/* Shop Notes */}
                    <div className="glass rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-400" />
                        Internal Notes
                      </h4>
                      
                      {editingNotes === order.id ? (
                        <div className="space-y-3">
                          <textarea
                            placeholder="Add internal notes about this order..."
                            value={shopNotes}
                            onChange={(e) => setShopNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:border-emerald-500 focus:outline-none resize-none"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleNotesUpdate(order.id)}
                              disabled={updatingOrder === order.id}
                              className="bg-emerald-500 hover:bg-emerald-600"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNotes(null);
                                setShopNotes('');
                              }}
                              className="border-gray-700"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : order.shopNotes ? (
                        <div className="flex items-start justify-between">
                          <p className="text-sm text-gray-400">{order.shopNotes}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingNotes(order.id);
                              setShopNotes(order.shopNotes || '');
                            }}
                            className="border-gray-700 text-gray-400 ml-4 flex-shrink-0"
                          >
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNotes(order.id)}
                          className="border-gray-700 text-gray-400"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Add Notes
                        </Button>
                      )}
                    </div>

                    {/* Status Update */}
                    <div className="pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400 mb-3">Update Order Status:</p>
                      <div className="flex gap-2 flex-wrap">
                        {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => {
                          const cfg = statusConfig[s];
                          const StatusIcon = cfg.icon;
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusUpdate(order.id, s)}
                              disabled={order.status === s || updatingOrder === order.id}
                              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2 ${
                                order.status === s
                                  ? `${cfg.bgColor} ${cfg.color} ring-2 ring-offset-2 ring-offset-gray-900 ring-current`
                                  : 'glass hover:bg-white/10 text-gray-400'
                              }`}
                            >
                              <StatusIcon className="w-4 h-4" />
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
