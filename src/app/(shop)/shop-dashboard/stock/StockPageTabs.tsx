'use client';

import { useState } from 'react';
import { Package, Upload } from 'lucide-react';
import { StockManagerClient } from './StockManagerClient';
import { StockImportClient } from './StockImportClient';

export function StockPageTabs() {
  const [tab, setTab] = useState<'manage' | 'import'>('manage');

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('manage')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'manage'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
              : 'glass text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Manage Stock
        </button>
        <button
          onClick={() => setTab('import')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            tab === 'import'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
              : 'glass text-gray-400 hover:text-white'
          }`}
        >
          <Upload className="w-4 h-4" />
          Import Stock
        </button>
      </div>

      {tab === 'manage' ? <StockManagerClient /> : <StockImportClient />}
    </div>
  );
}
