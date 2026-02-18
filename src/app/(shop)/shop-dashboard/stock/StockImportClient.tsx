'use client';

import { useState, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Plus, 
  RefreshCw,
  Info,
  X,
  ChevronDown,
} from 'lucide-react';

type ImportResult = {
  success: boolean;
  summary: {
    totalItems: number;
    created: number;
    updated: number;
    errors: number;
  };
  created: { name: string; quantity: number; id: string }[];
  updated: { name: string; quantity: number; newStock: number }[];
  errors?: string[];
};

const GAMES = [
  { value: '', label: 'No default' },
  { value: 'POKEMON', label: 'Pokémon' },
  { value: 'MAGIC_THE_GATHERING', label: 'Magic: The Gathering' },
  { value: 'YUGIOH', label: 'Yu-Gi-Oh!' },
  { value: 'ONE_PIECE', label: 'One Piece' },
  { value: 'LORCANA', label: 'Lorcana' },
  { value: 'FLESH_AND_BLOOD', label: 'Flesh and Blood' },
];

const CATEGORIES = [
  { value: '', label: 'Default (Single Card)' },
  { value: 'SINGLE_CARD', label: 'Single Card' },
  { value: 'BOOSTER_BOX', label: 'Booster Box' },
  { value: 'BOOSTER_PACK', label: 'Booster Pack' },
  { value: 'STARTER_DECK', label: 'Starter Deck' },
  { value: 'STRUCTURE_DECK', label: 'Structure Deck' },
  { value: 'ACCESSORIES', label: 'Accessories' },
  { value: 'SLEEVES', label: 'Sleeves' },
  { value: 'PLAYMAT', label: 'Playmat' },
  { value: 'BINDER', label: 'Binder' },
  { value: 'DECK_BOX', label: 'Deck Box' },
  { value: 'OTHER', label: 'Other' },
];

const CONDITIONS = [
  { value: '', label: 'Default (Near Mint)' },
  { value: 'MINT', label: 'Mint' },
  { value: 'NEAR_MINT', label: 'Near Mint' },
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'LIGHT_PLAYED', label: 'Light Played' },
  { value: 'PLAYED', label: 'Played' },
  { value: 'POOR', label: 'Poor' },
];

