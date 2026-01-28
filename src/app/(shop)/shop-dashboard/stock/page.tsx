import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { 
  Database, 
  ArrowLeft, 
  Store, 
  Plug, 
  FileText,
  Clock,
  Sparkles
} from 'lucide-react';

export default async function ShopStockPage() {
  const session = await getCurrentSession();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { shop: true },
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'SHOP_OWNER')) {
    redirect('/dashboard');
  }

  const shop = user.shop;
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="min-h-screen font-display">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30" />
      <div className="fixed inset-0 radial-gradient" />
      
      {/* Decorative gradient orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-teal-500/20 rounded-full blur-3xl animate-float" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative container py-8 md:py-12">
        {/* Header */}
        <div className="mb-10">
          <Link 
            href="/shop-dashboard" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full glass text-sm">
            <Database className="w-4 h-4 text-teal-400" />
            <span className="text-gray-300">{isAdmin ? 'Admin View' : shop?.name || 'My Stock'}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 font-heading">
            <span className="text-white">My </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-blue-400">Stock</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Manage your card inventory and connect external stock sources via API.
          </p>
        </div>

        {/* Coming Soon Card */}
        <div className="glass-strong rounded-2xl p-8 md:p-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 ring-1 ring-teal-500/30">
            <Sparkles className="w-10 h-10 text-teal-400" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Coming Soon
          </h2>
          
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            The Stock Management feature is currently in development. Soon you'll be able to:
          </p>

          {/* Feature Preview */}
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <div className="glass rounded-xl p-4">
              <div className="p-3 rounded-lg bg-teal-500/10 w-fit mx-auto mb-3">
                <Plug className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">API Integration</h3>
              <p className="text-sm text-gray-500">Connect your external inventory systems</p>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="p-3 rounded-lg bg-cyan-500/10 w-fit mx-auto mb-3">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Text Import</h3>
              <p className="text-sm text-gray-500">Import card lists in text format</p>
            </div>
            
            <div className="glass rounded-xl p-4">
              <div className="p-3 rounded-lg bg-blue-500/10 w-fit mx-auto mb-3">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white mb-1">Auto Sync</h3>
              <p className="text-sm text-gray-500">Real-time inventory synchronization</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 text-teal-400 text-sm">
            <Clock className="w-4 h-4" />
            <span>Feature in development</span>
          </div>
        </div>
      </div>
    </div>
  );
}
