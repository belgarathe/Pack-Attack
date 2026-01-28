'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Package, Truck, CheckCircle, Clock, XCircle, ChevronDown, ChevronUp, MapPin, Mail, User, Coins, Euro, Store, Link2, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type OrderItem = {
  id: string;
  cardName: string;
  cardImage: string | null;
  coinValue: number;
};

type Shop = {
  id: string;
  name: string;
  owner: {
    id: string;
    email: string;
    name: string | null;
  };
};

type Order = {
  id: string;
  status: string;
  totalCoins: number;
  shippingName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
  shippingCountry: string;
  shippingMethod: 'COINS' | 'EUROS';
  shippingCost: number;
  notes: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shopNotes: string | null;
  assignedShopId: string | null;
  assignedAt: string | null;
  assignedShop: Shop | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  items: OrderItem[];
};

const statusConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  PENDING: { color: 'text-yellow-400 bg-yellow-400/10', icon: Clock, label: 'Pending' },
  PROCESSING: { color: 'text-blue-400 bg-blue-400/10', icon: Package, label: 'Processing' },
  SHIPPED: { color: 'text-purple-400 bg-purple-400/10', icon: Truck, label: 'Shipped' },
  DELIVERED: { color: 'text-green-400 bg-green-400/10', icon: CheckCircle, label: 'Delivered' },
  CANCELLED: { color: 'text-red-400 bg-red-400/10', icon: XCircle, label: 'Cancelled' },
};