export function StockImportClient() {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);
  const [defaultGame, setDefaultGame] = useState('');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [defaultCondition, setDefaultCondition] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (activeTab === 'file' && selectedFile) {
        formData.append('file', selectedFile);
      } else if (activeTab === 'text' && textInput.trim()) {
        formData.append('text', textInput);
        formData.append('format', 'text');
      } else {
        setImporting(false);
        return;
      }

      if (defaultGame) formData.append('defaultGame', defaultGame);
      if (defaultCategory) formData.append('defaultCategory', defaultCategory);
      if (defaultCondition) formData.append('defaultCondition', defaultCondition);

      const res = await fetch('/api/shop-dashboard/stock/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({
          success: false,
          summary: { totalItems: 0, created: 0, updated: 0, errors: 1 },
          created: [],
          updated: [],
          errors: [data.error || 'Import failed'],
        });
        return;
      }

      setResult(data);
      if (data.success) {
        setTextInput('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch {
      setResult({
        success: false,
        summary: { totalItems: 0, created: 0, updated: 0, errors: 1 },
        created: [],
        updated: [],
        errors: ['Network error - please try again'],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setActiveTab('file');
    }
  };

  const canImport = (activeTab === 'text' && textInput.trim().length > 0) ||
    (activeTab === 'file' && selectedFile !== null);

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'text'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
              : 'glass text-gray-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Text Import
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === 'file'
              ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25'
              : 'glass text-gray-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          File Import (CSV / Excel)
        </button>
      </div>

      {/* Help Toggle */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
      >
        <Info className="w-4 h-4" />
        {showHelp ? 'Hide format guide' : 'Show format guide'}
      </button>

      {showHelp && (
        <div className="glass rounded-xl p-5 space-y-4">
          <h4 className="font-semibold text-white">Text Import Format</h4>
          <div className="text-sm text-gray-400 space-y-2">
            <p>One item per line. Supported formats:</p>
            <div className="glass rounded-lg p-3 font-mono text-xs text-gray-300 space-y-1">
              <p className="text-teal-400"># Simple (name only, qty defaults to 1)</p>
              <p>Charizard VMAX</p>
              <p className="text-teal-400 mt-2"># With quantity</p>
              <p>4x Lightning Energy</p>
              <p className="text-teal-400 mt-2"># With price</p>
              <p>2x Pikachu V | 12.50</p>
              <p className="text-teal-400 mt-2"># Full format: qty x name | price | category | game | condition | sku</p>
              <p>3x Booster Box Scarlet &amp; Violet | 129.99 | BOOSTER_BOX | POKEMON | MINT | SKU123</p>
            </div>
          </div>

          <h4 className="font-semibold text-white">CSV / Excel Format</h4>
          <div className="text-sm text-gray-400 space-y-2">
            <p>First row must be headers. Supported column names:</p>
            <div className="glass rounded-lg p-3 font-mono text-xs text-gray-300">
              <p><span className="text-teal-400">Required:</span> name (or card, product, article)</p>
              <p><span className="text-cyan-400">Optional:</span> quantity, price, category, game, condition, sku</p>
            </div>
            <p className="text-xs text-gray-500">Supports .csv, .tsv files. Separators: comma, semicolon, or tab.</p>
          </div>
        </div>
      )}

      {/* Default Settings */}
      <button
        onClick={() => setShowDefaults(!showDefaults)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ChevronDown className={`w-4 h-4 transition-transform ${showDefaults ? 'rotate-180' : ''}`} />
        Default values for imported items
      </button>

      {showDefaults && (
        <div className="glass rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Default Game</label>
              <select
                value={defaultGame}
                onChange={(e) => setDefaultGame(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {GAMES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Default Category</label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">Default Condition</label>
              <select
                value={defaultCondition}
                onChange={(e) => setDefaultCondition(e.target.value)}
                className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                {CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Text Import */}
      {activeTab === 'text' && (
        <div className="glass-strong rounded-2xl p-6">
          <label className="text-sm font-medium text-white mb-2 block">Paste your card list</label>
          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={`4x Charizard VMAX | 45.00\n2x Pikachu V | 12.50\n10x Lightning Energy\nBooster Box Scarlet & Violet | 129.99 | BOOSTER_BOX | POKEMON`}
            rows={12}
            className="w-full bg-gray-800/80 border border-gray-700 text-white rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y placeholder:text-gray-600"
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500">
              {textInput.split('\n').filter(l => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('//')).length} items detected
            </p>
          </div>
        </div>
      )}

      {/* File Import */}
      {activeTab === 'file' && (
        <div
          className="glass-strong rounded-2xl p-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          {selectedFile ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-teal-500/10">
                  <FileSpreadsheet className="w-6 h-6 text-teal-400" />
                </div>
                <div>
                  <p className="font-medium text-white">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-2 rounded-lg glass text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 ring-1 ring-teal-500/30">
                <Upload className="w-8 h-8 text-teal-400" />
              </div>
              <p className="text-white font-medium mb-1">Drop your file here or click to browse</p>
              <p className="text-sm text-gray-500 mb-4">Supports CSV, TSV, and text files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,.xls,.xlsx"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium glass text-teal-400 hover:text-white cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                Choose File
              </label>
            </div>
          )}
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={!canImport || importing}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all ${
          canImport && !importing
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40'
            : 'glass text-gray-600 cursor-not-allowed'
        }`}
      >
        {importing ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Import to Stock
          </>
        )}
      </button>

      {/* Results */}
      {result && (
        <div className={`glass-strong rounded-2xl p-6 space-y-4 ${
          result.success ? 'ring-1 ring-teal-500/30' : 'ring-1 ring-red-500/30'
        }`}>
          <div className="flex items-center gap-3">
            {result.success ? (
              <CheckCircle className="w-6 h-6 text-teal-400" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-400" />
            )}
            <h3 className="text-lg font-semibold text-white">
              {result.success ? 'Import Complete' : 'Import Failed'}
            </h3>
          </div>

          {result.success && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{result.summary.totalItems}</p>
                <p className="text-xs text-gray-400">Total Items</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-teal-400">{result.summary.created}</p>
                <p className="text-xs text-gray-400">New Products</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-cyan-400">{result.summary.updated}</p>
                <p className="text-xs text-gray-400">Stock Updated</p>
              </div>
              <div className="glass rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{result.summary.errors}</p>
                <p className="text-xs text-gray-400">Errors</p>
              </div>
            </div>
          )}

          {result.created.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-teal-400 mb-2">New Products Created</h4>
              <div className="glass rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {result.created.map((item, i) => (
                  <p key={i} className="text-sm text-gray-300">
                    <span className="text-teal-400">+{item.quantity}x</span> {item.name}
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.updated.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-2">Stock Updated</h4>
              <div className="glass rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {result.updated.map((item, i) => (
                  <p key={i} className="text-sm text-gray-300">
                    <span className="text-cyan-400">+{item.quantity}</span> {item.name}
                    <span className="text-gray-500"> (now {item.newStock} in stock)</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">Errors</h4>
              <div className="glass rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-red-300">{err}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