export function OrdersClient({ orders: initialOrders, shops }: { orders: Order[]; shops: Shop[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [orders, setOrders] = useState(initialOrders);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [trackingInputs, setTrackingInputs] = useState<Record<string, { number: string; url: string }>>({});

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to update order',
          variant: 'destructive',
        });
        return;
      }

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...data.order } : o));
      addToast({
        title: 'Success',
        description: `Order status updated to ${newStatus}`,
      });
      router.refresh();
    } catch (error) {
      console.error('Error updating order:', error);
      addToast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleShopAssignment = async (orderId: string, shopId: string | null) => {
    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedShopId: shopId }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to assign order',
          variant: 'destructive',
        });
        return;
      }

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...data.order } : o));
      addToast({
        title: 'Success',
        description: shopId ? 'Order assigned to shop' : 'Order unassigned from shop',
      });
      router.refresh();
    } catch (error) {
      console.error('Error assigning order:', error);
      addToast({
        title: 'Error',
        description: 'Failed to assign order',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleTrackingUpdate = async (orderId: string) => {
    const tracking = trackingInputs[orderId];
    if (!tracking) return;

    setUpdatingOrder(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackingNumber: tracking.number || null,
          trackingUrl: tracking.url || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data.error || 'Failed to update tracking',
          variant: 'destructive',
        });
        return;
      }

      setOrders(orders.map(o => o.id === orderId ? { ...o, ...data.order } : o));
      addToast({
        title: 'Success',
        description: 'Tracking information updated',
      });
      router.refresh();
    } catch (error) {
      console.error('Error updating tracking:', error);
      addToast({
        title: 'Error',
        description: 'Failed to update tracking',
        variant: 'destructive',
      });
    } finally {
      setUpdatingOrder(null);
    }
  };

  const filteredOrders = filterStatus === 'ALL' 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    shipped: orders.filter(o => o.status === 'SHIPPED').length,
    delivered: orders.filter(o => o.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-white">{orderStats.total}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-yellow-400">Pending</p>
          <p className="text-2xl font-bold text-white">{orderStats.pending}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-blue-400">Processing</p>
          <p className="text-2xl font-bold text-white">{orderStats.processing}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-purple-400">Shipped</p>
          <p className="text-2xl font-bold text-white">{orderStats.shipped}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-green-400">Delivered</p>
          <p className="text-2xl font-bold text-white">{orderStats.delivered}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === status
                ? 'bg-blue-500 text-white'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            {status === 'ALL' ? 'All Orders' : statusConfig[status]?.label || status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No orders found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.PENDING;
            const StatusIcon = status.icon;
            const isExpanded = expandedOrder === order.id;

            return (
              <div key={order.id} className="glass-strong rounded-xl overflow-hidden">
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${status.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">Order #{order.id.slice(-8).toUpperCase()}</p>
                        <p className="text-sm text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('de-DE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-400">{order.items.length} items</p>
                        <p className="font-semibold text-white">{order.shippingName}</p>
                      </div>
                      {order.assignedShop && (
                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          {order.assignedShop.name}
                        </div>
                      )}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {status.label}
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
                  <div className="border-t border-gray-800 p-4 space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Customer Info */}
                      <div className="glass rounded-xl p-4">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-400" />
                          Customer
                        </h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-400">
                            <span className="text-gray-500">Account:</span> {order.user.email}
                          </p>
                          {order.user.name && (
                            <p className="text-gray-400">
                              <span className="text-gray-500">Name:</span> {order.user.name}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Shipping Info */}
                      <div className="glass rounded-xl p-4">
                        <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          Shipping Address
                        </h4>
                        <div className="space-y-1 text-sm text-gray-400">
                          <p>{order.shippingName}</p>
                          <p>{order.shippingAddress}</p>
                          <p>{order.shippingZip} {order.shippingCity}</p>
                          <p>{order.shippingCountry}</p>
                          <p className="flex items-center gap-1 mt-2">
                            <Mail className="w-3 h-3" />
                            {order.shippingEmail}
                          </p>
                          {/* Shipping Payment */}
                          <div className={`flex items-center gap-2 mt-3 pt-3 border-t border-gray-700 ${
                            order.shippingMethod === 'COINS' ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {order.shippingMethod === 'COINS' ? (
                              <>
                                <Coins className="w-4 h-4" />
                                <span className="font-medium">Paid: {order.shippingCost?.toFixed(2) || '5.00'} coins</span>
                              </>
                            ) : (
                              <>
                                <Euro className="w-4 h-4" />
                                <span className="font-medium">Paid: {order.shippingCost?.toFixed(2) || '5.00'} €</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Shop Assignment */}
                    <div className="glass rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Store className="w-4 h-4 text-purple-400" />
                        Shop Assignment
                      </h4>
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                        <select
                          value={order.assignedShopId || ''}
                          onChange={(e) => handleShopAssignment(order.id, e.target.value || null)}
                          disabled={updatingOrder === order.id}
                          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-auto"
                        >
                          <option value="">-- Not Assigned --</option>
                          {shops.map((shop) => (
                            <option key={shop.id} value={shop.id}>
                              {shop.name} ({shop.owner.email})
                            </option>
                          ))}
                        </select>
                        {order.assignedShop && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">Assigned to:</span>
                            <span className="text-purple-400 font-medium">{order.assignedShop.name}</span>
                            {order.assignedAt && (
                              <span className="text-gray-500 text-xs">
                                on {new Date(order.assignedAt).toLocaleDateString('de-DE')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tracking Information */}
                    <div className="glass rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-green-400" />
                        Tracking Information
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Tracking Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 1Z999AA10123456784"
                            value={trackingInputs[order.id]?.number ?? order.trackingNumber ?? ''}
                            onChange={(e) => setTrackingInputs(prev => ({
                              ...prev,
                              [order.id]: { 
                                number: e.target.value, 
                                url: prev[order.id]?.url ?? order.trackingUrl ?? '' 
                              }
                            }))}
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Tracking URL</label>
                          <input
                            type="url"
                            placeholder="e.g. https://tracking.dhl.de/..."
                            value={trackingInputs[order.id]?.url ?? order.trackingUrl ?? ''}
                            onChange={(e) => setTrackingInputs(prev => ({
                              ...prev,
                              [order.id]: { 
                                number: prev[order.id]?.number ?? order.trackingNumber ?? '', 
                                url: e.target.value 
                              }
                            }))}
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleTrackingUpdate(order.id)}
                        disabled={updatingOrder === order.id}
                        className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      >
                        <Save className="w-4 h-4" />
                        Save Tracking Info
                      </button>
                      {order.trackingUrl && (
                        <a 
                          href={order.trackingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="mt-2 text-sm text-green-400 hover:text-green-300 inline-flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" />
                          View Tracking
                        </a>
                      )}
                    </div>

                    {/* Order Notes */}
                    {order.notes && (
                      <div className="glass rounded-xl p-4">
                        <h4 className="font-semibold text-white mb-2">Customer Notes</h4>
                        <p className="text-sm text-gray-400">{order.notes}</p>
                      </div>
                    )}

                    {/* Shop Notes */}
                    {order.shopNotes && (
                      <div className="glass rounded-xl p-4 border border-purple-500/30">
                        <h4 className="font-semibold text-purple-400 mb-2">Shop Notes</h4>
                        <p className="text-sm text-gray-400">{order.shopNotes}</p>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="glass rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3">Order Items ({order.items.length})</h4>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="relative group">
                            <div className="relative aspect-[63/88] rounded-lg overflow-hidden border border-gray-700">
                              {item.cardImage ? (
                                <Image
                                  src={item.cardImage}
                                  alt={item.cardName}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                  <span className="text-[8px] text-gray-600">?</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 truncate mt-1" title={item.cardName}>
                              {item.cardName}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Status Update */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      <p className="text-sm text-gray-400">Update Status:</p>
                      <div className="flex gap-2 flex-wrap">
                        {['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => {
                          const cfg = statusConfig[s];
                          return (
                            <button
                              key={s}
                              onClick={() => handleStatusUpdate(order.id, s)}
                              disabled={order.status === s || updatingOrder === order.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                                order.status === s
                                  ? cfg.color + ' ring-2 ring-offset-2 ring-offset-gray-900'
                                  : 'glass hover:bg-white/10 text-gray-400'
                              }`}
                            >
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











